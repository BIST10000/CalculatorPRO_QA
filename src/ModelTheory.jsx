import React from 'react';
import {MODEL,disturbanceNames} from './engine.js';
const FAK_FORMULAS=[
 <span>(t<sup>2</sup> + 1) / 2</span>,
 <span>cos<sup>2</sup>(1,5πt − π/6) / 4 + 0,2</span>,
 <span>sin(πt − π/6) / 5 + 0,5</span>,
 <span>(t + 1) / 2</span>,
 <span>cos<sup>2</sup>(1,5πt − π/6) / 4 + 0,1</span>,
 <span>sin<sup>2</sup>(πt − π/6) / 5 + 0,3</span>,
];
function Term({term}){
 if(!term)return <span>0</span>;
 return <>{term.factors.length>0&&term.factors.map(([id,index],i)=><React.Fragment key={id}>{i>0&&' · '}f<sub>{id}</sub>(u<sub>{MODEL[index].id}</sub>(t))</React.Fragment>)}{term.disturbances!==null?<>{term.factors.length>0&&' · '}({term.disturbances.map((index,i)=><React.Fragment key={index}>{i>0&&' + '}Fak<sub>{index+1}</sub>(t)</React.Fragment>)})</>:term.factors.length===0?'1':null}</>;
}
export default function ModelTheory({input}){
 return <section className="card prose model-theory"><h2>Математическая модель</h2>
 <p>Характеристика u<sub>i</sub>(t) описывает состояние одного свойства или недостатка ПО в момент t. Начальные значения задаются в «Параметрах». На графике каждая кривая подписана u(i), где i — номер характеристики, например u(5) — сопровождаемость.</p>
 <div className="formula-block">0 &lt; u<sub>i</sub>(0) ≤ 1, 0 ≤ t ≤ 1, t<sub>k</sub> = k / 79, k = 0, …, 79.</div>
 <h3>Функции взаимного влияния</h3><p>В семи строках выбираются номера функций и их коэффициенты. Аргумент u(i) — значение характеристики, от которой зависит соответствующая связь. Степени строк: 3, 1, 2, 1, 2, 1, 2.</p>
 <div className="formula-block">f<sub>j</sub>(u(i)) = a · u(i)<sup>3</sup> + b · u(i)<sup>2</sup> + c · u(i) + d<br/>f<sub>j</sub>(u(i)) = a · u(i)<sup>2</sup> + b · u(i) + c<br/>f<sub>j</sub>(u(i)) = a · u(i) + b</div>
 <p>Невыбранная функция является множителем 1. При повторе номера функции используются коэффициенты последней строки сверху вниз.</p>
 <h3>Как рассчитывается изменение характеристик</h3>
 <div className="formula-block"><span className="fraction"><span>du<sub>i</sub>(t)</span><span>dt</span></span> = [ P<sub>i</sub>(u,t) − N<sub>i</sub>(u,t) ] / s<sub>i</sub>, s<sub>i</sub> = 1.</div>
 <p>P<sub>i</sub> — слагаемое со знаком плюс, N<sub>i</sub> — слагаемое со знаком минус. Их численные значения могут быть отрицательными. В каждой части функции влияния перемножаются, а относящиеся к ней Fak складываются. Если внешний множитель отсутствует, он равен 1; если отсутствует всё слагаемое, оно равно 0.</p>
 <div className="formula-block equation-scroll">du<sub>5</sub>/dt = f<sub>1</sub>(u<sub>26</sub>) · (Fak<sub>1</sub> + Fak<sub>2</sub> + Fak<sub>6</sub>) −<br/> f<sub>2</sub>(u<sub>54</sub>) · f<sub>3</sub>(u<sub>55</sub>) · f<sub>4</sub>(u<sub>56</sub>) · f<sub>5</sub>(u<sub>109</sub>) · f<sub>6</sub>(u<sub>110</sub>) · f<sub>7</sub>(u<sub>113</sub>) · f<sub>8</sub>(u<sub>123</sub>) · f<sub>9</sub>(u<sub>124</sub>) · Fak<sub>4</sub>.</div>
 <h3>Все внешние воздействия Fak</h3><p>По умолчанию используются следующие зависимости. Все встроенные формулы Fak дают значения строго в (0; 1]. В дополнительных параметрах каждый Fak можно независимо заменить постоянным значением c<sub>i</sub> ∈ (0; 1]: тогда Fak<sub>i</sub>(t) = c<sub>i</sub> на всём интервале расчёта.</p>
 <div className="fak-theory-grid">{FAK_FORMULAS.map((formula,i)=><div className="fak-formula" key={i}><b>Fak{i+1} · {disturbanceNames[i]}</b><div className="formula-block">Fak<sub>{i+1}</sub>(t) = {formula}</div>{input.fakOverrides?.[i]!=null&&<p>В текущих параметрах заменено на константу: Fak{i+1}(t) = {String(input.fakOverrides[i])}.</p>}</div>)}</div>
 <h3>Численный метод</h3><p>Система решается методом Рунге — Кутты четвёртого порядка. Для состояния U и шага h вычисляются:</p>
 <div className="formula-block">k<sub>1</sub> = F(t, U)<br/>k<sub>2</sub> = F(t + h/2, U + hk<sub>1</sub>/2)<br/>k<sub>3</sub> = F(t + h/2, U + hk<sub>2</sub>/2)<br/>k<sub>4</sub> = F(t + h, U + hk<sub>3</sub>)<br/>U<sub>RK4</sub>(t+h) = U + h(k<sub>1</sub> + 2k<sub>2</sub> + 2k<sub>3</sub> + k<sub>4</sub>)/6.</div>
 <p>Ошибка оценивается сравнением одного полного шага и двух полушагов. Обозначим их результаты U<sub>h</sub> и U<sub>h/2</sub>. Принимается уточнённое значение U<sub>h/2</sub> + (U<sub>h/2</sub> − U<sub>h</sub>)/15. Шаг выбирается адаптивно; заданная точность — 10<sup>−8</sup>. Сохраняются 80 точек результата и пять снимков при t = 0; 0,25; 0,5; 0,75; 1.</p>
 <h3>Как читать графики</h3><ul><li>Горизонтальная ось — условное время t. Вертикальная ось графика характеристик — u(i) в диапазоне (0; 1]. Ноль исключён.</li><li>Каждая сплошная линия подписана номером характеристики; полное название указано в легенде. Нужные линии выбираются под графиком.</li><li>На графике u показываются только допустимые участки. Если расчётное значение стало ≤ 0 или &gt; 1, кривая прерывается. Числа в таблице и CSV сохраняются без подмены.</li><li>Fak отображаются на отдельном графике со своей шкалой: все встроенные формулы дают значения в (0; 1].</li><li>Рост свойства качества и рост недостатка имеют разный смысл. Для первых шести характеристик рост обычно желателен, для недостатков обычно желателен спад.</li><li>На снимках синий контур — начальное состояние, красный — текущее. У каждого снимка своя шкала; площадь контура не является общей оценкой качества.</li></ul>
 <details><summary>Уравнения всех 28 характеристик</summary>{MODEL.map(row=><div className="equation" key={row.id}><b>u({row.id}) · {row.label}</b><div className="formula-block">du<sub>{row.id}</sub>(t)/dt = [ <Term term={row.positive}/> − (<Term term={row.negative}/>) ] / 1.</div></div>)}</details>
 </section>;
}
