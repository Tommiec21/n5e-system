/** SHARED1: the shared-core boundary check, host hooks and bundle helpers. */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { checkFile, checkTestFile, codeOnly } from "../tools/check-core.mjs";
import { exportedNames } from "../tools/build-core.mjs";
import { setRuleProvider, rule } from "../module/rules/settings.mjs";
import { setHost, n5eConfig } from "../module/rules/host.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const coreFile = path.join(ROOT, "module/rules/x.mjs");

test("the boundary check flags host globals and outside imports, not comments or strings", () => {
  assert.deepEqual(checkFile(coreFile, "const v = game.settings.get(1);"), ['touches host global "game."']);
  assert.equal(checkFile(coreFile, "const c = globalThis.CONFIG?.N5E;").length, 1);
  assert.equal(checkFile(coreFile, "import { a } from \"../workflow/attack.mjs\";").length, 1);
  assert.equal(checkFile(coreFile, "import { a } from \"../config/core.mjs\"; const b = obj.game.x;").length, 0);
  assert.equal(codeOnly("// game.x\nconst s = \"CONFIG.N5E\";").includes("game"), false);
  const tests = path.join(ROOT, "tests/core");
  assert.equal(checkTestFile(path.join(tests, "a.test.mjs"), "import x from \"../../module/workflow/turn.mjs\";", tests).length, 1);
  assert.equal(checkTestFile(path.join(tests, "a.test.mjs"), "import { test } from \"node:test\"; import \"./setup.mjs\";", tests).length, 0);
});

test("rule provider and host hooks: provider values, defaults, and the static config fallback", () => {
  setRuleProvider(key => (key === "skillActionPenalties" ? false : undefined));
  assert.equal(rule("skillActionPenalties"), false);
  setRuleProvider(() => { throw new Error("not registered"); });
  assert.notEqual(rule("skillActionPenalties"), undefined, "a throwing provider falls back to the default");
  setRuleProvider(key => globalThis.game?.settings?.get?.("n5e", key));
  setHost({ config: () => undefined });
  assert.ok(n5eConfig().skills, "static config without a live registry");
  setHost({ config: () => ({ skills: { custom: {} } }) });
  assert.deepEqual(Object.keys(n5eConfig().skills), ["custom"]);
  setHost({ config: () => globalThis.CONFIG?.N5E });
});

test("the API listing reads every export form", () => {
  assert.deepEqual(exportedNames("export function a() {}\nexport const b = 1;\nexport { c, d as e };\nexport default 3;"), ["a", "b", "c", "default", "e"]);
});
