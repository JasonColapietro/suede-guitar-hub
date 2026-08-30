# GuitarHub launch runbook

Drafts for Jason to review and post. Nothing in this folder has been posted, submitted,
or sent anywhere. Every file is copy you paste yourself.

| File | What it is |
|---|---|
| `README.md` | This runbook. Order of operations, preconditions, checklist. |
| `directories.md` | Directory table plus the exact submission copy to paste into forms. |
| `social.md` | X thread, standalone X posts, LinkedIn post, two short-video scripts. |
| `communities.md` | Where guitarists actually are, the rules, and contribution-first drafts. |
| `outreach-emails.md` | Five cold-email templates: creator, newsletter, journalist, teacher, podcast. |
| `press-kit.md` | Boilerplate, founder bio, fact sheet, asset list, what may not be claimed. |

---

## Ground truth, verified 2026-08-29

Two different things, kept apart on purpose: **what production serves today** (checked with
live HTTP requests) and **what this branch already contains** (checked in the source). Every
gap below closes when the branch deploys — which is why Step 0 is a deploy and not a fix.

**Production today**

- `https://guitarhub.org` returns 200, served by Vercel.
- `https://guitarhub.org/breakthrough` returns 200.
- `https://guitarhub.org/llms.txt` returns 200.
- `https://guitarhub.org/robots.txt` returns 200 and explicitly allows the AI and search
  crawlers plus the three social unfurlers.
- `https://guitarhub.org/sitemap.xml` returns 200 but lists **2 URLs**, because production is
  running a build from before the sitemap was rewritten.
- The live home page emits **no `og:image`**, so a link pasted today unfurls as a bare text
  card. Same cause: the deployed build predates the card.
- Every Strumly, Suede Social, and Suede Labs URL used in these drafts returns 200.

**Live as of 2026-08-30 00:22 UTC — the deploy blocker is cleared**

The buildout is deployed. Every route below was checked with a real HTTP request against
production after the deploy went READY, not against the source:

```
200  /            200  /method       200  /tools        200  /guides
200  /faq         200  /about        200  /diagnose     200  /tempo
200  /readiness   200  /breakthrough
200  /how-to-practice-guitar-effectively    200  /guitar-practice-plateau
200  /deliberate-practice-guitar            200  /30-day-guitar-challenge
200  /guitar-practice-routine-intermediate  200  /how-long-to-practice-guitar-each-day
200  /guitar-practice-schedule              200  /why-cant-i-play-guitar-fast
200  /how-to-memorize-songs-on-guitar       200  /practicing-guitar-with-a-metronome
200  /sitemap.xml 200  /robots.txt   200  /llms.txt     200  /opengraph-image
```

24 of 24 return 200. `sitemap.xml` now lists **20 URLs**, up from 2. The home page emits
`og:image` pointing at a real 1200x630 PNG (38 KB, `image/png`), and `twitter:card` is
`summary_large_image` rather than the small text card. `/method`, `/tools` and `/faq` were
spot-checked and each carries its own `og:image`.

**Every link in this pack is safe to post.**

**Two routes referenced nowhere here, on purpose**

`/session` and `/log` were scoped and never built. They are absent from the route registry,
so nothing on the site or in this pack points at them. Do not add them to submission copy.

**One thing still broken, and it is the funnel**

`RESEND_API_KEY` is not set on the `suede-guitar-hub` Vercel project — confirmed with
`vercel env ls production`, which reports zero environment variables. Until it is set, every
application submitted at `/#apply` returns a 503 and the applicant is shown the
`info@suedeai.ai` email fallback instead of being delivered.

The sending domain is fine: `resend._domainkey.guitarhub.org` publishes a valid DKIM record,
so `applications@guitarhub.org` is a verified sender. The key is the only missing piece.

```bash
cd ~/code/suede-guitar-hub && vercel env add RESEND_API_KEY production
```

Then redeploy so the new value is picked up. **Driving traffic before this is set means
applications arrive only from people willing to copy an address into their mail client.**

**Already in this branch, so do not go build them again**

- **The sitemap.** `app/sitemap.ts` reads `HOME`, `TOOLS` and `GUIDES` from `lib/site.ts`
  and emits **12** URLs. Do not "point it at `SITEMAP_ENTRIES`" — that constant is
  `HOME + TOOLS + GUIDES` and excludes `/about` deliberately, so switching to it would drop
  a page rather than add nine.
- **The Open Graph card.** `app/opengraph-image.tsx` generates a 1200x630 PNG served at
  `/opengraph-image`, and `app/twitter-image.tsx` re-exports the same artwork. Every page
  now emits it, but that took a second fix worth knowing about: Next attaches a
  file-convention image to the segment that owns the file, and a page-level `openGraph`
  block **replaces** the layout's resolved object, card included. Eleven of the thirteen
  pages were shipping no `og:image` because of it. Each one now passes
  `images: [OG_IMAGE]` from `lib/site.ts`. If you add a page with its own `openGraph`
  block, it needs that line too, or it unfurls bare.

---

## Order of operations, and why this order

The sequence is not arbitrary. Each phase either removes a way the next one can fail, or
buys standing the next one needs.

### Step 0 — Ship the site. Nothing else starts until this is done.

Deploy the branch. Then re-run the route check and confirm all twelve return 200.

```
for p in / /breakthrough /diagnose /tempo /readiness /method /about \
         /guitar-practice-plateau /how-to-practice-guitar-effectively \
         /deliberate-practice-guitar /30-day-guitar-challenge \
         /guitar-practice-routine-intermediate; do
  printf '%s  %s\n' "$(curl -s -o /dev/null -L -w '%{http_code}' "https://guitarhub.org$p")" "$p"
done
```

**Must be true before Step 1:** already satisfied — 24 of 24 routes returned 200 on 2026-08-30. The list above is the sitemap —
check it against `curl -s https://guitarhub.org/sitemap.xml | grep -c '<loc>'`, which should
also return 12, so a route added later cannot quietly drop out of this check.

### Step 1 — Fix the plumbing. Do this before anyone sees a link.

Two things, in this order:

1. **Confirm the OG card renders — on more than the home page.** The card ships (see Ground
   truth above), but it is generated at request time by `next/og` and it is per-page, so
   what matters is that a real unfurler gets one for each URL you intend to paste. Check
   `https://guitarhub.org`, one tool page, and one guide page in a link-preview checker and
   in a Discord or Slack message. Directories scrape the card, X and LinkedIn render it, and
   most of them cache whatever they get on the first try and never re-scrape — which is why
   this happens before anything is submitted anywhere.
2. **Search Console and Bing Webmaster Tools.** Add `guitarhub.org` as a property, verify
   it, submit the sitemap. Do this *before* the directory batch, not after: the directory
   links are the first external signals the site will get, and you want the crawler already
   aware of the pages those links point at.

**Must be true before Step 2:** the OG card renders in a link-preview checker; sitemap lists
12 URLs; Search Console shows the property verified and the sitemap accepted.

### Step 2 — Start earning community standing. Post nothing. Start today.

This runs in the background for the whole launch, and it is why it appears this early.

Guitar communities are the highest-quality audience in this pack and the one you cannot
buy your way into. Most of them will remove a link from an account with no history, and
some will ban it. The only way through is to already be a participant when you eventually
post — which means the clock starts weeks before the post does.

So: pick two or three venues from `communities.md`, join, read the rules channel or sidebar,
and answer questions about practice for a few weeks. No links. No mention of the site. Just
be useful about the thing the site is about.

**Must be true before Step 7:** you have real, unpaid, non-promotional history in the venue,
and you have read that venue's current rules yourself.

### Step 3 — Your own channels. The anchor post.

X thread and LinkedIn post from `social.md`. These come before directories and before Show
HN for one reason: they are the only surfaces you fully control, so they are where you find
out whether the copy lands and whether anything on the site breaks under a small amount of
real traffic. Fix what surfaces here before a bigger audience hits it.

Post the X thread and the LinkedIn post on different days. Same-day cross-posting reads as
a broadcast; a day apart reads as a person.

**Must be true before Step 4:** the site survived the traffic, the tools worked on other
people's phones, nothing 404'd.

### Step 4 — Directory batch one. Two hours, the tier-1 list.

`directories.md`, tier 1 only. Product Hunt is *not* in this batch — it gets its own day.

Do these in one sitting with the copy block open in another window. Each one is a form and
a paste. The value is mostly durable long-tail discovery and a handful of real backlinks,
not a traffic spike, so treat it as chores, not as a launch.

**Must be true before Step 5:** OG card confirmed rendering in Step 1, because directories
that scrape a card will cache a bad one and most will not re-scrape.

### Step 5 — Show HN.

GuitarHub qualifies. HN's own Show HN guidelines say it is for something you made that
others can play with, and rule out things that cannot be tried — blog posts, sign-up pages,
newsletters. Four tools that run with no account and no signup are exactly the shape that
fits, and "no barriers such as signups or emails" is stated there as a positive.

Link `https://guitarhub.org` (not a tool page — let people choose), title as drafted in
`directories.md`, and post your explanatory comment yourself, immediately, as the maker.

**Never ask anyone to upvote.** HN's guidelines say so explicitly and the site detects it.
This is the one step where a shortcut gets the submission killed and the domain penalised.

**Must be true:** you have a free hour after posting to answer comments. A Show HN where the
maker vanishes does worse than one that was never posted.

### Step 6 — Product Hunt.

Its own day, because it needs assets nothing else needs: a 240x240 thumbnail, at least two
gallery images at 1270x760, the 60-character tagline, and a maker's first comment. Anyone
can submit their own product.

Ask for **feedback, not upvotes** — Product Hunt's own preparation guide words it that way,
and asking for votes is against the rules on both platforms in this pack.

**Must be true:** thumbnail and at least two gallery images exist and show the tools
actually doing something. Screenshots of a hero section are worth nothing here.

### Step 7 — Community posts. Only now.

Only in venues where Step 2 gave you standing, only following that venue's current rules,
and only with the contribution-first drafts in `communities.md`. Read the rules again on the
day — they change, and a rule you read in Step 2 is not evidence about today.

One venue at a time, several days apart. Posting the same thing in five guitar communities
in one afternoon is the pattern every moderator is looking for.

### Step 8 — Directory batch two, and the long tail.

The tier-2 list. Low value each, non-zero in aggregate, and none of it is urgent. Spread it
over a few weeks rather than burning a day on it.

---

## What you cannot say, in any form or post

You will be adapting this copy live in text boxes. These constraints travel with it.

- **No numbers you cannot show.** No user counts, no "X% of players", no study citations, no
  outcome percentages. You can describe an idea like deliberate practice in plain language.
  You cannot attach a number or a named study to it.
- **No testimonials, no names, no quotes.** Nobody has said anything about GuitarHub yet.
- **No claimed outcomes.** The tools have not made anyone better at guitar yet, and saying
  they have is the one lie that would actually matter.
- **No features that do not exist.** No accounts, no uploads, no video library, no chat, no
  mentors, no payments. The founding room is an application under review, not a running
  product, and every mention of it must say so.
- **No price, ever.** Not for the room, not "starting at", not "free for now". The tools are
  free — that is a fact about the tools and it is fine to state. The room has no announced
  price and must not imply one.
- **Say who you are.** Every post in this pack is posted by Jason, openly, as the person who
  built the thing. No alternate accounts, no friends posting it as a discovery, no
  undisclosed affiliation. Beyond being the rule on every platform here, it is the thing
  that makes the honest positioning worth anything.

---

## Checklist

**Step 0 — ship**

- [ ] Branch deployed to production
- [ ] All 12 routes return 200, `/about` included
- [ ] Tools tested on a real phone, not just a resized desktop window
- [ ] Tools tested with localStorage blocked (private window) and nothing crashes

**Step 1 — plumbing**

- [ ] OG card renders for the home page, a tool page, and a guide page — checker plus a real
      Discord or Slack paste
- [ ] sitemap.xml lists 12 URLs
- [ ] Google Search Console property verified, sitemap submitted
- [ ] Bing Webmaster Tools property verified, sitemap submitted
- [ ] `llms.txt` re-read once the tools are live, so it describes what actually ships

**Step 2 — standing (starts now, finishes later)**

- [ ] Joined 2–3 communities from `communities.md`
- [ ] Read each venue's current rules myself
- [ ] Contributing without links for at least a few weeks

**Step 3 — own channels**

- [ ] X thread posted from @johnnysuede
- [ ] Reposted or quoted from @AISUEDE
- [ ] LinkedIn post published, on a different day
- [ ] Nothing broke under the traffic

**Step 4 — directories, tier 1**

- [ ] Uneed
- [ ] Startup Fame
- [ ] Launching Next
- [ ] SaaSHub
- [ ] AlternativeTo
- [ ] Peerlist
- [ ] MicroLaunch
- [ ] Music Tools Index
- [ ] Fazier (only if the footer backlink is acceptable — see `directories.md`)

**Step 5 — Show HN**

- [ ] Posted with a maker comment, on a day I can sit with it
- [ ] Did not ask anyone to upvote

**Step 6 — Product Hunt**

- [ ] 240x240 thumbnail ready
- [ ] Two or more 1270x760 gallery images showing the tools in use
- [ ] Maker's first comment written in advance
- [ ] Asked for feedback, not upvotes

**Step 7 — communities**

- [ ] Re-read the venue rules on the day
- [ ] One venue at a time, days apart
- [ ] Posted openly as the builder in every one

**Step 8 — long tail**

- [ ] Tier-2 directories, spread out
- [ ] Standalone X posts scheduled weeks apart, not batched

---

## What to measure, and what it will not tell you

Worth watching: Search Console impressions per page (which of the six guides earns
anything), referrer traffic per directory (most will send nothing — that is normal and not a
failure), and how many people who land on a tool page reach a result rather than bouncing
off the form.

Worth ignoring: upvote counts, follower change on launch day, and directory listing counts.
None of them are the thing.

What none of it can tell you: whether the method works. That needs the founding room, real
recordings, and honest denominators, and it is a claim you do not get to make until you
have them. The site is already careful about this. Keep the distribution equally careful.
