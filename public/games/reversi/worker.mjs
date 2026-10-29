import{chooseMove}from'/games/reversi/vendor/ai.mjs';
onmessage=e=>{try{const{board,turn,depth}=e.data;postMessage({move:chooseMove(board,turn,depth)});}catch(e){postMessage({error:e.message});}};
