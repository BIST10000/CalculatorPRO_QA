// Rebuild the checked-in model from the plain-text extraction of 2021.docx.
import fs from 'node:fs';
const text = fs.readFileSync('../../analysis/report_2021.txt', 'utf8');
const equations = text.split(/\r?\n/).filter(line => /^du\d+\(t\)dt=/.test(line));
const ids = equations.map(line => Number(line.match(/^du(\d+)/)[1]));
const legacy = fs.readFileSync('../Models-and-methods-for-checking-the-feasibility-of-an-operation-plan-master/process.py', 'utf8');
const labelBlock = legacy.split('def labels_array():')[1].split('def process(')[0];
const labels = [...labelBlock.matchAll(/"([^"]+)"/g)].map(m => m[1]);
function term(s) {
  const factors = [...s.matchAll(/f(\d+)\(u(\d+)\(t\)\)/g)].map(m => [Number(m[1]), ids.indexOf(Number(m[2]))]);
  const disturbances = [...s.matchAll(/Fak(\d+)/g)].map(m => Number(m[1]) - 1);
  if (!factors.length && !disturbances.length) return null;
  return { factors, disturbances: disturbances.length ? disturbances : null };
}
const model = equations.map((equation, i) => {
  const body = equation.split('×(').slice(1).join('×(');
  const [positive, negative] = body.split('-');
  return {id: ids[i], label: labels[i], positive: term(positive), negative: term(negative || ''), source: equation};
});
if (model.length !== 28 || labels.length !== 28) throw Error('Expected 28 equations and labels');
const all = model.flatMap(row => [row.positive, row.negative].flatMap(t => t?.factors.map(f => f[0]) || []));
if (all.length !== 187 || new Set(all).size !== 187 || all.some((v, i) => v !== i + 1)) throw Error('Expected f1…f187 exactly once in order');
fs.mkdirSync('src', {recursive: true});
fs.writeFileSync('src/model-data.json', JSON.stringify(model, null, 2) + '\n');
console.log('Verified: 28 equations, 187 functions, all variable references resolved.');
