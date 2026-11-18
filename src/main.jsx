import React, { useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MODEL, disturbanceNames, disturbances, csv } from './engine.js';
import './style.css';
import { inputPreset, validateInput, toEngineConfig } from './input-model.js';
import ParameterForm from './ParameterForm.jsx';
import LineChart from './LineChart.jsx';
import ModelTheory from './ModelTheory.jsx';
import { radarScale, radarPosition, radarRatio } from './chart-geometry.js';

const format = value => value!==0&&Math.abs(value)<1e-6?Number(value).toExponential(3).replace('.',','):Number(value).toLocaleString('ru-RU', {maximumFractionDigits:6});
function download(name, content, type) {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement('a'); a.href=url; a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function labelLines(text) {
  const lines=[''];
  for(const word of text.split(' ')) {
    if((lines.at(-1)+' '+word).trim().length>24&&lines.at(-1))lines.push(word);
    else lines[lines.length-1]=(lines.at(-1)+' '+word).trim();
  }
  return lines.length>2?[lines[0],lines[1]+'…']:lines;
}
function Radar({snapshot,reference,title}) {
  const scale=radarScale([reference,snapshot]);
  const position=(i,ratio)=>radarPosition(i,ratio).map(v=>140+(v-140)*1.4);
  const polygon=values=>values.map((value,i)=>position(i,radarRatio(value,scale)).join(',')).join(' ');
  const ticks=[0,.5,.75,1];
  const labels=MODEL.map((m,i)=>{const p=position(i,1);return {m,i,p,left:p[0]<140,y:p[1]};});
  // Separate long names into two columns, retaining their axis order.
  for(const left of [true,false]) {
    const side=labels.filter(label=>label.left===left).sort((a,b)=>a.y-b.y);
    side.forEach((label,i)=>{label.y=Math.max(label.y,i?side[i-1].y+22:-20);});
    for(let i=side.length-1;i>=0;i--)side[i].y=Math.min(side[i].y,i===side.length-1?310:side[i+1].y-22);
  }
  return <div className="radar classic-radar"><h3>{title} <small>t = {format(snapshot.t)}</small></h3>
    <div className="snapshot-legend"><span style={{color:'#233cff'}}>━ Начальные значения</span>{snapshot.t!==0&&<span style={{color:'#d33131'}}>━ Текущие значения</span>}</div>
    <svg viewBox="-140 -65 560 425" role="img" aria-label={title}>
      {ticks.map((ratio,i)=><g key={ratio}><circle cx="140" cy="140" r={140*ratio} fill="none" stroke="#cbd2d9"/><text x={145+99*ratio} y={137-99*ratio} style={{paintOrder:'stroke',stroke:'white',strokeWidth:2}}>{format(scale.low+ratio*(scale.high-scale.low))}</text></g>)}
      {labels.map(({m,p,left,y})=>{const x=left?-40:320;const lines=labelLines(m.label);return <g key={m.id} data-axis={m.id}><line x1="140" y1="140" x2={p[0]} y2={p[1]} stroke="#d9dde2"/><line x1={p[0]} y1={p[1]} x2={x+(left?4:-4)} y2={y} stroke="#d9dde2" strokeWidth=".6"/><text x={x} y={y-((lines.length-1)*5)} textAnchor={left?'end':'start'}><title>u{m.id} · {m.label}</title>{lines.map((line,j)=><tspan key={j} x={x} dy={j===0?0:10}>{line}</tspan>)}</text></g>})}
      {snapshot.t!==0&&<polygon className="radar-initial" points={polygon(reference.values)} fill="none" stroke="#233cff" strokeWidth="1.5"/>}
      <polygon className="radar-values" points={polygon(snapshot.values)} fill="none" stroke={snapshot.t===0?'#233cff':'#d33131'} strokeWidth="1.5"/>
    </svg><p>Отдельная шкала снимка: {format(scale.low)}…{format(scale.high)}. Синий контур — начальное состояние, красный — текущее. Центр соответствует минимуму шкалы.</p></div>;
}
function App() {
  const [config,setConfig]=useState(()=>inputPreset());
  const [tab,setTab]=useState('parameters'),[result,setResult]=useState(null),[dirty,setDirty]=useState(false);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [selected,setSelected]=useState([0,1,2,3,4,5]);
  const worker=useRef(null),fileInput=useRef(null);
  useEffect(()=>()=>worker.current?.terminate(),[]);
  const change=updater=>{setConfig(c=>typeof updater==='function'?updater(c):updater);setDirty(true);setError('');};
  const loadPreset=name=>{worker.current?.terminate();setBusy(false);change(inputPreset(name));setResult(null);setTab('parameters');};
  const run=()=>{
    try{
      const numeric=toEngineConfig(config);
      setBusy(true);setError('');worker.current?.terminate();
      const w=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});worker.current=w;
      w.onmessage=({data})=>{setBusy(false);w.terminate();if(data.error){setError(data.error);return;}setResult(data.result);setDirty(false);setTab('results');};
      w.onerror=()=>{setBusy(false);w.terminate();setError('Не удалось выполнить расчёт. Перезапустите приложение и повторите попытку.');};
      w.postMessage(numeric);
    }catch(e){setError(e.message);}
  };
  const importFile=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{if(file.size>500000)throw Error('Файл сценария слишком большой.');const data=JSON.parse(await file.text());const c=validateInput(data.input??data);worker.current?.terminate();setBusy(false);change(c);setResult(null);setTab('parameters');}
    catch(err){setError(`Не удалось открыть сценарий: ${err.message}`);}e.target.value='';
  };
  const series=selected.map(index=>({index,shortLabel:`u(${MODEL[index].id})`,label:MODEL[index].label}));

  return <><header><div className="brand"><span className="brand-icon">Q</span><div>Качество ПО<small>Модель сопровождаемости</small></div></div><span className="header-note">Сопровождаемость программного обеспечения</span><span className="local">● Локальный расчёт</span></header>
    <main><div className="intro"><div><p className="eyebrow">МОДЕЛЬ СИСТЕМНОЙ ДИНАМИКИ</p><h1>Как меняется качество программы</h1><p>Задайте исходное состояние и влияния. Сравните характеристики во времени.</p></div><div className="model-stats"><strong>28 <small>характеристик</small></strong><strong>7 <small>строк функций</small></strong></div></div>
    <section className="toolbar"><div><label htmlFor="preset">Сценарий для начала</label><select id="preset" value="" disabled={busy} onChange={e=>loadPreset(e.target.value)}><option value="" disabled>Выберите пример…</option><option value="original">Исходные значения Python</option><option value="comparison">Сравнение · F1 = 1</option><option value="weaker">Сравнение · F1 = 0,1</option></select></div><div className="toolbar-actions"><button disabled={busy} onClick={()=>fileInput.current.click()}>Открыть JSON</button><button disabled={busy} onClick={()=>{try{const c=validateInput(config);download('scenario.json',JSON.stringify({version:3,input:c},null,2),'application/json');}catch(e){setError(e.message);}}}>Сохранить сценарий</button><input ref={fileInput} hidden type="file" accept=".json" onChange={importFile}/><button className="primary" disabled={busy} onClick={run}>{busy?'Вычисляем…':'Рассчитать →'}</button>{busy&&<button onClick={()=>{worker.current?.terminate();setBusy(false);}}>Отменить</button>}</div></section>
    {error&&<div className="alert error" role="alert">{error}</div>}
    {dirty&&result&&<div className="alert">Параметры изменены. Результаты относятся к предыдущему расчёту — нажмите «Рассчитать».</div>}
    <nav aria-label="Разделы приложения">{[['parameters','01','Параметры'],['results','02','Результаты'],['about','03','О модели']].map(([id,n,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><span>{n}</span>{label}</button>)}</nav>
    {tab==='parameters'&&<ParameterForm input={config} onChange={change} busy={busy}/>} 
    {tab==='results'&&(!result?<section className="card empty"><h2>Результатов пока нет</h2><p>Выберите сценарий и нажмите «Рассчитать».</p></section>:<>
      <div className={`result-status ${result.violations.length?'warning':'success'}`}><div><b>{result.violations.length?'Есть выход за допустимые границы':'Все характеристики в заданных границах'}</b><p>{result.rows.length} точек · t от 0 до {format(result.config.duration)} · {result.accepted} принятых шагов</p></div><button onClick={()=>download('results.csv',csv(result),'text/csv;charset=utf-8')}>Скачать CSV</button></div>
      {result.violations.length>0&&<div className="alert">Выход обнаружен у {result.violations.length} характеристик на принятых шагах расчёта. Значения сохранены без обрезки. Это проверка границ модели, а не оценка реального ПО.</div>}
      <section className="card"><div className="section-title"><h2>Характеристики во времени</h2><span>Допустимые участки · 0 &lt; u ≤ 1</span></div><LineChart rows={result.rows} series={series} title="Изменение характеристик" bounded/><details><summary>Выбрать линии ({selected.length} из 28)</summary><div className="checkbox-grid">{MODEL.map((m,i)=><label key={m.id}><input type="checkbox" checked={selected.includes(i)} onChange={()=>setSelected(s=>s.includes(i)?s.filter(v=>v!==i):[...s,i])}/>u{m.id} · {m.label}</label>)}</div></details></section>
      <section className="card"><h2>Точные значения в контрольные моменты</h2><p className="hint">Первые шесть показателей описывают свойства качества; остальные — недостатки. Рост разных показателей имеет разный смысл.</p><div className="table-wrap"><table><thead><tr><th>Характеристика</th>{result.checkpoints.map((r,i)=><th key={i}>t = {format(r.t)}</th>)}<th>Проверка</th></tr></thead><tbody>{MODEL.map((m,i)=><tr key={m.id}><td><span className="variable">u{m.id}</span>{m.label}</td>{result.checkpoints.map((r,j)=><td key={j} className={(result.config.excludeZero?r.values[i]<=0:r.values[i]<result.config.minimum[i]-1e-10)||r.values[i]>result.config.maximum[i]+(result.config.excludeZero?0:1e-10)?'outside':''}>{format(r.values[i])}</td>)}<td>{result.violations.some(v=>v.index===i)?<span className="badge bad">Выход за границу</span>:<span className="badge good">В границах</span>}</td></tr>)}</tbody></table></div></section>
      <section className="card"><h2>Снимки состояния</h2><p className="hint">Сравнение начального состояния с текущим. У каждого снимка своя шкала, как в исходных диаграммах; подписи идут против часовой стрелки. Значения не изменены.</p><div className="radars">{result.checkpoints.map((r,i)=><Radar key={i} snapshot={r} reference={result.checkpoints[0]} title={['Начало','¼ времени','½ времени','¾ времени','Конец'][i]}/>)}</div></section>
      <section className="card"><h2>Внешние воздействия</h2><LineChart rows={result.rows.map(r=>({t:r.t,values:disturbances(r.t,result.config)}))} series={disturbanceNames.map((label,index)=>({index,shortLabel:`Fak${index+1}`,label}))} title="Внешние воздействия" bounded/></section>
    </>)}
    {tab==='about'&&<ModelTheory input={config}/>} 
    <footer>Качество ПО <span>Сценарии и результаты остаются на вашем компьютере.</span></footer></main></>;
}
createRoot(document.getElementById('root')).render(<App/>);
