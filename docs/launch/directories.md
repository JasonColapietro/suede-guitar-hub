# Directory submissions

Two parts: where to submit, then the copy to paste. The copy block at the bottom is written
once and reused across every form in the table.

**Read `README.md` Step 0 first.** Ten of GuitarHub's twelve routes are 404 in production
as of 2026-08-29, `/about` among them. Directories scrape and cache. Submitting now means
caching a broken site.

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
| BetaList | betalist.com/submit | Submit page loads, form is behind a login. Historically aimed at **pre-launch and early-stage** products — GuitarHub is live and free, so check eligibility before spending time. |

**On the "931 directories" lists you will find:** they exist, and submitting to all of them
is roughly 60 hours of form-filling for links most of which no human reads. Batching five to
ten a week is the sane version. Do not let the long tail eat the week that should go into
`communities.md`, which is where the actual audience is.

---

## Do not submit — and why

Being in a directory you do not belong in is a small dishonesty that costs more than the
listing is worth. These are the ones to skip on purpose.

**AI tool directories — Futurepedia, There's An AI For That, Toolify, dang.ai.**
GuitarHub's four tools are deterministic. The diagnostic scores fixed weights, the tempo
ladder is arithmetic, the readiness score is a checklist, the planner is a lookup. There is
no model, no inference, no API call. Listing them as AI tools would be a false claim on a
site whose entire positioning is that it does not make false claims. **These directories are
a genuine fit for Strumly, which is an AI coach.** That is a separate submission run under a
separate product name, and worth doing — just not here.

**Music teacher directories — MusicTeacher.com, musicteachersdirectory.org, MusiCurate,
MusicTeacherNotes.** These list named individual teachers who are accepting students, and
people search them to book lessons. GuitarHub is not a teacher and is not taking students.
A listing would waste the searcher's time and misrepresent what the site does.

**G2, Capterra, SourceForge, Trustpilot.** B2B software review platforms. They expect a
vendor profile, a commercial product, a pricing model, and customer reviews. GuitarHub has
no accounts, no pricing, and no customers. Nothing to review.

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

Paste these. Do not rewrite them per form — the point of one block is that the positioning
stays identical across forty listings, which is what makes the site legible to both people
and answer engines.

Character counts below were counted by hand. **Trust the form's own counter over mine** and
trim from the end if a field is stricter than expected.

---

### Tagline — 60 characters or fewer

Primary (57 chars):

```
Free guitar practice tools. No account. Nothing uploaded.
```

Alternate, when the field wants a description rather than a claim (56 chars):

```
Four free guitar practice tools that run in your browser
```

Alternate, when the field is the headline of a card and needs the problem (52 chars):

```
Find the reason your guitar practice stopped working
```

**Launching Next wants a 5–8 word headline specifically.** Use:

```
Free guitar practice tools, no account needed
```

---

### Short description — 160 characters or fewer

154 chars:

```
Four free guitar practice tools: a plateau diagnostic, a tempo ladder, a song readiness score, and a 30-day plan. No account. Nothing leaves your browser.
```

---

### Long description — around 400 characters

385 chars:

```
GuitarHub is a free practice site for guitarists whose playing has stopped changing. Four browser tools turn a vague plan into one target you can pass or fail: a nine-question plateau diagnostic, a tempo ladder builder, a ten-check song readiness score, and a 30-day planner. Six guides cover the method behind them. No account, no sign-up, no upload. Everything stays in your browser.
```

Append this sentence when the field allows more (adds 21 chars, total 406):

```
 Built by Suede Labs.
```

---

### Long-form description — for the 500 to 2,500 character fields

Product Hunt allows 500. Launching Next allows 2,500. Use the 385-char block above for
Product Hunt, and this for anything larger:

```
GuitarHub is a free practice site for guitarists whose playing has stopped changing.

A plateau is a repetition problem, not a volume problem. Practice changes your playing at the edge where you can just barely hold it together, so a session with nothing failing in it leaves you at exactly the level you walked in with. More hours do not fix that on their own. What the hours contain does.

Four tools, all free, all running entirely in the browser:

- Practice plateau diagnostic. Nine questions about how you actually practice, scored against five blockers: no measurable target, never at tempo, no feedback loop, practicing the comfortable part, and material churn. It returns one thing to change in your next session.
- Tempo ladder builder. Give it the tempo you play a passage cleanly and the tempo you need. It returns an ordered set of sessions with capped steps, hold rungs, and a back-off session, each with a condition to pass before moving up.
- Song readiness score. Ten checks that decide whether a song survives outside practice conditions, including playing it cold, standing, from memory, twice in a row, and ending it on purpose. It names the single highest-leverage thing to fix.
- 30-day breakthrough planner. One finish line turned into a four-week sequence you can run this month.

Six written guides cover the method behind the tools.

There is no account, no sign-up, and no upload. Answers are stored in your browser's local storage and nowhere else. There is nothing to buy.

Built by Suede Labs, who also build Strumly, an AI guitar coach.
```

---

### Standard form fields

| Field | Answer |
|---|---|
| Product name | GuitarHub |
| URL | https://guitarhub.org |
| Pricing / license | **Free.** Not freemium, not free trial, not free tier. There is nothing to buy and no account to make. If the form only offers Freemium/Paid/Free Trial, pick Free; if it forces a price, leave the listing rather than entering a number. |
| Platform | Web / browser. No app, no download, no extension. |
| Category | Education → Music, or Productivity if music is absent. Not AI. Not SaaS. |
| Tags (5–10) | `guitar`, `guitar practice`, `music education`, `practice tools`, `learn guitar`, `metronome`, `tempo training`, `free tools`, `no signup`, `browser tools` |
| Startup type (Launching Next) | Side project |
| 90-day marketing budget (Launching Next) | Whatever is true. It is a filter field, not a public one. |
| Maker / founder | Jason Colapietro, Suede Labs |
| Contact | info@suedeai.ai |
| Screenshot | A tool mid-use, showing a real result. Not the hero section. A directory card showing a headline tells a browsing visitor nothing; a card showing a tempo ladder or a scored diagnostic tells them exactly what they get. |

---

### Show HN

Title — HN strips marketing language, so state the thing:

```
Show HN: Free guitar practice tools that run entirely in the browser
```

Link `https://guitarhub.org`, not a tool page.

First comment, posted by you immediately after submitting:

```
I build guitar software, and the same thing kept coming up: people who have practiced for years and stopped getting better. Not beginners. Players with a decade in who can almost play a hundred things and fully play none.

The pattern I kept landing on is that a plateau is a repetition problem rather than a volume problem. Practice changes your playing at the edge where you can just barely hold it together, so an hour containing nothing difficult maintains you at the level you walked in with.

So I built four tools around that. A nine-question diagnostic that scores how you practice against five blockers and names one thing to change. A tempo ladder builder that turns "play it faster" into an ordered set of sessions with capped steps, hold rungs, and a back-off session. A ten-check song readiness score for the parts that break outside the practice room, like starting cold, playing standing, and ending on purpose. And a four-week planner.

Everything runs client-side. No account, no server, no upload. Answers go into localStorage and nowhere else, so private-mode users just lose persistence rather than hitting a wall.

The scoring logic is opinionated and I would rather argue about it than defend it. If a rule is wrong I would like to know which one.
```

That last line is real. It is an invitation to critique, which is what HN rewards, and it is
not an ask for votes, which HN penalises.

---

### Product Hunt maker's first comment

```
Hi everyone. I'm Jason, I build guitar software at Suede Labs.

GuitarHub is for players whose practice stopped producing change. Not beginners — people a few years in, with a shelf of half-learned songs, who are putting the hours in and hearing the same recording every month.

The idea behind it is that a plateau is a repetition problem rather than a volume problem. Your playing changes at the edge where you can just barely hold it together, so an hour with nothing difficult in it maintains you exactly where you were.

There are four tools: a diagnostic that scores how you practice and names one thing to change, a tempo ladder builder with capped steps and hold rungs, a ten-check song readiness score, and a four-week planner. All free, no account, nothing uploaded — it all runs in your browser and stores answers locally.

What I would most like feedback on: the diagnostic's scoring. It weights nine questions across five blockers, and those weights are my judgement rather than anything measured. If it names the wrong blocker for your playing, please tell me which question misled it.
```

Note the framing: it asks for feedback on a specific thing, which is what Product Hunt's own
guidance recommends, and it does not ask for votes.
