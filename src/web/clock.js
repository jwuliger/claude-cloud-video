/** Preview clock: the audio element is the single source of time, and the film follows it. */

const SEEK_STEP = 1;

/**
 * @param {{ seek: (time: number) => void, duration: number }} film
 * @param {string} audioUrl
 */
export function attachAudioClock(film, audioUrl) {
  const audio = new Audio(audioUrl);
  audio.preload = 'auto';

  const follow = () => {
    film.seek(Math.min(audio.currentTime, film.duration));
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (audio.paused) {
        void audio.play();
      } else {
        audio.pause();
      }
    } else if (event.code === 'ArrowRight') {
      audio.currentTime = Math.min(film.duration, audio.currentTime + SEEK_STEP);
    } else if (event.code === 'ArrowLeft') {
      audio.currentTime = Math.max(0, audio.currentTime - SEEK_STEP);
    } else if (event.code === 'Home') {
      audio.currentTime = 0;
    }
  });
}
