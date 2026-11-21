import { test } from "node:test";
import assert from "node:assert/strict";
import { MISSION_IDEAS, filterIdeas, ideaText } from "../module/applications/gm/workspace-ideas.mjs";

test("idea filters combine and keep portable prompts available", () => {
  const result = filterIdeas({ rank: "C", theme: "Investigation", region: "Fire" });
  assert.deepEqual(result.map(i => i.id), ["dispatch"]);
  assert.equal(filterIdeas({ rank: "S" }).length, 0);
  assert.equal(filterIdeas().length, MISSION_IDEAS.length);
});
test("every prompt has usable objectives, obstacles, approaches and consequences", () => {
  for (const idea of MISSION_IDEAS) for (const key of ["objective", "obstacle", "approaches", "adversary", "twist", "outcome"]) assert.ok(idea[key]?.length > 10);
  assert.equal(new Set(MISSION_IDEAS.map(i => i.id)).size, MISSION_IDEAS.length);
});
test("rendering an idea escapes markup without changing its source", () => {
  const idea = { ...MISSION_IDEAS[0], name: "<script>" };
  assert.ok(!ideaText(idea).includes("<script>"));
  assert.equal(idea.name, "<script>");
  assert.match(ideaText(idea), /review difficulty/);
});
