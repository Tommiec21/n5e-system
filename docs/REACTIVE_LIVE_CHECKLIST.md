# N5e multiplayer and reactions — live verification

Use a disposable Foundry13 world and the new GitHub release. Do not test interrupted writes on campaign actors. Automated checks do not certify this checklist as passed.

1. Connect one active GM and two separate player clients. Give each player an actor/token with HP, CP and appropriate class features. Keep one player offline for a later test.
2. Confirm default manual casting, damage, Undo, rests and class/background/clan progression still work with new automation settings off.
3. In N5e Rules enable Reaction decision windows and Coordinated GM damage and reactions. Set timeout to 60 seconds.
4. Generate a damage card from an actual actor/token on the viewed scene. As GM control a defender token and apply damage. Check only that defender's owners and GMs see its reaction opportunity.
5. For base Deflection, accept as the player; confirm the unverified response as GM. Verify one reduction roll, one Discipline spent, one reaction spent and one damage application. Declining must leave the resource/reaction untouched while damage continues.
6. Verify Deflection dice at Weapon Specialist levels 1, 11 and 20. Upgraded techniques are outside the pilot and require manual adjudication.
7. Check static plus rolled DR separately protects HP and CP. With two HP damage types, record the damaged creature's selected order; verify leftover DR and resistance outcomes. Cancelling allocation must not apply that target's damage.
8. Test Uncanny Dodge with an observer's normal vision, blocked wall, darkness, Blindness, Blindsight radius, True Sight and Chakra Sight where supported. Chakra Sensing alone must not count as seeing. Unsupported elevation, ambiguous tokens or stealth should stop automatic eligibility.
9. Check Dodge halves after flat subtraction, does not spend Discipline, and does not stack repeated halving. Halving and doubling together must give normal damage. Immunity remains effective.
10. Repeat the same damage card/target. It must not roll, spend or apply again. Changing half/full mode after a stored result must not create a second application. Linked tokens sharing an actor must not receive accidental duplicate writes.
11. Let a prompt pass 60 seconds: it must hand off to GM without auto-answer or resource expenditure. Try a different seconds value and 0 (disabled). Existing windows retain their original deadline.
12. Remove the ability, spend the resource, change the turn, move the token behind a wall, or lose ownership while a prompt is open. Stale eligibility must stop or require reconciliation, not silently apply an invalid reaction.
13. Reload/disconnect while reviewing and during an interrupted application. Hand active GM authority to the other GM client. Check unfinished receipts are visible and never blindly replayed. No exactly-once guarantee is claimed for in-flight document writes.
14. Review N5e Automation Recovery. Inspect affected actors, reconcile partial outcomes, export the history and advance its epoch. Old pending packets must then be refused. Confirm archive cancellation/failure does not discard receipts.
15. Run representative N5e numeric/dice expressions with addition/subtraction before multiplication/division. Check explicit grouping, advantage dice, rerolls, critical dice, pools and Foundry animations. Third-party modules' own expressions must retain their own semantics.

Record exact Foundry/module versions, connected client roles, observed results and errors. Mark each item passed/failed/unsupported. This file currently records a test procedure, not test evidence.
