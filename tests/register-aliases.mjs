/**
 * Loaded via `--import` in the `test` script so the alias hooks are installed
 * before any test module is resolved. Kept separate from `alias-hooks.mjs`
 * because `register` runs that file on its own hooks thread.
 */
import { register } from "node:module";

register("./alias-hooks.mjs", import.meta.url);
