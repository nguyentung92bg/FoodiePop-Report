(()=>{
 const D=window.FoodieOrders;if(!D)return;
 const mapSelect=document.querySelector('#order-map'),levelSelect=document.querySelector('#order-level');if(!mapSelect)return;
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const name=(g,id)=>g.nodes[id]?.name||id;
 const nodeId=(g,node)=>g.tables[{i:'ingredient',c:'composite',g:'group'}[node[0]]][node[1]];
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
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
   row.search=normalize([level.map,level.position,level.index,...words,...parts.map(id=>name(g,id)),...raw.map(id=>name(g,id)),meta?.tutId||'',meta?difficulty[meta.difficultyTag]:'',meta?weather[meta.weatherEffect]:''].join(' '));models.push(row);keys.add(row.key);
 }
 for(const [key,meta] of metadata){if(!keys.has(key))models.push({key,level:{map:meta.map,index:meta.index,position:meta.position,customers:[]},meta,dishCount:0,parts:[],raw:[],search:normalize(meta.map+' '+meta.position+' chưa có đơn hàng')});}
 const byKey=new Map(models.map(m=>[m.key,m])),search=document.querySelector('#order-search'),prev=document.querySelector('#order-prev'),next=document.querySelector('#order-next'),pageLabel=document.querySelector('#order-page');
 const dialog=document.querySelector('#level-customers-dialog'),dialogBody=document.querySelector('#level-customers-body');
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
   const customers=hasOrders?openButton(model,'<b class="total-number">'+customerCount+'</b><span>Xem từng khách, món & công thức ↗</span>','customer-count')+(m&&m.numCustomers!==customerCount?'<small>Mô tả level: '+m.numCustomers+' khách</small>':''):'<b class="total-number">'+customerCount+'</b><small>Theo mô tả; chưa có đơn</small>';
   const dishes=hasOrders?'<b class="total-number">'+model.dishCount+'</b><small>Theo đơn hàng</small>'+(m&&m.numDishs!==model.dishCount?'<small>Mô tả: '+m.numDishs+'</small>':''):'<b class="total-number">'+m.numDishs+'</b><small>Theo mô tả</small>';
   const ingredientTotal=m?'<b class="total-number">'+m.numIngredients+'</b><small>Theo mô tả level</small>':'<b class="total-number">'+model.parts.length+'</b><small>Phần thành phần theo đơn; chưa có tổng mô tả</small>';
   const breakdown=hasOrders?'<div class="ingredient-breakdown" data-total="'+model.parts.length+'"><small class="breakdown-caption">Theo đơn: '+model.parts.length+' phần · '+counts(model.parts).length+' loại</small><ul>'+counts(model.parts).sort((a,b)=>b[1]-a[1]).map(([id,n])=>{
     const image=D.ingredient_images?.[l.map]?.[id];
     return '<li data-ingredient="'+escape(id)+'" data-quantity="'+n+'">'+(image?'<img src="../'+escape(image)+'" alt="" width="26" height="26" loading="lazy">':'<span class="ingredient-image-space"></span>')+'<span>'+escape(name(g,id))+'</span><b>× '+n+'</b></li>';
   }).join('')+'</ul><small>Thành phần ở trạng thái đơn yêu cầu; có thể đã sơ chế.</small></div>':'<small>Chưa có đơn hàng để thống kê từng loại.</small>';
   const ingredients=ingredientTotal+breakdown;
   const raw=hasOrders?openButton(model,'<div class="raw-preview">'+model.raw.slice(0,4).map(id=>rawChip(model,id,true)).join('')+'</div><span>'+model.raw.length+' loại · xem ảnh chi tiết</span>','raw-count','ingredients'):'<small>Chưa có dữ liệu</small>';
   return '<tr data-level-key="'+escape(model.key)+'"'+(!hasOrders?' class="metadata-only"':'')+'><td>'+levelCell+'</td><td>'+environment+'</td><td class="total-customers">'+customers+'</td><td>'+dishes+'</td><td>'+ingredients+'</td><td>'+raw+'</td><td>'+escape(m?.tutId||'—')+'</td></tr>';
 }
 function dishDetail(model,d,index){
   const g=model.g,id=nodeId(g,d.root),parts=leaves(g,d.root),raw=[...new Set(parts.flatMap(p=>rawInputs(g,p)))],image=D.images?.[model.level.map]?.[id];
   const food='<div class="food-identity">'+(image?'<img class="dish-thumb" src="../'+escape(image)+'" alt="Ảnh đại diện '+escape(name(g,id))+'" width="76" height="76" loading="lazy">':'')+'<div><b>'+escape(name(g,id))+'</b><br><small>Món '+index+' · 1 phần</small></div></div>';
   const recipe='<div class="ingredient-line">'+componentList(g,parts)+'</div><details class="dish-detail"><summary>Xem ảnh nguyên liệu gốc & cách chế biến</summary><div class="dish-body"><div class="raw-gallery">'+raw.map(r=>rawChip(model,r)).join('')+'</div>'+counts(parts).map(([p,n])=>'<p class="recipe-step"><b>'+escape(name(g,p))+' ×'+n+':</b><br>'+chain(g,p)+'</p>').join('')+'<p class="recipe-caption">Số sau đầu ra là số phần mỗi lần chế biến; không phải tổng lượng nguyên liệu thô cần lấy.</p></div></details>';
   return {food,recipe};
 }
 function openDetail(key,focus){
   const model=byKey.get(key);if(!model?.g)return;
   const l=model.level;document.querySelector('#level-customers-title').textContent=(model.g.name||l.map)+' · Cấu hình '+l.position+' · '+l.customers.length+' khách';
   const rows=l.customers.flatMap(c=>c.dishes.map((d,i)=>{
     const detail=dishDetail(model,d,i+1),customer=i===0?'<td rowspan="'+c.dishes.length+'"><b>Khách thứ '+c.sequence+'</b><br><small>'+(c.character_index===null?'Không chỉ định nhân vật':'Chỉ số nhân vật: '+c.character_index+' · chưa xác nhận tên')+'</small><br><small>Chờ: '+(c.wait===0?'mặc định (0)':c.wait)+' · Hiệu ứng: '+c.weather+'</small></td>':'';
     return '<tr data-customer="'+c.sequence+'">'+customer+'<td>'+detail.food+'</td><td>'+detail.recipe+'</td></tr>';
   })).join('');
   dialogBody.innerHTML='<p class="detail-intro">Chi tiết từ cột <b>Tổng số khách</b>: '+l.customers.length+' lượt khách · '+model.dishCount+' món · '+model.parts.length+' phần thành phần theo đơn.</p><div class="scroll"><table class="customer-detail-table"><thead><tr><th>Khách & điều kiện</th><th>Món ăn</th><th>Thành phần & công thức</th></tr></thead><tbody>'+rows+'</tbody></table></div><section id="level-raw-gallery"><h3>Ảnh nguyên liệu gốc của level · '+model.raw.length+' loại</h3><p>Danh sách loại nguyên liệu gốc liên quan đến đơn hàng; không quy đổi thành số lần lấy hoặc số mẻ chế biến tối ưu.</p><div class="raw-gallery">'+model.raw.map(id=>rawChip(model,id)).join('')+'</div></section>';
   dialog.showModal();dialog.scrollTop=0;if(focus==='ingredients')document.querySelector('#level-raw-gallery').scrollIntoView({block:'start'});
 }
 document.querySelector('#level-customers-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 document.querySelector('#order-customers').addEventListener('click',event=>{const button=event.target.closest('.open-level');if(button)openDetail(button.dataset.key,button.dataset.focus);});
 function draw(){
   const pages=Math.max(1,Math.ceil(filtered.length/50));page=Math.max(0,Math.min(page,pages-1));
   document.querySelector('#order-customers').innerHTML='<div class="scroll"><table class="level-summary-table"><thead><tr><th>Map / level</th><th>Độ khó / thời tiết</th><th>Tổng số khách</th><th>Tổng số món</th><th>Tổng số nguyên liệu</th><th>Nguyên liệu gốc</th><th>Tutorial</th></tr></thead><tbody>'+filtered.slice(page*50,(page+1)*50).map(rowHtml).join('')+'</tbody></table></div>';
   document.querySelector('#order-summary').innerHTML='<div class="order-stats"><span><b>'+filtered.length+'</b> level / cấu hình</span><span><b>'+filtered.reduce((n,m)=>n+(m.g?m.level.customers.length:0),0)+'</b> lượt khách có đơn</span><span><b>'+filtered.reduce((n,m)=>n+m.dishCount,0)+'</b> món có đơn</span></div>';
   pageLabel.textContent='Trang '+(page+1)+' / '+pages+' · '+filtered.length+' level';prev.disabled=page===0;next.disabled=page>=pages-1;
 }
 function filter(){const query=normalize(search.value.trim());filtered=models.filter(m=>(mapSelect.value==='all'||m.level.map===mapSelect.value)&&(levelSelect.value==='all'||m.level.index===Number(levelSelect.value))&&(!query||m.search.includes(query)));page=0;draw();}
 function selectMap(){levelSelect.replaceChildren(new Option('Tất cả cấu hình','all'));const indexes=[...new Set(models.filter(m=>mapSelect.value==='all'||m.level.map===mapSelect.value).map(m=>m.level.index))].sort((a,b)=>a-b);indexes.forEach(index=>levelSelect.add(new Option('Cấu hình '+(index+1)+' (Index '+index+')',String(index))));filter();}
 mapSelect.add(new Option('Tất cả map','all'));[...new Set(models.map(m=>m.level.map))].forEach(key=>mapSelect.add(new Option(D.graphs[key]?.name||key,key)));
 mapSelect.addEventListener('change',selectMap);levelSelect.addEventListener('change',filter);search.addEventListener('input',filter);prev.addEventListener('click',()=>{page--;draw()});next.addEventListener('click',()=>{page++;draw()});selectMap();
})();
