# Directory submissions

Two parts: where to submit, then the copy to paste. The copy block at the bottom is written
once and reused across every form in the table.

**Read `README.md` Step 0 and Step 1 first.** Directories scrape and cache the first card
and copy they see, so submit only after the owner steps are done and the share cards render.

---

## How this table was built, and what "verified" means

Every URL below was requested directly on 2026-08-29 and returned either 200 or 403.
A **403 means the site exists and blocks automated requests** — normal for these platforms,
and not a sign the directory is dead. It does mean I could not read the submission form, so
those rows say so instead of guessing at field limits.

Where a row states a character limit, a price, or a requirement, that came from the
platform's own page and is marked **verified**. Where it does not, the row says **unverified**
and you should read the form before trusting the effort estimate.

---

## Tier 1 — worth doing, in one sitting

| Directory | URL | Free? | What it needs | Effort | Value |
|---|---|---|---|---|---|
| **Product Hunt** | producthunt.com | Free — verified: anyone can submit their own product | Tagline max 60 chars, description max 500 chars, 240x240 thumbnail under 3MB, **minimum two** gallery images at 1270x760, optional YouTube-only video, maker's first comment. All verified from PH's own launch-prep page. | High — its own day | Highest single-day reach in the list |
| **Hacker News (Show HN)** | news.ycombinator.com | Free | Title and a URL. No assets. Verified from HN's Show HN guidelines: it is for something you made that others can play with; blog posts, sign-up pages and newsletters do not qualify; making it usable without signups is called out as a positive. **Never ask anyone to upvote — HN states this explicitly.** | Low to post, high to sit with | Very high if it lands, zero if it doesn't. Genuinely good fit: four tools, no signup. |
| **Uneed** | uneed.best/submit-a-tool | Free tier exists | Form starts with just product name and URL — it scrapes your page first, then asks you to sign up to save. Verified from the submit page. Remaining fields unverified. | Low | Moderate. Curated indie-maker audience, daily feed. |
| **Startup Fame** | startupfa.me/submit | Believed free with paid upgrades — **unverified**, page is a JS app I could not read | Unverified. Expect name, URL, tagline, description, logo, category. | Low | Moderate. Fast, dofollow-oriented. |
| **Launching Next** | launchingnext.com/submit/ | **Free, reviewed daily — verified.** $99 optional upgrade for 1-business-day review. | Verified fields: startup name, URL, **headline of 5–8 words**, description **max 2,500 chars**, **5–10 comma-separated tags**, startup type (side project / bootstrapped / investor-funded / other), 90-day marketing budget, your name, your email. | Low | Moderate. The 5–8 word headline is the only field needing custom copy. |
| **SaaSHub** | saashub.com/submit | Free — verified | Submit and verify the product, then its own tool offers a list of 108 further directories to post to. Field limits unverified. | Low | Moderate on its own, high as a launchpad for the tier-2 batch. |
| **AlternativeTo** | alternativeto.net | Free, crowdsourced | Could not read the form (403 to automated requests). Historically: name, URL, description, platforms, license/pricing, icon, and — the part that matters — **what it is an alternative to**. | Medium | Good, and an unusually good fit. "Free browser-based guitar practice tools, no account" is a real alternative to paid practice apps, and this is one of the few places where being free and account-free is the differentiator people search for. |
| **Peerlist (Project Spotlight)** | peerlist.io | Free | Could not read the form (403). Runs a weekly project spotlight. Requires a Peerlist profile. | Medium — profile setup first | Moderate. Founder-visible audience, which suits the personal-account strategy. |
| **MicroLaunch** | microlaunch.net | Free with paid "Pro"/"Feature" upgrades — verified from the homepage | Fields unverified. Launch cadence is **monthly**, not daily — verified. | Low | Low to moderate. Monthly cadence means less competition per slot. |
| **Music Tools Index** | musictoolsindex.com | Free — verified | Verified: open suggestion form, self-submissions explicitly welcome, every entry human-reviewed before going live. Categories: Songwriting, AI Music, Plugins, DAWs, Mixing & Mastering, Distribution & Marketing, **Utilities**. | Low | The only genuinely music-native directory found that accepts tool submissions. Submit under Utilities. Fit is real but not perfect — the index skews to production and songwriting tools, not practice tools. Say plainly what it is and let the human reviewer decide. |

### Fazier — a decision, not a default

**fazier.com/submit.** Verified from its own pricing: the **Basic tier is free but requires
a backlink to Fazier on your homepage or footer**, and is reviewed and listed within 30
days. Paid tiers ($29 / $49 / $149) drop the backlink requirement and speed up publication.

That backlink is a real cost. It puts a third-party promotional link in guitarhub.org's
footer permanently, on a site whose whole design argument is that it does not clutter. Not
recommended, but it is a judgement call and the terms are stated honestly by them, so it is
listed honestly here.

---

## Tier 2 — batch these later, low value each

All returned 200 on 2026-08-29. None of their forms were readable to automated requests, so
requirements are **unverified** across this whole tier. Expect the same five fields every
time, which is why the copy block below is written to be pasted without editing.

| Directory | URL | Note |
|---|---|---|
| TinyLaunch | tinylaunch.com | Generic indie launch feed |
| Tiny Startups | tinystartups.com | Newsletter-driven, small |
| LaunchIgniter | launchigniter.com/submit | Aggregator, also publishes its own list of ~931 directories if you want more |
| BetaList | betalist.com/submit | Submit page loads, form is behind a login. Historically aimed at **pre-launch and early-stage** products — GuitarHub is live and selling, so check eligibility before spending time. |

**On the "931 directories" lists you will find:** they exist, and submitting to all of them
is roughly 60 hours of form-filling for links most of which no human reads. Batching five to
ten a week is the sane version. Do not let the long tail eat the week that should go into
`communities.md`, which is where the actual audience is.

---

## Do not submit — and why

Being in a directory you do not belong in is a small dishonesty that costs more than the
listing is worth. These are the ones to skip on purpose.

**AI tool directories — Futurepedia, There's An AI For That, Toolify, dang.ai.**
GuitarHub's lessons and tools are deterministic. The diagnostic scores fixed weights, the
tempo ladder is arithmetic, the 30-day plan is a fixed path, and microphone exercises use
fixed signal processing. There is no model, no inference, no API call, so an AI listing would
describe a different product. **These directories are
a genuine fit for Strumly, which is an AI coach.** That is a separate submission run under a
separate product name, and worth doing — just not here.

**Music teacher directories — MusicTeacher.com, musicteachersdirectory.org, MusiCurate,
MusicTeacherNotes.** These list named individual teachers who are accepting students, and
people search them to book lessons. GuitarHub is not a teacher and is not taking students.
A listing would waste the searcher's time and misrepresent what the site does.

**G2, Capterra, SourceForge, Trustpilot.** B2B software review platforms. They expect a
vendor profile, a commercial product, a pricing model, and customer reviews. GuitarHub is a
consumer guitar course, not business software, so it does not fit their categories.

**Crunchbase.** Entity-level, not product-level. A Crunchbase profile would be for Suede
Labs, not GuitarHub. Worth doing eventually as a company task; it is not part of this launch.

**DevHunt.** Developer tools only. GuitarHub is built with dev tools; it is not one.

**OpenAlternative.** For open-source alternatives to proprietary SaaS. The repo is public,
but GuitarHub is not positioned as an alternative to a specific paid product, which is what
that directory indexes. Check their current scope before deciding; do not assume it fits.

**SideProjectors.** A marketplace for buying and selling side projects. Listing GuitarHub
there says it is for sale.

---

# The submission copy

Paste these. Do not rewrite them per form: one block keeps the positioning identical across
forty listings, which is what makes the site legible to both people and answer engines.

Character counts below were counted by script. **Trust the form's own counter** and trim from
the end if a field is stricter than expected.

**Price lines.** Until 30 November 2026: "$79 one time" and "Launch price $79. Goes to $99 on
December 1, 2026." From 1 December 2026: "$99 one time", no launch line. Never "usually",
"was $99", "save" or a countdown.

---

### Tagline — 60 characters or fewer

Primary (49 chars):

```
Real guitar chords and your first solo in 30 days
```

Alternate, when the field wants a description (59 chars):

```
A guitar course from first chords to first solo, free start
```

**Launching Next wants a 5–8 word headline specifically.** Use:

```
Play real chords and improvise in 30 days
```

---

### Short description — 160 characters or fewer

```
Play real chords and improvise your first solo in 30 days. Free first module and practice tools; every lesson $79 one time, with a 90-day guarantee.
```

---

### Long description — around 400 characters

```
GuitarHub gets beginner and intermediate guitarists playing real chords and improvising their first solo in 30 days: D and A, then E, C and G, then the minor pentatonic box, then four bars over a blues. A placement picks one free module, and the tuner, metronome and 30-day plan are free. Lifetime access is $79 one time on the web or iPhone, with a 90-day money-back guarantee.
```

Append this sentence when the field allows more:

```
 Built by Suede AI.
```

---

### Long-form description — for the 500 to 2,500 character fields

Product Hunt allows 500: use the block above. Use this for anything larger:

```
GuitarHub is a guitar course from Suede AI built around one promise: play real chords and improvise your first solo in 30 days.

The 30-day path runs four modules in order, one a week:
- D and A: two chords, checked string by string, switched on the beat.
- E, C and G: the open chords behind most songs, played through a full study.
- Box One: the minor pentatonic box, the five notes that always work over a blues.
- First Solo: four bars of your own over a twelve-bar blues, without stopping.

Every lesson pairs written instruction with something you play. Microphone exercises score single-note pitch and timing on your device, and nothing is uploaded.

Start free. Five questions pick your first module, and it opens in your browser with no account. The tuner and metronome, a practice plateau diagnostic, a tempo ladder builder and the full 30-day plan, with a printable chord and pentatonic chart pack by email, are free too.

Lifetime access opens all 135 lessons, the Advanced Lab of scored drills and the daily practice routine: $79 one time, on guitarhub.org or in the iPhone app, and one purchase covers both. Launch price $79. Goes to $99 on December 1, 2026. If after 90 days you are not playing chords and improvising, you get a full refund.

Built by Suede AI, who also build Strumly, an AI guitar coach.
```

---

### Standard form fields

| Field | Answer |
|---|---|
| Product name | GuitarHub |
| URL | https://guitarhub.org |
| Pricing / license | **Freemium**: a free first module and free tools, then lifetime access at $79 one time (no subscription). If the form forces one price, enter 79 USD, one-time. |
| Platform | Web (any browser) and iPhone (App Store: GuitarHub: Guitar Lessons). |
| Category | Education → Music. Not AI. |
| Tags (5–10) | `guitar`, `learn guitar`, `guitar lessons`, `guitar chords`, `guitar improvisation`, `music education`, `metronome`, `guitar tuner`, `pentatonic scale` |
| Startup type (Launching Next) | Bootstrapped product |
| 90-day marketing budget (Launching Next) | Whatever is true. It is a filter field, not a public one. |
| Maker / founder | Jason Colapietro, Suede AI |
| Contact | info@suedeai.ai |
| Screenshot | The free module mid-lesson, or the 30-day plan's four weeks. Not the hero section: a card showing the product in use tells a browsing visitor what they get. |

---

### Show HN

Title — HN strips marketing language, so state the thing:

```
Show HN: GuitarHub – real guitar chords and a first solo in 30 days
```

Link `https://guitarhub.org`, not a sub-page.

First comment, posted by you immediately after submitting:

```
I build guitar software. Most guitar courses sell a library, and a library has no finish line, so players stall somewhere in the middle. GuitarHub gives the first month one finish: real chords and an improvised solo by day 30.

The path is four existing modules in order: D and A, then E, C and G, then the minor pentatonic box, then four bars of your own over a twelve-bar blues. Microphone exercises score single-note pitch and timing client-side; no audio leaves the device.

You can try it without an account: a five-question placement opens one module free, and the tuner, metronome, practice diagnostic and tempo ladder are free in the browser. The full course is $79 one time, with a 90-day money-back guarantee.

The placement is the part I'd most like argued with. If it puts you in the wrong module, tell me which answer misled it.
```

That last line is an invitation to critique, which is what HN rewards, and it is not an ask
for votes, which HN penalises.

---

### Product Hunt maker's first comment

```
Hi everyone. I'm Jason, I build guitar software at Suede AI.

GuitarHub is built around one promise: play real chords and improvise your first solo in 30 days. Week 1 is D and A, week 2 is E, C and G, week 3 is the minor pentatonic box, and week 4 is four bars of your own over a blues.

You start free: five questions pick your first module, and the tuner, metronome and full 30-day plan are free too. Every lesson after that is $79 one time on the web or iPhone, one purchase for both. Launch price $79. Goes to $99 on December 1, 2026. If after 90 days you are not playing chords and improvising, you get a full refund.

What I'd most like feedback on: the placement. If it starts you in the wrong module, tell me which question misled it.
```

It asks for feedback on a specific thing, which is what Product Hunt's own guidance
recommends, and it does not ask for votes.
