(() => {
  const $=id=>document.getElementById(id);
  let key='', snapshot=null, busy=false, generation=0;
  const date=value=>new Date(value).toLocaleString();
  function rows(id,items,width) {
    const body=$(id);body.replaceChildren();
    if(!items.length) items=[['No matching records yet.']];
    for(const values of items){const tr=document.createElement('tr');for(const value of values){const td=document.createElement('td');td.textContent=value??'—';tr.append(td);}if(values.length===1)tr.firstChild.colSpan=width;body.append(tr);}
  }
  function render(){
    if(!snapshot)return;
    const q=$('search').value.toLowerCase(), source=$('source').value;
    const matches=r=>JSON.stringify(r).toLowerCase().includes(q);
    const filter=r=>matches(r)&&(!source||r.source===source);
    const sessions=snapshot.sessions.filter(filter).sort((a,b)=>b.lastSeen-a.lastSeen), visits=snapshot.visits.filter(filter);
    $('players').textContent=new Set(sessions.filter(s=>s.status==='active'&&s.player).map(s=>s.player)).size;
    $('sessions').textContent=sessions.filter(s=>s.status!=='offline').length;
    $('ips').textContent=new Set(visits.map(v=>v.ip)).size;
    $('views').textContent=visits.reduce((n,v)=>n+v.views,0);
    rows('sessionRows',sessions.map(s=>[s.player||'No player selected',s.status,s.path,s.level||'Not reported',s.ip,s.source,Math.round(s.activeMs/60000)+' min',date(s.lastSeen)]),8);
    rows('progressRows',snapshot.progress.filter(matches).map(s=>[s.player,s.game,s.revision,s.stats.map(x=>x.field+': '+x.value).join(' · ')||'Save present; no summarized fields']),4);
    rows('visitRows',visits.map(v=>[v.player||'Visitor / login',v.ip,v.source,v.path,v.views,date(v.firstSeen),date(v.lastSeen)]),7);
  }
  async function refresh(){
    if(!key||busy)return;busy=true;const current=generation;
    try{const r=await fetch('/api/monitoring',{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(10000)});const data=await r.json();if(current!==generation)return;if(!r.ok)throw Error(data.error||'Unable to read monitoring');snapshot=data;$('data').hidden=false;$('lock').hidden=false;$('status').textContent=(data.storageError?data.storageError+' ':'')+'Updated '+date(data.now)+' · Refreshes every 15 seconds';render();}
    catch(e){if(current===generation){$('status').textContent=e.message+' · Displayed data may be stale.';}}
    finally{busy=false;}
  }
  $('login').addEventListener('submit',e=>{e.preventDefault();generation++;key=$('key').value;$('key').value='';snapshot=null;$('data').hidden=true;refresh();});
  $('lock').onclick=()=>{generation++;key='';snapshot=null;$('data').hidden=true;$('lock').hidden=true;for(const id of ['sessionRows','progressRows','visitRows'])$(id).replaceChildren();$('status').textContent='Dashboard locked.';};
  $('search').oninput=render;$('source').onchange=render;$('refresh').onclick=refresh;
  setInterval(()=>{if(!document.hidden)refresh();},15000);
})();
