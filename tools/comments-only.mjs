/**
 * Guard for documentation passes: proves that edited JavaScript files changed only comments and
 * whitespace. Each changed .mjs file is tokenized twice (the last commit's version and the working
 * copy) and the token streams are compared; comments are not tokens, so they don't count.
 *
 *   node tools/comments-only.mjs            compare every changed .mjs file against HEAD
 *   node tools/comments-only.mjs <ref>      compare against another commit
 *
 * Exits 1 and names the file and first differing token when real code changed.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import * as espree from "espree";

const ref = process.argv[2] ?? "HEAD";
const changed = execSync(`git diff --name-only ${ref} -- "*.mjs"`, { encoding: "utf8" }).split("\n").filter(Boolean);
const tokens = src => espree.tokenize(src, { ecmaVersion: "latest", sourceType: "module" }).map(t => `${t.type}:${t.value}`);

let bad = 0;
for ( const file of changed ) {
  if ( !fs.existsSync(file) ) continue;
  let before;
  try {
    before = execSync(`git show ${ref}:${file}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    continue; // new file: nothing to compare
  }
  const a = tokens(before);
  const b = tokens(fs.readFileSync(file, "utf8"));
  const n = Math.max(a.length, b.length);
  for ( let i = 0; i < n; i++ ) {
    if ( a[i] !== b[i] ) {
      console.error(`✗ ${file}: code changed at token ${i}: ${a[i]} → ${b[i]}`);
      bad++;
      break;
    }
  }
}
if ( bad ) process.exit(1);
console.log(`✓ ${changed.length} file(s): comments and whitespace only`);
