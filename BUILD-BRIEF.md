# GuitarHub — build brief (from Chief of Staff session, 2026-08-24)

## Goal
Ship **guitarhub.org** as a new site that is **nearly identical in structure, layout, funnel, and scroll feel to https://sonoraguitarintensive.com** — but for GuitarHub (Suede Labs guitar education). Jason's words: "make it nearly identical to sonora."

**Legal line (non-negotiable):** mirror the layout, section order, visual rhythm, scroll interactions, and application-based funnel — but ALL copy must be original, all imagery must be generated or Suede-owned, and no Sonora names, testimonials, logos, or photos may appear. Structure clone, not content clone.

## Method (Jason explicitly requested)
1. **Use the `suede-skills:suede-graph-flo-xr` skill** to select the implementation plan before building (competing plans → evidence-gated selection). Invoke it via the Skill tool first.
2. **Use the `nateherk-design` plugin** (scroll-craft marketplace, installed at user scope) for scroll animations and design craft.
3. **Imagery:** prefer Kie AI generation if key access is available in-session (`KIE_AI_API_KEY`, macOS login Keychain; use only inside command substitution, never print or persist). If key access is blocked, ship with crafted CSS/SVG/gradient art matching Sonora's visual rhythm and list "generate Kie AI imagery" in HANDOFF.md as the follow-up.

## References
- `./reference/sonora-hero.png`, `sonora-desktop.png`, `sonora-mobile.png` — full-page captures of the target. Study them; re-fetch the live site if more detail is needed.
- Existing scaffold: this directory is already a Next.js (App Router) scaffold — build on it, don't restart.

## Sonora structure to mirror (from captures + site)
Hero with bold promise + application CTA → social-proof strip → "the problem with traditional lessons" narrative → method/curriculum breakdown → mentor/instructor section → student results (use REAL Suede/Strumly facts or clearly generic aspirational copy — NO fabricated named testimonials) → FAQ → application form CTA (repeat). Premium, editorial, lots of whitespace, serif/sans pairing, smooth scroll reveals.

## Ship checklist
1. Build the site in this directory (`~/code/suede-guitar-hub`).
2. `vercel.json` MUST contain: `"ignoreCommand": "[ \"$VERCEL_ENV\" != \"production\" ] && exit 0 || exit 1"` (standing rule — no preview builds).
3. Init git, create **public** GitHub repo `JasonColapietro/suede-guitar-hub` (gh auth must show JasonColapietro active; commits SSH-signed by default — do not disable signing). No Claude attribution anywhere.
4. Public repo standing rule: commit `.claude/settings.json` registering the Suede skills marketplace (`extraKnownMarketplaces.suede` → github `JasonColapietro/suede-creator-skills`, `enabledPlugins: {"suede-skills@suede": true}`).
5. Create Vercel project, deploy to production, then attach **guitarhub.org** (it is already owned in the Vercel team `suede-ai-64d39175`; it currently serves a parked 301 — repointing it is authorized).
6. Verify live: `curl -sI https://guitarhub.org` returns 200 with the new site; spot-check pages.
7. Application form: wire to email (info@suedeai.ai) via a simple API route or a form provider already in the stack — no new paid services.
8. Leave strumly completely untouched.
9. Finish with a commit and a `HANDOFF.md` in this directory summarizing what shipped, what's placeholder (pricing, any TODO copy), and exact next steps for Jason.

## Decision defaults (do NOT stop to ask; no interactive questions available)
- Smallest scope that satisfies "nearly identical structure."
- Original copy throughout; placeholder pricing marked `TODO-JASON` if none exists.
- Never fabricate named people or numeric results.
- If genuinely blocked (missing credential, destructive choice), write the blocker into `HANDOFF.md` and continue with everything else.
