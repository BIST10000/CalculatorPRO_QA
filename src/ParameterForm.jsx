import React from 'react';
import { MODEL } from './engine.js';
import { DEGREES } from './input-model.js';

function NumberField({label,value,onChange,disabled}) {
  return <input aria-label={label} type="text" inputMode="decimal" value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}/>;
}
export default function ParameterForm({input,onChange,busy}) {
  const initial=(i,value)=>onChange(c=>({...c,initial:c.initial.map((v,j)=>i===j?value:v)}));
  const id=(i,value)=>onChange(c=>({...c,assignments:c.assignments.map((v,j)=>i===j?{...v,id:value}:v)}));
  const coefficient=(i,j,value)=>onChange(c=>({...c,assignments:c.assignments.map((v,k)=>i===k?{...v,coefficients:v.coefficients.map((n,l)=>j===l?value:n)}:v)}));
  const duplicate = new Set(input.assignments.map(r=>String(r.id))).size<7;
  return <><p className="hint">Ввод совпадает с Python-приложением: 28 начальных значений, 7 номеров функций и 19 коэффициентов. Время расчёта — от 0 до 1; воздействиями управляют встроенные формулы.</p><div className="input-columns">
    <section className="card"><div className="section-title"><h2>Начальные значения</h2><span>28 характеристик</span></div><div className="table-wrap"><table><thead><tr><th>Характеристика</th><th>Значение при t = 0</th></tr></thead><tbody>{MODEL.map((m,i)=><tr key={m.id}><td><span className="variable">u{m.id}</span>{m.label}</td><td><NumberField label={`u${m.id} начало`} value={input.initial[i]} disabled={busy} onChange={v=>initial(i,v)}/></td></tr>)}</tbody></table></div></section>
    <section className="card function-card"><div className="section-title"><h2>Уравнения</h2><span>7 строк · 19 коэффициентов</span></div><p className="hint">Выберите номер F от 1 до 126 и введите коэффициенты слева направо, как в исходном окне.</p>
      {input.assignments.map((row,i)=><div className="function-row" key={i}><label className="function-number">Строка {i+1} · F<select aria-label={`Строка ${i+1} номер F`} disabled={busy} value={row.id} onChange={e=>id(i,e.target.value)}>{Array.from({length:126},(_,j)=><option key={j+1} value={j+1}>{j+1}</option>)}</select></label><div className="polynomial"><span>(x) =</span>{row.coefficients.map((value,j)=>{const power=DEGREES[i]-j;return <React.Fragment key={j}>{j>0&&<span>+</span>}<NumberField label={`Строка ${i+1} коэффициент ${j+1}`} value={value} disabled={busy} onChange={v=>coefficient(i,j,v)}/>{power>0&&<span>·x{power>1&&<sup>{power}</sup>}</span>}</React.Fragment>})}</div></div>)}
      {duplicate&&<div className="alert">Один номер F выбран несколько раз. Используются коэффициенты последней из этих строк сверху вниз.</div>}
      <p className="hint">Степени строк сохранены: кубическая, линейная, квадратичная, линейная, квадратичная, линейная, квадратичная. Невыбранные функции исключаются из произведений (множитель 1).</p>
    </section>
  </div></>;
}
