import fs from 'node:fs';
import path from 'node:path';

const contractsRoot = path.resolve(import.meta.dirname, '..');
const repositoryRoot = path.resolve(contractsRoot, '../..');
const mappings = [
  {
    source: path.join(contractsRoot, 'deployment-sepolia.json'),
    target: path.join(repositoryRoot, 'apps/web/src/deployment.json'),
  },
  {
    source: path.join(contractsRoot, 'client/abis.js'),
    target: path.join(repositoryRoot, 'apps/web/src/contracts.js'),
    transform: (value) => value.replace(
      '// Canonical browser-safe ABI surface. Run `npm run sync:client` after editing.',
      '// Generated from packages/contracts/client/abis.js. Do not edit directly.',
    ),
  },
];

export function syncClientArtifacts({ check = false } = {}) {
  const stale = [];
  for (const mapping of mappings) {
    const source = fs.readFileSync(mapping.source, 'utf8');
    const expected = mapping.transform ? mapping.transform(source) : source;
    if (check) {
      if (!fs.existsSync(mapping.target) || fs.readFileSync(mapping.target, 'utf8') !== expected) stale.push(mapping.target);
    } else {
      fs.mkdirSync(path.dirname(mapping.target), { recursive: true });
      fs.writeFileSync(mapping.target, expected);
    }
  }
  if (stale.length > 0) {
    throw new Error(`Client artifacts are stale. Run npm run sync:client.\n${stale.join('\n')}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  syncClientArtifacts({ check: process.argv.includes('--check') });
}
