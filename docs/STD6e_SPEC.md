# STD6e function spec: clans as data

Status: **Proposed 2026-11-21 (King: "Next batch" after STD6d finished). Waiting on King's approval and Q-E1–Q-E4. Nothing built.**

Plan: `docs/STD_SPEC.md` (STD6e: "Clan traits, hijutsu, clan conditions and keywords as data; `workflow/clan.mjs` name branches removed"). Same method as the class pass (`docs/STD6d_SPEC.md`).

## What's there today (survey, 2026-11-21)

| Content | Count | State |
| --- | ---: | --- |
| Clans | 44 (43 clans + Non-Clan) | Clan items carry ASI, speed, skills, affinities, languages, Hijutsu abilities, keywords and advancement as data. |
| Clan features and options | 621 (in the 43 clans) | No reviewed entries; no activities or effects (only Nara has 2 buttons). Mechanics today come from the text fallback. |
| Non-Clan | 36 own features and options, 577 Latent Bloodline variants | The variants copy other clans' features (Latent Hyūga, Latent Uchiha...). |
| Hijutsu | 408 | 16 with buttons; none reviewed. |
| Clan stances | 26 | No elements (STD6b covered the Fighting Stances compendium only). |
| Clan Amp cards | 34 | Done (AMP1d). |
| Clan condition cards | 35 | Done (CCOND1c); new ones added when a clan's text defines one. |
| Name branches | `"non-clan"` in `workflow/clan.mjs` and `advancement/clan.mjs` | The +1/+1/+1 ability pattern. |

## How a clan is done

- **One table per clan:** `content/automation/clans/<clan>.json`, one entry per feature, option, stance and (Q-E1) Hijutsu, keyed by identifier; the same entry keys as the class tables (`status`, `rules`, `activities`, `castOptions`, `pools`, `effects`, `dropEffects`, `duration`).
- **Applied by** `node tools/content/apply-automation.mjs` (it learns the clans pack); `npm run check` fails when a clan's item has no entry, an entry is invalid, or the table isn't applied.
- **Reviewed:** every listed item is marked `flags.n5e.reviewed`, so its text is display only.
- **Review table per clan:** `docs/clans/<clan>-automation.md` (features and options in level order, then stances, then Hijutsu by rank), with status, what's automated and what stays at the table.
- **Statuses:** automated, partly automated, notes only, no mechanics (as STD6d).
- **Clan pools** (Sharingan, Byakugan and the like) appear in the Class & Clan Limits menu automatically.
- **New condition cards** when a clan defines one that isn't a card yet; text issues go on the errata list; unclear mechanics become questions, never guesses.
- **Non-Clan's ability pattern** becomes clan data (`system.asiPatterns`), and the two `"non-clan"` branches are removed (allowlist shrinks).

## Proposed batches (a few clans per release)

| # | Batch | Clans | Features and options |
| --- | --- | --- | ---: |
| E1 | Land of Earth | Bakuton, Futton, Shí Hóu, Yoton | 76 |
| E2 | Land of Wind | Fūshin, Hanami, Jiton, Konjiki, Shakuton | 58 |
| E3 | Land of Lightning | Chinoike, Keton, Ranton | 46 |
| E4 | Land of Water | Genwa, Hoshigaki, Hozuki, Kaguya, Vesper, Yamada, Yuki | 100 |
| E5 | Land of Sound | Jinzo, Jūgo, Kashu, Shoton, Tsuchigumo | 110 |
| E6 | Land of Fire I | Aburame, Akimichi, Hatake, Hyūga, Iburi, Inuzuka, Kurama | 82 |
| E7 | Land of Fire II | Namikaze, Nara, Sarutobi, Senju, Uchiha, Uzumaki, Yamanaka | 89 |
| E8 | Minor Lands | Hebi, Hoshi, Kuru, Ryu, Shikigami | 60 |
| E9 | Non-Clan | Its own features and options; the Latent Bloodline variants (Q-E3) | 36 + 577 |

Plus each clan's stances and (Q-E1) Hijutsu in the same batch.

## Questions for King

- **Q-E1 Hijutsu:** the plan puts Hijutsu in the clan pass (408 jutsu, about 9 a clan). Do them with their clan in STD6e (each clan done in one go), or move them to STD6f with all other jutsu? Proposed: with their clan.
- **Q-E2 Clan stances:** do the 26 clan stances with their clan? Proposed: yes.
- **Q-E3 Latent Bloodlines:** the 577 variants copy other clans' features. Build them in E9 from their source clan's entries, listing only the variants whose text differs from the source for review? Proposed: yes.
- **Q-E4 Order:** start with E1 (Land of Earth) and go down the table, or another order?

## Progress log

- 2026-11-21 Claude: spec written from a survey of the clans pack. Nothing built.
