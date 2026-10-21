import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(__dirname, '../js/app-simulation.js'), 'utf-8');

function submitWithAnswer(answer) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      innerText: '',
      innerHTML: '',
      style: {},
      classList: { add() {}, remove() {}, contains() { return false; } },
      addEventListener() {}
    });
    return elements.get(id);
  };
  element('question').value = answer;

  const context = {
    appState: {
      currentCase: {
        questions: [{ id: 'question', type: 'number', correct: 0, label: 'Nilai', hint: '' }],
        explanation: ''
      },
      currentMode: 'latihan',
      currentModule: 'PPh',
      user: { xp: 0, history: [] }
    },
    document: {
      getElementById: element,
      querySelectorAll: () => [{ classList: { remove() {}, add() {} } }]
    },
    window: {},
    saveData() {},
    updateProfileUI() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);
  context.submitSimulation();
  return element('result-score').innerText;
}

assert.equal(submitWithAnswer(''), 0, 'jawaban kosong tidak boleh benar saat kunci bernilai nol');
assert.equal(submitWithAnswer('0'), 100, 'jawaban nol yang diisi tetap benar');
console.log('2 lulus, 0 gagal');
