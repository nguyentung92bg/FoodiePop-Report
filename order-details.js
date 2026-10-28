(()=>{
 const D=window.FoodieOrders;if(!D)return;
 const mapSelect=document.querySelector('#order-map'),levelSelect=document.querySelector('#order-level');if(!mapSelect)return;
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const name=(g,id)=>g.nodes[id]?.name||id;
 const nodeId=(g,node)=>g.tables[{i:'ingredient',c:'composite',g:'group'}[node[0]]][node[1]];
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
 function characterCounts(level){return '<span class="customer-type-counts">'+['Boss','Shipper','Normal'].map(type=>'<span class="character-badge character-'+type.toLowerCase()+'">'+type+': <b>'+(level.character_counts?.[type]||0)+'</b></span>').join(' ')+'</span>';}
 const difficulty=['Normal','Hard','SuperHard'],weather=['Normal','Rainy','Sunny','Freeze','Stormy','Autumn','Night','Sandstorm'];
 function leaves(g,node){return node[0]==='i'?[nodeId(g,node)]:node[2].flatMap(child=>leaves(g,child));}
 function counts(values){const result=new Map();values.forEach(v=>result.set(v,(result.get(v)||0)+1));return [...result.entries()];}
 function componentList(g,values){return counts(values).map(([id,n])=>escape(name(g,id))+' ×'+n).join(' + ')||'Không có thành phần cụ thể trong đơn';}
 function chain(g,id,visited=new Set()){
   if(visited.has(id))return escape(name(g,id))+' (vòng tham chiếu; cần đối chiếu)';
   const next=new Set(visited);next.add(id);const paths=g.recipes[id]||[];
   if(!paths.length)return '<b>'+escape(name(g,id))+'</b>';
   return paths.map(recipe=>{
     const inputs=counts(recipe.inputs).map(([input,n])=>chain(g,input,next)+(n>1?' ×'+n:'')).join(' + ');
     const tools=[recipe.tool,...recipe.chain].map(t=>escape(name(g,t))).join(' → ');
     return '('+inputs+') <span class="recipe-arrow">→ '+tools+' →</span> <b>'+escape(name(g,id))+' ×'+recipe.yield_count+'</b>';
   }).join('<br>Hoặc: ');
 }
 function rawInputs(g,id,visited=new Set()){
   if(visited.has(id))return [];
   const next=new Set(visited);next.add(id);const paths=g.recipes[id]||[];
   return paths.length?paths.flatMap(recipe=>recipe.inputs.flatMap(input=>rawInputs(g,input,next))):[id];
 }
 const metadata=new Map((D.metadata||[]).map(m=>[m.map+':'+m.index,m])),models=[],keys=new Set();
 for(const level of D.levels){
   const g=D.graphs[level.map],meta=metadata.get(level.map+':'+level.index),parts=[],words=[];let dishCount=0;
   for(const c of level.customers){words.push('khách '+c.sequence,c.character_index===null?'không cố định':'nhân vật '+c.character_index);for(const d of c.dishes){dishCount++;parts.push(...leaves(g,d.root));words.push(name(g,nodeId(g,d.root)));}}
   const raw=[...new Set(parts.flatMap(id=>rawInputs(g,id)))];
   const row={key:level.map+':'+level.index,level,g,meta,dishCount,parts,raw};
   const state=D.boards?.[row.key]?.states;
   row.search=normalize([level.map,level.position,level.index,...words,...parts.map(id=>name(g,id)),...raw.map(id=>name(g,id)),meta?.tutId||'',meta?difficulty[meta.difficultyTag]:'',meta?weather[meta.weatherEffect]:'',state?.hidden_config?'hidden ẩn':'',state?.frozen?'frozen đóng băng chặn gắp':'',state?.key?'chìa khóa màu':''].join(' '));models.push(row);keys.add(row.key);
 }
 for(const [key,meta] of metadata){if(!keys.has(key))models.push({key,level:{map:meta.map,index:meta.index,position:meta.position,customers:[]},meta,dishCount:0,parts:[],raw:[],search:normalize(meta.map+' '+meta.position+' chưa có đơn hàng')});}
 const byKey=new Map(models.map(m=>[m.key,m])),search=document.querySelector('#order-search'),prev=document.querySelector('#order-prev'),next=document.querySelector('#order-next'),pageLabel=document.querySelector('#order-page');
 const dialog=document.querySelector('#level-customers-dialog'),dialogBody=document.querySelector('#level-customers-body');
 let boardLinkObserver;
 dialog.addEventListener('close',()=>{boardLinkObserver?.disconnect();boardLinkObserver=null;});
 let page=0,filtered=models;
 function rawChip(model,id,compact=false){
   const image=D.ingredient_images?.[model.level.map]?.[id],label=name(model.g,id);
   return '<span class="raw-chip'+(compact?' compact':'')+'" title="'+escape(label)+'">'+(image?'<img src="../'+escape(image)+'" alt="'+escape(label)+'" width="52" height="52" loading="lazy">':'<span class="raw-missing">Chưa có ảnh</span>')+(compact?'':'<span>'+escape(label)+'</span>')+'</span>';
 }
 function openButton(model,content,cls='',focus='customers'){return '<button class="open-level '+cls+'" data-key="'+escape(model.key)+'" data-focus="'+focus+'" aria-haspopup="dialog" aria-controls="level-customers-dialog">'+content+'</button>';}
 function rowHtml(model){
   const {level:l,meta:m,g}=model,hasOrders=Boolean(g),customerCount=hasOrders?l.customers.length:m.numCustomers;
   const levelCell='<b>'+escape(g?.name||l.map)+'</b><br>Cấu hình <b>'+l.position+'</b><br><small>Index '+l.index+'</small>';
   const environment=m?'<span class="level-label">'+escape(difficulty[m.difficultyTag]??m.difficultyTag)+'</span><br><small>'+escape(weather[m.weatherEffect]??m.weatherEffect)+'</small>':'<small>Chưa có mô tả cùng index</small>';
   const customers=hasOrders?openButton(model,'<b class="total-number">'+customerCount+'</b><span>Xem từng khách, món & công thức ↗</span>','customer-count')+characterCounts(model.level)+(m&&m.numCustomers!==customerCount?'<small>Mô tả level: '+m.numCustomers+' khách</small>':''):'<b class="total-number">'+customerCount+'</b><small>Theo mô tả; chưa có đơn</small>';
   const dishes=hasOrders?'<b class="total-number">'+model.dishCount+'</b><small>Theo đơn hàng</small>'+(m&&m.numDishs!==model.dishCount?'<small>Mô tả: '+m.numDishs+'</small>':''):'<b class="total-number">'+m.numDishs+'</b><small>Theo mô tả</small>';
   const ingredientTotal=m?'<b class="total-number">'+m.numIngredients+'</b><small>Theo mô tả level</small>':'<b class="total-number">'+model.parts.length+'</b><small>Phần thành phần theo đơn; chưa có tổng mô tả</small>';
   const breakdown=hasOrders?'<div class="ingredient-breakdown" data-total="'+model.parts.length+'"><small class="breakdown-caption">Theo đơn: '+model.parts.length+' phần · '+counts(model.parts).length+' loại</small><ul>'+counts(model.parts).sort((a,b)=>b[1]-a[1]).map(([id,n])=>{
     const image=D.ingredient_images?.[l.map]?.[id];
     return '<li data-ingredient="'+escape(id)+'" data-quantity="'+n+'">'+(image?'<img src="../'+escape(image)+'" alt="" width="26" height="26" loading="lazy">':'<span class="ingredient-image-space"></span>')+'<span>'+escape(name(g,id))+'</span><b>× '+n+'</b></li>';
   }).join('')+'</ul><small>Thành phần ở trạng thái đơn yêu cầu; có thể đã sơ chế.</small></div>':'<small>Chưa có đơn hàng để thống kê từng loại.</small>';
   const ingredients=ingredientTotal+breakdown;
   const raw=hasOrders?openButton(model,'<div class="raw-preview">'+model.raw.slice(0,4).map(id=>rawChip(model,id,true)).join('')+'</div><span>'+model.raw.length+' loại · xem ảnh chi tiết</span>','raw-count','ingredients'):'<small>Chưa có dữ liệu</small>';
   const b=D.boards?.[model.key],board=b?openButton(model,'<b>Board Size</b><strong>'+b.height+' hàng × '+b.width+' cột</strong><span>'+b.slots+' ô · '+b.ingredient_amount+' nguyên liệu ↗</span><small>Hidden: '+b.states.hidden+' · Frozen: '+b.states.frozen+' · Chìa khóa: '+b.states.key+'</small>','board-count','board'):'<small>Chưa có cấu hình Board</small>';
   return '<tr data-level-key="'+escape(model.key)+'"'+(!hasOrders?' class="metadata-only"':'')+'><td>'+levelCell+'</td><td>'+environment+'</td><td class="total-customers">'+customers+'</td><td>'+dishes+'</td><td>'+ingredients+'</td><td>'+raw+'</td><td class="total-board">'+board+'</td><td>'+escape(m?.tutId||'—')+'</td></tr>';
 }
 function dishDetail(model,d,index){
   const g=model.g,id=nodeId(g,d.root),parts=leaves(g,d.root),raw=[...new Set(parts.flatMap(p=>rawInputs(g,p)))],image=D.images?.[model.level.map]?.[id];
   const food='<div class="food-identity">'+(image?'<img class="dish-thumb" src="../'+escape(image)+'" alt="Ảnh đại diện '+escape(name(g,id))+'" width="76" height="76" loading="lazy">':'')+'<div><b>'+escape(name(g,id))+'</b><br><small>Món '+index+' · 1 phần</small></div></div>';
   const recipe='<div class="ingredient-line">'+componentList(g,parts)+'</div><details class="dish-detail"><summary>Xem ảnh nguyên liệu gốc & cách chế biến</summary><div class="dish-body"><div class="raw-gallery">'+raw.map(r=>rawChip(model,r)).join('')+'</div>'+counts(parts).map(([p,n])=>'<p class="recipe-step"><b>'+escape(name(g,p))+' ×'+n+':</b><br>'+chain(g,p)+'</p>').join('')+'<p class="recipe-caption">Số sau đầu ra là số phần mỗi lần chế biến; không phải tổng lượng nguyên liệu thô cần lấy.</p></div></details>';
   return {food,recipe};
 }
 function connectBoardLinks(board){
   const table=dialogBody.querySelector('.board-grid'),stage=document.createElement('div');
   stage.className='board-link-stage';table.parentNode.insertBefore(stage,table);stage.append(table);
   const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('board-link-lines');svg.setAttribute('role','img');svg.setAttribute('aria-label','Đường màu vàng nối các ô cùng nhóm Linked');stage.append(svg);
   const groups=new Map();for(const c of board.columns.flat())for(const g of c.memberships||[])if(g.kind===1)groups.set(g.index,g.cells);
   if(groups.size){table.insertAdjacentHTML('beforebegin','<p class="board-link-legend"><span></span>Đường vàng nối các ô cùng nhóm Linked; số nhóm trên ô giúp phân biệt khi các đường giao nhau.</p>');}
   function drawLinks(){
     if(!dialog.open||!stage.isConnected)return;
     stage.style.width=Math.max(stage.parentElement.clientWidth,330,80+board.width*130)+'px';
     const base=stage.getBoundingClientRect(),width=Math.max(table.offsetWidth,stage.clientWidth),height=stage.offsetHeight;
     svg.setAttribute('width',width);svg.setAttribute('height',height);svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.replaceChildren();
     const point=([x,y])=>{const el=stage.querySelector('.board-cell[data-column="'+x+'"][data-row="'+y+'"]');if(!el)return null;const r=el.getBoundingClientRect(),td=el.closest('td').getBoundingClientRect();return {x:r.left-base.left+r.width/2,y:r.bottom-base.top,gapY:td.bottom-base.top-1,right:td.right-base.left-1};};
     for(const [group,coords] of groups){
       const pts=coords.map(point);if(pts.some(p=>!p))continue;
       for(let i=1;i<pts.length;i++){
         const a=pts[i-1],b=pts[i],routeX=a.x<=b.x?a.right:b.right;
         const path=document.createElementNS(ns,'path');path.classList.add('board-linked-line');path.dataset.group=String(group+1);path.dataset.from=coords[i-1].join(',');path.dataset.to=coords[i].join(',');path.setAttribute('d',`M ${a.x} ${a.y} V ${a.gapY} H ${routeX} V ${b.gapY} H ${b.x} V ${b.y}`);
         const title=document.createElementNS(ns,'title');title.textContent='Nhóm Linked #'+(group+1);path.append(title);svg.append(path);
       }
       for(let i=0;i<pts.length;i++){const p=pts[i],dot=document.createElementNS(ns,'circle');dot.classList.add('board-linked-dot');dot.dataset.group=String(group+1);dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);dot.setAttribute('r','4');svg.append(dot);}
     }
   }
   boardLinkObserver?.disconnect();boardLinkObserver=new ResizeObserver(drawLinks);boardLinkObserver.observe(table);boardLinkObserver.observe(dialog);boardLinkObserver.observe(stage.parentElement);
   stage.addEventListener('load',drawLinks,true);requestAnimationFrame(drawLinks);
 }
 function openBoard(model){
   const b=D.boards?.[model.key];if(!b)return;
   const hiddenIcon='<img class="board-hidden-icon" src="../Images/Board/sharedassets6.assets_291_Icon_Hidden_Ingredient_2.png" alt="Ẩn nguyên liệu" width="24" height="28">';
   const freezeIcon='<svg class="board-freeze-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M3.34 7l17.32 10M3.34 17L20.66 7M9 4l3 3 3-3M9 20l3-3 3 3M3.6 10.6l4.1-1.1-1.1-4.1M17.4 18.6l-1.1-4.1 4.1-1.1M6.6 18.6l1.1-4.1-4.1-1.1M20.4 10.6l-4.1-1.1 1.1-4.1"/></svg>';
   const statuses=(c,compact=false)=>{const tags=[];
     if(!compact&&c.hidden_initial)tags.push('<span class="board-state hidden-state">'+hiddenIcon+'<span>Đang ẩn</span></span>');
     else if(!compact&&c.hidden_config)tags.push('<span class="board-state revealed-state">'+hiddenIcon+'<span>Đã lộ ở đầu hàng/nhóm</span></span>');
     if(!compact&&c.frozen>0)tags.push('<span class="board-state frozen-state">'+freezeIcon+'<b>'+c.frozen+'</b> lớp</span>');
     if(c.keys?.length)tags.push('<span class="board-state key-state">Chìa khóa màu '+c.keys.join(', ')+'</span>');
     for(const group of c.memberships||[])tags.push('<span class="board-state group-state">'+(group.kind===0?'Combined · nhóm gộp ':'Linked · liên kết ')+(group.index+1)+'</span>');
     for(const effect of c.unknown_effects||[])tags.push('<span class="board-state">Hiệu ứng #'+escape(effect)+'</span>');
     return tags.join('')||(compact&&(c.hidden_initial||c.frozen>0)?'':'<span class="board-state normal-state">'+(c.kind==='empty'?'Ô trống':c.kind==='sweeper'?'Sweeper':'Thường')+'</span>');
   };
   const photo=c=>{const path=D.ingredient_images?.[model.level.map]?.[c.node];return path?'<img src="../'+escape(path)+'" alt="'+escape(c.name)+'" width="60" height="60" loading="lazy">':'<span class="board-no-image">'+(c.kind==='empty'?'Ô trống':c.kind==='sweeper'?'Sweeper':'Chưa có ảnh')+'</span>';};
   const cell=c=>'<div class="board-cell '+c.kind+(c.hidden_initial?' is-hidden':'')+(c.frozen>0?' is-frozen':'')+'" data-hidden="'+Boolean(c.hidden_initial)+'" data-frozen="'+(c.frozen||0)+'" data-column="'+c.column+'" data-row="'+c.row+'" data-amount="'+c.amount+'" data-node="'+escape(c.node||c.kind)+'"><div class="board-corner-statuses">'+(c.hidden_initial?'<span class="board-hidden-marker" title="Hidden: nguyên liệu đang bị ẩn" aria-label="Nguyên liệu đang ẩn">'+hiddenIcon+'</span>':'')+(c.frozen>0?'<span class="board-frozen-marker" data-layers="'+c.frozen+'" title="Đóng băng: '+c.frozen+' lớp" aria-label="Đóng băng: '+c.frozen+' lớp">'+freezeIcon+'<b>'+c.frozen+'</b></span>':'')+'</div><span class="board-ingredient-picture">'+photo(c)+'</span><b>'+escape(c.name)+'</b><strong>× '+c.amount+'</strong><div class="board-states">'+statuses(c,true)+'</div></div>';
   const combined=new Map(),owners=new Map();
   for(const c of b.columns.flat())for(const group of c.memberships||[])if(group.kind===0)combined.set(group.index,group);
   for(const group of combined.values()){
     const xs=group.cells.map(p=>p[0]),ys=group.cells.map(p=>p[1]);
     const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x+1,h=Math.max(...ys)-y+1;
     if(w*h!==group.cells.length)continue;
     const layout={...group,x,y,w,h};for(const [cx,cy] of group.cells)owners.set(cx+':'+cy,layout);
   }
   const boardTd=(col,x,y)=>{
     const group=owners.get(x+':'+y);
     if(group){
       if(group.x!==x||group.y!==y)return '';
       const members=[...group.cells].sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
       return '<td class="board-combined-td" rowspan="'+group.h+'" colspan="'+group.w+'"><div class="board-combined" data-group="'+(group.index+1)+'" data-size="'+members.length+'" style="--combined-width:'+group.w+';--combined-height:'+group.h+'"><span class="board-combined-label">Combined · '+members.length+' ô</span><div class="board-combined-members">'+members.map(([cx,cy])=>cell(b.columns[cx][cy])).join('')+'</div></div></td>';
     }
     return '<td>'+(col[y]?cell(col[y]):'<span class="board-no-slot">Không có ô</span>')+'</td>';
   };
   const rows=Array.from({length:b.height},(_,y)=>'<tr><th scope="row">Hàng '+(y+1)+(y===0?'<small>Đầu hàng</small>':'')+'</th>'+b.columns.map((col,x)=>boardTd(col,x,y)).join('')+'</tr>').join('');
   document.querySelector('.level-dialog-header small').textContent='CHI TIẾT BOARD NGUYÊN LIỆU';
   document.querySelector('#level-customers-title').textContent=(model.g.name||model.level.map)+' · Cấu hình '+model.level.position+' · Board '+b.height+' hàng × '+b.width+' cột';
   dialogBody.innerHTML='<section class="level-board-detail"><p><b>Board Size: '+b.height+' hàng × '+b.width+' cột</b> · '+b.slots+' ô được cấu hình · '+b.ingredient_slots+' ô nguyên liệu · <b>'+b.ingredient_amount+' đơn vị nguyên liệu</b>.</p><p class="detail-intro">Hàng 1 là đầu hàng đợi, các hàng tiếp theo nằm sâu dần. Cột được đánh số theo thứ tự trong cấu hình. Sơ đồ là toàn bộ hàng đợi đầu level, không phải lưới bàn chế biến. Map đặt '+b.visible_rows+' hàng hiển thị; ô có × 2 hoặc × 3 vẫn chỉ chiếm một vị trí. Nhóm Combined được gộp thành một khung dài hoặc rộng bằng 2–3 ô theo vị trí cấu hình, giữ ảnh và số lượng từng nguyên liệu. Nếu các cột dài khác nhau, số hàng là chiều cao lớn nhất; “Không có ô” khác với ô trống được cấu hình.</p><div class="scroll board-scroll"><table class="board-grid" style="min-width:'+Math.max(330,80+b.width*130)+'px"><caption>Nguyên liệu đầu level theo hàng và cột</caption><thead><tr><th>Hàng / cột</th>'+b.columns.map((_,x)=>'<th scope="col">Cột '+(x+1)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div><p class="detail-intro">Ảnh là nguyên liệu ở trạng thái đầu vào được gán trong Board. Số lượng ở đây đếm theo cấu hình hàng đợi, tách với số thành phần theo đơn hàng. Các mã hiệu ứng giữ nguyên khi chưa có ánh xạ tên được xác minh.</p></section>';
   const special=b.columns.flat().filter(c=>c.effects.length||c.memberships?.length);
   const overview='<section class="board-status-overview"><h3>Trạng thái các ô đầu level</h3><div class="board-status-counts"><span>Hidden đang ẩn: <b>'+b.states.hidden+'</b></span><span>Frozen / chặn gắp: <b>'+b.states.frozen+'</b></span><span>Có chìa khóa màu: <b>'+b.states.key+'</b></span><span>Thuộc nhóm: <b>'+b.states.grouped+'</b></span></div><p class="detail-intro">Hidden: lớp che nguyên liệu, không phải khóa gắp. Ảnh thật vẫn hiển thị trong báo cáo để phân tích. Ô Hidden ở hàng đầu, hoặc nhóm Combined đã chạm hàng đầu, được lộ theo IsHidden. Frozen chặn gắp cho tới khi tan băng. Chìa khóa màu không đồng nghĩa ô bị khóa. Blocked/OrderLock/ColorLock thuộc lưới bàn chế biến riêng; không gán các trạng thái đó lên Board hàng đợi này. Đây là trạng thái suy ra từ bố trí đầu level, không mô phỏng các thay đổi trong lúc chơi.</p></section>';
   dialogBody.querySelector('.board-scroll').insertAdjacentHTML('beforebegin',overview);
   const locations=special.length?'<h3>Vị trí ô có trạng thái / liên kết</h3><div class="scroll"><table class="board-state-locations"><thead><tr><th>Hàng</th><th>Cột</th><th>Nguyên liệu</th><th>Trạng thái</th></tr></thead><tbody>'+special.map(c=>'<tr><td>'+(c.row+1)+'</td><td>'+(c.column+1)+'</td><td>'+escape(c.name)+' × '+c.amount+'</td><td><div class="board-states">'+statuses(c)+'</div></td></tr>').join('')+'</tbody></table></div>':'<p class="board-normal-message">Không có ô Hidden, Frozen, chìa khóa hoặc nhóm liên kết trong cấu hình Board này.</p>';
   dialogBody.querySelector('.board-scroll').insertAdjacentHTML('afterend',locations);
   dialog.showModal();dialog.scrollTop=0;connectBoardLinks(b);
 }
 function openDetail(key,focus){
   const model=byKey.get(key);if(!model?.g)return;
   if(focus==='board'){openBoard(model);return;}
   document.querySelector('.level-dialog-header small').textContent='CHI TIẾT TỔNG SỐ KHÁCH';
   const l=model.level;document.querySelector('#level-customers-title').textContent=(model.g.name||l.map)+' · Cấu hình '+l.position+' · '+l.customers.length+' khách';
   const rows=l.customers.flatMap(c=>c.dishes.map((d,i)=>{
     const detail=dishDetail(model,d,i+1),customer=i===0?'<td rowspan="'+c.dishes.length+'"><b>Khách thứ '+c.sequence+'</b><br><small>'+('<span class="character-badge character-'+c.character_type.toLowerCase()+'">'+escape(c.character_type)+'</span><br>'+(c.character_index===null?'Chọn ngẫu nhiên trong nhóm Normal':escape(c.character_name)+' · Index '+c.character_index))+'</small><br><small>Chờ: '+(c.wait===0?'mặc định (0)':c.wait)+' · Hiệu ứng: '+c.weather+'</small></td>':'';
     return '<tr data-customer="'+c.sequence+'">'+customer+'<td>'+detail.food+'</td><td>'+detail.recipe+'</td></tr>';
   })).join('');
   dialogBody.innerHTML='<p class="detail-intro">Chi tiết từ cột <b>Tổng số khách</b>: '+l.customers.length+' lượt khách · '+model.dishCount+' món · '+model.parts.length+' phần thành phần theo đơn.</p>'+characterCounts(l)+'<p class="detail-intro">Loại nhân vật lấy từ CharacterType: Boss, Shipper hoặc Normal. Khách không chỉ định nhân vật được chọn từ nhóm Normal; chưa xác định danh tính cụ thể trước khi chạy level.</p><div class="scroll"><table class="customer-detail-table"><thead><tr><th>Khách & điều kiện</th><th>Món ăn</th><th>Thành phần & công thức</th></tr></thead><tbody>'+rows+'</tbody></table></div><section id="level-raw-gallery"><h3>Ảnh nguyên liệu gốc của level · '+model.raw.length+' loại</h3><p>Danh sách loại nguyên liệu gốc liên quan đến đơn hàng; không quy đổi thành số lần lấy hoặc số mẻ chế biến tối ưu.</p><div class="raw-gallery">'+model.raw.map(id=>rawChip(model,id)).join('')+'</div></section>';
   dialog.showModal();dialog.scrollTop=0;if(focus==='ingredients')document.querySelector('#level-raw-gallery').scrollIntoView({block:'start'});
 }
 document.querySelector('#level-customers-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 document.querySelector('#order-customers').addEventListener('click',event=>{const button=event.target.closest('.open-level');if(button)openDetail(button.dataset.key,button.dataset.focus);});
 function draw(){
   const pages=Math.max(1,Math.ceil(filtered.length/50));page=Math.max(0,Math.min(page,pages-1));
   document.querySelector('#order-customers').innerHTML='<div class="scroll"><table class="level-summary-table"><thead><tr><th>Map / level</th><th>Độ khó / thời tiết</th><th>Tổng số khách</th><th>Tổng số món</th><th>Tổng số nguyên liệu</th><th>Nguyên liệu gốc</th><th>Board</th><th>Tutorial</th></tr></thead><tbody>'+filtered.slice(page*50,(page+1)*50).map(rowHtml).join('')+'</tbody></table></div>';
   document.querySelector('#order-summary').innerHTML='<div class="order-stats"><span><b>'+filtered.length+'</b> level / cấu hình</span><span><b>'+filtered.reduce((n,m)=>n+(m.g?m.level.customers.length:0),0)+'</b> lượt khách có đơn</span><span><b>'+filtered.reduce((n,m)=>n+m.dishCount,0)+'</b> món có đơn</span></div>';
   pageLabel.textContent='Trang '+(page+1)+' / '+pages+' · '+filtered.length+' level';prev.disabled=page===0;next.disabled=page>=pages-1;
 }
 function filter(){const query=normalize(search.value.trim());filtered=models.filter(m=>(mapSelect.value==='all'||m.level.map===mapSelect.value)&&(levelSelect.value==='all'||m.level.index===Number(levelSelect.value))&&(!query||m.search.includes(query)));page=0;draw();}
 function selectMap(){levelSelect.replaceChildren(new Option('Tất cả cấu hình','all'));const indexes=[...new Set(models.filter(m=>mapSelect.value==='all'||m.level.map===mapSelect.value).map(m=>m.level.index))].sort((a,b)=>a-b);indexes.forEach(index=>levelSelect.add(new Option('Cấu hình '+(index+1)+' (Index '+index+')',String(index))));filter();}
 mapSelect.add(new Option('Tất cả map','all'));[...new Set(models.map(m=>m.level.map))].forEach(key=>mapSelect.add(new Option(D.graphs[key]?.name||key,key)));
 mapSelect.addEventListener('change',selectMap);levelSelect.addEventListener('change',filter);search.addEventListener('input',filter);prev.addEventListener('click',()=>{page--;draw()});next.addEventListener('click',()=>{page++;draw()});selectMap();
})();
