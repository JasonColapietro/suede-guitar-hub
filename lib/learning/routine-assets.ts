/**
 * The chord diagrams the A/D routine draws, resolved on the server.
 *
 * PracticeRoutine used to look them up in the browser, which bundled the whole
 * demo-asset library (every lesson's diagrams, studies and riffs) into the
 * routine page for the two chords it shows.
 */
import { getInstructionAsset, type InstructionAsset } from "./instruction-assets.ts";
import { routineTemplate } from "./routine.ts";

export type ChordAsset = Extract<InstructionAsset, { kind: "chord" }>;

export function routineChordAssets(): Record<string, ChordAsset> {
  const assets: Record<string, ChordAsset> = {};
  for (const block of routineTemplate.blocks) for (const id of block.assetIds) {
    const asset = getInstructionAsset(id);
    if (asset.kind === "chord") assets[id] = asset;
  }
  return assets;
}
