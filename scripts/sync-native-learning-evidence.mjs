#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const sourceRoot = process.argv.find(argument => argument.startsWith("--native="))?.slice("--native=".length);
if (!sourceRoot) throw new Error("Specify --native=/absolute/path/to/the/canonical/ios/checkout. Add --check for verification only.");
const destination = "contracts/learning-evidence.json";
const bytes = await readFile(resolve(sourceRoot, destination));
if (process.argv.includes("--check")) assert.deepEqual(await readFile(destination), bytes, `${destination}: stale native learning evidence contract`);
else await writeFile(destination, bytes);
process.stdout.write(`${process.argv.includes("--check") ? "Verified" : "Synced"} ${destination}\n`);
