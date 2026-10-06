import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]))).flat();
}
const chunks = await Promise.all((await files('.next/static')).filter(path => path.endsWith('.js')).map(async path => ({ path, text: await readFile(path, 'utf8') })));
const privateText = [];
for (const name of ['beginner-guitar-instruction', 'song-guitar-instruction', 'advanced-guitar-instruction', 'voice-instruction']) {
  const data = JSON.parse(await readFile(`lib/learning/data/${name}.json`, 'utf8'));
  for (const lesson of data.lessons) for (const step of lesson.steps) {
    if (step.action.length >= 80) privateText.push({ id: lesson.id, text: step.action });
  }
}
const voice = JSON.parse(await readFile('lib/learning/data/voice-learning-material.json', 'utf8'));
for (const reading of voice.readings) privateText.push({ id: reading.id, text: reading.body });
for (const item of privateText) {
  const forms = [item.text, JSON.stringify(item.text).slice(1, -1)];
  for (const chunk of chunks) assert.ok(!forms.some(text => chunk.text.includes(text)), `${item.id}: paid instruction found in public bundle ${chunk.path}`);
}
assert.ok(chunks.length > 0 && privateText.length > 200);
console.log(`Checked ${privateText.length} private lesson/reading passages against ${chunks.length} public JavaScript chunks.`);
