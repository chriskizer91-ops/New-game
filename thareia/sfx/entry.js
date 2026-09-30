// Bundle entry for the page: the sound library and the music, on window.TH.
import { SFX, sfxInit, playSfx } from './sounds.js';
import { MUSIC, musicPlay, musicStop, musicPlaying } from './music.js';
window.TH = { SFX, sfxInit, playSfx, MUSIC, musicPlay, musicStop, musicPlaying };
