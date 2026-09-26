/**
 * The Tone course: guitar tone from the fingers to the speaker. Pure data, so
 * the registry, the sitemap, the course hub and the lesson pages all read one
 * source. House style: no em dashes, no invented statistics, no named gear
 * endorsements.
 */

export type ToneArtKey = "hands" | "pickups" | "amp" | "pedals" | "chain" | "power" | "eq" | "recording" | "recipes";

export type ToneSection = { heading: string; paragraphs: readonly string[]; list?: readonly string[] };

export type ToneLesson = {
  slug: string;
  number: number;
  title: string;
  /** The line that gets a guitarist to click. Honest, but curious. */
  hook: string;
  description: string;
  minutes: number;
  art: ToneArtKey;
  intro: string;
  sections: readonly ToneSection[];
  myth: { myth: string; truth: string };
  tryIt: { label: string; href: string; body: string };
  takeaways: readonly string[];
  /** Slug of the free field guide this lesson pairs with. */
  guide: string;
  lastModified: string;
};

const DATE = "2026-09-26";

export const TONE_LESSONS: readonly ToneLesson[] = [
  {
    slug: "tone-is-in-your-hands", number: 1, art: "hands", minutes: 7, guide: "tone-field-manual", lastModified: DATE,
    title: "Tone starts in your hands",
    hook: "Two players, same guitar, same amp, two different sounds. Here is the part of that cliché that is actually true.",
    description: "How pick attack, picking position, pick material, strings and setup shape your guitar tone before a single knob is touched.",
    intro: "Before pickups, pedals or amps, the string has to move. How it moves decides which harmonics exist for the rest of the rig to shape. No pedal can add back a note you choked, and no amp can soften an attack you never softened.",
    sections: [
      { heading: "Where you pick changes the whole EQ", paragraphs: [
        "Pick near the bridge and the string vibrates with more upper harmonics: bright, tight, snappy. Pick over the neck and the fundamental dominates: round, warm, flutey. The difference is as large as moving a tone knob from 10 to 3, and it costs nothing.",
        "Try it with one chord: strum over the bridge pickup, then halfway, then over the end of the neck. Most players find they have been picking in one place for years and never used the other two tones.",
      ] },
      { heading: "Attack is a volume knob and a gain knob", paragraphs: [
        "Dig in and the string swings wider, so the signal hitting the amp is louder. On a clean amp that is just volume. On an amp near breakup, it is the difference between clean and crunch. That is why a good edge-of-breakup sound responds to your hand, and why great players can go from whisper to growl without touching a pedal.",
      ] },
      { heading: "Pick, strings, setup", paragraphs: [
        "A thin pick flexes and rounds off the attack; a thick one transfers everything. Pointed tips click; rounded ones smear. Heavier strings carry more tension and a stronger fundamental, which is why many players hear them as fuller, though they cost you bends.",
        "Setup matters more than people expect. High action takes more effort and can sound fuller; low action buzzes more easily, and fret buzz reads as harshness once distortion amplifies it. Old strings lose top end and sustain. If your tone died slowly over months, try new strings before a new pedal.",
      ], list: ["Change strings when the high end has dulled, not on a calendar.", "Try a pick one step thicker and one step thinner than your usual.", "Learn to move your picking hand along the string as a tone control."] },
    ],
    myth: { myth: "Tone is all in the fingers, so gear does not matter.", truth: "The hands decide what the string does, and the gear decides what happens to it afterwards. Both matter. The hands just come first, and they are free." },
    tryIt: { label: "Hear attack drive the amp", href: "/pedal-lab?recipe=edge-of-breakup", body: "The edge-of-breakup recipe in the Pedal Lab is set so louder notes break up and quieter ones stay clean." },
    takeaways: ["Picking position is a free tone knob.", "Attack drives the amp as much as the gain knob does.", "Fresh strings and a decent setup beat most tone purchases."],
  },
  {
    slug: "pickups", number: 2, art: "pickups", minutes: 9, guide: "tone-field-manual", lastModified: DATE,
    title: "Pickups: single-coils, humbuckers and P-90s",
    hook: "Your pickup height screw is the cheapest tone mod you own. Most players have never turned it.",
    description: "How guitar pickups work, why single-coils, humbuckers and P-90s sound different, what pickup height does, and how to use the volume and tone knobs.",
    intro: "A pickup is a magnet wrapped in thousands of turns of wire. The vibrating steel string disturbs the magnetic field and induces a tiny voltage. Everything about its character comes from where it sits, how it is wound and how many coils it has.",
    sections: [
      { heading: "The three families", paragraphs: [
        "Single-coils have one coil and a narrow magnetic window, so they hear a small slice of string. They sound clear, glassy and articulate, and they pick up mains hum because a single coil is also an antenna.",
        "Humbuckers use two coils wired out of phase with opposite magnetic polarity. Hum cancels; string signal adds. Because the two coils hear two points on the string, some treble cancels too, so humbuckers sound thicker and louder with a stronger midrange.",
        "P-90s are single-coils with a wide, flat coil. They sit between the other two: more body and grit than a narrow single-coil, more bite than a humbucker, and they hum.",
      ] },
      { heading: "Position matters as much as type", paragraphs: [
        "A neck pickup sits where the string swings widest, so it hears a strong fundamental: warm and round. A bridge pickup sits near the anchor point where the string barely moves, so it hears more harmonics: bright and cutting. That is why the same pickup model sounds different in each slot, and why manufacturers often wind bridge pickups hotter to balance the level.",
      ] },
      { heading: "Pickup height", paragraphs: [
        "Closer to the strings means louder, more output and more compression. Too close and the magnet pulls on the string, which causes warbling sustain and odd overtones, especially with single-coils on the low E. Further away sounds clearer, airier and quieter.",
        "Adjust with the screws either side of the pickup, a little at a time, and balance the neck and bridge so switching does not cause a big jump in volume. Many players set the bass side slightly lower than the treble side because wound strings produce more output.",
      ] },
      { heading: "Volume and tone knobs are real controls", paragraphs: [
        "Rolling the guitar volume from 10 to 7 feeds the amp less signal, which cleans up a driven amp without touching it. Most guitars also lose some treble as you roll back, which a treble-bleed capacitor reduces.",
        "The tone knob is a low-pass filter. At 10 it is out of the way; at 0 it is dark and vocal. Somewhere around 6 or 7 it tames harsh bridge pickups without going muddy. Use it.",
      ] },
    ],
    myth: { myth: "Hotter pickups mean better distortion.", truth: "Hotter pickups push the amp harder and sound thicker, but they also compress more and lose clarity. Plenty of heavy tones use moderate-output pickups and let the amp or a pedal do the gain." },
    tryIt: { label: "Practice the knob moves", href: "/tone/amps", body: "Next, the amp: once you know what the guitar hands it, the amp's knobs make much more sense." },
    takeaways: ["Single-coils are clear and hum; humbuckers are thick and quiet; P-90s sit between.", "Pickup height changes output and clarity. Balance neck and bridge.", "The guitar's volume knob is a gain control. Ride it."],
  },
  {
    slug: "amps", number: 3, art: "amp", minutes: 10, guide: "amp-recipes", lastModified: DATE,
    title: "Amps: gain, EQ and why volume changes everything",
    hook: "Turned your amp up and it suddenly sounded amazing? Here is exactly why, and how to get most of it at bedroom volume.",
    description: "How guitar amps work: preamp and power amp gain, the tone stack, clean headroom, tube vs solid-state vs modeling, and speakers.",
    intro: "A guitar amp is not a neutral speaker. It is an instrument with its own EQ, compression and distortion, and a large part of what people call guitar tone is really amp tone.",
    sections: [
      { heading: "Preamp gain and master volume", paragraphs: [
        "On most amps the gain (or drive) knob sets how hard the preamp stage is pushed. Push it harder and it clips, which is where most modern distortion comes from. The master volume then sets how loud that sound is. That separation is what lets you have a distorted tone at low volume.",
        "Amps with only a volume knob work differently. Turning it up drives every stage harder at once, so you only get distortion by getting loud.",
      ] },
      { heading: "Power-amp breakup and the volume magic", paragraphs: [
        "When the power section of a tube amp is pushed hard it compresses, sags and adds a smooth, touch-sensitive grind. The speaker is also working harder and adds its own compression. Our ears hear more bass and treble at higher volume too. All three together explain why the same settings sound bigger when loud.",
        "At low volume you can get some of the way there: a little less gain than you think, a bit more bass and treble to make up for quiet listening, and a speaker or cabinet simulation if you are playing through headphones.",
      ] },
      { heading: "The tone stack is interactive", paragraphs: [
        "On many classic amp designs, bass, middle and treble are not independent. Turning one changes how the others behave, and all of them at zero can mean almost no sound at all. So treat the controls as a set: start everything at noon, then move one at a time and listen.",
        "Mids are the part most players scoop and then regret. A scooped tone sounds huge alone and vanishes in a band, because the guitar's place in a mix is in the midrange.",
      ] },
      { heading: "Tube, solid-state, modeling", paragraphs: [
        "Tube amps compress and distort smoothly and respond to touch, but they are heavy, need maintenance and sound best loud. Solid-state amps are reliable and stay clean at volume; many players find their distortion harsher. Modeling amps and plugins simulate both, and the best of them are now used on professional records. Pick based on where you play, not on forum arguments.",
      ] },
      { heading: "Speakers are the biggest EQ in the chain", paragraphs: [
        "A guitar speaker rolls off steeply above roughly 5 kHz and shapes the mids heavily. That is why an amp recorded straight from its output, without a speaker or a cabinet simulation, sounds like fizz. Changing a speaker can change an amp more than any pedal.",
      ] },
    ],
    myth: { myth: "More gain equals heavier.", truth: "Past a point, extra gain adds compression and noise and blurs the notes. Many heavy records use less gain than players expect, doubled across two tracks." },
    tryIt: { label: "Turn an amp's knobs by ear", href: "/pedal-lab", body: "The Pedal Lab has an amp with gain, EQ and a speaker cab you can switch off. Turn the cab off once to hear why speakers matter." },
    takeaways: ["Gain sets distortion; master sets loudness.", "Start EQ at noon and move one knob at a time.", "Do not scoop the mids if you play with other people.", "The speaker is a huge filter. Always use one, real or simulated."],
  },
  {
    slug: "pedals", number: 4, art: "pedals", minutes: 11, guide: "pedalboard-blueprint", lastModified: DATE,
    title: "Pedals: every family explained",
    hook: "Overdrive, distortion and fuzz are not three names for the same thing. Hear the difference in 30 seconds.",
    description: "What every family of guitar effects pedal does: compressors, overdrive, distortion, fuzz, modulation, delay, reverb, filters, pitch and utility pedals.",
    intro: "There are thousands of pedals, but only a handful of jobs. Learn the jobs and every new pedal becomes easy to understand: it is a variation on one of these.",
    sections: [
      { heading: "Dynamics: compressors and boosts", paragraphs: [
        "A compressor turns loud notes down and, with makeup gain, brings quiet ones up. The result is even, sustaining notes. It is the secret behind snappy funk rhythm and smooth clean leads.",
        "A clean boost just makes the signal louder. Before a driven amp that means more distortion; after it, more volume for a solo.",
      ] },
      { heading: "Gain: overdrive, distortion, fuzz", paragraphs: [
        "Overdrive clips softly, like a tube amp pushed hard. Many popular overdrives also trim bass and push the mids, which tightens a driven amp. They respond strongly to picking dynamics.",
        "Distortion clips harder for more saturation and sustain. It is less dynamic, but thicker and more consistent.",
        "Fuzz clips so hard that the waveform turns almost square. The result is thick, buzzy and sustaining, and many vintage fuzz circuits react to the guitar's volume knob, cleaning up dramatically when it is rolled back.",
      ] },
      { heading: "Modulation: chorus, flanger, phaser, tremolo, vibrato", paragraphs: [
        "Chorus mixes in a slightly delayed copy whose delay time wobbles, which sounds like two guitars. Flangers use a shorter delay with feedback for a jet-plane sweep. Phasers sweep notches through the EQ for a swirling sound. Tremolo moves the volume up and down; vibrato moves the pitch.",
      ] },
      { heading: "Time: delay and reverb", paragraphs: [
        "Delay repeats what you played. Short single repeats give a slapback rockabilly sound; longer repeats with more feedback give ambient trails. Delay set to the song's tempo creates rhythmic patterns.",
        "Reverb simulates a space: a small room, a hall, a spring tank in an amp, or an impossible cathedral. A touch makes a dry guitar sound natural; a lot pushes it into the background.",
      ] },
      { heading: "Filters, pitch and utilities", paragraphs: [
        "Wah pedals sweep a resonant peak with your foot. Envelope filters sweep it with your picking. EQ pedals shape frequency like a studio console. Octave and pitch-shift pedals add notes above or below.",
        "Tuners, buffers, volume pedals, noise gates and loopers do not sound like much on their own, but a board without them is harder to live with.",
      ] },
    ],
    myth: { myth: "Great tone needs a big board.", truth: "Many classic recordings used a guitar, a cable and a loud amp, plus maybe one drive and some studio reverb. Add pedals when a song asks for a sound, not before." },
    tryIt: { label: "Switch pedals on and off", href: "/pedal-lab", body: "Six pedal families, one riff. Flip each footswitch and hear what that family does." },
    takeaways: ["Every pedal is a variation on a few jobs.", "Overdrive is soft and dynamic, distortion is saturated, fuzz is square and wild.", "Modulation moves pitch or time; delay and reverb place you in space."],
  },
  {
    slug: "signal-chain", number: 5, art: "chain", minutes: 9, guide: "pedalboard-blueprint", lastModified: DATE,
    title: "Signal chain: which pedal goes where",
    hook: "Put reverb before distortion and your tone turns to soup. Here is the order most boards use and why.",
    description: "Guitar pedal order explained: the conventional signal chain, why each position exists, the effects loop, and the famous exceptions.",
    intro: "Each pedal processes whatever the previous one handed it. Change the order and you change the sound, sometimes a little, sometimes completely. There is a conventional order for good reasons, and a few famous reasons to break it.",
    sections: [
      { heading: "The conventional order", paragraphs: [
        "Tuner, then filters and wah, then compressor, then gain (fuzz, overdrive, distortion), then modulation, then delay, then reverb. The logic is simple: shape the raw signal, distort it, then decorate the distorted sound with movement and space.",
      ], list: ["Tuner first: it sees the cleanest signal and can mute the rest.", "Wah before gain: the sweep feeds the distortion and sounds vocal.", "Compressor before gain: it shapes your pick attack, not the noise.", "Fuzz before other gain, and often first: many vintage fuzzes want to see the pickup directly.", "Modulation after gain keeps the swirl clear.", "Delay before reverb: the repeats land in the room instead of the room echoing."] },
      { heading: "Why reverb before distortion goes wrong", paragraphs: [
        "Distortion compresses and saturates everything it receives. Feed it a reverb tail and the tail gets as loud as the note, so every chord smears into the next. Shoegaze players do this on purpose. Everyone else usually hears mud.",
      ] },
      { heading: "The effects loop", paragraphs: [
        "Many amps with preamp distortion have an effects loop: a send and return between the preamp and the power amp. Time effects in the loop sit after the amp's own distortion, which keeps delays and reverbs clean even with a high-gain channel. Gain pedals still go in front of the amp.",
        "If your amp is clean and you get distortion from pedals, you do not need the loop.",
      ] },
      { heading: "Stacking drives", paragraphs: [
        "Two drives in a row interact. A low-gain overdrive in front of a higher-gain one tightens and focuses it. Swap them and you get a different, often looser sound. There is no rule here: try both orders and keep the one you like.",
      ] },
    ],
    myth: { myth: "There is one correct pedal order.", truth: "There is a conventional order that works for most boards. Break it deliberately for a sound; do not follow it blindly if your ears prefer something else." },
    tryIt: { label: "Reorder a real chain", href: "/pedal-lab?recipe=ambient-lead", body: "Load the ambient lead recipe, then move reverb in front of the overdrive and listen to the wash." },
    takeaways: ["Shape, then distort, then decorate.", "Delay before reverb; modulation after gain.", "Effects loops keep time effects clean on high-gain amps."],
  },
  {
    slug: "power-and-noise", number: 6, art: "power", minutes: 8, guide: "pedalboard-blueprint", lastModified: DATE,
    title: "Power, cables and killing the hum",
    hook: "That hum might not be your pedals at all. The noise-hunting routine that finds it in ten minutes.",
    description: "Pedalboard power supplies, isolated vs daisy-chained power, current draw, cable capacitance, buffers and true bypass, and how to find and kill hum and noise.",
    intro: "Most noisy boards are not broken. They are powered, grounded or cabled in a way that invites noise. The fixes are usually cheap once you know where to look.",
    sections: [
      { heading: "Isolated power vs daisy chains", paragraphs: [
        "A daisy chain feeds every pedal from one supply through one cable. It is cheap and works for a few simple pedals, but digital pedals and some drives share noise through the common ground and you hear whine or hum.",
        "An isolated supply gives each output its own separate circuit. It costs more and solves the majority of power-related noise.",
      ] },
      { heading: "Check voltage, polarity and current", paragraphs: [
        "Most pedals want 9 volts DC with a center-negative barrel, but not all. Some want 12 or 18 volts; some want center-positive. The wrong supply can damage a pedal. Read the label.",
        "Current draw, in milliamps, is the other number. Digital delays and reverbs can draw several times what an analog drive does. Add up your board and make sure every output can supply what its pedal needs, with headroom.",
      ] },
      { heading: "Cables, buffers and true bypass", paragraphs: [
        "Guitar cable has capacitance, which acts like a gentle tone knob turned down: long runs lose treble. A true-bypass pedal, when off, connects the cables straight through, so every foot of cable on the board adds up.",
        "A buffer is a small circuit that drives long cables without that loss. One good buffer early in the chain usually fixes a dull board. Some vintage fuzzes sound wrong after a buffer, so put those before it.",
      ] },
      { heading: "The noise hunt", paragraphs: [
        "Work from the amp backwards so you know which change fixed it.",
      ], list: ["Plug the guitar straight into the amp. If it hums, turn to face a different direction: single-coils pick up hum from screens and lights.", "Add the board back one pedal at a time.", "When the noise appears, try that pedal on its own isolated output.", "Swap patch cables: a failing cable crackles when moved.", "Keep power cables and audio cables apart, crossing at right angles if they must cross."] },
    ],
    myth: { myth: "True bypass is always better.", truth: "True bypass is transparent for a single pedal. Across a long board and long cables it dulls your tone. Most good boards mix true-bypass pedals with at least one buffer." },
    tryIt: { label: "Get the Pedalboard Blueprint", href: "/tone#field-guides", body: "The free guide has a power worksheet and the full noise checklist on one printable page." },
    takeaways: ["Isolated power solves most hum and whine.", "Check volts, polarity and milliamps on every pedal.", "Long true-bypass chains lose treble. Add a buffer.", "Hunt noise one change at a time."],
  },
  {
    slug: "eq-and-the-mix", number: 7, art: "eq", minutes: 9, guide: "tone-field-manual", lastModified: DATE,
    title: "EQ: why your tone vanishes in the band",
    hook: "Your tone sounds huge at home and disappears at rehearsal. The fix is the opposite of what feels right.",
    description: "A guitarist's guide to EQ: the guitar frequency map from boom to fizz, why scooped tones disappear in a mix, and how to cut mud and harshness.",
    intro: "Alone, a guitar can fill the whole frequency range. In a band, the bass, kick drum, vocals and cymbals already live in most of it. A tone that works in the mix is one that owns the part of the spectrum nobody else is using.",
    sections: [
      { heading: "The map", paragraphs: [
        "Every band has a word players use when there is too much of it. Learn the words and you can fix any tone by ear.",
      ], list: ["Around 100 Hz: boom. Fights the bass and kick.", "Around 250 Hz: mud. Warmth that turns cloudy.", "Around 500 Hz: boxy. A hollow, small-room sound.", "Around 800 Hz: honk. Nasal, where wah sounds live.", "Around 1.5 kHz: push. The band that cuts through a mix.", "Around 3 kHz: bite. Pick attack and aggression.", "Above 6 kHz: fizz. Distortion fuzziness and string sizzle."] },
      { heading: "Why scooped tones vanish", paragraphs: [
        "Scooping the mids with lots of bass and treble sounds huge on its own, because those bands feel exciting at low volume. In a band, the bass guitar owns the lows and the cymbals own the highs, so a scooped guitar is left with nothing to stand on. Put the mids back and the guitar reappears, even if it sounds a little plainer alone.",
      ] },
      { heading: "Cut before you boost", paragraphs: [
        "When a tone is muddy, cutting around 200 to 300 Hz usually works better than adding treble. When it is harsh, find the ugly band around 2 to 5 kHz and cut it a little rather than darkening everything. Boosting adds volume and gain; cutting just removes the problem.",
        "For recording and live sound, a high-pass filter somewhere between 80 and 120 Hz on the guitar clears space for the bass without making the guitar sound thin in context.",
      ] },
      { heading: "Train your ears", paragraphs: [
        "Naming frequencies is a learnable skill. Practice by hearing one band boosted, guessing it, and checking. A few minutes a day for a couple of weeks makes a real difference to how fast you dial in a tone.",
      ] },
    ],
    myth: { myth: "More bass makes a guitar sound bigger.", truth: "In a mix, more bass usually makes the guitar sound smaller, because it collides with the bass guitar and turns to mud. Big guitar tones on records are often lighter on low end than players expect." },
    tryIt: { label: "Train your ears on EQ", href: "/eq-ear-trainer", body: "The EQ Ear Trainer boosts one band on a guitar riff. Name the band, build a streak, and learn the map by ear." },
    takeaways: ["Learn the words: boom, mud, boxy, honk, push, bite, fizz.", "Mids are where a guitar lives in a band.", "Cut problems before boosting.", "Ear training makes dialing in faster."],
  },
  {
    slug: "recording-guitar", number: 8, art: "recording", minutes: 10, guide: "tone-field-manual", lastModified: DATE,
    title: "Recording guitar at home",
    hook: "One microphone, one inch of movement, a completely different sound. Where to point it and why.",
    description: "How to record guitar at home: miking an amp, recording direct with amp simulation or capture profiles, gain staging, and doubling rhythm parts.",
    intro: "You can record great guitar at home two ways: a microphone in front of a speaker, or a direct signal into software that simulates the amp and speaker. Both work. Both have a few rules that make most of the difference.",
    sections: [
      { heading: "Miking an amp", paragraphs: [
        "Point a dynamic microphone at the speaker, close to the grille. Where on the speaker matters more than which microphone. At the center of the dust cap the sound is brightest and most aggressive. Move toward the edge of the cone and it gets darker and smoother. Most engineers start near where the dust cap meets the cone and move a centimeter at a time.",
        "Angling the microphone off-axis also softens the top end. Moving it back from the grille adds more room sound, which is only good if the room sounds good.",
      ] },
      { heading: "Recording direct", paragraphs: [
        "An audio interface's instrument input records the guitar clean and unprocessed. Amp simulation plugins, or capture-based profiles of real amps, then do the rest. The advantage is huge: you can change the amp after the performance, and you can record silently at night.",
        "Always record the clean direct track, even when you use a hardware amp, so you can re-amp or fix the tone later.",
      ] },
      { heading: "Gain staging", paragraphs: [
        "Set the input so your hardest playing peaks well below the top of the meter, around 12 to 18 decibels below full scale on a digital recorder. Clipping an interface input sounds nasty and cannot be undone. There is no benefit to recording hotter than this in 24-bit.",
      ] },
      { heading: "Doubling for width", paragraphs: [
        "For big rhythm guitars, play the part twice and pan the two takes left and right. The tiny differences between performances create width that one track copied and panned cannot. It needs tight playing, which makes it great practice too.",
      ] },
    ],
    myth: { myth: "You need an expensive microphone to record guitar.", truth: "Some of the most recorded guitar tones in history came from inexpensive dynamic microphones. Placement and the source matter far more than the price of the microphone." },
    tryIt: { label: "Hear what a speaker does", href: "/pedal-lab", body: "Switch the cab off in the Pedal Lab. That fizz is what a direct recording sounds like without a speaker simulation." },
    takeaways: ["Mic position on the speaker is the biggest recording EQ.", "Always capture a clean direct track.", "Peak around -12 to -18 dBFS; never clip the input.", "Double rhythm parts for width."],
  },
  {
    slug: "tone-recipes", number: 9, art: "recipes", minutes: 8, guide: "amp-recipes", lastModified: DATE,
    title: "Tone recipes: six sounds you can dial in today",
    hook: "Glassy clean, crunchy rock, wall of fuzz. The starting settings for each, and the one knob that matters most.",
    description: "Six guitar tone recipes with guitar, pedal and amp starting settings: glassy clean, edge of breakup, classic crunch, tight high gain, fuzz and ambient lead.",
    intro: "A recipe is a starting point, not a destination. Every amp, guitar and room is different, so dial these in, then move one knob at a time until it sounds right to you. Each recipe loads into the Pedal Lab so you can hear it first.",
    sections: [
      { heading: "Glassy clean", paragraphs: ["Neck or middle pickup, amp gain low, treble a little above noon, light compression, a touch of chorus and room reverb. The one knob that matters: amp gain. Keep it low enough that hard strums stay clean."] },
      { heading: "Edge of breakup", paragraphs: ["Bridge or neck pickup, amp gain just to the point where hard picking starts to crunch, and a low-gain overdrive with its level up to nudge the amp. The one knob that matters: your guitar's volume. At 10 it growls; at 7 it cleans up."] },
      { heading: "Classic rock crunch", paragraphs: ["Bridge humbucker, amp gain around 6, mids up. A mid-focused overdrive in front if the amp needs help. The one knob that matters: mids. Push them for chords that sit in a band."] },
      { heading: "Tight high gain", paragraphs: ["Bridge humbucker, amp gain high, bass a little below noon. In front, an overdrive with drive almost off and level up: it trims low end before the amp so palm mutes stay tight. The one knob that matters: bass. Too much and the chugs turn to mush."] },
      { heading: "Wall of fuzz", paragraphs: ["Fuzz first in the chain, straight from the guitar. Amp fairly clean with the mids slightly cut, or use the fuzz's tone knob to find the sweet spot. The one knob that matters: the guitar's volume, because many fuzzes clean up beautifully when it is rolled back."] },
      { heading: "Ambient lead", paragraphs: ["Compressor for sustain, mild overdrive, then a delay around 400 to 500 milliseconds with several repeats, then a long reverb. The one knob that matters: delay mix. Keep the repeats just under the note so the melody stays clear."] },
    ],
    myth: { myth: "Copying a famous player's settings gets you their tone.", truth: "Their settings worked for their guitar, amp, room, volume and hands. Use them as a starting point, then adjust by ear for yours." },
    tryIt: { label: "Load every recipe", href: "/pedal-lab?recipe=glass-clean", body: "Each recipe is a preset in the Pedal Lab. Load one, then change a single knob and listen." },
    takeaways: ["Recipes are starting points.", "Each sound has one knob that matters most. Learn which.", "Adjust one control at a time, by ear, at the volume you will play."],
  },
];

export const toneHref = (slug: string) => `/tone/${slug}`;

export function toneLesson(slug: string): ToneLesson | undefined {
  return TONE_LESSONS.find(lesson => lesson.slug === slug);
}
