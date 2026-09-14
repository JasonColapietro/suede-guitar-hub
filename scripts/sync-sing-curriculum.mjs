#!/usr/bin/env node
/**
 * Sing owns the voice catalog; GuitarHub temporarily renders its lessons.
 * Merge the publishing Sing PR first. Missing upstream data is a failure,
 * never a provisional pass. --sing=/absolute/checkout permits explicit local
 * byte comparison before that merge, without changing CI's reference.
 */
import { vendor } from './lib/vendor-sing-contract.mjs';

await vendor({
    file: 'contracts/suede-voice-curriculum.json',
    resyncHint: 'run node scripts/sync-sing-curriculum.mjs, then reconcile lib/learning/data/voice.json with the published curriculum',
});
