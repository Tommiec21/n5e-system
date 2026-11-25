import { test } from "node:test";
import assert from "node:assert/strict";
import { libraryGroups } from "../module/applications/gm/workspace-library.mjs";

test("library groups preserve references and include favorites without moving originals", () => {
  const entries = [{ uuid: "c", kind: "campaign", favorite: true }, { uuid: "m", kind: "mission" },
    { uuid: "p", kind: "character" }, { uuid: "w", kind: "village" }, { uuid: "n", kind: "note" }];
  const before = structuredClone(entries);
  const groups = libraryGroups(entries);
  assert.deepEqual(groups.map(g => g.name), ["Favorites", "Campaigns", "Missions & sessions", "Characters", "World", "Notes & ideas"]);
  assert.equal(groups[0].entries[0], groups[1].entries[0]);
  assert.deepEqual(entries, before);
  assert.deepEqual(libraryGroups([]), []);
});
