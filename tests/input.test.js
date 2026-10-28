import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inputPreset,validateInput,toEngineConfig,DEGREES} from '../src/input-model.js';
import {simulate,poly} from '../src/engine.js';

test('same 28 defaults, 7 ids, 19 coefficients and id range as the actual Python UI',()=>{
  const source=fs.readFileSync(new URL('../../Models-and-methods-for-checking-the-feasibility-of-an-operation-plan-master/ui_dialog.py',import.meta.url),'utf8');
  const defaults=[];
  for(const m of source.matchAll(/begin_expression_lineEdit_(\d+)\.setText\(_translate\("Dialog", "([^"]+)"\)\)/g))defaults[Number(m[1])-1]=Number(m[2]);
  const input=inputPreset();assert.deepEqual(input.initial,defaults);
  assert.deepEqual(input.assignments.map(r=>r.id),[1,2,3,4,5,6,7]);
  assert.deepEqual(input.assignments.map(r=>r.coefficients.length),[4,2,3,2,3,2,3]);
  assert.equal(input.initial.length+input.assignments.length+input.assignments.flatMap(r=>r.coefficients).length,54);
  assert.ok(source.includes('range(1, 127)'));
});
test('all seven polynomial shapes preserve coefficient order, including second-row intercept',()=>{
  const input=inputPreset();input.assignments.forEach((r,i)=>{r.coefficients=r.coefficients.map((_,j)=>i+j+.25);});
  const config=toEngineConfig(input);
  input.assignments.forEach((r,i)=>{
    const expected=r.coefficients.reduce((sum,v,j)=>sum+v*2**(DEGREES[i]-j),0);
    assert.equal(poly(2,config.functions[r.id-1]),expected);
  });
  assert.equal(config.functions[1][3],2.25);
  assert.deepEqual(config.functions[186],[0,0,0,1]);
});
test('all id values 1…126 accepted, duplicates deterministic, input errors rejected',()=>{
  const input=inputPreset();input.assignments[0].id=126;input.assignments[6].id=126;
  input.assignments[6].coefficients=[2,3,4];
  assert.deepEqual(toEngineConfig(input).functions[125],[0,2,3,4]);
  input.assignments[0].id=127;assert.throws(()=>validateInput(input));
  input.assignments[0].id=1;input.assignments[0].coefficients[0]='';assert.throws(()=>validateInput(input));
});
test('same fixed output grid and unscaled original disturbances; exact quarter snapshots',()=>{
  const config=toEngineConfig(inputPreset('comparison'));
  assert.equal(config.duration,1);assert.equal(config.samples,80);assert.equal(config.disturbanceScale,1);
  const result=simulate(config);assert.equal(result.rows.length,80);
  result.rows.forEach((r,i)=>assert.ok(Math.abs(r.t-i/79)<1e-14));
  assert.deepEqual(result.checkpoints.map(r=>r.t),[0,.25,.5,.75,1]);
});
test('import cannot introduce extra model controls and decimal commas are supported',()=>{
  const input=inputPreset();input.initial[0]='0,25';input.duration=5;input.disturbanceScale=.1;
  const checked=validateInput(input);assert.deepEqual(Object.keys(checked),['initial','assignments']);
  const c=toEngineConfig(checked);assert.equal(c.initial[0],.25);assert.equal(c.duration,1);assert.equal(c.disturbanceScale,1);
});
test('original Python initial values outside 0…1 remain permitted and are flagged',()=>{
  const input=inputPreset('comparison');input.initial[0]=-1;
  const r=simulate(toEngineConfig(input));assert.ok(r.violations.some(v=>v.index===0&&v.time===0));
});
