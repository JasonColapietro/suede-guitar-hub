#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const sourceRoot = process.argv.find(argument => argument.startsWith('--native='))?.slice('--native='.length);
if (!sourceRoot) throw new Error('Specify --native=/absolute/path/to/the/canonical/ios/checkout. Add --check for verification only.');
const check = process.argv.includes('--check');
const mappings = ['guitar', 'voice', 'song-guitar', 'beginner-guitar-instruction', 'song-guitar-instruction'].map(name => [`GuitarHubCore/Sources/GuitarHubCore/Resources/${name}.json`, `lib/learning/data/${name}.json`]);
mappings.push(['contracts/learning.json', 'contracts/learning.json']);
for (const [source, destination] of mappings) {
  const bytes = await readFile(resolve(sourceRoot, source));
  if (check) assert.deepEqual(await readFile(destination), bytes, `${destination}: stale native bundle`);
  else await writeFile(destination, bytes);
  process.stdout.write(`${check ? 'Verified' : 'Synced'} ${destination}\n`);
}
