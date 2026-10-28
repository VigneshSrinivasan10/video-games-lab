(() => {
  const $=id=>document.getElementById(id), paths={chess:'chess-quest.html',kitchen:'kitchen-pals.html'};
  document.addEventListener('focusin',e=>{document.querySelectorAll('.selected').forEach(n=>n.classList.remove('selected'));if(e.target.matches('button,a,input'))e.target.classList.add('selected');});
  const names={chess:'Chess Quest',kitchen:'Kitchen Pals'};
  let room=null,events=null,adapter=null,presence={host:false,guest:false},lastEvent=0,lastInput=0,lastState=null,busy=false,actions=[],keys={},padKeys={},touchKeys={},previous={},started=false,lastTick=0,closed=false;
  const R=window.FamilyRoom={role:null,game:null,ready:false,remote:{},remoteAt:0,
    register(a){adapter=a; a.start();started=true;a.connection(R.ready);if(lastState && R.role==='guest')a.apply(lastState);announceReady();if(R.ready)$('game').contentWindow.focus();else $('leaveWait').focus();},
    sendAction(name){actions.push(name);}, get adapter(){return adapter;},
    get remoteFresh(){return performance.now()-R.remoteAt<700;}
  };
  async function api(path,data,token) {
    const r=await fetch(path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{'X-Room-Token':token}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(6000)});
    const v=await r.json(); if(!r.ok){if(r.status===401)location.href='/login?next='+encodeURIComponent(location.pathname+location.search);throw new Error(v.error||'Connection trouble');}return v;
  }
  function announceReady(){if(adapter&&room)api(`/api/rooms/${room.id}/message`,{type:'ready'},room.token).catch(()=>{events?.close();setTimeout(stream,1000);});}
  function connected() {
    const ready=presence.host && presence.guest && performance.now()-lastEvent<15000;
    if(R.ready!==ready){R.ready=ready;adapter?.connection(ready);if(ready)$('game').contentWindow.focus();else {keys={};touchKeys={};previous={};actions=[];$('leaveWait').focus();}}
    $('waiting').classList.toggle('hidden',!!ready);
    $('status').textContent=room ? `${names[room.game]} · Door ${room.door} · You are ${room.role==='host'?'Player 1':'Player 2'} · ${ready?'Together!':'Waiting…'}`:'';
    if(room?.role==='guest') { $('waitTitle').textContent='Waiting for the host';$('waitText').textContent='The game pauses while we reconnect. Keep this page open.'; }
    else if(started && presence.guest===false){$('waitTitle').textContent='Waiting for family';$('waitText').textContent='Your family can choose this game and join your door. If disconnected, reload their game to reconnect.';}
  }
  function stream() {
    if(closed)return;
    events?.close();
    events=new EventSource(`/api/rooms/${room.id}/events?token=${room.token}`);
    events.onopen=()=>{lastEvent=performance.now();announceReady();};
    events.onmessage=e=>{
      lastEvent=performance.now();const v=JSON.parse(e.data);
      if(v.type==='presence'){presence=v;connected();}
      if(v.type==='state'){lastState=v.data;if(room.role==='guest')adapter?.apply(v.data);}
      if(v.type==='input' && room.role==='host'){R.remote=v.data||{};R.remoteAt=performance.now();adapter?.input(R.remote);}
      if(v.type==='action')adapter?.action(v.data);
      if(v.type==='ping')connected();
      if(v.type==='closed'){closed=true;events.close();presence={host:false,guest:false};connected();$('waitTitle').textContent='The host left';$('waitText').textContent='Go back to the arcade to start another room.';}
    };
    events.onerror=()=>{presence={host:false,guest:false};connected();};
  }
  async function enter(info) {
    room=info; R.role=room.role;R.game=room.game;
    document.body.dataset.game=room.game;
    for(const b of document.querySelectorAll('#touch [data-key]')){
      b.hidden=(b.dataset.key==='X'&&['orchard','pip','cheese','kitchen'].includes(room.game))||(room.game==='orchard'&&['up','down'].includes(b.dataset.key));
      b.setAttribute('aria-label',({left:'Move left',right:'Move right',up:'Move up',down:'Move down',B:'Pause or back',A:room.game==='pip'?'Dash or continue':room.game==='kitchen'?'Cook or continue':'Confirm or continue',X:'Second action'})[b.dataset.key]);
    }
    sessionStorage.setItem('family-room:'+room.id,room.token);
    history.replaceState(null,'','?room='+room.id);
    $('lobby').style.display='none';$('session').style.display='grid';
    $('waitingDoor').textContent=room.door;
    $('leaveWait').focus();
    stream();
    $('game').style.pointerEvents=room.role==='guest'?'none':'auto';
    $('game').src=paths[room.game]+'?family=1';connected();
  }
  async function join(id) {
    try {if(!/^[a-f0-9]{12}$/.test(id))throw new Error('This door has closed. Choose another door.');await enter(await api('/api/rooms/'+id+'/join',{token:sessionStorage.getItem('family-room:'+id)}));}
    catch(e){$('error').textContent=e.message;}
  }
  let selectedGame=null,listing=false,entering=false;
  async function refreshDoors(focus=false){
    if(!selectedGame||room||listing)return;
    const game=selectedGame;listing=true;
    try{
      const data=await api('/api/rooms?game='+encodeURIComponent(game));
      if(room||selectedGame!==game)return;
      const list=$('doorList'),old=document.activeElement,oldID=old?.dataset.room;
      const signature=JSON.stringify(data.rooms);
      if(list.dataset.signature!==signature){
        list.dataset.signature=signature;list.replaceChildren();
        for(const r of data.rooms){
          const b=document.createElement('button');b.className='doorButton';b.dataset.room=r.id;
          const picture=document.createElement('span');picture.className='doorPicture';picture.textContent=r.door;
          const label=document.createElement('small');label.textContent='👋 Join Door '+r.door;
          b.append(picture,label);b.onclick=()=>joinDoor(r.id);list.append(b);
        }
        if(oldID) (list.querySelector(`[data-room="${oldID}"]`)||list.firstElementChild||$('createDoor')).focus();
      }
      $('doorHint').textContent=data.rooms.length?'Someone is waiting! Choose their door.':'No one is waiting yet. Open a door for your family!';
      $('error').textContent='';
      if(focus)(list.firstElementChild||$('createDoor')).focus();
    }catch(e){$('error').textContent=e.message;}finally{listing=false;}
  }
  async function joinDoor(id){if(entering)return;entering=true;try{await join(id);}finally{entering=false;}}
  function chooseGame(game){selectedGame=game;$('games').hidden=true;$('doors').hidden=false;$('doorTitle').textContent=names[game];$('doorList').replaceChildren();delete $('doorList').dataset.signature;$('doorHint').textContent='Looking for family…';$('createDoor').focus();refreshDoors(true);}
  function back(){
    if(!room&&selectedGame){const game=selectedGame;selectedGame=null;$('doors').hidden=true;$('games').hidden=false;$('error').textContent='';document.querySelector(`[data-game="${game}"]`).focus();}
    else leave();
  }
  document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>chooseGame(b.dataset.game));
  $('backGames').onclick=back;
  $('createDoor').onclick=async()=>{if(entering||!selectedGame)return;entering=true;try{await enter(await api('/api/rooms',{game:selectedGame}));}catch(e){$('error').textContent=e.message;}finally{entering=false;}};
  setInterval(()=>refreshDoors(),2000);
  async function leave(){if(room)try{await api('/api/rooms/'+room.id+'/leave',{},room.token);}catch{}location.href='index.html';}
  $('leave').onclick=$('leaveWait').onclick=leave;
  window.addEventListener('arcade-exit',()=>{if(room)navigator.sendBeacon(`/api/rooms/${room.id}/leave?token=${room.token}`,'');});
  const keyMap={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Space:'A',Enter:'A',Escape:'B',KeyP:'start',KeyX:'X',ShiftLeft:'X',ShiftRight:'X'};
  function keyboard(e,down,child=false){
    if(e.target.tagName==='INPUT')return;
    if(!room || !R.ready){if(down){const list=[...(room?$('waiting'):$('lobby')).querySelectorAll('button,a,input')].filter(b=>b.offsetParent!==null);let i=list.indexOf(document.activeElement);if(e.code.startsWith('Arrow')){list[(i+(e.code==='ArrowLeft'||e.code==='ArrowUp'?-1:1)+list.length)%list.length]?.focus();e.preventDefault();}else if(e.code==='Escape'){e.preventDefault();back();}else if(e.code==='Space'||e.code==='Enter'){e.preventDefault();document.activeElement?.click();}}return;}
    const key=keyMap[e.code]; if(!key)return;
    if(room.role==='guest'){keys[key]=down;e.preventDefault();e.stopImmediatePropagation();adapter?.unlock?.();}
    else if(!child && !['BUTTON','A'].includes(e.target.tagName)){
      const w=$('game').contentWindow;w.dispatchEvent(new w.KeyboardEvent(down?'keydown':'keyup',{code:e.code,key:e.key,bubbles:true}));e.preventDefault();
    }
  }
  window.addEventListener('keydown',e=>keyboard(e,true));window.addEventListener('keyup',e=>keyboard(e,false));
  $('game').onload=()=>{
    const w=$('game').contentWindow;
    if(!w.location.search.includes('family=1')){leave();return;}
    w.addEventListener('keydown',e=>keyboard(e,true,true),true);w.addEventListener('keyup',e=>keyboard(e,false,true),true);
    w.addEventListener('blur',()=>{keys={};});
  };
  window.addEventListener('blur',()=>{keys={};touchKeys={};});
  document.addEventListener('visibilitychange',()=>{keys={};touchKeys={};if(document.hidden && room)actions.push('pause');});
  if(matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');
  window.addEventListener('touchstart',()=>document.body.classList.add('touch'),{once:true});
  document.querySelectorAll('[data-key]').forEach(b=>{
    const sendTouch=down=>{if(room?.role==='host'&&R.ready){const w=$('game').contentWindow;const code=Object.keys(keyMap).find(k=>keyMap[k]===b.dataset.key);if(code)w.dispatchEvent(new w.KeyboardEvent(down?'keydown':'keyup',{code,key:code==='Space'?' ':code==='Escape'?'Escape':code,bubbles:true}));}};
    b.onpointerdown=e=>{sendTouch(true);e.preventDefault();b.setPointerCapture(e.pointerId);touchKeys[b.dataset.key]=true;adapter?.unlock?.();};
    b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>{sendTouch(false);touchKeys[b.dataset.key]=false;};
  });
  // The guest iframe stays read-only; forward counter taps through the room adapter.
  document.addEventListener('pointerdown',e=>{
    if(room?.game!=='kitchen'||room.role!=='guest'||!R.ready)return;
    const r=$('game').getBoundingClientRect();
    if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)adapter?.pointer?.(e.clientX-r.left,e.clientY-r.top);
  });
  let repeatAt=0;
  function frame(now){
    requestAnimationFrame(frame);
    const pads=GamepadStd.read('family'); const p=pads[0];
    if(p?.any)adapter?.unlock?.();
    if(!room || !R.ready){if(p){const nav=GamepadStd.navRepeat(p,'family');for(const k of ['left','right','up','down'])if(nav[k])keyboard({code:'Arrow'+k[0].toUpperCase()+k.slice(1),target:document.body,preventDefault(){}},true);if(p.just.A)document.activeElement?.click();if(p.just.B)back();}return;}
    if(room.role==='guest'){
      padKeys=p||{};const input={};for(const k of ['left','right','up','down','A','B','X','Y','start'])input[k]=!!(keys[k]||padKeys[k]||touchKeys[k]);
      if(input.B&&!previous.B)actions.unshift('B');if(input.start&&!previous.start)actions.unshift('start');
      if(input.A&&!previous.A)actions.push('A');if(input.X&&!previous.X)actions.push('X');
      const needsNav=room.game==='chess'||(room.game==='rocket'&&lastState?.menu)||(room.game==='volleyball'&&lastState?.paused)||(['orchard','pip','cheese','kitchen'].includes(room.game)&&lastState?.menu);
      if(needsNav)for(const k of ['left','right','up','down'])if(input[k] && (!previous[k]||now>repeatAt)){if(!actions.includes(k))actions.push(k);repeatAt=now+(previous[k]?140:350);}
      previous=input; R.local=input;
    }
    if(now-lastTick<50)return;lastTick=now;
    // The host also detects a stale input stream even when the SSE connection survives.
    if(room.role==='host' && !R.remoteFresh) adapter?.input({});
    connected();
    if(!adapter || busy)return;
    let payload;
    if(actions.length){const action=actions.shift();if(room.role==='host'){adapter.action(action);return;}payload={type:'action',data:action};}
    else if(room.role==='host')payload={type:'state',data:adapter.snapshot()};
    else {payload={type:'input',data:R.local||{}};lastInput=now;}
    busy=true;api(`/api/rooms/${room.id}/message`,payload,room.token).catch(()=>{presence={host:false,guest:false};connected();events?.close();setTimeout(stream,1000);}).finally(()=>busy=false);
  }
  requestAnimationFrame(frame);
  const id=new URLSearchParams(location.search).get('room');if(id)joinDoor(id);else document.querySelector('[data-game]').focus();
})();
