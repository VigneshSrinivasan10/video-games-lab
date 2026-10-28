(async()=>{'use strict';
const list=await fetch('cities.json').then(r=>{if(!r.ok)throw Error('Atlas unavailable');return r.json();});
const berlin={id:'berlin',name:'Berlin',country:'Germany',flag:'🇩🇪',landmarks:[{name:'Brandenburg Gate'},{name:'Oberbaumbrücke'},{name:'Molecule Man'}],googleMaps:'https://www.google.com/maps/@52.512,13.402,13z'};
const colors=['#b9d9dd','#c7d7c0','#e2d3bd','#c4dce2','#d8d0db'];
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function art(c,i){const dark='#416b70',light='#6e9590';let landmark='';
if(c.id==='paris')landmark='<path d="M140 135L175 20L210 135M153 90H197M163 60H187M145 120H205M153 90L197 120M197 90L153 120" fill="none" stroke="#416b70" stroke-width="5"/>';
else if(c.id==='london')landmark='<circle cx="208" cy="73" r="45" fill="none" stroke="#416b70" stroke-width="3"/><path d="M208 73L187 135M208 73L229 135M208 28V118M163 73H253M176 41L240 105M240 41L176 105" fill="none" stroke="#416b70" stroke-width="2"/><path d="M101 135V57H126V135M99 57L113 30L128 57" fill="#416b70"/><circle cx="113" cy="68" r="7" fill="#edf3dd"/>';
else if(c.id==='rome')landmark='<ellipse cx="175" cy="70" rx="75" ry="23" fill="#416b70"/><path d="M100 70V120Q175 153 250 120V70Q175 105 100 70" fill="#6e9590"/>'+Array.from({length:11},(_,j)=>`<path d="M${110+j*13} 119v-16q4-9 8 0v16z" fill="#416b70"/>`).join('');
else if(c.id==='barcelona')landmark=Array.from({length:7},(_,j)=>`<path d="M${119+j*17} 135V${63+Math.abs(3-j)*11}l5-25 5 25v72" fill="#416b70"/>`).join('');
else if(c.id==='bengaluru')landmark='<path d="M85 136V85H265V136M112 85V66H135V85M215 85V66H238V85M151 85V59H199V85M154 59A21 21 0 0 1 196 59M174 37V22" fill="#416b70"/>'+[100,120,140,160,180,200,220,240].map(x=>`<path d="M${x} 97h8v32h-8z" fill="#d8e6cc"/>`).join('');
else if(['venice','amsterdam','prague','budapest'].includes(c.id))landmark='<path d="M95 121Q175 69 255 121V136H237Q175 96 113 136H95Z" fill="#416b70"/><path d="M137 110V50H153V104M135 50L145 30L155 50M209 110V50H225V119M207 50L217 30L227 50" fill="#416b70"/>';
else landmark='<path d="M112 136V85H238V136M106 85L175 51L244 85M147 68V58A28 28 0 0 1 203 58V68M173 30V15" fill="#416b70"/>'+[123,145,167,189,211].map(x=>`<path d="M${x} 96h9v40h-9z" fill="#b6cdc0"/>`).join('');
return `<svg viewBox="0 0 350 145" aria-hidden="true"><circle cx="275" cy="35" r="21" fill="#fff3c9"/><path d="M0 125V99H26V83H53V110H78V90H98V131H268V100H285V81H312V108H334V94H350V145H0" fill="${light}" opacity=".6"/>${landmark}<path d="M0 136Q80 126 160 139T350 134V145H0" fill="${dark}" opacity=".5"/><path d="M43 43l22-7-9 9 17 4-4 4-19-4-7 8-4-1 4-10-10-4 4-3z" fill="#fff9e8"/></svg>`;}
const cities=[...list,berlin];document.querySelector('#cities').innerHTML=cities.map((c,i)=>`<article class="card" style="--sky:${colors[i%colors.length]}"><a class="fly" href="${c.id==='berlin'?'../berlin-city-flight.html':'game.html?city='+c.id}" data-city="${c.id}"><div class="art">${art(c,i)}<span class="flag">${c.flag}</span><span class="count">${c.id==='berlin'?25:c.landmarks.length} golden hoops</span></div><div class="info"><span class="country">${c.country}</span><h2>${c.name}</h2><p class="landmarks">${(c.highlights||c.landmarks.slice(0,3).map(l=>l.name)).map(esc).join(' · ')}</p><span class="go">Let’s fly ↗</span></div></a><div class="bottom"><span>${c.id==='berlin'?'The original city tour':c.routeKm.toFixed(1)+' km sightseeing tour'}</span><a class="map" href="${c.googleMaps}" target="_blank" rel="noopener" aria-label="View ${c.name} on Google Maps">Google Maps ↗</a></div></article>`).join('');
const links=[...document.querySelectorAll('.fly')];
let returning=new URLSearchParams(location.search).has('from')||/\/(?:world-flight\/game|berlin-city-flight)\.html(?:[?#]|$)/.test(document.referrer);
let focus=Math.max(0,links.findIndex(a=>a.dataset.city===sessionStorage.getItem('flight-city'))),last=0,padReady=false,neutralSince=null,selectionArmed=!returning,leaving=false;
const prompt=document.createElement('p');prompt.id='city-selection-hint';prompt.setAttribute('role','status');document.querySelector('#cities').before(prompt);
function hint(){prompt.textContent=selectionArmed?'Press A to fly to '+links[focus].querySelector('h2').textContent+'.':'Use a direction to choose your next city, then press A. You can also click a city.';}
function resetEntry(){padReady=false;neutralSince=null;selectionArmed=false;leaving=false;links.forEach(a=>a.classList.remove('focus'));hint();document.querySelector('h1').tabIndex=-1;document.querySelector('h1').focus({preventScroll:true});}
addEventListener('pageshow',e=>{if(e.persisted)resetEntry();});
function select(n,scroll=true){focus=Math.max(0,Math.min(links.length-1,n));selectionArmed=true;links.forEach((a,i)=>a.classList.toggle('focus',i===focus));links[focus].focus({preventScroll:true});if(scroll)links[focus].scrollIntoView({block:'nearest',behavior:'smooth'});hint();}
function move(direction){const columns=getComputedStyle(document.querySelector('.grid')).gridTemplateColumns.split(' ').length;select(focus+(direction==='left'?-1:direction==='right'?1:direction==='up'?-columns:columns));}
links.forEach((a,i)=>{a.addEventListener('focus',()=>{focus=i;selectionArmed=true;links.forEach((b,j)=>b.classList.toggle('focus',i===j));hint();});a.addEventListener('click',e=>{if(leaving){e.preventDefault();return;}leaving=true;sessionStorage.setItem('flight-city',a.dataset.city);});});
addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')){e.preventDefault();move(e.key.slice(5).toLowerCase());}if(e.code==='Space'||e.key==='Enter'){if(e.target.closest?.('a:not(.fly)'))return;e.preventDefault();if(!e.repeat&&selectionArmed&&!leaving)links[focus].click();}if(e.key==='Escape')location.href='../index.html';});
function frame(t){for(const p of GamepadStd.read('city-atlas')){if(p.index!==0||leaving)continue;
 if(!padReady){if(p.A||p.B||p.left||p.right||p.up||p.down)neutralSince=null;else{neutralSince??=t;if(t-neutralSince>=250)padReady=true;}continue;}
 if(p.just.A&&selectionArmed){links[focus].click();continue;}if(p.just.B){location.href='../index.html';continue;}
 const dir=['left','right','up','down'].find(d=>p[d]);if(dir&&(p.just[dir]||t-last>220)){move(dir);last=t;}
 }requestAnimationFrame(frame);}
if(returning){resetEntry();links[focus].scrollIntoView({block:'nearest'});}else select(focus,false);
requestAnimationFrame(frame);
})().catch(e=>{document.querySelector('#cities').textContent='The atlas could not open. Please reload to try again.';console.error(e);});
