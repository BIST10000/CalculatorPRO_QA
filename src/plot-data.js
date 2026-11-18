// Build visible segments without changing the simulated data.
export function chartSegments(rows,index,bounded=false,minIncluded=false) {
  const segments=[];let segment=[];
  for(const row of rows){
    const value=row.values[index];
    const valid = Number.isFinite(value) && (!bounded || (minIncluded ? (value >= 0 && value <= 1) : (value > 0 && value <= 1)));
    if(valid){segment.push({t:row.t,value});}
    else if(segment.length){segments.push(segment);segment=[];}
  }
  if(segment.length)segments.push(segment);
  return segments;
}
export function curveLabels(series,segments,x,y,box,fontSize=12) {
  const labels=[];const width=56,height=fontSize+5;
  series.forEach((s,rank)=>{
    const points=segments[rank].flat();if(!points.length)return;
    const fractions=[.15+.7*(rank+.5)/series.length,.85,.65,.45,.25,.05,.95];
    let placed=null;
    for(const fraction of fractions){
      const point=points[Math.min(points.length-1,Math.floor(fraction*points.length))];
      for(const dy of [0,-18,18,-36,36,-54,54,-72,72,-90,90,-126,126,-162,162]){
        for(const dx of [8,-60,32,-84]){
          const left=Math.max(box.left+3,Math.min(box.right-width,x(point.t)+dx));
          const top=Math.max(box.top+3,Math.min(box.bottom-height,y(point.value)+dy-height/2));
          if(labels.every(l=>left>l.left+width+3||left+width+3<l.left||top>l.top+height+2||top+height+2<l.top)){
            placed={...s,left,top,anchorX:x(point.t),anchorY:y(point.value)};break;
          }
        }
        if(placed)break;
      }
      if(placed)break;
    }
    if(!placed){const point=points.at(-1);placed={...s,left:Math.min(box.right-width,x(point.t)+8),top:Math.max(box.top+3,y(point.value)-height),anchorX:x(point.t),anchorY:y(point.value)};}
    labels.push(placed);
  });
  return labels;
}
