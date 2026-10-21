(function (global) {
  'use strict';

  var AudioContextClass = global.AudioContext || global.webkitAudioContext;
  var audioContext = AudioContextClass ? new AudioContextClass() : null;
  var buzzer = new Audio(new URL('../assets/sounds/buzzer.mp3', document.currentScript.src).href);
  var countdownKey = '';
  var countdownSecond = null;
  var lastResultKey = '';

  function unlock() {
    if (audioContext && audioContext.state === 'suspended') {
      return audioContext.resume().catch(function (error) {
        console.warn('Game Hub audio could not be unlocked.', error);
      });
    }
    return Promise.resolve();
  }

  function tone(frequency, delay, duration, volume) {
    if (!audioContext) return;
    var start = audioContext.currentTime + delay;
    var oscillator = audioContext.createOscillator();
    var gain = audioContext.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  function tick() {
    tone(880, 0, 0.045, 0.07);
  }

  function correct() {
    tone(660, 0, 0.11, 0.12);
    tone(990, 0.1, 0.16, 0.12);
  }

  function wrong() {
    buzzer.currentTime = 0;
    var playback = buzzer.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(function (error) { console.warn('Game Hub buzzer playback failed.', error); });
    }
  }

  function countdown(questionKey, remainingMs, answered) {
    if (!questionKey || answered || remainingMs <= 0) return;
    if (questionKey !== countdownKey) {
      countdownKey = questionKey;
      countdownSecond = null;
    }
    var seconds = Math.ceil(remainingMs / 1000);
    if (seconds > 10 || seconds === countdownSecond) return;
    countdownSecond = seconds;
    tick();
  }

  function resetCountdown() {
    countdownKey = '';
    countdownSecond = null;
  }

  function answerResult(questionKey, isCorrect, answered) {
    if (!answered || !questionKey || questionKey === lastResultKey) return;
    lastResultKey = questionKey;
    if (isCorrect) correct();
    else wrong();
  }

  global.GameHubAudio = { unlock: unlock, countdown: countdown, resetCountdown: resetCountdown, answerResult: answerResult };
})(window);
