/* Approved clean colour palette with regional materials and afternoon sun.
   Footprints remain mapped; untagged heights and finishes are approximations. */
window.CityStyles={forCity(city){
 const id=city.id||'berlin',theme=city.theme||'stone',autumn=id==='berlin',desert=id==='dubai';
 const palettes={
  berlin:['#f4e9cd','#f3f4e9','#e4c89d','#d99b83','#c5e1e9','#f3dfae','#bad5cb','#b5d4e5'],
  paris:['#f3ebd8','#f7f5e9','#e6d3b7','#dfb8a1','#c9dfe5','#f1e1bb','#d0ddd1','#b9d6e4'],
  london:['#dca58c','#f2e6d5','#c78d76','#b6745c','#c5dce0','#f4dfb6','#d7b098','#b9d2df'],
  rome:['#f2d5a6','#f5e3c7','#deb587','#df9f7f','#d5dfce','#f3dcaa','#cb9580','#e9bf92'],
  venice:['#f7e8c8','#e8ac99','#f3d68e','#f7f1db','#d99078','#f5e8cb','#d8ac93','#b7d6ce'],
  bengaluru:['#f1e2ca','#e0e8d4','#ddc7ae','#dcac94','#b8dbdb','#f4dfb1','#d4b8ab','#bad8e1'],
  dubai:['#f2e9d5','#e8edef','#ded0b7','#e4c7a0','#a6d0dc','#f6e4be','#d9e2df','#b4dce8']
 };
 const warm=['rome','venice'].includes(id),roofs=autumn?['#526b85','#be6e54','#56768c','#d48660','#6a9475','#42988c']:warm?['#b97857','#c98c66','#af7254','#d6986f','#879c78','#719b8c']:desert||id==='bengaluru'?['#ccd6d7','#b6c7ce','#dad5c3','#c9b899','#8fae98','#80b9bd']:['#627d91','#b3765e','#718a98','#c28a6f','#7ba280','#579e96'];
 const suns={berlin:[52.52,13.405,'13:05'],paris:[48.858,2.325,'14:30'],london:[51.506,-.126,'14:00'],rome:[41.896,12.483,'13:20'],venice:[45.434,12.337,'13:15'],bengaluru:[12.977,77.591,'09:30'],dubai:[25.197,55.274,'11:00']},sun=suns[id]||suns.berlin;
 return {id,aesthetic:'illustrated',season:autumn?'autumn':null,solar:{latitude:sun[0],longitude:sun[1],date:'2026-10-24T'+sun[2]+':00Z'},historic:warm,facades:palettes[id]||palettes.paris,roofs,flatRoofs:desert||id==='bengaluru',desert,palms:desert||id==='bengaluru',cypress:id==='rome',ground:desert?'#e0d4b8':'#b8c9cc',park:desert?'#92b957':'#88b64c',water:autumn?0x079ec5:desert?0x13b6c8:id==='venice'?0x14b4b6:id==='rome'?0x36a79f:0x129ec2,sky:desert?'#279deb':autumn?'#0589e9':id==='london'?'#319be4':'#1595e7',haze:desert?'#c4e1ed':'#b0d8ed'};
}};
