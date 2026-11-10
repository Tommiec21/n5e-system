import { esc } from "./common.mjs";

/** Minimal fallback for legacy roll data; normal cards use Foundry's Roll renderer. */
export function damageRollHTML(trace) {
  if ( !trace ) return "";
  return trace.parts.map(part => {
    const dice = part.dice.map(die => '<ol class="dice-rolls">' + die.results.map(result => '<li class="roll die' + (result.kept ? '' : ' discarded') + '">' + esc(String(result.value)) + '</li>').join('') + '</ol>').join('');
    return '<div class="dice-roll" data-action="expandRoll"><div class="dice-result">'
      + (part.formula ? '<div class="dice-formula">' + esc(part.formula) + '</div>' : '')
      + (dice ? '<div class="dice-tooltip">' + dice + '</div>' : '')
      + '<h4 class="dice-total">' + part.amount + '</h4></div></div>';
  }).join("");
}

export async function renderDamageRolls(rolls, trace) {
  if ( !rolls?.length ) return damageRollHTML(trace);
  const rendered = [];
  for ( const [index, roll] of [...rolls].entries() ) {
    if ( typeof roll.render === "function" && roll._evaluated !== false ) rendered.push(await roll.render({ flavor: "" }));
    else if ( trace?.parts[index] ) rendered.push(damageRollHTML({ ...trace, parts: [trace.parts[index]] }));
  }
  return rendered.join("");
}
