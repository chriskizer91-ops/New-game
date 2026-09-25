// Plain-language battle log lines for every event (the accessible record of the fight).
import { statusName, relicLabel } from './model.js';

const RES = { crit: 'LEGEND STRIKE', hit: 'hit', graze: 'graze', miss: 'miss', fumble: 'fumble', save: 'saved', fail: 'failed' };
const EFF = { weak: ' (weak!)', resist: ' (resisted)', immune: ' (immune)', normal: '' };

// -> { text, kind } or null
export function logLine(ev, disp) {
  const U = id => disp.units[id];
  const N = id => (id && U(id) ? U(id).label : id ? 'someone' : '');
  switch (ev.t) {
    case 'turn': return { text: `${N(ev.actor)}'s turn`, kind: 'turn' };
    case 'intent':
      return { text: ev.queued ? `Foreseen: ${N(ev.foe)} will use ${ev.name} (d${ev.die} ${ev.face})` : `${N(ev.foe)} readies ${ev.text.replace(/^\d+: /, '')} (d${ev.die} ${ev.face})`, kind: 'intent' };
    case 'roll': {
      const dice = ev.rolls && ev.rolls.length > 1 ? `[${ev.rolls.join(', ')}] keeps ${ev.kept}` : `${ev.kept}`;
      const sign = ev.bonus >= 0 ? `+ ${ev.bonus}` : `- ${-ev.bonus}`;
      if (ev.purpose === 'save') return { text: `${N(ev.actor)} ${ev.ability || ''} save: ${dice} ${sign} = ${ev.total} vs DC ${ev.vs}, ${RES[ev.result]}`, kind: 'roll' };
      if (ev.purpose === 'flee') return { text: `Flee: ${dice} ${sign} = ${ev.total} vs DC ${ev.vs}, ${ev.result === 'save' ? 'away!' : 'caught'}`, kind: 'roll' };
      return { text: `${N(ev.actor)} rolls ${dice} ${sign} = ${ev.total} vs Guard ${ev.vs}: ${RES[ev.result] || ev.result}`, kind: ev.result === 'crit' ? 'crit' : 'roll' };
    }
    case 'damage': {
      const what = ev.aspect && ev.aspect !== ev.kind ? `${ev.kind} ${ev.aspect}` : ev.kind || '';
      return { text: `${N(ev.target)} takes ${ev.amount} ${what}${EFF[ev.eff] || ''}${ev.absorbed ? `, ${ev.absorbed} warded` : ''}${ev.graze ? ' (graze)' : ''}`, kind: 'damage' };
    }
    case 'heal': return ev.amount ? { text: `${N(ev.target)} recovers ${ev.amount} HP`, kind: 'heal' } : null;
    case 'status':
      if (ev.op === 'add') return { text: `${N(ev.target)} is ${statusName(ev.status)}${ev.stacks > 1 ? ` x${ev.stacks}` : ''}`, kind: 'status' };
      if (ev.op === 'remove') return { text: `${N(ev.target)} is no longer ${statusName(ev.status)}`, kind: 'status' };
      if (ev.op === 'trigger') return { text: `${statusName(ev.status)} takes hold of ${N(ev.target)}`, kind: 'status' };
      return null;
    case 'grip': return { text: `${N(ev.target)}'s grip on ${relicLabel(ev.relic, U(ev.target))}: ${ev.to}/${ev.max}`, kind: 'grip' };
    case 'disarm': return null; // the engine's text line says it
    case 'surge': return ev.to >= 100 && ev.from < 100 ? { text: `${N(ev.actor)}'s Legend Surge is full!`, kind: 'surge' } : null;
    case 'legend': return { text: `${N(ev.actor)} unleashes ${ev.name}!`, kind: 'legend' };
    case 'ko': return { text: `${N(ev.target)} falls.`, kind: 'ko' };
    case 'revive': return { text: `${N(ev.target)} is back on their feet.`, kind: 'heal' };
    case 'phase': return { text: `${N(ev.foe)}, phase ${ev.phase}: ${ev.text || ''}`, kind: 'phase' };
    case 'move': return { text: `${N(ev.actor)}: ${ev.name}`, kind: 'move' };
    case 'text': case 'spawn': case 'escape': return ev.text ? { text: ev.text, kind: 'text' } : null;
    case 'victory': return { text: 'Victory!', kind: 'end' };
    case 'defeat': return { text: 'The party falls.', kind: 'end' };
    case 'fled': return { text: 'You break away and escape.', kind: 'end' };
    default: return null;
  }
}
