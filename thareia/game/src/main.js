// Boot: register every screen, install the shared card services, open the title screen.
// 'road' (the M2 Gauntlet screen) is an alias of 'world': go('road') mounts the world.
// Owner: WP8.
import './ui/theme.css';
import './ui/screens.css';
import { createApp } from './ui/app.js';
import { installCardServices } from './ui/card.js';
import { setReducedGetter } from './ui/lib/anim.js';
import * as battle from './ui/screens/battle.js';
import * as title from './ui/screens/title.js';
import * as newgame from './ui/screens/newgame.js';
import * as aftermath from './ui/screens/aftermath.js';
import * as party from './ui/screens/party.js';
import * as codex from './ui/screens/codex.js';
import * as settings from './ui/screens/settings.js';
import * as world from './ui/screens/world.js';
import * as atlas from './ui/screens/atlas.js';
import * as journal from './ui/screens/journal.js';
import { startBattle } from './rules/gauntlet.js';

const screens = { title, newgame, world, battle, aftermath, party, codex, settings, atlas, journal };
const aliases = { road: 'world' };

const app = createApp(document.getElementById('app'), screens, { aliases });

// Services exist before any screen mounts.
installCardServices(app);
setReducedGetter(() => app.reduced());

// Test seam: tools/e2e-flow.mjs (and e2e-world.mjs) define this before load to watch the app, and
// get a small kit to start a battle without walking into one. No-op otherwise.
if (typeof globalThis.__aethTest === 'function') globalThis.__aethTest(app, { startBattle });

app.go('title');
