/* Presence is approximate: visible game tab, not proof of keyboard activity. */
(() => {
  if(window.ArcadeMonitor || location.pathname.startsWith('/monitor')) return;
  const id=crypto.randomUUID();
  let level=null, busy=false;
  window.ArcadeMonitor={level(value){level=String(value).slice(0,120);}};
  async function beat() {
    if(busy) return;busy=true;
    try { await fetch('/api/monitoring/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,path:location.pathname,level,visible:!document.hidden}),keepalive:true}); } catch {} finally {busy=false;}
  }
  setInterval(beat,15000);
  document.addEventListener('visibilitychange',beat);
  addEventListener('pagehide',()=>{navigator.sendBeacon('/api/monitoring/heartbeat',new Blob([JSON.stringify({id,path:location.pathname,level,visible:false})],{type:'application/json'}));});
  beat();
})();
