import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL, poly, preset, derivative, simulate, originalDisturbances, numericConfig, validate, csv, disturbances } from '../src/engine.js';

const close = (actual, expected, tolerance=1e-9) => assert.ok(Math.abs(actual-expected)<=tolerance, `${actual} != ${expected}`);
// Independent expression evaluation of the printed report equations. This does
// not use the engine's factors/termValue or its integration implementation.
const referenceExpressions=MODEL.map(row=>{
  const source=row.source.slice(row.source.indexOf('×(')+1);
  const expr=source.replace(/f(\d+)\(u(\d+)\(t\)\)/g,(_,f,u)=>`P(U[${MODEL.findIndex(m=>m.id===Number(u))}],C.functions[${Number(f)-1}])`)
    .replace(/Fak(\d+)/g,(_,id)=>`D[${Number(id)-1}]`).replaceAll('×','*').replace(/\)\(/g,')*(').replace(/\)D\[/g,')*D[');
  return new Function('U','C','P','D',`return ${expr};`);
});
const referenceDerivative=(t,u,c)=>referenceExpressions.map((f,i)=>f(u,c,poly,disturbances(t,c))/c.scales[i]);

test('the report model contains 28 states and each function f1…f187 once',()=>{
  assert.equal(MODEL.length,28);
  const factors=MODEL.flatMap(m=>[m.positive,m.negative].flatMap(t=>t?.factors??[]));
  assert.deepEqual(factors.map(f=>f[0]),Array.from({length:187},(_,i)=>i+1));
  assert.ok(factors.every(([,i])=>i>=0&&i<28));
  assert.deepEqual(MODEL[2].positive.factors,[[14,0],[15,4],[16,5]]);
  assert.deepEqual(MODEL[12].negative.factors,[[81,0],[82,2]]);
  assert.deepEqual(MODEL[5].negative.factors.find(f=>f[0]===51),[51,18]);
});
test('all 28 derivatives match independently evaluated report equations',()=>{
  let seed=493;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
  for(let trial=0;trial<20;trial++){
    const c=preset();c.disturbanceMode=trial%2?'original':'polynomial';
    c.functions=c.functions.map(()=>Array.from({length:4},()=>random()*.6-.15));
    c.disturbancePolynomials=c.disturbancePolynomials.map(()=>Array.from({length:4},()=>random()-.3));
    c.scales=c.scales.map(()=>random()+.2);
    const u=Array.from({length:28},()=>random()),t=random();
    const actual=derivative(t,u,c),expected=referenceDerivative(t,u,c);
    actual.forEach((v,i)=>close(v,expected[i],1e-12));
  }
});
test('polynomial is a*x^3+b*x^2+c*x+d; coefficients themselves are not exponentiated',()=>close(poly(2,[2,3,4,5]),41));
test('a missing disturbance multiplier is 1; absent positive term is 0',()=>{
  const c=preset('zero');c.functions=c.functions.map(()=>[0,0,0,1]);
  const d=derivative(0,c.initial,c);
  close(d[1],-1);close(d[6],1);close(d[9],0);close(d[12],0);
});
test('u* divides the whole difference and is independent of current u',()=>{
  const c=preset('zero');c.functions=c.functions.map(()=>[0,0,0,1]);c.scales[1]=2;c.initial[1]=0;
  close(derivative(0,c.initial,c)[1],-.5);
});
test('zero scenario has no changes at any output',()=>{
  const r=simulate(preset('zero'));for(const row of r.rows)for(const value of row.values)close(value,.5);
  assert.equal(r.violations.length,0);
});
test('linear scenario matches the analytical solution at all times and quarters',()=>{
  const r=simulate(preset('linear'));
  for(const row of r.rows){close(row.values[0],.5+.2*row.t);close(row.values[1],.5+.2*row.t);close(row.values[4],.5+.2*row.t);close(row.values[2],.5);}
  assert.deepEqual(r.checkpoints.map(r=>r.t),[0,.125,.25,.375,.5]);
  r.checkpoints.forEach((row,i)=>close(row.values[0],[.5,.525,.55,.575,.6][i]));
});
test('doubling u* halves linear growth; second run does not mutate the model',()=>{
  const c=preset('linear');const initial=JSON.stringify(c);const r1=simulate(c);c.scales[0]=2;
  close(simulate(c).final[0],.55);close(simulate(preset('linear')).final[0],r1.final[0]);
  c.scales[0]=1;assert.equal(JSON.stringify(c),initial);
});
test('out-of-range results, including negative values, are reported without clipping',()=>{
  const r=simulate(preset('boundary'));close(r.final[0],1.1);assert.deepEqual(r.violations.map(v=>v.index).sort((a,b)=>a-b),[0,1,4]);
  const c=preset('linear');c.functions[0]=[0,0,0,-10];const negative=simulate(c);
  close(negative.final[0],-.5);assert.ok(negative.violations.some(v=>v.index===0));
});
test('demo remains finite and within 0…1 on all output points',()=>{
  const r=simulate(preset());assert.equal(r.violations.length,0);
  assert.ok(r.rows.every(row=>row.values.every(v=>Number.isFinite(v)&&v>=0&&v<=1)));
  close(r.final[0],.6107927116328764,1e-8);
});
test('adaptive integration agrees with independent fixed-step RK4 on coupled equations',()=>{
  const c=preset();let u=[...c.initial];const h=c.duration/4000;
  for(let n=0;n<4000;n++){
    const t=n*h,k1=referenceDerivative(t,u,c);
    const k2=referenceDerivative(t+h/2,u.map((v,i)=>v+h*k1[i]/2),c);
    const k3=referenceDerivative(t+h/2,u.map((v,i)=>v+h*k2[i]/2),c);
    const k4=referenceDerivative(t+h,u.map((v,i)=>v+h*k3[i]),c);
    u=u.map((v,i)=>v+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
  }
  const actual=simulate(c);u.forEach((v,i)=>close(actual.final[i],v,2e-8));
  const fine=simulate({...c,tolerance:1e-10,samples:401});actual.final.forEach((v,i)=>close(v,fine.final[i],2e-8));
});
test('original disturbance formulas retain their signs and values',()=>{
  const d=originalDisturbances(0);close(d[0],1);close(d[1],.3875);close(d[2],.1);close(d[3],-1);close(d[4],.1875);close(d[5],.4);
});
test('blank, NaN, zero scales, reversed limits, invalid dimensions and fractional sample counts fail',()=>{
  for(const mutate of [c=>c.scales[0]=0,c=>c.initial[0]=NaN,c=>c.minimum[0]=1,c=>c.initial.pop(),c=>c.functions.pop(),c=>c.functions[0][0]=Infinity,c=>c.duration=-1,c=>c.samples=200.5,c=>c.tolerance=0,c=>c.disturbanceMode='other']){
    const c=preset();mutate(c);assert.throws(()=>simulate(c));
  }
  const c=preset();c.initial[0]='';assert.throws(()=>numericConfig(c));
  c.initial[0]='0,25';close(numericConfig(c).initial[0],.25);validate(numericConfig(c));
});
test('unstable or overflowing coefficients are rejected, never returned as a valid result',()=>{
  const c=preset('linear');c.functions[0]=[1e308,0,0,0];assert.throws(()=>simulate(c),/неустойчив|сложный/);
});
test('CSV contains all 28 original variable ids and the unmodified output',()=>{
  const r=simulate(preset('boundary')),text=csv(r),lines=text.split('\r\n');
  assert.equal(lines.length,r.rows.length+1);assert.equal(lines[0].split(';').length,29);
  close(Number(lines.at(-1).split(';')[1]),1.1);assert.ok(lines[0].includes('u125'));
});
