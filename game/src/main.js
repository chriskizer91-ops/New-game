// Boot: register every screen, install the shared card services, open the title screen.
import './ui/theme.css';
import './ui/screens.css';
import { createApp } from './ui/app.js';
import { installCardServices } from './ui/card.js';
import { setReducedGetter } from './ui/lib/anim.js';
import * as battle from './ui/screens/battle.js';
import * as title from './ui/screens/title.js';
import * as newgame from './ui/screens/newgame.js';
import * as road from './ui/screens/road.js';
import * as aftermath from './ui/screens/aftermath.js';
import * as party from './ui/screens/party.js';
import * as codex from './ui/screens/codex.js';
import * as settings from './ui/screens/settings.js';

const screens = { title, newgame, road, battle, aftermath, party, codex, settings };

const app = createApp(document.getElementById('app'), screens);

// Services exist before any screen mounts.
installCardServices(app);
setReducedGetter(() => app.reduced());

// Test seam: tools/e2e-flow.mjs defines this before load to watch the app. No-op otherwise.
if (typeof globalThis.__aethTest === 'function') globalThis.__aethTest(app);

app.go('title');
