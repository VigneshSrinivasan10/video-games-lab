import { randomBytes } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dataRoot } from '../server/paths.mjs';
mkdirSync(dataRoot,{recursive:true,mode:0o700});
const file=new URL('monitoring-key',dataRoot);
try { writeFileSync(file,randomBytes(32).toString('hex')+'\n',{flag:'wx',mode:0o600}); console.log('Created monitoring admin key.'); }
catch(e) { if(e.code!=='EEXIST')throw e; console.log('Keeping existing monitoring admin key.'); }
console.log('Private key file: '+fileURLToPath(file));
console.log('Restart the main server, then open /monitor/ and paste the key from that file.');
