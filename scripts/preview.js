/**
 * Serves the film for interactive preview. Open the printed URL; the audio is the clock.
 *
 *   npm run preview     (space = play/pause, arrows = seek, Home = restart)
 */
import { buildAudio } from './build-audio.js';
import { startServer } from './lib/server.js';

buildAudio();
const server = await startServer(5173);
process.stdout.write(`Preview: ${server.url}/src/web/index.html?preview\nPress Ctrl+C to stop.\n`);
