// Offline table search and pagination. Text matching never executes input as HTML.
document.querySelectorAll('.data-table').forEach(section=>{
  const input=section.querySelector('.search');if(!input)return;
  const rows=[...section.querySelectorAll('tbody tr')],count=section.querySelector('.result-count'),label=section.querySelector('.page-count'),prev=section.querySelector('.prev'),next=section.querySelector('.next');
  const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
  const values=rows.map(row=>normalize(row.textContent));let page=0,matches=rows;
  function draw(){const pages=Math.max(1,Math.ceil(matches.length/50));page=Math.max(0,Math.min(page,pages-1));rows.forEach(row=>row.hidden=true);matches.slice(page*50,(page+1)*50).forEach(row=>row.hidden=false);count.textContent=`${matches.length} / ${rows.length} bản ghi`;label.textContent=`Trang ${page+1} / ${pages}`;prev.disabled=page===0;next.disabled=page>=pages-1;}
  input.addEventListener('input',()=>{const query=normalize(input.value.trim());matches=rows.filter((row,i)=>values[i].includes(query));page=0;draw()});prev.addEventListener('click',()=>{page--;draw()});next.addEventListener('click',()=>{page++;draw()});draw();
});
