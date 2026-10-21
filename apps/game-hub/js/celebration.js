(function () {
  'use strict';

  function createCelebrationVideo(src) {
    var wrap = document.createElement('div');
    wrap.className = 'lq-celebration-wrap';

    var canvas = document.createElement('canvas');
    canvas.className = 'lq-celebration';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Animasi kucing bertepuk tangan merayakan hasil kuis');

    var video = document.createElement('video');
    video.className = 'lq-celebration-source';
    video.src = src;
    video.autoplay = true;
    video.loop = true;
    video.muted = false;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');
    video.tabIndex = -1;

    var soundButton = document.createElement('button');
    soundButton.className = 'lq-btn lq-btn--primary';
    soundButton.type = 'button';
    soundButton.textContent = 'Putar animasi dengan suara';
    soundButton.hidden = true;
    soundButton.addEventListener('click', function () {
      video.muted = false;
      try {
        var playback = video.play();
        if (playback && typeof playback.then === 'function') {
          playback.then(function () { soundButton.hidden = true; }, function () { soundButton.hidden = false; });
        }
      } catch (_) {
        soundButton.hidden = false;
      }
    });

    wrap.appendChild(canvas);
    wrap.appendChild(video);
    wrap.appendChild(soundButton);

    var context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context || typeof context.getImageData !== 'function') {
      canvas.hidden = true;
      video.controls = true;
      video.removeAttribute('aria-hidden');
      video.tabIndex = 0;
      video.className = 'lq-celebration-fallback';
      return wrap;
    }

    var lastTime = -1, frameScheduled = false;
    function drawFrame() {
      if (video.readyState < video.HAVE_CURRENT_DATA || !video.videoWidth) return;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      var frame = context.getImageData(0, 0, canvas.width, canvas.height);
      var pixels = frame.data;
      for (var i = 0; i < pixels.length; i += 4) {
        var green = pixels[i + 1] - Math.max(pixels[i], pixels[i + 2]);
        if (green <= 18) continue;
        var key = Math.min(1, (green - 18) / 55);
        pixels[i + 1] = Math.min(pixels[i + 1], Math.max(pixels[i], pixels[i + 2]) + 18);
        pixels[i + 3] = Math.round(pixels[i + 3] * (1 - key));
      }
      context.putImageData(frame, 0, 0);
    }

    function scheduleFrame() {
      if (frameScheduled) return;
      frameScheduled = true;
      if (typeof video.requestVideoFrameCallback === 'function') {
        video.requestVideoFrameCallback(function () {
          frameScheduled = false;
          drawFrame();
          scheduleFrame();
        });
        return;
      }
      window.requestAnimationFrame(function () {
        frameScheduled = false;
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          drawFrame();
        }
        if (!video.paused && !video.ended) scheduleFrame();
      });
    }

    video.addEventListener('loadeddata', function () {
      drawFrame();
      if (!video.paused) scheduleFrame();
    });
    video.addEventListener('play', scheduleFrame);

    try {
      var playback = video.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch(function () { soundButton.hidden = false; });
      }
    } catch (_) {
      soundButton.hidden = false;
    }
    return wrap;
  }

  window.GameHubCelebration = { create: createCelebrationVideo };
})();
