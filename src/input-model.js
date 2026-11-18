import { preset, numericConfig, validate, MODEL } from './engine.js';

export const DEGREES = [3, 1, 2, 1, 2, 1, 2];
export const ROW_PARAMS = [
  [1, 2, 3, 4],     // Row 1: 4 parameters (анализируемость, изменяемость, стабильность, тестируемость)
  [5, 6],           // Row 2: 2 parameters (согласованность, несоответствие комплектности)
  [7, 8, 9],        // Row 3: 3 parameters (несоответствие стандартам, отсутствие лицензии, невысокий уровень языка)
  [10, 11],         // Row 4: 2 parameters (отсутствие схемы иерархии, низкая читабельность кода)
  [12, 13, 14],     // Row 5: 3 parameters (недостаточно комментариев, системный подход, большие модули)
  [15, 16],         // Row 6: 2 parameters (средства диагностики, средства регистрации)
  [17, 18, 19],     // Row 7: 3 parameters (трудоемкость изменений, уровень параметризации, локальность)
];
export const ORIGINAL_INITIAL = [.9,.9,.6,.5,.7,.4,.9,.24,.567,.234,.52,.25,.678,.7534,.67,.3,.4,.6,.234,.42,.56,.89,.9,.54,.67,.64,.873,.43];

// Exactly the Python form: 28 initial numbers, seven ids, 19 coefficients.
export function inputPreset(name = 'original') {
  const input = {
    initial: [...ORIGINAL_INITIAL],
    fakOverrides: Array(6).fill(null),
    assignments: DEGREES.map((degree, i) => ({ id: i + 1, coefficients: Array(degree + 1).fill(1) })),
  };
  if (name === 'comparison') {
    input.initial = Array(28).fill(.5);
    input.assignments[0].coefficients = [0,0,0,1];
  }
  if (name === 'weaker') {
    input.initial = Array(28).fill(.5);
    input.assignments[0].coefficients = [0,0,0,.1];
  }
  return input;
}

export function validateInput(input) {
  const value = numericConfig({initial:input.initial,assignments:input.assignments,fakOverrides:input.fakOverrides??Array(6).fill(null)});
  if (!Array.isArray(value.initial) || value.initial.length !== 28 || !value.initial.every(Number.isFinite)) throw Error('Начальное состояние: заполните все 28 полей конечными числами.');
  value.initial.forEach((u,i)=>{if(u<=0||u>1)throw Error('u('+MODEL[i].id+'): начальное значение должно быть больше 0 и не больше 1.');});
  if(!Array.isArray(value.fakOverrides)||value.fakOverrides.length!==6||!value.fakOverrides.every(v=>v===null||Number.isFinite(v)))throw Error('Для Fak требуется шесть конечных значений или null для встроенной формулы.');
  value.fakOverrides.forEach((v,i)=>{if(v!==null&&(v<=0||v>1))throw Error('Fak('+(i+1)+'): постоянное значение должно быть больше 0 и не больше 1.');});
  if (!Array.isArray(value.assignments) || value.assignments.length !== 7) throw Error('Нужно ровно семь строк функций.');
  value.assignments.forEach((row,i) => {
    if (!Number.isInteger(row.id) || row.id < 1 || row.id > 126) throw Error(`Строка ${i+1}: номер функции должен быть от 1 до 126.`);
    if (!Array.isArray(row.coefficients) || row.coefficients.length !== DEGREES[i]+1 || !row.coefficients.every(Number.isFinite)) throw Error(`Строка ${i+1}: требуется ${DEGREES[i]+1} числовых коэффициента.`);
  });
  // Ignore all extra fields in imported files; settings cannot be changed secretly.
  return {initial:[...value.initial],fakOverrides:[...value.fakOverrides],assignments:value.assignments.map(row=>({id:row.id,coefficients:[...row.coefficients]}))};
}

export function toEngineConfig(input) {
  const value = validateInput(input);
  const config = preset();
  config.initial = value.initial;
  config.allowInitialOutside = false;
  config.excludeZero = true;
  config.disturbanceOverrides = value.fakOverrides;
  config.duration = 1;
  config.samples = 80;
  config.disturbanceMode = 'original';
  config.disturbanceScale = 1;
  // In the Python app unselected factors are removed from products: identity 1.
  config.functions = Array.from({length:187},()=>[0,0,0,1]);
  value.assignments.forEach(({id,coefficients}) => {
    config.functions[id-1] = [...Array(4-coefficients.length).fill(0),...coefficients];
  });
  config.multiAssignments = value.assignments.map(({id, coefficients}, i) => ({
    id,
    paramIndices: ROW_PARAMS[i],
    coefficients,
  }));
  validate(config);
  return config;
}
