// Boot: register screens and open the title screen.
import './ui/theme.css';
import { createApp } from './ui/app.js';
import * as battle from './ui/screens/battle.js';

// Screens register here as they are built: { name: { mount(root, ctx, params) } }
const screens = {
  battle,
  title: {
    mount(root) {
      root.innerHTML = '<h1 class="title-display">Aethermoor</h1><p>Hearth &amp; Heirloom is being assembled.</p>';
    },
  },
};

const app = createApp(document.getElementById('app'), screens);
app.go('title');
