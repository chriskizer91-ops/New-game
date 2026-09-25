// Boot: register screens and open the title screen.
import './ui/theme.css';
import { createApp } from './ui/app.js';

// Screens register here as they are built: { name: { mount(root, ctx, params) } }
const screens = {
  title: {
    mount(root, ctx) {
      root.innerHTML = '<h1 class="title-display">Aethermoor</h1><p>Hearth &amp; Heirloom is being assembled.</p>';
    },
  },
};

const app = createApp(document.getElementById('app'), screens);
app.go('title');
