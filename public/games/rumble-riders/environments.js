/* Separate places and terrain profiles; all artwork is cached Canvas drawing. */
(() => {
const environments = [
 {name:'Harbor Sprint',icon:'⚓',sky:['#76b9d0','#e7e1bf'],hills:['#9aafb0','#719391'],ground:['#aeb799','#8a9c78'],road:['#84938f','#415863'],water:true,prop:'harbor',hill:9,wave:630,curve:.0021,width:1},
 {name:'Vineyard Climb',icon:'🍇',sky:['#8dbbd0','#f4e0b2'],hills:['#a5ad7e','#78915c'],ground:['#9dad68','#8b9c50'],road:['#99917c','#68624e'],prop:'vineyard',hill:48,wave:410,curve:.0032,width:.93},
 {name:'Marsh Causeway',icon:'🌧',sky:['#718f9b','#bdccca'],hills:['#8baba1','#608779'],ground:['#849e7b','#628665'],road:['#829391','#435b62'],water:true,prop:'reeds',hill:16,wave:480,curve:.0028,width:.88},
 {name:'Quarry Rollers',icon:'🪨',sky:['#7fb3c9','#edd2af'],hills:['#c6a58e','#ad8269'],ground:['#c5a57d','#b78c61'],road:['#bd956d','#8b664b'],prop:'rock',hill:35,wave:190,curve:.0024,width:1.02,decks:[[1150,1650,22],[4100,4620,25]]},
 {name:'Windmill Ridge',icon:'🌬',sky:['#7ebace','#e2e4cd'],hills:['#a3b69e','#6c957e'],ground:['#a3b67e','#759b67'],road:['#9b9c8b','#596b62'],prop:'turbine',hill:60,wave:530,curve:.002,width:.96},
 {name:'City Dash',icon:'🌆',sky:['#65749e','#edb69b'],hills:['#89949e','#677786'],ground:['#8b9491','#6a7e7e'],road:['#778391','#394955'],prop:'city',hill:22,wave:600,curve:.0018,width:1.08,decks:[[1700,2350,24],[4650,5350,27]]},
 {name:'Valley Viaduct',icon:'🌉',sky:['#81afc5','#e8debc'],hills:['#90a69f','#5e8178'],ground:['#8aa08a','#6b8c75'],road:['#9c9b8a','#626d64'],prop:'bridge',hill:48,wave:660,curve:.0025,width:.86,decks:[[600,1300,20],[2800,3450,23],[5000,5650,21]]},
 {name:'Bamboo Bridges',icon:'🎋',sky:['#83b9b8','#e0ddae'],hills:['#86a391','#4f8273'],ground:['#89a26a','#5a8857'],road:['#c2ae7a','#907953'],water:true,prop:'bamboo',hill:26,wave:360,curve:.003,width:.9,decks:[[900,1480,22],[3500,4080,24],[5500,6080,21]]},
 {name:'Redwood Pass',icon:'🌲',sky:['#8fa7b0','#d6d6be'],hills:['#82998e','#4e7767'],ground:['#8a9470','#637f59'],road:['#969383','#5d6557'],prop:'redwood',hill:52,wave:360,curve:.0036,width:.9},
 {name:'Stadium Finale',icon:'🏟',sky:['#182846','#6c678b'],hills:['#4d526e','#323b57'],ground:['#778f79','#426b59'],road:['#767d91','#35405b'],prop:'stadium',hill:25,wave:260,curve:.0031,width:1.04,decks:[[1450,1980,24],[4450,5020,25]]}
];
function height(index,distance){const e=environments[index];return e.hill*(Math.sin(distance/e.wave+.2)+.28*Math.sin(distance/(e.wave*.47)+.9))}
function grade(index,distance){return (height(index,distance+5)-height(index,distance-5))/10}
function deck(index,distance,x){if(x<-.94||x>-.08)return 0;let y=0;for(const [start,end,peak] of environments[index].decks||[]){if(distance>start&&distance<end)y+=Math.sin(Math.PI*(distance-start)/(end-start))**2*peak}return y}
globalThis.RumbleWorld={environments,height,grade,deck};
})();
