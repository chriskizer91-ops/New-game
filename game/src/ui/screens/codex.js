// The Hearth Codex binder (M3 spec §5.6; M4 spec §4.4, §5.2): one page per region, tabbed I · II · III · IV.
// mount(root, ctx, { from = 'world', page? }): Back returns to `from`. The binder opens on `page`, else
// on the page of the region the party stands in (Page I in the Wilds).
//
//   - page tabs: I, II, III (M5) and IV (M6) show their region and a claimed count (a tick once the page is
//     finished); a page with no relics yet (none since M6) would show a padlock and the region's name, and
//     open a sealed panel with the region's closed roads instead of pockets. An open page whose road is still
//     shut (the Ironspire before the second council, the Gloomfen before the third) says what opens it
//     (ROAD_NOTE)
//   - each open page: its progress ("9 of 14 claimed, 12 sighted", rules/codex.js pageProgress), a
//     bar, and its reward line (data/codex.js PAGES: greyed until earned, then gold with the day)
//   - its pockets, in Codex order: the portrait, the name (a riddle while unsighted), who holds it,
//     and the three stamps (Sighted, Claimed, Awakened); Awakened pockets glow. The starters you did
//     not choose stay in the Keep (Tamsin only ever lends hers): their pockets say so, and the page
//     does not count them. Tap a pocket for its card (a silhouette, the grey held card, or yours)
//   - the footer keeps M3's stamp legend
// Pure helpers for tests (node): binderPage(game, pageId) (M5: with its road note), defaultPage(game),
// RIDDLES, HOLDER, ROAD_NOTE.
// Test hooks: .cx-tab[data-page][aria-selected]; .cx-head[data-page]; .cx-prog; .cx-reward[data-earned];
//   .cx-sealed; .pocket[data-relic][data-state] (+ .is-awakened, .is-spare).
// Owner: WP8; M4 P7b (the binder); M5 P7 (Page III: its riddles and holders, the road notes); M6 P7 (Page IV).
import { RELICS } from '../../data/relics.js';
import { PAGES } from '../../data/codex.js';
import { STARTERS } from '../../data/heroes.js';
import { MAPS } from '../../data/maps/index.js';
import { relicsOn, pageProgress } from '../../rules/codex.js';
import { relicItem } from '../../rules/loot.js';
import { createRng } from '../../core/rng.js';
import { el, esc, button } from '../lib/dom.js';
import { portraitCanvas, rarityColor, rarityName } from '../lib/art.js';
import { codexNo } from '../lib/items.js';
import { screenNav } from '../lib/keys.js';
import { regionOpen } from '../lib/atlas-geo.js';

export const RIDDLES = Object.freeze({
  hearthbrand: 'It has never once gone cold. Ask Fenwick where the Keep keeps its coals.',
  'stillwater-lance': 'Cut from a lake the winter it held its breath.',
  cairnmaul: 'A stone from the Old Road that refused to break.',
  'wardens-seal': 'Pressed into every oath the Keep has sworn. Someone with ink-stained fingers wants the oaths.',
  tallyknife: 'Every notch is a debt. Look for the one counting coins by lamplight.',
  thornsplitter: 'A ranger buried it in something that never forgave him. Listen for grunting in the black mud.',
  'rotwood-circlet': 'Grown, not made. The white stag of Fawnrest does not wear white any more.',
  'thornwatch-hood': 'Thirty names were on the roll once. A toll-keeper wears one he never earned.',
  'thornwatch-jerkin': 'It knits itself closed. Someone in a Tallyman camp is wearing it badly.',
  'thornwatch-boots': 'They leave no trail the forest will tell. Deep in the bramble, someone is walking in them.',
  thornwreath: 'It grew around a skull the night the hearth flickered, and it has not stopped growing.',
  briarfang: 'A fang the length of a knife, still in the mouth it came from.',
  lightfingers: 'Cold hands, quick hands. The queen of a hollow by the Hearth Road never pays a toll.',
  hartshorn: 'It still pulls toward deer. Look across the millrace, where a poacher keeps his holm.',
  'mosswatch-lantern': 'The lights at midnight are not ghosts. Ghosts do not need a lantern.',
  'watchkeepers-kettle': 'An old man in a mossy tower wears his pot like a crown. Talk to him, or help him.',
  'mire-pearl': 'Something in the Mossfall shrine wears reeds for a crown and a pearl for a heart.',
  dawnbell: 'Fawnrest lost its bell to something with wings. Listen for humming in the pale trees.',
  rootsong: 'The Grove circle sings under the new moon, and the Thornmother leads the song.',
  oathshield: 'Three rangers went down into the roots. One of them still holds the line, and does not know why.',
  'isoldes-oath': 'The Commander’s own blade, pawned one hard winter. Someone is counting sap with it now.',
  'ichor-mask': 'A smith’s mask on something that was never a smith. It drinks from the eldest trees.',
  'first-seed': 'The first thing that ever grew in the Wilds, and the last thing the Rot wants to give back.',
  'vale-gauntlets': 'Tamsin never takes them off. You will have to beat her to see her hands.',
  // Page II: the Sunscorch Wastes
  sandwalkers: 'They have never once sunk. A rider takes her toll in water on the Sunward Road.',
  'zaras-orrery': 'It hums an hour that has not happened yet. A caravan-mistress in Sandspire has lost the crate it sleeps in.',
  wyrmscale: 'A scale big enough to hide behind, still on the thing it grew on. Something in the Dust Trail breathes under the sand.',
  'sunstone-lantern': 'A sun in a brass cage, carried down the Dusthaven shaft by a foreman who counts every stone.',
  'glass-carapace': 'Glass that remembers being a dune. Something in the heart of the mine wears it like a shell.',
  dunebreaker: 'A maul that cracks glassed dunes. The Raider-King of the Flats says he took it from a giant.',
  cinderfang: 'Forged to kill a dragon, and still warm from failing. It is caught in a tail, deep under Dusthaven.',
  'mirage-glass': 'A lens of well-water that never spills. The queen of Miragewell’s lights will not lend it.',
  'qasims-signet': 'Pressed into every water-tally in Sandspire. The Cistern Lord gives it only for water.',
  'sunstone-heart': 'It beats. An assayer in Dusthaven keeps a secret, and asks for a lantern’s worth of light.',
  'scorchgate-key': 'A key ring with no key on it. A captain of ash still walks the walls of Scorchgate with it.',
  'ashen-aegis': 'Scorchgate’s last shield, carried out of the fire and never put down. It still stands watch below.',
  'cinder-crown': 'Every ember in it was a soldier. Whoever wears it in the Vault of Ash still gives them orders.',
  saltglass: 'It sings when it is drawn. A sharpshooter rides with the Tallyman caravan across the Flats.',
  // Page III: the Ironspire Peaks (M5)
  'windstep-boots': 'A monk crossed the great slide in them without touching a stone. A deserter wears them now, at his toll chain on the Rockslide Pass.',
  veilbell: 'Cast from the great bell’s first crack. The abbess of Peak’s Veil rings it for the drowned every evening, and will give it to whoever quiets them.',
  ironwall: 'A dwarf door, cut down to carry. Iron hands hold it at the foot of the Iron Stair, for a Thane who has sealed his own halls.',
  'drowned-censer': 'It swings by itself, and its smoke is always wet. An abbess who drowned still carries it on the island in Frostmere.',
  'ironvein-bracers': 'Ironhold work, small at the wrist. Someone else is hunting Harrow, and she waits on the Deeps stair with them on.',
  'roc-feather-cloak': 'Three feathers make a cloak that sheds rain, snow and arrows. The bird that grew them nests on the Highfold crags.',
  'thanes-rune': 'A ring of black iron the Deeps’ doors were cut to know. Only the Thane of Ironhold can give it, and he gives nothing for free.',
  'trollhide-mantle': 'Hides that still grow back a little. An old troll wears them in a cave on the Iron Stair, behind a wall of blue ice.',
  runestaff: 'Runes cut by a smith who went missing. His journeyman still works it in a side forge, down in the dark under Ironhold.',
  'anvil-heart': 'It glows through iron ribs like coals through a grate, and beats like a bellows. It waits in the forge below the Ironhold Deeps.',
  'worldforge-hammer': 'A smith who never once put his hammer down. Something he built still swings it, in his forge under Ironhold.',
  'cutters-pick': 'A notch in the haft for every block of lake it took. The Tallymen’s Cutter-Chief keeps it at the saw camp on the Frost Road.',
  'rime-crozier': 'Frozen to its bearer’s hand for thirty years. He went down under Frostmere to listen, and never came back up.',
  'hushweave-cowl': 'Woven from something that was not wool, by someone who was listening. The Abbot under the ice wears it pulled low.',
  // Page IV: the Gloomfen Marsh (M6)
  'unfair-toll': 'A clipped coin that always comes down the same way up. The old man who keeps Rotbridge will part with it only over a game he thinks he cannot lose.',
  bogstriders: 'Boots for a country where the ground is only a rumour. Tamsin came down into the fen in them, following the letters.',
  'weeping-bow': 'Strung with a hair from a willow that has wept for three hundred years. Out past Willowmurk’s failing wards, the oldest willow has started to walk.',
  'willow-ward': 'The last of the three shields Willowmurk made for its wards. Elder Moss keeps it for whoever quiets what walks outside them.',
  'hag-stone': 'A holed stone on a ring of bog-iron: look through it, and see what is really there. Mother Grue wears it in her sunken hut in the Lanternfen.',
  'lamplighters-lantern': 'The lamp that led a drowned city’s children out along the boardwalk. Bogmire’s children are following it into the eastern bogs at night.',
  'mourning-veil': 'Black lace, still wet. The Lantern Mother has worn it since the night she went back for the last child.',
  'salvagers-helm': 'A copper diving helm with a Tallyman stamp on the brow. The salvage crew’s master wears it at their camp in the Misthollow Ruins.',
  'cantors-staff': 'It has beaten time under the water for a thousand years, for a song that must not stop. The choir’s master keeps it in the belfry below Misthollow.',
  'gar-tooth': 'A tooth as long as your hand, and the gar it came from has a mouthful more. Old Jaws keeps his pool down the Blackwater Reach.',
  'barge-gauntlets': 'A link of a great chain set in each palm. The Bargemaster keeps the chain-post at the Tallymen’s camp on the Tidal Flats.',
  'corvus-harpoon': 'A diver lost it in something on his last dive. Whatever it struck still carries it in its side, in the deep off the Tidal Flats.',
  'deep-pearl': 'Grown in a brow over a thousand years in the dark, and it glows. The thing the Tallymen have chained in the Blackwater wears it.',
  'hexbane-shawl': 'Knotted from bog-cotton and a hag’s hair. Nettie of Bogmire makes one for whoever puts Mother Grue to rest.',
});

// Who holds each relic, short enough for a pocket ("Held by ...") and the grey card's stamp.
export const HOLDER = Object.freeze({
  hearthbrand: 'the Keep reliquary', 'stillwater-lance': 'Tamsin Vale', cairnmaul: 'the Keep reliquary',
  'wardens-seal': 'Sneck the Tallyman', tallyknife: 'a Tallyman veteran', thornsplitter: 'Old Snag', 'rotwood-circlet': 'the Rot-Stag',
  'thornwatch-hood': 'Skarn', 'thornwatch-jerkin': 'a bandit veteran', 'thornwatch-boots': 'a bandit veteran', thornwreath: 'Briarmaw', briarfang: 'Briarmaw',
  lightfingers: 'Mags Kestrel', hartshorn: 'Haskett the poacher', 'mosswatch-lantern': 'Hollis Fairweight', 'watchkeepers-kettle': 'Old Garret',
  'mire-pearl': 'Gorrow the Mire-King', dawnbell: 'the Gloamwing', rootsong: 'Oda the Thornmother', oathshield: 'Sergeant Corra Thistle',
  'isoldes-oath': 'Dun the Counter', 'ichor-mask': 'the Rotwarden', 'first-seed': 'the Rotwarden', 'vale-gauntlets': 'Tamsin',
  sandwalkers: 'Rasa the Dune-Rider', 'zaras-orrery': 'Zara’s lost crate', wyrmscale: 'the Sand Wyrm', 'sunstone-lantern': 'Foreman Brask',
  'glass-carapace': 'Kharzul the Glass Scorpion', dunebreaker: 'Gnash the Raider-King', cinderfang: 'Kharzul the Glass Scorpion',
  'mirage-glass': 'the Wisp-Queen', 'qasims-signet': 'Cistern Lord Qasim', 'sunstone-heart': 'Luma of Dusthaven',
  'scorchgate-key': 'the Ash-Captain', 'ashen-aegis': 'the Ashen Warden', 'cinder-crown': 'the Ashen Warden', saltglass: 'Vell Saltglass',
  'windstep-boots': 'Rhune the Pass-Warden', veilbell: 'Mother Wynn', ironwall: 'the Sentinel-Captain', 'drowned-censer': 'the Drowned Abbess',
  'ironvein-bracers': 'Tamsin', 'roc-feather-cloak': 'the Thunder-Roc', 'thanes-rune': 'Thane Brundar', 'trollhide-mantle': 'Old Horn',
  runestaff: 'Harrow’s Journeyman', 'anvil-heart': 'Mother Anvil', 'worldforge-hammer': 'Mother Anvil', 'cutters-pick': 'the Cutter-Chief',
  'rime-crozier': 'the Rime-Abbot', 'hushweave-cowl': 'the Rime-Abbot',
  'unfair-toll': 'Hodge of Rotbridge', bogstriders: 'Tamsin', 'weeping-bow': 'Grandfather Willow', 'willow-ward': 'Elder Moss',
  'hag-stone': 'Mother Grue', 'lamplighters-lantern': 'the Lantern Mother', 'mourning-veil': 'the Lantern Mother', 'salvagers-helm': 'the Salvage-Master',
  'cantors-staff': 'the Drowned Cantor', 'gar-tooth': 'Old Jaws', 'barge-gauntlets': 'the Bargemaster', 'corvus-harpoon': 'the Blackwater Leviathan',
  'deep-pearl': 'the Blackwater Leviathan', 'hexbane-shawl': 'Nettie the Swamp Witch',
});

const PAGE_IDS = PAGES.map(p => p.id);
// What opens the road to a region whose page is open but whose road is not (yet).
export const ROAD_NOTE = Object.freeze({
  sunscorch: 'The road to the Sunscorch opens once both Brands of the Wilds are yours.',
  ironspire: 'The road to the Ironspire opens once the Council has sat a second time: the Keep’s east postern.',
  // M6: the fen stair below Mossfall opens with the third council
  gloomfen: 'The road to the Gloomfen opens once the Council has sat a third time: the fen stair below Mossfall.',
});
const isSealed = P => !P || P.from == null;
const shortRegion = P => String(P?.name || '').replace(/^The /, '').split(' ')[0];

// Every sealed road into a region (the Keep's postern guards, the Wilds' edges): the sealed page's text.
function sealedTexts(region) {
  const out = [];
  for (const m of Object.values(MAPS)) for (const x of m.exits || []) if (x.sealed?.region === region && !x.to && !out.includes(x.sealed.text)) out.push(x.sealed.text);
  return out;
}

// The starter you carry, and the one Tamsin lends in her duels (M3: the codex remembers which you took).
function startersOf(game) {
  const codex = game?.codex || {};
  const mine = game?.progress?.flags?.story?.starter && STARTERS[game.progress.flags.story.starter] ? game.progress.flags.story.starter
    : Object.keys(STARTERS).find(id => codex[id]?.claimed) || null;
  return { mine, tamsins: mine ? STARTERS[mine].rival : null };
}

// The page to open on: the one of the region the party stands in, if that page is open; else Page I.
export function defaultPage(game) {
  const region = MAPS[game?.progress?.pos?.map]?.region;
  const P = PAGES.find(p => p.region === region);
  return P && !isSealed(P) ? P.id : PAGES[0].id;
}

// The view model of one page (pure; node tests use it).
export function binderPage(game, pageId) {
  const P = PAGES.find(p => p.id === pageId) || PAGES[0];
  const codex = game?.codex || {};
  if (isSealed(P)) return { id: P.id, no: P.no, name: P.name, region: P.region, sealed: true, texts: sealedTexts(P.region), relics: [], progress: null, reward: null };
  const { mine, tamsins } = startersOf(game);
  const progress = pageProgress(game, P.id);
  const day = game?.progress?.flags?.pages?.[P.id];
  const earned = !!(P.reward && (day || progress.done));
  const relics = relicsOn(P.id).map(id => {
    const R = RELICS[id], e = codex[id] || {};
    const state = e.claimed ? 'claimed' : e.sighted ? 'sighted' : 'unsighted';
    // a starter you did not choose: it stays on its pedestal (or in Tamsin's hands) and the page does not need it
    const spare = R.starter && !e.claimed ? (id === tamsins ? 'tamsin' : 'keep') : null;
    const holder = R.starter ? (id === tamsins ? 'Tamsin Vale' : id === mine ? 'you' : 'the Keep reliquary') : HOLDER[id] || R.holder || 'somebody';
    return { id, codex: R.codex, name: R.name, rarity: R.rarity, state, awakened: !!e.awakened, spare, holder, riddle: RIDDLES[id] || 'Nobody has seen it yet.' };
  });
  return {
    id: P.id, no: P.no, name: P.name, region: P.region, sealed: false, texts: [], relics, progress,
    // what opens the region's road while it is still shut (ROAD_NOTE), else null
    road: ROAD_NOTE[P.region] && !regionOpen(game, P.region) ? ROAD_NOTE[P.region] : null,
    reward: P.reward ? { name: P.reward.name, text: P.reward.text, earned, day: typeof day === 'number' ? day : null } : null,
  };
}

let lastPage = null; // the page picked last this session (while the party stays in the same region)

export function mount(root, ctx, params = {}) {
  if (!ctx.game) { ctx.go('title'); return {}; }
  const game = ctx.game;
  const from = params.from || 'world';
  const leave = () => ctx.go(from);
  const region = MAPS[game.progress?.pos?.map]?.region || 'verdant';
  const pick0 = PAGE_IDS.includes(params.page) ? params.page : lastPage && lastPage.region === region ? lastPage.id : defaultPage(game);
  let page = pick0;

  const top = el('header', 'topbar');
  top.append(button('‹ Back', 'btn ghost back', () => { ctx.audio.sfx('back'); leave(); }), el('div', 'tb-title', '<span class="realm">The Hearth Codex</span><h1 class="title-display">Every legend has a holder</h1>'));
  const tabs = el('div', { class: 'tabs cx-tabs', role: 'tablist', 'aria-label': 'Codex pages' });
  const head = el('section', { class: 'codex-sum cx-head panel', 'aria-live': 'polite' });
  const binder = el('div', { class: 'binder', role: 'tabpanel', id: 'cx-panel' });
  const foot = el('p', 'codex-foot');
  root.append(top, tabs, head, binder, foot);

  const awakenedAll = Object.values(game.codex || {}).filter(e => e?.awakened).length;
  foot.textContent = `Sighted: seen on its holder. Claimed: pried loose and yours. Awakened: a relic that has done three great deeds in your hands. ${awakenedAll ? `${awakenedAll === 1 ? 'One relic has' : `${awakenedAll} relics have`} woken that far.` : 'No relic has woken that far yet.'}`;

  function renderTabs() {
    tabs.replaceChildren(...PAGES.map((P, i) => {
      const sealed = isSealed(P);
      const prog = sealed ? null : pageProgress(game, P.id);
      const done = !!(prog?.done || game.progress?.flags?.pages?.[P.id]);
      const label = sealed ? `Page ${P.no}, ${P.name}: sealed` : `Page ${P.no}, ${P.name}: ${prog.claimed} of ${prog.needed} claimed${done ? ', finished' : ''}`;
      const b = button('', `tab cx-tab${sealed ? ' is-sealed' : ''}${done ? ' is-done' : ''}`, () => { if (page === P.id) return; ctx.audio.sfx('page'); setPage(P.id); },
        { role: 'tab', 'aria-selected': String(P.id === page), 'aria-controls': 'cx-panel', 'aria-label': label, 'data-page': P.id, 'data-pick': String(i + 1) });
      const no = el('span', 'cx-no', [sealed ? el('i', { class: 'cx-lock', 'aria-hidden': 'true' }) : null, el('b', { text: P.no }), done ? el('i', { class: 'cx-tick', 'aria-hidden': 'true', text: '✓' }) : null]);
      b.append(no, el('span', { class: 'cx-rg', text: shortRegion(P) }), el('span', { class: 'cx-ct', text: sealed ? 'Sealed' : `${prog.claimed}/${prog.needed}` }));
      return b;
    }));
  }

  function renderHead(V) {
    head.replaceChildren();
    head.dataset.page = V.id;
    head.classList.toggle('is-sealed', V.sealed);
    head.append(el('p', { class: 'cx-kick', text: `Page ${V.no}` }), el('h2', { class: 'title-display cx-name', text: V.name }));
    if (V.sealed) return;
    const p = V.progress;
    const bits = [`${p.claimed} of ${p.needed} claimed`, `${p.sighted} sighted`];
    if (p.awakened) bits.push(`${p.awakened} awakened`);
    head.append(el('p', { class: 'cx-prog', text: bits.join(', ') }));
    const bar = el('span', { class: 'cbar', role: 'img', 'aria-label': `${p.claimed} of ${p.needed} claimed` });
    const claimedW = p.needed ? p.claimed / p.needed * 100 : 0, sightedW = p.total ? p.sighted / p.total * 100 : 0;
    bar.append(el('i', { style: { width: `${claimedW}%` } }), el('b', { style: { width: `${sightedW}%` } }));
    head.append(bar);
    if (V.reward) {
      const r = V.reward;
      const line = el('p', { class: `cx-reward${r.earned ? ' is-earned' : ''}`, 'data-earned': r.earned ? '1' : '0' });
      line.append(
        el('span', { class: 'cx-rk', text: r.earned ? `Earned${r.day ? ` · Day ${r.day}` : ''}` : 'Reward' }),
        el('b', { class: 'cx-rn', text: r.name }),
        el('span', { class: 'cx-rt', text: r.earned ? `${r.text} Yours for good.` : `${r.text} Yours once every relic the page needs is claimed.` }),
      );
      head.append(line);
    }
    // the page's small print: the starters on Page I, the road to Page II
    const spare = V.relics.filter(x => x.spare).length;
    if (spare) head.append(el('p', { class: 'cx-note', text: `The page counts your starter and every relic held out in the world. The ${spare === 1 ? 'starter' : `${['', 'one', 'two', 'three'][spare] || spare} starters`} you passed over stay${spare === 1 ? 's' : ''} in the Keep, or with Tamsin.` }));
    if (V.road && !p.sighted) head.append(el('p', { class: 'cx-note cx-road', text: V.road }));
  }

  function renderSealed(V) {
    const box = el('div', 'cx-sealed');
    box.append(el('span', { class: 'cx-bigl', 'aria-hidden': 'true' }), el('p', { class: 'cx-sealed-k', text: 'Sealed' }));
    for (const t of V.texts.slice(0, 2)) box.append(el('p', { class: 'cx-sealed-t', text: `“${t}”` }));
    box.append(el('p', { class: 'cx-sealed-n', text: `The relics of ${V.name.replace(/^The /, 'the ')} are still out of reach. This page opens in a later chapter.` }));
    binder.append(box);
  }

  function renderPockets(V) {
    const where = PAGES.find(p => p.id === V.id)?.name || 'the Realm';
    V.relics.forEach((x, i) => {
      const R = RELICS[x.id];
      const owned = game.inventory.find(it => it.base === x.id && !it.shattered) || game.inventory.find(it => it.base === x.id);
      const item = owned || relicItem(x.id, createRng('codex-' + x.id), { from: R.holder, where, day: game.progress.flags.day });
      const st = x.state;
      const b = el('button', {
        type: 'button', class: `pocket is-${st}${x.awakened ? ' is-awakened' : ''}${x.spare ? ' is-spare' : ''}`, 'data-r': x.rarity, 'data-relic': x.id, 'data-state': st,
        'aria-label': `${codexNo(R)}: ${st === 'unsighted' ? 'unknown relic' : x.name}, ${st}${x.awakened ? ', awakened' : ''}${x.spare ? ', not needed for the page' : ''}`,
      });
      const p = portraitCanvas(item, { size: 64, develop: st === 'unsighted' ? 0 : undefined, still: st !== 'claimed' });
      b.append(el('span', 'no', codexNo(R).replace(' / ', '/')), el('span', 'pp', [p.canvas]));
      b.append(el('span', 'pn', st === 'unsighted' ? '???' : esc(x.name)));
      b.append(el('span', 'pr', st === 'unsighted' ? 'Unsighted' : `<span style="color:${rarityColor(x.rarity)}">${esc(rarityName(x.rarity))}</span>`));
      if (x.spare) b.append(el('span', { class: 'hint spare', text: x.spare === 'tamsin' ? 'Tamsin’s: only ever lent. The page does not need it.' : 'Stays in the Keep. The page does not need it.' }));
      else if (st === 'unsighted') b.append(el('span', { class: 'hint', text: x.riddle }));
      else if (st === 'sighted') b.append(el('span', { class: 'hint', text: `Held by ${x.holder}` }));
      b.append(el('span', 'stamps', `<i class="${st !== 'unsighted' ? 'on' : ''}">Sighted</i><i class="${st === 'claimed' ? 'on' : ''}">Claimed</i><i class="${x.awakened ? 'on' : ''}">Awakened</i>`));
      b.addEventListener('click', () => {
        ctx.audio.sfx('page');
        if (st === 'unsighted') ctx.services.cardInspect(item, { silhouette: true, riddle: x.riddle, picker: false });
        else if (st === 'sighted') ctx.services.cardPreview(item, { heldBy: x.holder });
        else ctx.services.cardInspect(owned || item, { picker: !!owned });
      });
      b.style.setProperty('--i', String(i));
      binder.append(b);
    });
  }

  function setPage(id) {
    page = id;
    lastPage = { id, region };
    const V = binderPage(game, id);
    renderTabs();
    renderHead(V);
    binder.replaceChildren();
    binder.classList.toggle('is-sealed', V.sealed);
    binder.dataset.page = V.id;
    if (V.sealed) renderSealed(V); else renderPockets(V);
  }

  setPage(page);
  if (!ctx.audio.track || ctx.audio.track === 'victory') ctx.audio.music('road');
  return {
    onAction: screenNav(root, {
      back: leave, menu: leave,
      pick: n => { const P = PAGES[n - 1]; if (!P) return false; if (P.id !== page) { ctx.audio.sfx('page'); setPage(P.id); } return true; },
    }),
  };
}
