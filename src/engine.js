import modelData from './model-data.json' with { type: 'json' };

export const MODEL = modelData;
export const disturbanceNames = ['Опыт разработчиков', 'Опыт эксплуатационного персонала', 'Трудоёмкость разработки', 'Курс рубля к доллару', 'Репутация разработчиков', 'Репутация эксплуатирующей организации'];
export const poly = (x, [a, b, c, d]) => ((a * x + b) * x + c) * x + d;
export function originalDisturbances(t) {
  const cos = Math.cos(1.5 * t * Math.PI - Math.PI / 6);
  const sin = Math.sin(t * Math.PI - Math.PI / 6);
  return [t * t + 1, cos * cos / 4 + .2, sin / 2.5 + .3, 2 * t - 1, cos * cos / 4, sin * sin / 2.5 + .3];
}
export function disturbances(t, config) {
  return config.disturbanceMode === 'original'
    ? originalDisturbances(t).map(x => x * config.disturbanceScale)
    : config.disturbancePolynomials.map(p => poly(t, p));
}
function termValue(term, u, f, fak) {
  if (term === null) return 0;
  let value = 1;
  for (const [id, index] of term.factors) value *= poly(u[index], f[id - 1]);
  // No external factor means multiplication by 1, NOT by 0.
  if (term.disturbances !== null) value *= term.disturbances.reduce((sum, i) => sum + fak[i], 0);
  return value;
}
export function derivative(t, u, config) {
  const fak = disturbances(t, config);
  return MODEL.map((row, i) => (termValue(row.positive, u, config.functions, fak) - termValue(row.negative, u, config.functions, fak)) / config.scales[i]);
}
export function preset(name = 'demo') {
  const config = {
    initial: Array(28).fill(.5), scales: Array(28).fill(1),
    minimum: Array(28).fill(0), maximum: Array(28).fill(1),
    functions: Array.from({length: 187}, () => [0, 0, 1, 0]),
    disturbanceMode: 'original', disturbanceScale: .1,
    disturbancePolynomials: Array.from({length: 6}, () => [0, 0, 0, 0]),
    duration: 1, samples: 201, tolerance: 1e-8,
  };
  if (name === 'zero' || name === 'linear' || name === 'boundary') {
    config.functions = Array.from({length: 187}, () => [0, 0, 0, 0]);
    config.disturbanceMode = 'polynomial';
    config.duration = .5;
  }
  if (name === 'linear' || name === 'boundary') {
    config.functions[0] = [0, 0, 0, 1];
    config.disturbancePolynomials[0] = [0, 0, 0, .2];
  }
  if (name === 'boundary') config.duration = 3;
  return config;
}
export function numericConfig(input) {
  function convert(value) {
    if (Array.isArray(value)) return value.map(convert);
    if (typeof value === 'object' && value !== null) return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, convert(v)]));
    if (typeof value === 'string' && value !== 'original' && value !== 'polynomial') {
      if (!value.trim()) throw new Error('Есть пустое числовое поле. Заполните его перед расчётом.');
      return Number(value.replace(',', '.'));
    }
    return value;
  }
  return convert(input);
}
export function validate(config) {
  const finite = (x, label) => { if (!Number.isFinite(x)) throw new Error(`${label}: введите конечное число.`); };
  for (const key of ['initial', 'scales', 'minimum', 'maximum']) {
    if (!Array.isArray(config[key]) || config[key].length !== 28) throw new Error(`${key}: требуется 28 значений.`);
    config[key].forEach((x, i) => finite(x, `${MODEL[i].label} (${key})`));
  }
  MODEL.forEach((row, i) => {
    if (config.scales[i] <= 0) throw new Error(`u${row.id}: масштаб u* должен быть больше нуля.`);
    if (config.minimum[i] >= config.maximum[i]) throw new Error(`u${row.id}: минимум должен быть меньше максимума.`);
    if (!config.allowInitialOutside && (config.initial[i] < config.minimum[i] || config.initial[i] > config.maximum[i])) throw new Error(`u${row.id}: начальное значение вне допустимого диапазона.`);
  });
  for (const [key, length] of [['functions',187], ['disturbancePolynomials',6]]) {
    if (!Array.isArray(config[key]) || config[key].length !== length) throw new Error(`${key}: неверное число функций.`);
    config[key].forEach((p, i) => {
      if (!Array.isArray(p) || p.length !== 4) throw new Error(`${key} ${i+1}: нужны четыре коэффициента.`);
      p.forEach(x => finite(x, `${key} ${i+1}`));
    });
  }
  if (!['original','polynomial'].includes(config.disturbanceMode)) throw new Error('Неизвестный вид воздействий.');
  finite(config.disturbanceScale, 'Множитель воздействий');
  if (config.disturbanceScale < 0) throw new Error('Множитель воздействий должен быть неотрицательным.');
  finite(config.duration, 'Время');
  if (config.duration <= 0 || config.duration > 100) throw new Error('Время должно быть больше 0 и не больше 100.');
  if (!Number.isInteger(config.samples) || config.samples < 5 || config.samples > 1001) throw new Error('Число точек: целое от 5 до 1001.');
  if (!Number.isFinite(config.tolerance) || config.tolerance < 1e-12 || config.tolerance > 1e-3) throw new Error('Точность: от 1e-12 до 1e-3.');
}
function rk4(t, u, h, config) {
  const k1 = derivative(t,u,config);
  const k2 = derivative(t+h/2,u.map((v,i)=>v+h*k1[i]/2),config);
  const k3 = derivative(t+h/2,u.map((v,i)=>v+h*k2[i]/2),config);
  const k4 = derivative(t+h,u.map((v,i)=>v+h*k3[i]),config);
  return u.map((v,i)=>v+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
}
export function simulate(input) {
  const config = numericConfig(input);
  validate(config);
  const dt = config.duration / (config.samples-1);
  let h = Math.min(dt, .01), t = 0, u = [...config.initial], attempts = 0, accepted = 0;
  const rows = [{t: 0, values: [...u]}], violations = new Map();
  const observe = () => u.forEach((value, i) => {
    if ((value < config.minimum[i]-1e-10 || value > config.maximum[i]+1e-10) && !violations.has(i)) violations.set(i, {index:i, time:t, value});
  });
  observe();
  const checkpoints = [{t:0,values:[...u]}];
  // Preserve the original output grid (including 80 points) while evaluating
  // quarter snapshots at their exact times, not at the nearest output index.
  const key = value => value.toPrecision(15);
  const outputTimes = Array.from({length:config.samples-1},(_,i)=>(i+1)*dt);
  const checkpointTimes = [.25,.5,.75,1].map(f=>f*config.duration);
  const outputKeys = new Set(outputTimes.map(key));
  const checkpointKeys = new Set(checkpointTimes.map(key));
  const targets = [...new Map([...outputTimes,...checkpointTimes].map(value=>[key(value),value])).values()].sort((a,b)=>a-b);
  for (const target of targets) {
    while (target-t > 1e-13*Math.max(1,config.duration)) {
      if (++attempts > 100000) throw new Error('Слишком сложный расчёт: уменьшите время или коэффициенты. Результат не принят.');
      h = Math.min(h, target-t);
      const full = rk4(t,u,h,config);
      const middle = rk4(t,u,h/2,config);
      const half = rk4(t+h/2,middle,h/2,config);
      const error = Math.max(...half.map((v,i)=>Math.abs(v-full[i])/15/(config.tolerance*(1+Math.max(Math.abs(v),Math.abs(u[i]))))));
      const safe = [...half,...full,...middle].every(v => Number.isFinite(v) && Math.abs(v)<1e6);
      if (!safe || !Number.isFinite(error) || error > 1) {
        h *= safe && Number.isFinite(error) ? Math.max(.1,.8*error**(-.2)) : .25;
        if (h < 1e-12*Math.max(1,config.duration)) throw new Error(`Расчёт неустойчив около t=${t.toPrecision(5)}. Уменьшите время или коэффициенты. Значения не обрезаны.`);
        continue;
      }
      // Richardson correction; accepted steps remain unmodified, including negative values.
      u = half.map((v,i)=>v+(v-full[i])/15);
      t += h;
      accepted++;
      observe();
      h *= error === 0 ? 2 : Math.min(2,Math.max(.5,.9*error**(-.2)));
    }
    t = target;
    if (outputKeys.has(key(target))) rows.push({t, values:[...u]});
    if (checkpointKeys.has(key(target))) checkpoints.push({t, values:[...u]});
  }
  return {config, rows, checkpoints, violations:[...violations.values()], accepted, final:[...u]};
}
export function csv(result) {
  const lines = [['t',...MODEL.map(m=>`u${m.id}`)].join(';')];
  for (const row of result.rows) lines.push([row.t,...row.values].map(v=>String(v)).join(';'));
  return '\uFEFF'+lines.join('\r\n');
}
