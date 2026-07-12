import fs from 'fs';
import path from 'path';

const mesRoot = process.argv[2];
if (!mesRoot) {
  console.error('Usage: node generate-minus-one-tags.mjs <mes-source-path>');
  process.exit(1);
}

const profiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name.endsWith('Profile.cs')) {
      profiles.push(fullPath);
    }
  }
}

walk(path.join(mesRoot, 'Data', 'Scripts', 'ModularEncountersSystems'));

const tags = new Set(['MinTargetValue', 'MaxTargetValue']);
for (const filePath of profiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const init = content.match(/public\s+\w+\s*\(\)\s*\{[\s\S]*?\n\t\t\}/);
  if (!init) {
    continue;
  }

  for (const match of init[0].matchAll(/\n\t\t\t([A-Za-z][A-Za-z0-9_]*)\s*=\s*-1;/g)) {
    tags.add(match[1]);
  }
}

const sorted = [...tags].sort();
const outPath = path.resolve('src/sbc/mesMinusOneNumericTags.ts');
const body = `/** Tags where MES uses -1 as disabled/unlimited (from Profile.cs defaults + TargetingSystem.cs). */
export const MES_MINUS_ONE_NUMERIC_TAGS = new Set<string>([
${sorted.map((tag) => `  '${tag}',`).join('\n')}
]);
`;

fs.writeFileSync(outPath, body);
console.log(`Wrote ${sorted.length} tags to ${outPath}`);
