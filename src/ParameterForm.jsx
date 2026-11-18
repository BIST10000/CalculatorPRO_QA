import React from 'react';
import { MODEL, disturbanceNames, originalDisturbances } from './engine.js';
import { DEGREES, ROW_PARAMS } from './input-model.js';

function NumberField({label,value,onChange,disabled,readOnly}) {
  return <input aria-label={label} type="text" inputMode="decimal" value={value} disabled={disabled} readOnly={readOnly} onChange={readOnly ? undefined : e=>onChange(e.target.value)}/>;
}
function randomInitial() {
  return +(0.05 + Math.random() * 0.9).toFixed(3);
}
const FAK_STR_FORMULAS = [
  '(t² + 1) / 2',
  'cos²(1,5πt − π/6) / 4 + 0,2',
  'sin(πt − π/6) / 5 + 0,5',
  '(t + 1) / 2',
  'cos²(1,5πt − π/6) / 4 + 0,1',
  'sin²(πt − π/6) / 5 + 0,3',
];

export default function ParameterForm({input,onChange,busy}) {
  const initial=(i,value)=>onChange(c=>({...c,initial:c.initial.map((v,j)=>i===j?value:v)}));
  const id=(i,value)=>onChange(c=>({...c,assignments:c.assignments.map((v,j)=>i===j?{...v,id:value}:v)}));
  const duplicate = new Set(input.assignments.map(r=>String(r.id))).size<7;

  const randomizeInitial = () => onChange(c => ({
    ...c,
    initial: Array.from({length: 28}, () => randomInitial()),
  }));

  const randomizeWeights = () => onChange(c => ({
    ...c,
    assignments: c.assignments.map(row => ({
      ...row,
      coefficients: row.coefficients.map(() => +(Math.random()).toFixed(2)),
    })),
  }));

  return <><p className="hint">Основной ввод: 28 начальных значений (характеристики качества и дефектов), 7 выбранных функций и их расчет при t = 0. Все значения остаются в диапазоне (0; 1].</p><div className="input-columns">
    <section className="card">
      <div className="section-title">
        <div>
          <h2>Начальные значения</h2>
          <span>28 характеристик</span>
        </div>
        <button type="button" disabled={busy} onClick={randomizeInitial} className="random-btn">Случайные значения</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Характеристика</th><th>Значение при t = 0 · (0; 1]</th></tr></thead>
          <tbody>{MODEL.map((m,i)=><tr key={m.id}><td><span className="variable">u{m.id}</span>{m.label}</td><td><NumberField label={`u${m.id} начало`} value={input.initial[i]} disabled={busy} onChange={v=>initial(i,v)}/></td></tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="card function-card">
      <div className="section-title">
        <div>
          <h2>Уравнения</h2>
          <span>7 строк функций</span>
        </div>
        <button type="button" disabled={busy} onClick={randomizeWeights} className="random-btn" title="Сгенерировать случайные веса в уравнениях от 0 до 1">Случайные значения</button>
      </div>
      <p className="hint">Формулы зависят от нескольких характеристик модели и рассчитываются автоматически. Веса (коэффициенты) задаются от 0 до 1.</p>
      
      {input.assignments.map((row,i)=>{
        const pIndices = ROW_PARAMS[i] || [];
        let calculatedTotal = 0;
        row.coefficients.forEach((c, j) => {
          const pIdx = pIndices[j];
          const rawVal = pIdx !== undefined ? input.initial[pIdx] : 0.5;
          const uVal = Number(String(rawVal).replace(',', '.')) || 0;
          const numC = Number(String(c).replace(',', '.')) || 0;
          calculatedTotal += numC * uVal;
        });

        return <div className="function-row" key={i}>
          <div className="function-header">
            <label className="function-number">Строка {i+1} · F<select aria-label={`Строка ${i+1} номер F`} disabled={busy} value={row.id} onChange={e=>id(i,e.target.value)}>{Array.from({length:126},(_,j)=><option key={j+1} value={j+1}>{j+1}</option>)}</select></label>
          </div>
          <div className="polynomial">
            {row.coefficients.map((value,j)=>{
              const pIdx = pIndices[j];
              const paramModel = pIdx !== undefined ? MODEL[pIdx] : null;
              const paramName = paramModel ? `u${paramModel.id}` : `u${j+1}`;
              const rawVal = pIdx !== undefined ? input.initial[pIdx] : 0.5;
              const paramVal = Number(String(rawVal).replace(',', '.')) || 0;

              return <React.Fragment key={j}>
                {j>0&&<span className="poly-plus">+</span>}
                <NumberField label={`Строка ${i+1} коэффициент ${j+1}`} value={value} disabled={busy} readOnly={true}/>
                <span className="param-term">
                  · <span className="param-name" title={paramModel?.label}>{paramName}</span>
                  <span className="param-value-eq">(= {Number(paramVal.toFixed(3))})</span>
                </span>
              </React.Fragment>
            })}
            <span className="equation-result" title={`Значение функции F${row.id} при текущих начальных значениях`}>
              = {Number.isFinite(calculatedTotal) ? Number(calculatedTotal.toFixed(4)) : '—'}
            </span>
          </div>
        </div>
      })}

      {duplicate&&<div className="alert">Один номер F выбран несколько раз. Используются коэффициенты последней из этих строк сверху вниз.</div>}
      <p className="hint">Каждая функция объединяет несколько взаимосвязанных характеристик модели качества.</p>
      
      <details className="fak-options"><summary>Дополнительные параметры Fak</summary><p className="hint">Для каждого воздействия можно оставить встроенную формулу либо задать постоянное число от 0 до 1.</p>
        {disturbanceNames.map((name,i)=>{const value=input.fakOverrides?.[i]??null;return <div className="fak-option" key={i}>
          <label>Fak{i+1} · {name}
            <select aria-label={`Fak${i+1} способ задания`} disabled={busy} value={value===null?'original':'constant'} onChange={e=>onChange(c=>({...c,fakOverrides:(c.fakOverrides??Array(6).fill(null)).map((v,j)=>j===i?(e.target.value==='original'?null:originalDisturbances(0)[i]):v)}))}>
              <option value="original">Встроенная формула</option>
              <option value="constant">Постоянное значение</option>
            </select>
          </label>
          {value===null?<div className="fak-formula-preview">Fak{i+1}(t) = {FAK_STR_FORMULAS[i]}</div>:<NumberField label={`Fak${i+1} значение`} value={value} disabled={busy} onChange={v=>onChange(c=>({...c,fakOverrides:c.fakOverrides.map((n,j)=>j===i?v:n)}))}/>}
        </div>;})}
      </details>
    </section>
  </div></>;
}
