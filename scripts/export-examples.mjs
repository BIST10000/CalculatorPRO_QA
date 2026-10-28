import fs from 'node:fs';
import {inputPreset,toEngineConfig} from '../src/input-model.js';
import {simulate,csv,MODEL} from '../src/engine.js';
fs.mkdirSync('examples/compatible',{recursive:true});
const summary={};
for(const name of ['original','comparison','weaker']){
  const input=inputPreset(name),result=simulate(toEngineConfig(input));
  fs.writeFileSync(`examples/compatible/${name}.json`,JSON.stringify({version:2,input},null,2)+'\n');
  fs.writeFileSync(`examples/compatible/${name}-expected.csv`,csv(result));
  summary[name]={checkpoints:result.checkpoints.map(r=>({t:r.t,values:Object.fromEntries(MODEL.map((m,i)=>[`u${m.id}`,r.values[i]]))})),violations:result.violations.map(v=>({...v,id:MODEL[v.index].id}))};
}
fs.writeFileSync('examples/compatible/expected-results.json',JSON.stringify(summary,null,2)+'\n');
console.log('Three Python-compatible input files and expected outputs written.');
