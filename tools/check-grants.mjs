/**
 * Pack links (FIN1): every "Compendium.n5e.<pack>.Item.<id>" inside the pack sources must point at an
 * item that exists in that pack. A link to a missing item is a grant that silently gives nothing.
 * Run by `npm run check`.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "packs/_source");
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(path.join(dir, d.name))
  : d.name.endsWith(".json") ? [path.join(dir, d.name)] : []));

/** {pack: Set<id>} and every link found: [{file, pack, id}]. */
export function packLinks() {
  const ids = {};
  const links = [];
  for ( const pack of fs.readdirSync(SRC) ) {
    ids[pack] = new Set();
    for ( const f of walk(path.join(SRC, pack)) ) {
      const text = fs.readFileSync(f, "utf8");
      const id = JSON.parse(text)._id;
      if ( id ) ids[pack].add(id);
      for ( const m of text.matchAll(/Compendium\.n5e\.([a-z0-9-]+)\.Item\.([A-Za-z0-9]{16})/g) ) links.push({ file: path.relative(ROOT, f), pack: m[1], id: m[2] });
    }
  }
  return { ids, links };
}

export function brokenLinks() {
  const { ids, links } = packLinks();
  return links.filter(l => !ids[l.pack]?.has(l.id));
}

if ( import.meta.url === `file://${process.argv[1]}` ) {
  const { links } = packLinks();
  const broken = brokenLinks();
  for ( const b of broken.slice(0, 40) ) console.error(`✗ ${b.file}: Compendium.n5e.${b.pack}.Item.${b.id} does not exist`);
  if ( broken.length ) { console.error(`✗ ${broken.length} broken pack link(s)`); process.exit(1); }
  console.log(`✓ pack links: ${links.length} links, all point at existing items`);
}
