import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sounds = [];
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
  createOscillator() {
    const oscillator = {
      frequency: { setValueAtTime(value) { oscillator.value = value; } },
      connect() {},
      start() { sounds.push({ type: 'tone', frequency: oscillator.value }); },
      stop() {}
    };
    return oscillator;
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
}
class FakeAudio {
  constructor(src) { this.src = src; this.currentTime = 0; }
  play() { sounds.push({ type: 'file', src: this.src }); return Promise.resolve(); }
}

const context = {
  window: {
    AudioContext: FakeAudioContext,
    Audio: FakeAudio,
    console,
    URL,
    document: { currentScript: { src: 'https://example.test/apps/game-hub/js/audio-feedback.js' } }
  },
  Audio: FakeAudio,
  document: { currentScript: { src: 'https://example.test/apps/game-hub/js/audio-feedback.js' } },
  URL,
  console,
  Promise
};
vm.runInNewContext(readFileSync(new URL('../apps/game-hub/js/audio-feedback.js', import.meta.url), 'utf8'), context);
const audio = context.window.GameHubAudio;
let passed = 0;
let failed = 0;
function check(condition, message) {
  if (condition) passed++;
  else { failed++; console.error('FAIL:', message); }
}

audio.countdown('room:0', 20000, false);
check(sounds.length === 0, 'tidak berbunyi sebelum 10 detik terakhir');
audio.countdown('room:0', 10000, false);
audio.countdown('room:0', 9750, false);
check(sounds.length === 1 && sounds[0].type === 'tone', 'berbunyi sekali pada detik ke-10, bukan setiap render');
audio.countdown('room:0', 9000, false);
check(sounds.length === 2, 'bunyi mengikuti detik berikutnya');
audio.countdown('room:0', 8000, true);
check(sounds.length === 2, 'bunyi timer berhenti setelah siswa menjawab');
audio.countdown('room:1', 10000, false);
check(sounds.length === 3, 'timer soal baru mulai hitung ulang');

audio.answerResult('room:0', true, false);
check(sounds.length === 3, 'tidak berbunyi jika siswa tidak menjawab');
audio.answerResult('room:0', true, true);
audio.answerResult('room:0', true, true);
check(sounds.length === 5 && sounds[3].frequency < sounds[4].frequency, 'efek benar berupa dua nada naik dan tidak berulang');
audio.answerResult('room:1', false, true);
check(sounds.length === 6 && sounds[5].type === 'file' && /\/assets\/sounds\/buzzer\.mp3$/.test(sounds[5].src), 'efek salah memutar file buzzer lokal');

console.log(`test-gamehub-audio: ${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
