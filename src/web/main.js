/** Browser entry. Boots the film and exposes a single `film.seek(seconds)` for the renderer. */

import { VIDEO } from '../config/video.config.js';
import { buildFilm } from './film.js';
import { applyTokens, loadFont } from './tokens.js';

/** @returns {HTMLElement} */
function getStage() {
  const stage = document.getElementById('stage');
  if (!stage) {
    throw new Error('Missing #stage element.');
  }
  return stage;
}

/**
 * Preview only: scale the 1920x1080 stage to the window.
 * @param {HTMLElement} stage
 */
function fitToWindow(stage) {
  const scale = Math.min(window.innerWidth / VIDEO.layoutWidth, window.innerHeight / VIDEO.layoutHeight);
  stage.style.transform = `scale(${scale})`;
}

async function boot() {
  const stage = getStage();
  applyTokens(stage);
  await loadFont();
  const film = buildFilm(stage);
  film.seek(0);
  Object.assign(window, { film: { ...film, fps: VIDEO.fps } });
  if (new URLSearchParams(location.search).has('preview')) {
    fitToWindow(stage);
    window.addEventListener('resize', () => fitToWindow(stage));
  }
  document.documentElement.dataset['ready'] = 'true';
}

boot().catch((error) => {
  document.documentElement.dataset['error'] = String(error);
  throw error;
});
