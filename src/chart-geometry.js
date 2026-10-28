const colors = ['#138b7a','#5b61cf','#d57b25','#c64b69','#2987c1','#8e5caf','#648e35','#b16c44'];
export function seriesStyle(index) {
  return {color:colors[index]??`hsl(${(index*137.508)%360} 65% 40%)`,dash:undefined,border:'solid',name:'сплошная'};
}

export function radarScale(snapshots) {
  const values=snapshots.flatMap(snapshot=>snapshot.values);
  if (!values.length || !values.every(Number.isFinite)) throw Error('Для диаграммы нужны конечные значения.');
  const minimum=Math.min(...values),maximum=Math.max(...values);
  if (maximum===minimum) {
    const padding=Math.max(Math.abs(minimum)*.05,.01);
    return {low:minimum-padding,high:maximum+padding};
  }
  return {low:minimum,high:maximum+(maximum-minimum)*.02};
}

// SVG y increases downward. Negative sine makes axes increase anticlockwise.
export function radarPosition(index,ratio,count=28) {
  const angle=index*2*Math.PI/count;
  return [140-Math.sin(angle)*100*ratio,140-Math.cos(angle)*100*ratio];
}

export function radarRatio(value,scale) {
  return (value-scale.low)/(scale.high-scale.low);
}
