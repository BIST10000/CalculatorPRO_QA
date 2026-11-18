import React,{useEffect,useRef,useState} from 'react';
import {seriesStyle} from './chart-geometry.js';
import {chartSegments,curveLabels} from './plot-data.js';

function ChartView({rows,series,title,bounded,expanded=false}){
  if(!series.length)return <p className="empty">Выберите хотя бы одну характеристику.</p>;
  const width=1100,height=expanded?650:460,left=86,top=28,right=34,bottom=52;
  const values=rows.flatMap(r=>series.map(s=>r.values[s.index]));
  const isFak = title.includes('воздействия') || title.includes('Fak');
  let low=bounded?0:Math.min(0,...values),high=bounded?1:Math.max(1,...values);
  if(!bounded){const pad=(high-low)*.07;low-=pad;high+=pad;}
  const x=t=>left+(width-left-right)*t/rows.at(-1).t;
  const y=value=>top+(height-top-bottom)*(high-value)/(high-low);
  const segments=series.map(s=>chartSegments(rows,s.index,bounded,isFak));
  const fontSize=expanded?15:12;
  const labels=curveLabels(series,segments,x,y,{left,right:width-right,top,bottom:height-bottom},fontSize);
  const ticks=bounded?[.2,.4,.6,.8,1]:Array.from({length:5},(_,i)=>low+(high-low)*i/4);
  return <div className={`chart ${expanded?'chart-expanded':''}`}>
    <svg className="time-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
      {ticks.map((value,i)=><g key={i}><line x1={left} x2={width-right} y1={y(value)} y2={y(value)} stroke="#e2e9ed"/><text x={left-10} y={y(value)+4} textAnchor="end">{Number(value.toFixed(3))}</text></g>)}
      {bounded&&<text x={left-9} y={height-bottom+4} textAnchor="end">{isFak ? '0' : '0 (не вкл.)'}</text>}
      {Array.from({length:5},(_,i)=>{const t=rows.at(-1).t*i/4;return <text key={i} x={x(t)} y={height-24} textAnchor="middle">{Number(t.toFixed(3))}</text>;})}
      <line x1={left} x2={left} y1={top} y2={height-bottom} stroke="#a6b5bf"/>
      <line x1={left} x2={width-right} y1={height-bottom} y2={height-bottom} stroke="#a6b5bf"/>
      <text x={left} y="16">{isFak ? 'Fak(i) · диапазон [0; 1]' : (bounded ? 'u(i) · 0 < u ≤ 1' : 'Fak(i)')}</text>
      {series.map((s,rank)=><g key={s.index} data-series={s.index}>{segments[rank].map((segment,j)=>segment.length===1?<circle key={j} cx={x(segment[0].t)} cy={y(segment[0].value)} r="2" fill={seriesStyle(s.index).color}/>:<polyline key={j} fill="none" stroke={seriesStyle(s.index).color} strokeWidth="2.3" points={segment.map(p=>`${x(p.t)},${y(p.value)}`).join(' ')}/>)}</g>)}
      <g className="curve-labels">{labels.map(label=><g key={label.index} data-label-series={label.index}>
        <line x1={label.anchorX} y1={label.anchorY} x2={label.left} y2={label.top+fontSize/2} stroke={seriesStyle(label.index).color} strokeWidth=".7" opacity=".55"/>
        <text x={label.left} y={label.top+fontSize} style={{fontSize,fill:seriesStyle(label.index).color,paintOrder:'stroke',stroke:'white',strokeWidth:4,strokeLinejoin:'round'}}><title>{label.label}</title>{label.shortLabel}</text>
      </g>)}</g>
      <text x={width-right} y={height-3} textAnchor="end">t · условное время</text>
    </svg>
    <div className="legend">{series.map(s=><span key={s.index}><i style={{background:seriesStyle(s.index).color}}/>{s.shortLabel} · {s.label}</span>)}</div>
    {bounded&&!isFak&&<p className="hint chart-domain-note">Показаны только участки, где 0 &lt; u(i) ≤ 1. Участки вне диапазона и нулевые значения не рисуются и не соединяются через разрыв. Исходные результаты доступны в таблице и CSV.</p>}
    {isFak&&<p className="hint chart-domain-note">Пределы графика воздействий зафиксированы от 0 до 1.</p>}
  </div>;
}
function EnlargedChart({onClose,...props}){
  const ref=useRef(null);const [zoom,setZoom]=useState(1);
  useEffect(()=>{
    const previous=document.activeElement;const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';ref.current.showModal();
    return()=>{document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  const trapFocus=e=>{
    if(e.key!=='Tab')return;
    const buttons=[...ref.current.querySelectorAll('button:not([disabled])')];
    const first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  };
  return <dialog onKeyDown={trapFocus} ref={ref} className="chart-dialog" aria-label={`Увеличенный график: ${props.title}`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}>
    <div className="chart-dialog-content"><div className="dialog-heading"><h2>{props.title}</h2><div className="zoom-controls"><button aria-label="Уменьшить масштаб" disabled={zoom<=1} onClick={()=>setZoom(z=>Math.max(1,z-.25))}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="Увеличить масштаб" disabled={zoom>=3} onClick={()=>setZoom(z=>Math.min(3,z+.25))}>+</button></div><button className="dialog-close" aria-label="Закрыть увеличенный график" onClick={onClose}>×</button></div>
    <div className="zoom-scroll"><div style={{width:`${zoom*100}%`}}><ChartView {...props} expanded/></div></div></div>
  </dialog>;
}
export default function LineChart(props){
  const [open,setOpen]=useState(false);
  return <><div className="chart-actions"><button className="expand-chart" onClick={()=>setOpen(true)} aria-label={`Увеличить график: ${props.title}`}>⤢ На весь экран</button></div><ChartView {...props}/>{open&&<EnlargedChart {...props} onClose={()=>setOpen(false)}/>}</>;
}
