# CARD2 function spec: combat cards laid out like the SW5e card

Status: **spec written 2026-11-16 (King: "I was hoping the Combat cards would look similar/close to" the SW5e card he shared). King answered Q-C1–Q-C4 (rolls inside the card; −1, 0, ¼, ½, 1, 2; all cards; saves as tiles). Released in 0.63.0-alpha.1 (CARD2a and CARD2b together).**

## What King wants

The SW5e card, top to bottom:
1. **Who and what:** the actor's portrait and name, then the item (icon, name, type line).
2. **Two big buttons:** ATTACK and DAMAGE.
3. **Results side by side:** Attack (formula, then the total with a hit mark) and Damage (formula, then the total with the type icon). Each has an arrow that expands the dice.
4. **Targets:** each target with its AC, and a check mark when the attack hit it.
5. **Tags:** Action, Instantaneous, Equipped, Proficient.
6. **Apply:** a Targeted / Selected switch; each creature with the damage it takes; multiplier buttons −1, 0, ¼, ½, 1, 2; one APPLY button.

## What N5e's card does today (CARD1)

- **One action card** per jutsu cast, weapon attack or feature use, with buttons for each activity (attack, save, damage, effects), a section bar, and per-target rows with Apply and Half.
- **Each roll is its own chat message**, linked to the card. Once recorded, it folds to one line ("Shown on the Fireball card"). That is why you still see the damage card under the jutsu card.
- **Apply** offers full or half per target, plus Undo. There's no ¼, 0, ×2 or "heal instead" per target, and no Targeted / Selected switch.

## The design

### 1. Layout (one card, SW5e order)

- **Header:** the caster's portrait and name; the jutsu, weapon or feature with its icon and type line (D-Rank Ninjutsu · Fire Release; Martial Lightweapon).
- **Action buttons:** large buttons in one row, named for what they do: ATTACK, DAMAGE, SAVE DC 12 DEX, HEAL, APPLY EFFECT. A second row holds the extras (Critical, Place area, Clash).
- **Results row:** one tile per rolled result, side by side.
  - **Attack:** the formula, then the total in large type with a green check (hit) or red cross (miss) when there's one target.
  - **Damage:** the formula, then the total with its type icon.
  - Each tile has an arrow that shows the dice and the breakdown.
- **Targets:** one line per target with its AC (attacks) or the save it made (saves), and hit / miss / saved marks. The existing attack-roll and save-result visibility settings decide what players see.
- **Tags:** the action, duration, keywords and components, as small capital tags (Action · Instantaneous · Fire Release · HS·CM).
- **Apply panel:**
  - a Targeted / Selected switch;
  - each creature with the damage it would take after its own resistance and DR;
  - multiplier buttons −1 (heals), 0, ¼, ½, 1, 2. ½ is pre-selected for a successful save that halves.
  - One **APPLY** button applies every row. Undo stays.

### 2. Rolls live inside the card (Q-C1)

- **Proposed:** rolling Attack or Damage from the card puts the result in the card itself. No separate roll message is posted.
- Dice So Nice still animates the dice; roll modes (private, blind) still hide the numbers from those who shouldn't see them.
- A player's save against the card is rolled by its owner and written into the card through the GM (as CARD1 does today). With no GM connected, it posts separately until one connects.

### 3. Everything else stays

The current card keeps working underneath: riders, reactions to hits and damage, Will of Fire rerolls, concentration, Read the Enemy and Identify, area placement, Clash and the GM's toggle that turns action cards off. CARD2 changes how the card looks and where rolls go, not the rules.

## Phases

| Phase | What |
| --- | --- |
| CARD2a | The layout: header, big buttons, result tiles, targets with AC or saves, tags, the Apply panel with multipliers and Targeted / Selected. Rolls still post their own message, but fold away completely. |
| CARD2b | Rolls inside the card (if Q-C1 is yes): no separate roll messages; Dice So Nice and roll modes kept. |

## Questions for King

- **Q-C1 Rolls inside the card:** should rolls go inside the card, with no separate messages (like SW5e)? Or keep separate messages that fold away?
- **Q-C2 Apply multipliers:** −1, 0, ¼, ½, 1, 2 as in SW5e? N5e has no ¼ damage rule today, but it's handy for odd cases.
- **Q-C3 Which cards:** all action cards at once (jutsu, weapon attacks and strikes, feature uses), or jutsu first?
- **Q-C4 Saves on the card:** for a save jutsu, should the tiles row show each target's save (Dex 14 ✓ saved) next to the damage tile, or should saves stay in the target lines only?

## Progress log

- 2026-11-16 King: wants combat cards like his SW5e card. Claude: spec written. Separately fixed: Fireball's damage now records on the card (0.62.0-alpha.4).
- 2026-11-16 King: Q-C1 yes, Q-C2 yes, Q-C3 all, Q-C4 own tile. Claude: CARD2 built (0.63.0-alpha.1): rules/card-layout.mjs, workflow/card-layout.mjs, renderActionCard tiles/targets/apply panel, recorded linked messages hidden, quarter/none apply modes.
- 2026-11-16 King: card cleanup (one attack display, no Will of Fire or hit-reaction buttons, two-column smaller buttons, short save label, small Clash/Read/Identify, compact save boxes, no per-target save buttons). Claude: done (0.63.0-alpha.2); also fixed the ghost save row (uuid keys split by Foundry).
