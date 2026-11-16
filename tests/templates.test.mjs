/** Every Handlebars template compiles (a broken block once shipped in level-up.hbs, 0.41–0.60). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";

test("every template compiles", () => {
  const files = [];
  const walk = dir => { for ( const f of fs.readdirSync(dir, { withFileTypes: true }) ) {
    const p = path.join(dir, f.name);
    if ( f.isDirectory() ) walk(p); else if ( p.endsWith(".hbs") ) files.push(p);
  } };
  walk(path.join(import.meta.dirname, "..", "templates"));
  assert.ok(files.length > 50);
  for ( const f of files ) assert.doesNotThrow(() => Handlebars.precompile(fs.readFileSync(f, "utf8")), f);
});
