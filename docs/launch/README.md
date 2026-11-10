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
| `press-kit.md` | Boilerplate, founder bio, fact sheet, numbers to quote, asset list. |

---

## The story every file tells (2026-11-10)

- **Promise:** Play real chords and improvise your first solo in 30 days.
- **Who for:** beginner and intermediate guitarists.
- **The 30-day path:** D and A, then E, C and G, then Box One (the minor pentatonic box),
  then First Solo (four improvised bars over a twelve-bar blues).
- **Free:** one full module picked by the five-question placement at `/start`; the tuner and
  metronome (`/practice`); the 30-day plan (`/breakthrough`, the full plan and a chord and
  pentatonic chart pack by email); the practice plateau diagnostic (`/diagnose`); the tempo
  ladder builder (`/tempo`); the written guides and their PDF field guides.
- **Lifetime access:** $79 one time on guitarhub.org or in the iPhone app. Launch price $79.
  Goes to $99 on December 1, 2026. One purchase opens every lesson on both when the player
  signs in with the same email. It also opens the Advanced Lab, the A-to-D chord routine,
  `/session`, `/readiness` and `/log`.
- **Guarantee:** If after 90 days you are not playing chords and improvising, you get a full
  refund. It covers web purchases; Apple handles refunds for purchases made in the app.
- **Voice:** voice lessons on the web live on Suede Sing (https://sing.suedeai.ai).
- **Primary link:** `https://guitarhub.org/breakthrough` (the free 30-day plan). Second:
  `https://guitarhub.org/start` (the free module).

Every draft in this folder uses these facts and no others. The press kit has the numbers to
quote.

---

## Step 0: owner steps before any traffic

The sell-first build sells only once these are done. Each is an owner step; the code is
ready and waits on them. Full detail: `docs/account/README.md`, "Owner steps".

1. Apply the database migration `supabase/migrations/20261110000000_guitarhub_sell_first.sql`.
2. Set the Vercel environment: Supabase URL, publishable and service keys; Apple server
   credentials; `STRIPE_SECRET_KEY`; the Stripe webhook secret `STRIPE_WEBHOOK_SECRET`; the
   email keys `RESEND_API_KEY` and `GUITARHUB_LEADS_UNSUBSCRIBE_SECRET`; `CRON_SECRET`; and
   last `GUITARHUB_ACCOUNTS_ENABLED=true`.
3. Supabase Auth: allow sign-ups, require email confirmation, send the numeric code, set
   rate limits.
4. Resend: confirm `plan@guitarhub.org` sends, with open and click tracking off.
5. Merge `sell-first-web` to `main`, then create the Stripe webhook for
   `https://guitarhub.org/api/stripe/webhook` (`checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `charge.refunded`).
6. One live purchase, sign in with the receipt email, lessons open; refund it, lessons lock.
7. Ask for the plan on `/breakthrough` with your own address and confirm the first email
   arrives with a working unsubscribe link.
8. Redeploy on or after 1 December 2026 so pre-built pages show $99.

**Must be true before Step 1:** a live purchase unlocked lessons, a refund locked them, and
the plan email arrived.

---

## Order of operations, and why this order

Each phase either removes a way the next one can fail, or buys standing the next one needs.

### Step 1: plumbing. Do this before anyone sees a link.

1. **Confirm the share cards render.** The home card reads "Real chords and your first solo
   in 30 days". Check `https://guitarhub.org`, `/breakthrough`, `/start` and one guide page
   in a link-preview checker and in a Discord or Slack message. Directories and social
   networks cache the first card they scrape.
2. **Search Console and Bing Webmaster Tools.** Verify `guitarhub.org` and submit
   `https://guitarhub.org/sitemap.xml` before the directory batch, so the crawler knows the
   pages the first links point at.
3. **Route check.** Every URL in this pack returns 200:

```
for p in / /breakthrough /start /practice /diagnose /tempo /learn /learn/guitar /faq \
         /compare /method /about /privacy /terms; do
  printf '%s  %s\n' "$(curl -s -o /dev/null -L -w '%{http_code}' "https://guitarhub.org$p")" "$p"
done
```

**Must be true before Step 2:** cards render, sitemap accepted, every route 200.

### Step 2: earn community standing. Post nothing. Start today.

Guitar communities remove links from accounts with no history. Pick two or three venues from
`communities.md`, read the rules, and answer practice questions for a few weeks with no
links. The 30-day path gives you a clear point of view to answer from: chords first, then
the pentatonic box, then four bars of your own.

**Must be true before Step 7:** real, non-promotional history in the venue, and that venue's
current rules read by you.

### Step 3: your own channels. The anchor post.

X thread and LinkedIn post from `social.md`, on different days. These are the surfaces you
control, so this is where you learn whether the copy lands and whether checkout, sign-in and
the plan email hold up under real traffic.

**Must be true before Step 4:** the plan email arrived for real visitors, checkout worked on
other people's phones, nothing 404'd.

### Step 4: directory batch one. The tier-1 list.

`directories.md`, tier 1 only, in one sitting with the copy block open. Product Hunt gets its
own day.

### Step 5: Show HN.

Show HN is for something people can try. GuitarHub's tuner, metronome, diagnostic, tempo
ladder and free module open in the browser with no account, so a reader can try it in the
first minute. Link `https://guitarhub.org`, title as drafted in `directories.md`, and post
your maker comment immediately. **Never ask anyone to upvote.** Keep a free hour to answer
comments.

### Step 6: Product Hunt.

Its own day. Assets: a 240×240 thumbnail, at least two 1270×760 gallery images showing the
free module and the 30-day plan in use, the 60-character tagline, and a maker's first
comment. Ask for feedback, not upvotes.

### Step 7: community posts. Only now.

Only in venues where Step 2 gave you standing, only under that venue's current rules, with
the contribution-first drafts in `communities.md`. One venue at a time, days apart.

### Step 8: directory batch two, and the long tail.

The tier-2 list, spread over a few weeks.

---

## Claims to use

You will adapt this copy live in text boxes. Keep it inside these lines:

- **Use the promise as written:** "Play real chords and improvise your first solo in 30
  days." Present it as what the path teaches toward, with the guarantee behind it.
- **Price, from the offer:** "$79 one time" and, until 30 November 2026, "Launch price $79.
  Goes to $99 on December 1, 2026." Never "usually $99", "was $99", "save" or a countdown.
  From 1 December 2026 the price is "$99 one time" with no launch line.
- **The guarantee, verbatim:** "If after 90 days you are not playing chords and
  improvising, you get a full refund." It covers web purchases.
- **Feedback, precisely:** microphone exercises score single-note pitch and timing on the
  device. Describe chords as something the lessons teach and check, never as something the
  app hears or scores.
- **Free, precisely:** the free module, the tuner and metronome, the 30-day plan, the
  diagnostic, the tempo ladder and the guides. Everything else is lifetime access.
- **Voice:** link Suede Sing as the home for voice on the web; do not call it free.
- **Numbers:** only those in the press kit. No user counts, outcome percentages,
  testimonials or study citations until they exist.
- **Say who you are.** Every post is Jason's, openly, as the person who built it. No
  alternate accounts and no undisclosed affiliation.

---

## Checklist

**Step 0: owner steps**

- [ ] Migration applied
- [ ] Vercel environment set, accounts enabled last
- [ ] Supabase Auth and Resend configured
- [ ] Merged to `main`; Stripe webhook created
- [ ] Live purchase unlocks; refund locks
- [ ] Plan email arrives with a working unsubscribe link

**Step 1: plumbing**

- [ ] Share cards render for home, `/breakthrough`, `/start` and a guide
- [ ] Google Search Console and Bing Webmaster Tools verified, sitemap submitted
- [ ] Route check all 200
- [ ] `llms.txt` re-read once live

**Step 2: standing (starts now, finishes later)**

- [ ] Joined 2–3 communities from `communities.md`
- [ ] Read each venue's current rules myself
- [ ] Contributing without links for a few weeks

**Step 3: own channels**

- [ ] X thread posted from @johnnysuede
- [ ] Reposted or quoted from @AISUEDE
- [ ] LinkedIn post published, on a different day

**Step 4: directories, tier 1**

- [ ] Uneed
- [ ] Startup Fame
- [ ] Launching Next
- [ ] SaaSHub
- [ ] AlternativeTo
- [ ] Peerlist
- [ ] MicroLaunch
- [ ] Music Tools Index
- [ ] Fazier (only if the footer backlink is acceptable; see `directories.md`)

**Step 5: Show HN**

- [ ] Posted with a maker comment, on a day I can sit with it
- [ ] Did not ask anyone to upvote

**Step 6: Product Hunt**

- [ ] 240×240 thumbnail ready
- [ ] Two or more 1270×760 gallery images showing the product in use
- [ ] Maker's first comment written in advance
- [ ] Asked for feedback, not upvotes

**Step 7: communities**

- [ ] Re-read the venue rules on the day
- [ ] One venue at a time, days apart
- [ ] Posted openly as the builder in every one

**Step 8: long tail**

- [ ] Tier-2 directories, spread out
- [ ] Standalone X posts scheduled weeks apart

---

## What to watch

The site collects no usage analytics yet; measurement is deferred until there is a paying
user. Watch what you can see without it: plan sign-ups in `guitarhub_leads`, purchases and
refunds in Stripe, Search Console impressions per page, and referrers each directory sends
(most send little, which is normal). Upvote counts and launch-day follower changes are not
the measure.
