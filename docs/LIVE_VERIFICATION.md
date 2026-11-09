# N5e multiplayer and reaction verification

November 9, 2026. Runtime: Foundry13.351, N5e0.13.0-alpha.6 plus LIVE1 corrections intended for0.13.0-alpha.7. Tests used only a disposable workspace world; production installation/worlds were unchanged.

## Observed results

1. GM and two isolated player sessions connect — passed.
2. Real Foundry dice use N5e precedence and preserve pools/keep dice — passed.
3. Observer-specific visibility detects source and does not use GM omniscience — passed.
4. Only the eligible player receives the Deflection prompt — passed.
5. Accepting Deflection spends one pool/reaction and applies one damage result — passed.
6. Duplicate application does not repeat damage or cost — passed.
7. Uncanny Dodge resolves after real observer visibility and spends only reaction — passed.
8. Declining leaves reaction/resource unspent and damage proceeds — passed.
9. Remote non-owned effects require GM review and resolve through a committed receipt — passed.
10. Real wall blocks observer sight and suppresses Dodge — passed.
11. Blindsight qualifies while blinded only within its real configured range — passed.
12. Editable timer hands unanswered opportunities to the GM without spending — passed.
13. Zero disables automatic timer handoff — passed.
14. Recovery settings window renders actual durable receipts — passed.
15. Disabled-timer window is recovered by the player after a real reload — passed.
16. Backup GM resumes a persisted deadline after the original GM disconnects — passed.
17. Reconciled receipt archive advances the epoch and rejects old packets — passed.

Final runs: **17 scenarios passed; zero page errors**. The genuine reload/handover run also confirmed no stale owner dialogs remained. Automated release baseline: **227 passed, 2 existing migration-fixture skips, zero failures**.

## Corrections from live testing

- Long recovery histories were clipped; the recovery window now scrolls.
- Owner dialogs remained open after GM resolution/handoff; they now close without creating another response.

## Limits

The GM used a rendered software-graphics scene. Player/backup-GM contexts disabled canvas for permission/dialog checks. Some collapsed-sidebar actions were invoked through their actual DOM button handlers rather than pointer coordinates, so this is not complete pointer/layout or player-graphics certification. A Foundry-core wall-deletion error occurred on early no-canvas clients; the final harness moved the wall instead and recorded zero errors. No Foundry internals were patched.

These results cover base Deflection, Uncanny Dodge, standard scene sight/walls, timer/reload/handover and receipt recovery. They do not certify upgraded reactions, all scene geometry/stealth/elevation, third-party modules, atomic multi-actor transactions or authenticated unattended player requests. GM review remains required.

The test server was stopped and temporary license/session copies removed. Future testing follows the user's cap: at most three attempts per scenario; two failures stop the entire process and require a report/user direction. Do not repeat broad live setup for routine changes.
