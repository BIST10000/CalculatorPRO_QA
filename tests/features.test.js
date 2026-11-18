import test from 'node:test';
import assert from 'node:assert/strict';
import {inputPreset,toEngineConfig,validateInput} from '../src/input-model.js';
import {disturbances,originalDisturbances,simulate,derivative} from '../src/engine.js';
import {chartSegments,curveLabels} from '../src/plot-data.js';

test('bounded graph omits zero and outside values, breaks paths, and preserves raw data',()=>{
 const values=[.5,1,1.1,.7,0,-.1,.2];const rows=values.map((v,t)=>({t,values:[v]}));
 const before=JSON.stringify(rows);const segments=chartSegments(rows,0,true);
 assert.deepEqual(segments.map(s=>s.map(p=>p.value)),[[.5,1],[.7],[.2]]);
 assert.equal(JSON.stringify(rows),before);
 assert.equal(chartSegments(rows,0,false)[0].length,7);
});
test('all selected curves receive labels near valid points',()=>{
 const rows=Array.from({length:80},(_,i)=>({t:i/79,values:Array.from({length:28},(_,j)=>.15+j*.025+i*.001)}));
 const series=Array.from({length:28},(_,index)=>({index,shortLabel:`u(${index})`}));
 const segments=series.map(s=>chartSegments(rows,s.index,true));
 const labels=curveLabels(series,segments,t=>86+980*t,v=>408-380*v,{left:86,right:1066,top:28,bottom:408});
 assert.equal(labels.length,28);assert.equal(new Set(labels.map(l=>l.index)).size,28);
 assert.ok(labels.every(l=>Number.isFinite(l.left)&&l.top>=28));
});
test('each Fak can be overridden independently, including zero and negative constants',()=>{
 const input=inputPreset('comparison');input.fakOverrides=[0,null,null,-.2,null,null];const config=toEngineConfig(input);
 for(const t of [0,.25,.5,1]){
  const actual=disturbances(t,config),expected=originalDisturbances(t);expected[0]=0;expected[3]=-.2;
  assert.deepEqual(actual,expected);
 }
 const checked=validateInput(JSON.parse(JSON.stringify(input)));assert.deepEqual(checked.fakOverrides,input.fakOverrides);
 input.fakOverrides[1]='0,8';assert.equal(validateInput(input).fakOverrides[1],.8);
 input.fakOverrides[1]='';assert.throws(()=>validateInput(input),/пустое/);
});
test('legacy scenarios retain original Fak and custom values affect the equations',()=>{
 const input=inputPreset('comparison');delete input.fakOverrides;
 const baseline=toEngineConfig(input);assert.deepEqual(baseline.disturbanceOverrides,Array(6).fill(null));
 assert.ok(Math.abs(simulate(baseline).final[0]-5.0483957269601065)<1e-8);
 const changed={...input,fakOverrides:[2,null,null,null,null,null]};const config=toEngineConfig(changed);
 const actual=derivative(0,config.initial,config)[0]-derivative(0,baseline.initial,baseline)[0];
 assert.ok(Math.abs(actual-1)<1e-12);
 assert.notEqual(simulate(config).final[0],simulate(baseline).final[0]);
});
