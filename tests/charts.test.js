import test from 'node:test';
import assert from 'node:assert/strict';
import {radarScale,radarPosition,radarRatio,seriesStyle} from '../src/chart-geometry.js';

test('radar accepts signed values and uses individual comparison scales',()=>{
  const snapshots=[0,1,2,3,4].map(i=>({values:[.5-i*.4,.5+i]}));
  const scale=radarScale(snapshots);
  assert.ok(scale.low <= -1.1);assert.ok(scale.high > 4.5);
  assert.notDeepEqual(radarScale([snapshots[0]]),scale);
  const own=radarScale([{values:[.23,.78]}]);assert.equal(own.low,.23);assert.ok(own.high<.8);
  const zero=radarRatio(0,scale);
  for(const snapshot of snapshots)for(const value of snapshot.values){
    const r=radarRatio(value,scale);assert.ok(r>=0&&r<=1);
    if(value<0)assert.ok(r<zero);
    assert.ok(Math.abs(scale.low+r*(scale.high-scale.low)-value)<1e-12);
  }
});
test('radar axis 0 is up, next axes run anticlockwise',()=>{
  assert.deepEqual(radarPosition(0,1),[140,40]);
  const next=radarPosition(1,1);assert.ok(next[0]<140&&next[1]<140);
  const quarter=radarPosition(7,1);assert.ok(Math.abs(quarter[0]-40)<1e-12&&Math.abs(quarter[1]-140)<1e-12);
});
test('all 28 series use distinct colors and solid lines',()=>{
  const styles=Array.from({length:28},(_,i)=>seriesStyle(i));
  assert.equal(new Set(styles.map(s=>s.color+'|'+s.dash)).size,28);
  assert.ok(styles.every(s=>s.dash===undefined&&s.border==='solid'&&s.name==='сплошная'));
});
