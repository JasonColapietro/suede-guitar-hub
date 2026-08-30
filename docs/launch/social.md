# Social copy

Ready to post. Nothing here has been posted. Every draft is written to be posted by Jason,
openly, as the person who built the site.

**Accounts** (from the structured data in `app/layout.tsx`, so these are the real ones):

- X, personal: `@johnnysuede` — post the thread and the standalone posts from here
- X, company: `@AISUEDE` — repost or quote, do not duplicate
- LinkedIn, personal: linkedin.com/in/jasoncolapietro
- LinkedIn, company: linkedin.com/company/suede-labs-ai
- Instagram: instagram.com/suedeai
- YouTube: youtube.com/@aisuede

**Before posting anything:** ten of twelve routes are 404 in production as of 2026-08-29,
`/about` among them, and the live build emits no `og:image`, so a link pasted today unfurls
as a bare text card. Both are the same cause — production is running an old build — and both
clear when the branch deploys. See `README.md` Step 0, then confirm the card actually
unfurls (Step 1) before pasting a link anywhere that caches the first one it sees.

**Character counts** were checked with a script. Every X post below fits 280 **after**
allowing for X counting each link as 23 characters regardless of its real length, so they
all work without a Premium account. Longest is 278.

**First-person stories about your own playing are placeholders.** Three lines in the video
scripts put an anecdote in your mouth that I invented. Replace each with something that
actually happened to you, or cut it. They're the lines a viewer will trust most, which is
exactly why they have to be real:

- Script 1, Beat 1 — "This is the part **I** can already play. It sounds the best, so **I**
  play it the most."
- Script 2, Beat 1 — "You can hear the difference and **I've** been playing this one for
  weeks."
- Script 2, Beat 3 — "Most of the songs **I** thought I'd finished failed several of these."

The Discord reply in `communities.md` has the same problem in the same way, and the first two
paragraphs of the Reddit draft in that file are flagged there.

Two smaller checks: the LinkedIn post opens with "I spent this month", so adjust if the
timeline is different by the time you post, and both scripts assume you'll film yourself
playing badly on purpose without editing it out. That is the part that makes them work.

Everything else in this file is drawn from the site's own copy and from `lib/` — the five
blockers, the ten readiness checks, the ladder's hold and back-off rungs are all real
features you can point at.

---

## X thread

Nine posts. Each one reads on its own, because that is how they will actually be
encountered. No thread emoji, no "here's what I learned", no promise of a payoff further
down. If someone only sees post 6, post 6 should still be worth having read.

Post one line at a time as replies to your own post. Do not schedule the whole thing to
fire in one second.

---

**1/**

```
Most guitarists don't quit. They plateau.

Years of tabs and videos produce players who can almost play a hundred things and fully play none.

So I built a free site about why that happens, with four tools. No account, nothing uploaded.

guitarhub.org
```

**2/**

```
A plateau is a repetition problem, not a volume problem.

Your playing changes at the edge where you can just barely hold it together. An hour with nothing difficult in it leaves you at exactly the level you walked in with. The hour wasn't wasted. It went on the finished part.
```

**3/**

```
Six things cause it:

Practicing what already sounds good.
Never playing at real tempo.
Never hearing yourself from outside your own head.
No target you could pass or fail.
New material before the last piece is done.
Routing around a technique problem instead of fixing it.
```

**4/**

```
The hardest one to catch is the first.

Practicing what already sounds good feels like practice. It's the part that sounds best, so you play it most, and the recording you make in week four sounds like the one from week one.
```

**5/**

```
So I built a diagnostic. Nine questions about how you practice, scored against five blockers: no measurable target, never at tempo, no feedback loop, practicing the comfortable part, material churn.

It names one thing to change in your next session.

guitarhub.org/diagnose
```

**6/**

```
Second tool. You give it the tempo you play a passage cleanly and the tempo you need.

It returns an ordered set of sessions: capped steps, hold rungs that repeat a tempo instead of adding to it, and a back-off session. Each one has a condition to pass.

guitarhub.org/tempo
```

**7/**

```
Third tool. Ten checks a song has to survive outside the practice room.

Can you start it cold. Standing. Twice in a row without the second take being worse. Without the tab. Ending it the same way, on purpose.

guitarhub.org/readiness
```

**8/**

```
All four tools are free and need no account. Nothing is uploaded.

Your answers go into your browser's local storage and nowhere else, which also means they disappear when you clear it. There is no signup wall and nothing to buy.
```

**9/**

```
I'm Jason. I build Suede Labs. GuitarHub is the practice method, Strumly is our AI guitar coach.

There's also a founding practice room, but it's an application we're reviewing, not a running product, and I'd rather say that than imply otherwise.

The tools are just free.
```

**Notes on the thread**

- Post 9 is doing real work. Ending on the honest limitation rather than a pitch is the
  whole positioning in one post, and it is the one most likely to be quoted.
- If a post gets a genuine question, answer it in the replies rather than pointing at a page.
- Do not quote-tweet your own thread to boost it later that day. Let it sit.

---

## Standalone X posts

Three separate posts, for three separate weeks. Not a thread, not the same day, not
scheduled in a batch. Each one has to justify itself with no link doing the work.

**A — the idea, no link**

```
What improves is what is currently failing.

Practice changes your playing at the edge where you can just barely hold it together, and nowhere else. This is why adding hours to a session that contains nothing difficult produces more of the same playing.
```

**B — the uncomfortable one**

```
A song is not finished because you can play it in your practice room.

Can you start it cold, with no warm-up? Standing, with the strap where you'd wear it? Twice in a row without the second take being worse? Can you end it the same way, on purpose?

guitarhub.org/readiness
```

**C — the practical one**

```
"Play it faster" is not a plan.

A tempo you reach once is not a tempo you own. What makes it stick is holding a speed for a session instead of climbing, and dropping below it afterwards to climb back through ground you already covered.

Free builder: guitarhub.org/tempo
```

---

## LinkedIn

One post, on a different day from the X thread. LinkedIn rewards a real first line and
punishes a link in the first two lines, so the URL sits at the end.

```
I spent this month building something free, and the interesting part was what I had to leave out.

GuitarHub is a practice site for guitarists whose playing has stopped changing. Not beginners. People a few years in, with a shelf of half-learned songs, putting the hours in and hearing the same recording every month.

The idea it's built on is that a plateau is a repetition problem rather than a volume problem. Your playing changes at the edge where you can just barely hold it together. A session with nothing failing in it leaves you at exactly the level you walked in with. The hour isn't wasted. It goes on the part that was already finished.

There are four tools. A diagnostic that scores how you practice against five blockers and names one thing to change. A tempo ladder builder that turns "play it faster" into sessions with capped steps and hold rungs. A ten-check score for whether a song survives outside the practice room. A four-week planner. All free, no account, nothing uploaded. Answers live in your browser and nowhere else.

Now the part I had to leave out.

Every instinct in launch copy says to put proof on the page. Numbers of players. A testimonial. A percentage. I have none of those, because the site is new and nobody has used it yet, and inventing them would have been trivially easy and completely invisible to a visitor.

So the page says what it can support and nothing more. No student counts. No outcome claims. The founding practice room is described as what it currently is, which is an application under review, not a running product. Where I wanted a statistic I wrote the idea in plain language instead.

That constraint made the copy better, not worse. Removing every claim I couldn't back left only the ones I could argue for, and an argument you can actually defend reads differently to a reader than a number they can't check.

The tools are free and there is nothing to buy: guitarhub.org

Built at Suede Labs, where we also build Strumly, an AI guitar coach.
```

**Notes**

- The angle is the honesty constraint, not the product. That is the post a founder audience
  on LinkedIn will engage with, and it happens to be true.
- No hashtags. No "thoughts?" at the end.
- If you post from the company page too, wait a few days and cut it to the first three
  paragraphs plus the link.

---

## Short-video scripts

Two scripts, both about the plateau idea. Vertical, 9:16, phone-shot with a guitar in
frame. Both are built so the first sentence works with the sound off and on-screen text
carries the argument.

Respect the obvious: no fake numbers on screen, no "1,000 players", no before/after that
isn't a real before/after. If you show a recording, it has to be your own recording.

---

### Script 1 — "The reason your practice stopped working" (about 40 seconds)

**Hook (0:00–0:03)** — say it straight to camera, guitar already in hand.

> You didn't get worse at guitar. Your practice stopped containing anything difficult.

*On-screen text: PRACTICE THAT CHANGES NOTHING*

**Beat 1 (0:03–0:12)** — play four bars of something clean and easy. Talk over it.

> This is the part I can already play. It sounds the best, so I play it the most. And it is
> the exact part that cannot make me better, because nothing in it is failing.

**Beat 2 (0:12–0:22)** — stop. Play the hard bar. Let it be bad. Do not edit the mistake out.

> This is the bar that actually breaks. It sounds worse, so it gets less time. That is
> backwards. Your playing changes at the edge where you can just barely hold it together,
> and nowhere else.

*On-screen text: WHAT IMPROVES IS WHAT IS CURRENTLY FAILING*

**Beat 3 (0:22–0:33)** — back to camera.

> So an hour with nothing difficult in it leaves you at exactly the level you walked in with.
> The hour wasn't wasted. It went on the part that was already finished. That is why more
> practice doesn't fix a plateau on its own.

**CTA (0:33–0:40)**

> I built a free thing that asks nine questions about how you actually practice and names the
> one habit doing this to you. No account, nothing uploaded. It's at guitarhub.org.

*On-screen text: guitarhub.org/diagnose — free, no account*

**Notes:** the whole video lives or dies on Beat 2. Leaving the bad bar in, unedited, is the
proof. Cutting it makes this identical to every other practice video.

---

### Script 2 — "Ten questions that decide if your song is finished" (about 45 seconds)

**Hook (0:00–0:04)** — straight to camera.

> You can play the song. In your practice room. Sitting down. After a warm-up. With the tab
> open. That is four conditions, and the song only works inside all of them.

*On-screen text: IS IT ACTUALLY FINISHED?*

**Beat 1 (0:04–0:16)** — demonstrate. Stand up, no warm-up, start cold, and film it going
slightly wrong. Do not retake.

> Cold start, standing, strap where I'd actually wear it. That's the first take. You can hear
> the difference and I've been playing this one for weeks.

**Beat 2 (0:16–0:30)** — list over B-roll of hands, each item hitting as on-screen text.

> The checks that catch it: can you start it cold. Can you keep playing through a mistake
> instead of stopping. Can you play it at the real tempo, not your practice tempo. Do you know
> the form without the tab. Can you play it twice in a row without the second take being worse.
> Have you recorded it and actually listened back. Can you start from any section, not just the
> top. Can you end it the same way, on purpose, twice.

*On-screen text, one per item as spoken: COLD START / PLAY THROUGH MISTAKES / REAL TEMPO /
FORM FROM MEMORY / TWICE IN A ROW / RECORDED AND HEARD / ANY SECTION / CLEAN ENDING*

**Beat 3 (0:30–0:38)**

> Most of the songs I thought I'd finished failed several of these. Not because I couldn't
> play them. Because I'd only ever played them under the conditions where they worked.

**CTA (0:38–0:45)**

> There's a free scorer for this at guitarhub.org. Ten checks, no account, nothing uploaded.
> It tells you the one thing to fix first.

*On-screen text: guitarhub.org/readiness — free, no account*

**Notes:** Beat 3 is a statement about your own playing, which is yours to make. Do not
generalise it into a claim about other players, and do not put a percentage on screen.

---

## Reusable one-liners

For replies, bios, Discord intros, and any box too small for the drafts above.

- A plateau is a repetition problem, not a volume problem.
- What improves is what is currently failing.
- A tempo you reach once is not a tempo you own.
- A song isn't finished because it works in your practice room.
- The hour wasn't wasted. It went on the part that was already finished.
- Free, no account, nothing uploaded: guitarhub.org
