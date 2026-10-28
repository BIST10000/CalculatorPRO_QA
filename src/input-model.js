import { preset, numericConfig, validate } from './engine.js';

export const DEGREES = [3, 1, 2, 1, 2, 1, 2];
export const ORIGINAL_INITIAL = [.9,.9,.6,.5,.7,.4,.9,.24,.567,.234,.52,.25,.678,.7534,.67,.3,.4,.6,.234,.42,.56,.89,.9,.54,.67,.64,.873,.43];

// Exactly the Python form: 28 initial numbers, seven ids, 19 coefficients.
export function inputPreset(name = 'original') {
  const input = {
    initial: [...ORIGINAL_INITIAL],
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
  const value = numericConfig(input);
  if (!Array.isArray(value.initial) || value.initial.length !== 28 || !value.initial.every(Number.isFinite)) throw Error('Начальное состояние: заполните все 28 полей конечными числами.');
  if (!Array.isArray(value.assignments) || value.assignments.length !== 7) throw Error('Нужно ровно семь строк функций.');
  value.assignments.forEach((row,i) => {
    if (!Number.isInteger(row.id) || row.id < 1 || row.id > 126) throw Error(`Строка ${i+1}: номер функции должен быть от 1 до 126.`);
    if (!Array.isArray(row.coefficients) || row.coefficients.length !== DEGREES[i]+1 || !row.coefficients.every(Number.isFinite)) throw Error(`Строка ${i+1}: требуется ${DEGREES[i]+1} числовых коэффициента.`);
  });
  // Ignore all extra fields in imported files; settings cannot be changed secretly.
  return {initial:[...value.initial],assignments:value.assignments.map(row=>({id:row.id,coefficients:[...row.coefficients]}))};
}

export function toEngineConfig(input) {
  const value = validateInput(input);
  const config = preset();
  config.initial = value.initial;
  config.allowInitialOutside = true;
  config.duration = 1;
  config.samples = 80;
  config.disturbanceMode = 'original';
  config.disturbanceScale = 1;
  // In the Python app unselected factors are removed from products: identity 1.
  config.functions = Array.from({length:187},()=>[0,0,0,1]);
  value.assignments.forEach(({id,coefficients}) => {
    config.functions[id-1] = [...Array(4-coefficients.length).fill(0),...coefficients];
  });
  validate(config);
  return config;
}
