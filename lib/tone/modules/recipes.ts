import type { ToneModule } from "../types.ts";

const LAB = "/tools/pedal-lab";
const START_NOTE = "These settings are starting points. Every amp's numbers mean something different, so set the knobs where listed and then adjust by ear.";

export const RECIPES: ToneModule = {
  id: "recipes",
  title: "Recipes",
  blurb: "Eight classic guitar sounds described by their settings and by the playing that makes them work, each with a matching pedal lab preset.",
  lessons: [
    {
      id: "recipe-glassy-clean",
      module: "recipes",
      title: "Recipe: glassy clean",
      summary: "A bright, chiming clean with lots of headroom, in the style of a mid-60s surf-adjacent clean. Settings, pedals and the touch that makes it ring.",
      minutes: 10,
      sections: [
        {
          heading: "The sound and where it works",
          paragraphs: [
            "A glassy clean is bright, open and completely undistorted even when you dig in. Chords ring with clear separation between strings, and single notes have a bell-like snap at the start. Think of a mid-60s surf-adjacent clean, or the shimmering arpeggios of 1980s jangle pop.",
            "It works for arpeggiated chord parts, clean intros, and any song where the guitar needs to sparkle above a busy rhythm section without taking up much low end.",
            "In a band, a glassy clean sits above the bass and keys rather than competing with them. It carries little low end, so it leaves space for the lower range of the vocal, and its bright attack makes even quiet arpeggios easy to hear. That same brightness can tire the ear if it plays every bar of a song, so it often works best as a contrast to a heavier section.",
          ],
        },
        {
          heading: "How to set it up",
          paragraphs: [
            "Start with single-coil pickups, ideally the bridge and middle together or the neck and middle together if your guitar has them. The amp should have plenty of clean headroom: low gain, a high master or volume, and the treble a little above halfway. Keep the bass modest so the low strings do not flub.",
            "A compressor at the front evens out the attack and adds sustain to ringing chords. Keep its ratio gentle and the level matched to bypass. A touch of spring-style reverb at the end adds the wet shimmer, but too much turns chords into a blur. " + START_NOTE,
          ],
        },
        {
          heading: "How to play it, and common mistakes",
          paragraphs: [
            "The hands matter more than the gear. Pick firmly and let every note ring its full length. Fret cleanly just behind the fret so nothing buzzes, because a clean amp shows every mistake. Picking closer to the bridge adds more glass; closer to the neck softens it.",
            "The common mistakes are too much treble, which turns glassy into ice-pick harsh, too much reverb, and too much gain, which takes away the headroom the sound depends on. If the amp starts to crunch when you hit hard, lower the gain and raise the master instead.",
          ],
        },
        {
          heading: "Make it yours",
          paragraphs: [
            "The two variables that move this sound most are pickup choice and pick attack. The bridge-and-middle position gives a hollow chime with a sharper edge; neck-and-middle is rounder and softer. The bridge alone is brighter still and can sound thin, while the neck alone loses some sparkle. Try each position on the same arpeggio before you touch the amp.",
            "Pick attack changes the tone as much as the treble knob does. A thin pick or a light stroke gives a softer, even chime; a thicker pick played firmly near the bridge gives a sharper snap. Angle the pick slightly so it glides off the string rather than catching it flat, and listen to the first moment of each note.",
            "You have gone too far when single high notes make you wince at a moderate volume, when chords lose the weight of their low strings, or when the reverb tail is still sounding as the next chord arrives. Back off the treble or the reverb until the sound is bright but comfortable to hear for a whole song.",
          ],
        },
      ],
      keyPoints: [
        "Single coils and a clean amp with lots of headroom are the base of a glassy clean.",
        "A gentle compressor evens the attack and helps chords sustain.",
        "Let every note ring and fret cleanly; a clean amp reveals every buzz.",
        "Too much treble or reverb turns the sound harsh or blurry.",
      ],
      exercise: {
        title: "Build the glassy clean",
        tool: LAB,
        steps: [
          "Open the pedal lab from the glassy-clean preset button on this lesson page.",
          "Play an open-chord arpeggio and listen for each string ringing on its own.",
          "Bypass the compressor and play again; notice the attack jumping out and the tail dying sooner.",
          "Raise the reverb until the chords start to blur, then back it off by about a third.",
          "Try the same settings on your own amp, starting from the knob positions in the recipe.",
        ],
      },
      quiz: [
        {
          q: "Your glassy clean starts to crunch when you strum hard. What should you change first?",
          options: [
            "Add a distortion pedal",
            "Lower the amp gain and raise the master volume",
            "Turn the treble up",
            "Switch to a higher-output pickup",
          ],
          answer: 1,
          why: "The sound depends on headroom. Less preamp gain and more master keeps the amp clean even when you dig in.",
        },
        {
          q: "What is the compressor doing in this recipe?",
          options: [
            "Adding distortion to the chords",
            "Adding echo",
            "Evening out the attack and helping notes sustain",
            "Removing hum from single coils",
          ],
          answer: 2,
          why: "A gentle compressor tames the loudest peaks and lifts the quieter tail, so arpeggios ring evenly.",
        },
      ],
      recipe: {
        preset: "glassy-clean",
        guitar: "A solid-body with three single-coil pickups and a five-way switch.",
        pickup: "Bridge and middle together, or neck and middle together.",
        amp: "A clean amp with plenty of headroom, such as an American-style combo with a bright voicing.",
        settings: ["Gain: 2", "Bass: 4", "Mid: 5", "Treble: 6", "Master: 7", "Reverb: 3"],
        pedals: [
          "Compressor: ratio low, sustain 4, level matched to bypass",
          "Spring-style reverb: mix 3, decay 4",
        ],
        hands: "Firm, even picking with every note allowed to ring, clean fretting just behind the fret, and the pick near the bridge for extra chime.",
      },
    },
    {
      id: "recipe-edge-of-breakup",
      module: "recipes",
      title: "Recipe: edge of breakup",
      summary: "A clean amp just starting to distort: clean when you play softly, gritty when you dig in. How to set it and how to control it with your hands.",
      minutes: 10,
      sections: [
        {
          heading: "The sound and where it works",
          paragraphs: [
            "Edge of breakup is the point where a clean amp just begins to distort. Play softly and it is clean; dig in and it growls. It is a late-1950s and 1960s blues and roots sound, and it is still the default for many players because it responds to every change in touch.",
            "It suits blues, country, roots rock and any style where you want one sound that can move between clean rhythm and a gritty fill without touching a pedal.",
            "In a band, this sound sits in the middle of the mix. It has more body than a glassy clean and less compression than a crunch, so chords keep their dynamics and single notes feel alive. Because it responds to touch, it rewards players who vary their attack through a song and exposes those who do not.",
          ],
        },
        {
          heading: "How to set it up",
          paragraphs: [
            "Set the amp clean, then raise the gain or volume slowly while strumming hard. Stop at the point where hard strums start to break up but soft ones stay clean. That point is different on every amp, so trust your ears over the numbers.",
            "A low-gain overdrive with its drive near zero and its level slightly above unity can push a clean amp to this point at a lower volume. Keep the pedal's tone near noon so it does not add fizz. " + START_NOTE,
          ],
        },
        {
          heading: "How to play it, and common mistakes",
          paragraphs: [
            "This sound lives in your hands. Pick lightly for clean, harder for grit. Use the guitar's volume knob too: rolled back to around 7 the amp cleans up, full up it breaks up. Practise moving between the two without changing anything else.",
            "The common mistake is setting it too far into distortion, so there is no clean left when you play softly. The other is playing at one dynamic level all the time, which wastes the whole point of the sound.",
          ],
        },
        {
          heading: "Make it yours",
          paragraphs: [
            "The variable that moves this sound most is gain versus volume. Raising the amp's gain or preamp volume gives earlier, fizzier breakup with more compression. Raising the master volume, on an amp that has one, while keeping the gain moderate gives a looser, bolder breakup that comes more from the power section. Every amp balances these differently, so reach the same amount of grit both ways and compare.",
            "Pickup output is the second variable. A hotter pickup pushes the amp further into breakup at the same settings, so a humbucker may need less gain than a single coil to land in the same place. When you change guitars, reset the amp with the playing test rather than the numbers: soft is clean, hard is gritty.",
            "You have gone too far when your softest playing is already distorted, when rolling the guitar volume to about 7 no longer cleans the sound up, or when chords lose their separation. Turn the gain down until the softest strums are clean again.",
          ],
        },
      ],
      keyPoints: [
        "Edge of breakup is clean when you play softly and gritty when you dig in.",
        "Find it by raising gain slowly until only hard strums distort.",
        "The guitar's volume knob and your picking strength are the main controls.",
        "Set too far into distortion, the sound loses its clean side.",
      ],
      exercise: {
        title: "Three levels of touch",
        tool: LAB,
        steps: [
          "Open the pedal lab from the edge-of-breakup preset button on this lesson page.",
          "Play the same chord three times: very softly, medium and as hard as you can.",
          "Listen for the soft chord staying clean and the hard one breaking up; adjust the drive until that is true.",
          "Roll the guitar volume back to about 7 and repeat, noting how much cleaner each level gets.",
          "Play a short blues phrase that moves between soft rhythm and a hard fill without touching any knob.",
        ],
      },
      quiz: [
        {
          q: "What makes an amp setting edge of breakup rather than crunch?",
          options: [
            "Soft playing stays clean while hard playing distorts",
            "It uses a fuzz pedal",
            "The treble is set to 10",
            "It stays distorted at every playing level",
          ],
          answer: 0,
          why: "The defining feature is that the amp moves between clean and dirty with your picking strength.",
        },
        {
          q: "How can you clean up an edge-of-breakup sound without touching the amp?",
          options: [
            "Turn the guitar's tone knob up",
            "Switch to the bridge pickup",
            "Roll back the guitar's volume knob and pick more lightly",
            "Add more reverb",
          ],
          answer: 2,
          why: "Less signal into the amp means less breakup, so the volume knob and a lighter touch both clean it up.",
        },
      ],
      recipe: {
        preset: "edge-of-breakup",
        guitar: "A single-cut or double-cut solid-body, or a semi-hollow, with single coils or low-output pickups.",
        pickup: "Neck pickup for rounder grit, bridge for more bite.",
        amp: "A small, low-wattage clean amp turned up until it just starts to distort.",
        settings: ["Gain: 5", "Bass: 5", "Mid: 6", "Treble: 6", "Master: 6", "Reverb: 2"],
        pedals: [
          "Low-gain overdrive: drive 1, tone 5, level slightly above bypass",
          "Spring-style reverb: mix 2",
        ],
        hands: "Dynamic picking, light for clean and hard for grit, with the guitar volume knob used as a gain control.",
      },
    },
    {
      id: "recipe-classic-crunch",
      module: "recipes",
      title: "Recipe: classic crunch",
      summary: "A 1970s arena rock rhythm crunch: mid-heavy, punchy and clear enough that every chord still reads. Settings, pedals and the right-hand approach.",
      minutes: 10,
      sections: [
        {
          heading: "The sound and where it works",
          paragraphs: [
            "Classic crunch is a 1970s arena rock rhythm crunch: a cranked amp with thick mids, a punchy attack and enough distortion to growl while every note in a chord stays audible. It is the sound of big open-chord riffs and power chords played with swagger rather than speed.",
            "It works for rock rhythm parts, riff-based songs and anything that needs weight without the saturation of modern high gain.",
            "In a band, crunch fills the space between the bass and the vocal. One crunch rhythm part can carry a verse, and two doubled parts can carry a chorus. It usually has less distortion than it seems to on recordings, because distortion stacks up when tracks are layered and the whole band is playing.",
          ],
        },
        {
          heading: "How to set it up",
          paragraphs: [
            "Use humbuckers on the bridge pickup, into a British-style amp with the gain around the middle and the mids up. The mids are what make crunch cut through a band, so do not scoop them.",
            "If your amp does not break up enough at a usable volume, a medium-gain overdrive in front can add the push. A little plate-style reverb or a short room reverb adds depth without washing out the attack. " + START_NOTE,
          ],
        },
        {
          heading: "How to play it, and common mistakes",
          paragraphs: [
            "Play with a firm, relaxed right hand and let chords breathe. Muting with the fretting hand between chords gives the riff its punch; the silence is as important as the notes. Open chords sound huge with this much gain, so do not avoid them.",
            "The common mistakes are too much gain, which turns crunch into mush, and scooped mids, which make it sound big alone and vanish in a band. If the chords blur, lower the gain before anything else.",
          ],
        },
        {
          heading: "Make it yours",
          paragraphs: [
            "Gain versus volume moves this sound most. Crunch from a loud amp with moderate gain has an open, punchy feel, with the power section adding weight. The same amount of distortion from high preamp gain at low volume sounds more compressed and fizzy. If you can play loudly, try less gain and more volume; if you cannot, a pedal in front at a low drive setting often gets closer than turning up the amp's gain.",
            "Pick attack is the second variable. Digging in with a thick pick adds bite and a sharp front to each chord; a lighter stroke rounds it off. Strumming nearer the neck softens the sound, and strumming near the bridge tightens it. Many players set the amp slightly cleaner than they want and let the right hand add the rest.",
            "You have gone too far when a big open chord sounds like one blurred note, when sustain fills the rests in your riff, or when the amp hisses loudly between chords. Take the gain down until the strings separate again.",
          ],
        },
      ],
      keyPoints: [
        "Classic crunch is mid-heavy, punchy distortion where chords stay clear.",
        "Bridge humbucker into a British-style amp with the mids up is the usual base.",
        "Fretting-hand muting between chords gives riffs their punch.",
        "Too much gain or scooped mids ruin crunch in a band mix.",
      ],
      exercise: {
        title: "Find the crunch ceiling",
        tool: LAB,
        steps: [
          "Open the pedal lab from the classic-crunch preset button on this lesson page.",
          "Play an open A chord and listen for each string inside the distortion.",
          "Raise the gain until the chord starts to lose definition, then lower it two steps.",
          "Play a riff that alternates chords and short silences, muting with the fretting hand.",
          "Cut the mids to 2 and play again; note how the sound gets bigger alone but less clear, then restore them.",
        ],
      },
      quiz: [
        {
          q: "Why keep the mids up for a classic crunch?",
          options: [
            "The mids reduce hum",
            "The mids are what let crunch cut through a band",
            "The mids make the amp cleaner",
            "The mids add reverb",
          ],
          answer: 1,
          why: "Guitar lives mostly in the midrange. Scooping it may sound big alone, but the guitar disappears once bass and drums are playing.",
        },
        {
          q: "Your crunch chords sound mushy. What is the first change?",
          options: [
            "Lower the gain",
            "Add more reverb",
            "Switch to the neck pickup",
            "Turn the bass to 10",
          ],
          answer: 0,
          why: "Too much gain is the most common cause of mush; less gain restores the separation between strings.",
        },
      ],
      recipe: {
        preset: "classic-crunch",
        guitar: "A solid-body with humbuckers.",
        pickup: "Bridge humbucker.",
        amp: "A British-style amp with a gritty, mid-forward voicing, turned up.",
        settings: ["Gain: 6", "Bass: 5", "Mid: 7", "Treble: 6", "Presence: 5", "Master: 6", "Reverb: 2"],
        pedals: [
          "Medium-gain overdrive (optional): drive 4, tone 5, level 6",
          "Room or plate-style reverb: mix 2, short decay",
        ],
        hands: "Firm but relaxed strumming, let chords ring, and mute with the fretting hand between chords so the riff punches.",
      },
    },
    {
      id: "recipe-high-gain-rhythm",
      module: "recipes",
      title: "Recipe: high-gain rhythm",
      summary: "A tight, saturated modern metal rhythm sound. Why a boost before the amp tightens the low end, and why palm muting matters more than gain.",
      minutes: 11,
      sections: [
        {
          heading: "The sound and where it works",
          paragraphs: [
            "High-gain rhythm is the tight, saturated chug of late-1980s thrash onwards and modern metal: heavy distortion, a controlled low end and a sharp attack on every palm-muted note. It should sound huge and precise at the same time.",
            "It works for metal and heavy rock rhythm parts, fast palm-muted riffs and anything with low tunings.",
            "In a mix, high-gain rhythm guitars are usually doubled or layered further and panned wide, which is why each track needs to be tighter and less saturated than you might expect. The low end has to share space with the bass and often a fast kick drum, so a controlled bottom matters more than a huge one.",
          ],
        },
        {
          heading: "How to set it up",
          paragraphs: [
            "Start with a bridge humbucker, a high-gain amp and the gain lower than you expect, often a little past halfway. A clean boost or a low-gain overdrive in front, with the drive at zero, the tone a bit bright and the level up, tightens the bass before the amp's distortion stage so palm mutes stay focused rather than flubby.",
            "A noise gate at the start of the chain, or in the amp's effects loop, keeps silences silent. Set the threshold just high enough to stop hiss between riffs, not so high that it chops note tails. Keep reverb low or off. " + START_NOTE,
          ],
        },
        {
          heading: "How to play it, and common mistakes",
          paragraphs: [
            "Precision is the sound. Palm-mute with the edge of the picking hand right where the strings leave the bridge; too far forward chokes the note, too far back leaves it ringing. Use mostly downstrokes for chugs, and mute every string you are not playing with both hands.",
            "The biggest mistake is too much gain. It feels powerful alone but turns fast riffs into noise, especially when doubled. The second is scooping the mids to nothing. The third is loose right-hand timing, which no pedal can fix.",
          ],
        },
        {
          heading: "Make it yours",
          paragraphs: [
            "The two variables that move this sound most are the amount of gain and how the boost is set. More gain adds sustain and saturation but blurs the attack and raises noise; less gain makes each palm mute sharper. With its level high and drive low, the boost tightens and focuses the amp; with more drive, it adds saturation and can make the sound fizzy.",
            "Pickup choice matters as well. A high-output bridge humbucker pushes the amp harder and compresses more, while a lower-output pickup keeps more attack and clarity. In a lowered tuning, lowering the pickup slightly on the bass side can reduce flub on the lowest string.",
            "You have gone too far when fast palm-muted notes run together into one roar, when the noise gate needs a high threshold just to keep pauses quiet, or when the low string sounds woolly rather than tight. Lower the gain first, then the bass, then the boost's drive.",
          ],
        },
      ],
      keyPoints: [
        "A boost in front of a high-gain amp tightens the low end before distortion.",
        "Use less gain than feels exciting; definition matters more than saturation.",
        "A noise gate keeps pauses silent, set so it does not chop note tails.",
        "Palm-mute position and tight picking timing are what make the sound.",
      ],
      exercise: {
        title: "Tighten the chug",
        tool: LAB,
        steps: [
          "Open the pedal lab from the high-gain-rhythm preset button on this lesson page.",
          "Play a palm-muted chug on the low string with downstrokes against a metronome.",
          "Bypass the boost and play the same riff; listen for the low end getting looser.",
          "Lower the amp gain one step at a time until the riff is clearest while still heavy.",
          "Move your palm slightly forward and back on the bridge to find the spot with the best thump and pitch.",
        ],
      },
      quiz: [
        {
          q: "Why put a clean boost or low-gain overdrive in front of a high-gain amp?",
          options: [
            "To add more reverb",
            "To tighten the low end before the amp's distortion",
            "To make the amp cleaner",
            "To remove the need for palm muting",
          ],
          answer: 1,
          why: "The boost trims bass and pushes the mids into the amp, so heavy distortion stays focused on fast palm-muted notes.",
        },
        {
          q: "A noise gate is chopping off the end of your sustained chords. What should you do?",
          options: [
            "Lower the gate threshold",
            "Raise the gate threshold",
            "Add more gain",
            "Move the gate after the reverb",
          ],
          answer: 0,
          why: "A lower threshold lets quieter signal through, so note tails survive while hiss between riffs is still cut.",
        },
        {
          q: "Where should the palm rest for a focused palm mute?",
          options: [
            "Over the neck pickup",
            "Over the middle of the strings between the pickups",
            "Right where the strings leave the bridge",
            "On the headstock",
          ],
          answer: 2,
          why: "Right at the bridge the mute dampens the string without choking its pitch; further forward it goes dull and flat.",
        },
      ],
      recipe: {
        preset: "high-gain-rhythm",
        guitar: "A solid-body with a high-output bridge humbucker, in standard or a lowered tuning.",
        pickup: "Bridge humbucker.",
        amp: "A high-gain amp with a modern voicing, or a high-gain channel.",
        settings: ["Gain: 6", "Bass: 5", "Mid: 5", "Treble: 6", "Presence: 6", "Master: 5", "Reverb: 0"],
        pedals: [
          "Noise gate: threshold set just above the hiss",
          "Clean boost or low-gain overdrive: drive 0, tone 6, level 8",
        ],
        hands: "Tight palm muting right at the bridge, mostly downstrokes on chugs, and both hands muting every string not being played.",
      },
    },
    {
      id: "recipe-singing-lead",
      module: "recipes",
      title: "Recipe: singing lead",
      summary: "A smooth, sustaining lead tone for melodic solos. Settings, a touch of delay, and the vibrato and bending that make notes sing.",
      minutes: 10,
      sections: [
        {
          heading: "The sound and where it works",
          paragraphs: [
            "A singing lead is smooth, warm and sustaining, with notes that hold and bloom rather than decay quickly. Think of a late-1970s and 1980s melodic rock solo, where the guitar phrases like a voice.",
            "It works for melodic solos, slow expressive lines and any part where the guitar takes the place of the singer for a while.",
            "In a band, a lead tone needs to be a little louder than your rhythm tone and to sit in the midrange where the vocal usually lives, because during a solo it takes the vocal's place. A lead that is only more distorted than the rhythm sound, not louder or more present, often disappears the moment the solo starts.",
          ],
        },
        {
          heading: "How to set it up",
          paragraphs: [
            "Use the neck humbucker for a rounder, vocal tone, or the bridge with the tone knob rolled back a little. The amp should be well into distortion, with the mids up for presence and the treble slightly lower than for rhythm so high notes do not get shrill.",
            "An overdrive in front adds sustain and smooths the attack. A delay after the distortion, with a time of roughly 300 to 450 milliseconds, a few repeats and the mix low, gives the notes a tail without cluttering the line. " + START_NOTE,
          ],
        },
        {
          heading: "How to play it, and common mistakes",
          paragraphs: [
            "Vibrato is what makes a lead sing. Practise a steady, even vibrato at a consistent speed, and bend notes precisely to pitch; an out-of-tune bend sounds worse with more sustain. Play fewer notes and let each one hold.",
            "The common mistakes are too much delay, which smears the phrase, too much treble on the bridge pickup, and relying on gain to sustain notes that need a good vibrato. Mute unused strings, because high gain makes every open string ring.",
          ],
        },
        {
          heading: "Make it yours",
          paragraphs: [
            "Pickup choice and pick attack move this sound most. The neck pickup is warm and vocal but can get woolly in the low register; the bridge is more cutting but can turn shrill high up the neck. Many players use the neck for slow melodic phrases and the bridge for faster, more aggressive runs, and shape the difference with the guitar's tone knob rather than the amp.",
            "Pick attack shapes the start of every note. A light touch with plenty of gain gives a smooth, almost bowed entry, while a harder attack gives more definition. Picking with the edge of the pick at a slight angle softens the attack, and leaves the fretting-hand vibrato to carry the expression.",
            "You have gone too far when strings you did not mean to play start ringing, when feedback appears at a moderate volume, or when the delay repeats crowd the next phrase. Reduce the gain or the delay mix until each phrase ends clearly before the next begins.",
          ],
        },
      ],
      keyPoints: [
        "A singing lead is smooth and sustaining, with notes that bloom.",
        "Neck humbucker or a rolled-back bridge keeps high notes from getting shrill.",
        "A delay after the distortion, mixed low, adds a tail without clutter.",
        "Steady vibrato and in-tune bends matter more than any setting.",
      ],
      exercise: {
        title: "Make one note sing",
        tool: LAB,
        steps: [
          "Open the pedal lab from the singing-lead preset button on this lesson page.",
          "Play a single note on the second string and hold it for four beats with no vibrato.",
          "Play it again with a slow, even vibrato and compare how it sustains and sounds.",
          "Bend a note up a whole step and check it against the target fret for pitch.",
          "Raise the delay mix until your phrases start to blur, then halve it.",
        ],
      },
      quiz: [
        {
          q: "Where does the delay usually go in a singing lead chain?",
          options: [
            "Before the overdrive",
            "After the distortion",
            "Before the tuner",
            "It replaces the amp",
          ],
          answer: 1,
          why: "Delay after the distortion repeats the finished sound cleanly; before it, the repeats get distorted and muddy.",
        },
        {
          q: "Which change most helps a sustained lead note sound expressive?",
          options: [
            "More gain",
            "More treble",
            "A steady, controlled vibrato",
            "A longer delay time",
          ],
          answer: 2,
          why: "Gain adds sustain, but vibrato is what gives a held note its voice.",
        },
      ],
      recipe: {
        preset: "singing-lead",
        guitar: "A solid-body with humbuckers.",
        pickup: "Neck humbucker, or the bridge with the tone knob at about 7.",
        amp: "A British-style or high-gain amp on a lead setting with the mids up.",
        settings: ["Gain: 7", "Bass: 5", "Mid: 7", "Treble: 5", "Presence: 5", "Master: 6", "Reverb: 2"],
        pedals: [
          "Overdrive: drive 3, tone 5, level 6",
          "Delay: time 350 to 450 ms, feedback 3, mix 2",
        ],
        hands: "Steady, even vibrato, bends that land on pitch, fewer notes held longer, and unused strings muted.",
      },
    },
    {
      id: "recipe-ambient-swell",
      module: "recipes",
      title: "Recipe: ambient swell",
      summary: "Volume swells into long delay and reverb to make pads with no pick attack. How to set the chain and how to swell with the volume knob.",
      minutes: 10,
      sections: [
        {
          heading: "The sound and where it works",
          paragraphs: [
            "An ambient swell removes the pick attack so notes fade in like a bowed instrument or a synth pad, then hang in long delay and reverb. It is the sound of 1980s atmospheric rock and modern ambient and post-rock textures.",
            "It works for intros, transitions, soundscapes, and as a quiet layer under other instruments.",
            "Because the notes have no attack, this sound sits behind other instruments rather than in front of them. In a band it fills space in quiet sections without drawing attention; on its own it can carry a whole piece, especially when the harmony moves slowly.",
          ],
        },
        {
          heading: "How to set it up",
          paragraphs: [
            "Start with a clean amp and the neck pickup. The swell comes from a volume pedal or the guitar's volume knob, placed before the delay and reverb so the tails keep ringing after the volume comes down. A delay with a long time, from roughly 500 milliseconds to a second, and moderate feedback, runs into a large reverb with a long decay and a high mix.",
            "Keep the amp's treble moderate, because long tails build up high frequencies. Many delays have a tone or filter control; darkening the repeats keeps the wash from getting harsh. " + START_NOTE,
          ],
        },
        {
          heading: "How to play it, and common mistakes",
          paragraphs: [
            "Turn the volume knob fully down, pick the note or chord, then roll the volume up smoothly over half a second to a second. Use your little finger on the knob while you pick, or a volume pedal if the knob is awkward to reach. Change chords slowly and let each one overlap the last.",
            "The common mistakes are putting the volume control after the delay, which cuts the tails off, and changing chords too fast, which turns the wash into mud. Choose chords that share notes so the overlaps sound intentional.",
          ],
        },
        {
          heading: "Make it yours",
          paragraphs: [
            "Where the effects sit and how wet they are move this sound most. Delay into reverb gives distinct repeats that dissolve into a wash; reverb into delay gives a smoother, more diffuse sound in which every repeat is already blurred. Try both orders and listen to how clearly you can hear the rhythm of the repeats.",
            "Swell speed is the second variable. A quick swell sounds like a note with a soft attack; a slow one, over a second or more, turns the guitar into a pad. Match the speed to the tempo of the piece and keep it consistent, so the swells feel like part of the rhythm rather than accidents.",
            "You have gone too far when you cannot tell where one chord ends and the next begins, when the wash keeps growing as the delay feedback builds, or when the top end starts to hiss. Shorten the reverb decay, lower the feedback or darken the repeats until the chords are distinct again.",
          ],
        },
      ],
      keyPoints: [
        "A swell fades the note in so there is no pick attack.",
        "The volume control goes before delay and reverb so tails keep ringing.",
        "Long delay and large reverb make the pad; darker repeats keep it from getting harsh.",
        "Slow chord changes with shared notes keep the wash clear.",
      ],
      exercise: {
        title: "Swell a four-chord pad",
        tool: LAB,
        steps: [
          "Open the pedal lab from the ambient-swell preset button on this lesson page.",
          "Practise one swell on an open chord: volume down, pick, then roll up over about one second.",
          "Play four chords that share at least one note, one swell per bar, letting each overlap the last.",
          "Shorten the delay time and hear how the wash tightens, then return it to the preset value.",
          "Try the swells with the volume knob and, if you have one, a volume pedal, and keep whichever feels smoother.",
        ],
      },
      quiz: [
        {
          q: "Why does the volume control go before the delay and reverb?",
          options: [
            "So the delay and reverb tails keep ringing after the volume comes down",
            "So the delay repeats get louder",
            "Because volume pedals only work at the start of a chain",
            "To reduce hum from the amp",
          ],
          answer: 0,
          why: "If the volume control came after the delay and reverb, lowering it would cut their tails off instead of letting them decay naturally.",
        },
        {
          q: "Your swells turn into a muddy wash. What is the best fix?",
          options: [
            "Pick harder",
            "Add distortion",
            "Change chords more slowly and pick chords that share notes",
            "Turn the treble to 10",
          ],
          answer: 2,
          why: "Long tails overlap. Slower changes with shared notes keep the overlap harmonious rather than cluttered.",
        },
      ],
      recipe: {
        preset: "ambient-swell",
        guitar: "Any electric guitar with an easy-to-reach volume knob.",
        pickup: "Neck pickup.",
        amp: "A clean amp with plenty of headroom.",
        settings: ["Gain: 2", "Bass: 5", "Mid: 5", "Treble: 4", "Master: 6", "Reverb: 0 (reverb comes from the pedal)"],
        pedals: [
          "Volume pedal (or the guitar volume knob): used for swells",
          "Delay: time 500 to 900 ms, feedback 5, mix 4, repeats darkened",
          "Reverb: large room or hall, decay 8, mix 5",
        ],
        hands: "Volume down before each note, pick, then roll the volume up smoothly over about a second; slow chord changes that share notes.",
      },
    },
    {
      id: "recipe-funk-clean",
      module: "recipes",
      title: "Recipe: funk clean",
      summary: "A snappy, compressed clean for 1970s funk rhythm: short chord stabs, muted scratches and a strict sixteenth-note right hand.",
      minutes: 10,
      sections: [
        {
          heading: "The sound and where it works",
          paragraphs: [
            "A funk clean is bright, tight and percussive. Chord stabs are short and snappy, muted strums sound like a hi-hat, and nothing rings longer than it should. It is the rhythm sound of 1970s funk and soul, and of a lot of dance and pop guitar since.",
            "It works for rhythm parts that lock in with the drums, where the guitar acts as much like percussion as like harmony.",
            "In a band, a funk guitar part usually sits in a narrow band of upper midrange and treble, away from the bass and kick. It often plays alongside the hi-hat and should lock to it. The guitar is rarely loud, but it is always audible, because its attack cuts through.",
          ],
        },
        {
          heading: "How to set it up",
          paragraphs: [
            "Single coils give the right snap; the middle and bridge together, or the neck and middle together, are good starting points. The amp should be fully clean with the bass low and the mids and treble up, so the chords are thin and cutting rather than full.",
            "A compressor at the front, with a quick attack and a moderate ratio, evens the stabs and adds snap. Keep reverb very low or off, because reverb blurs short notes. An auto-wah or envelope filter is a common addition, but the basic sound does not need it. " + START_NOTE,
          ],
        },
        {
          heading: "How to play it, and common mistakes",
          paragraphs: [
            "Keep your strumming hand moving in steady sixteenth notes all the time, down and up, even when you are not hitting the strings. Let the fretting hand decide which strums sound: press down for a chord, release pressure for a muted scratch. Use small chord shapes on the top three or four strings.",
            "The common mistakes are too much bass, which makes the chords boomy, too much reverb, and a strumming hand that stops and starts. The groove comes from the constant motion, not from the gear.",
          ],
        },
        {
          heading: "Make it yours",
          paragraphs: [
            "Pickup choice and the compressor move this sound most. Middle-and-bridge gives a hollow, snappy tone; neck-and-middle is rounder and softer. The bridge alone cuts hardest but can be thin. On the compressor, a fast attack flattens the front of each note for an even, polished sound, while a slightly slower attack lets the pick click through before the compressor clamps down.",
            "Pick attack is the other big variable. A light strum with a thin pick sounds scratchy and percussive; a heavier strum sounds fuller but less crisp. Strumming across fewer strings keeps the part tight and leaves more room for the bass.",
            "You have gone too far when you can hear the compressor pumping, when the muted scratches are as loud as the chords, or when the chords sound boomy even with the bass knob low. Back off the compressor's sustain or ratio, and check the pickup selector.",
          ],
        },
      ],
      keyPoints: [
        "A funk clean is bright, tight and percussive, with short chords.",
        "Single coils, a clean amp and low bass give the right snap.",
        "A compressor with a quick attack evens the stabs; keep reverb minimal.",
        "Constant sixteenth-note strumming with fretting-hand muting is the real sound.",
      ],
      exercise: {
        title: "Sixteenth-note scratch groove",
        tool: LAB,
        steps: [
          "Open the pedal lab from the funk-clean preset button on this lesson page.",
          "Set a metronome to 90 bpm and strum continuous sixteenth notes with the fretting hand muting all strings.",
          "Press down a small chord shape on the top strings on beats two and four only, keeping the strumming hand moving.",
          "Move the chord hits to different sixteenths each bar and keep the rest muted.",
          "Raise the reverb and listen to the stabs blur, then turn it back down.",
        ],
      },
      quiz: [
        {
          q: "In funk rhythm playing, what decides whether a strum is a chord or a muted scratch?",
          options: [
            "The strumming hand stopping between chords",
            "Fretting-hand pressure",
            "The amp's gain setting",
            "The pickup selector",
          ],
          answer: 1,
          why: "The strumming hand keeps moving; the fretting hand presses for a chord and releases for a muted scratch.",
        },
        {
          q: "Why keep reverb low for a funk clean?",
          options: [
            "Reverb blurs the short, percussive chords",
            "Reverb adds distortion",
            "Reverb makes the guitar quieter",
            "Reverb only works with humbuckers",
          ],
          answer: 0,
          why: "The sound depends on short notes with clear gaps, and reverb fills those gaps.",
        },
      ],
      recipe: {
        preset: "funk-clean",
        guitar: "A solid-body or semi-hollow with single-coil pickups.",
        pickup: "Middle and bridge together, or neck and middle together.",
        amp: "A clean amp with plenty of headroom and a bright voicing.",
        settings: ["Gain: 2", "Bass: 3", "Mid: 6", "Treble: 7", "Master: 6", "Reverb: 1"],
        pedals: [
          "Compressor: attack fast, ratio medium, level matched to bypass",
          "Auto-wah or envelope filter (optional): sensitivity 5, range mid",
        ],
        hands: "Constant sixteenth-note strumming, fretting-hand pressure for chords and release for scratches, small shapes on the top strings.",
      },
    },
    {
      id: "recipe-vintage-fuzz",
      module: "recipes",
      title: "Recipe: vintage fuzz",
      summary: "A thick, woolly late-1960s fuzz that cleans up with the guitar's volume knob. Settings, pedal placement, and how to control it.",
      minutes: 10,
      sections: [
        {
          heading: "The sound and where it works",
          paragraphs: [
            "Vintage fuzz is thick, woolly and harmonically rich, closer to a square wave than to an overdriven amp. It is the sound of late-1960s psychedelic rock, and in a milder form, of garage rock and stoner rock ever since.",
            "It works for riffs, big sustaining leads and single-note lines. It is less suited to complex chords, which can turn into a buzzing blur.",
            "In a band, fuzz is thick but can sound surprisingly small if the mids are cut or the bass is too heavy. It often sits best with a simple bass part, because the fuzz already fills much of the low and middle range. Its sustain makes long notes easy, and its rich harmonics make octave lines sound huge.",
          ],
        },
        {
          heading: "How to set it up",
          paragraphs: [
            "Many older fuzz circuits react strongly to what is plugged into them. They often sound and behave best with the guitar plugged straight into them, before any buffer, wah or tuner. If a fuzz sounds thin or harsh on your board, try moving it to the very front of the chain.",
            "Set the fuzz high, the level to taste, and use a clean or edge-of-breakup amp with the mids up. The fuzz provides the distortion; the amp just needs to reproduce it. " + START_NOTE,
          ],
        },
        {
          heading: "How to play it, and common mistakes",
          paragraphs: [
            "The guitar's volume knob is the key control. With many vintage-style fuzz circuits, full volume gives thick fuzz, and rolling back to around 6 or 7 cleans it up into a bright, glassy crunch. Use the neck pickup for smooth leads and the bridge for riffs.",
            "The common mistakes are placing the fuzz after a buffer, which can make some circuits sound thin and harsh, playing dense chords that turn to mush, and stacking the fuzz into an already distorted amp. Keep chord shapes simple, such as power chords and octaves.",
          ],
        },
        {
          heading: "Make it yours",
          paragraphs: [
            "The two variables that move this sound most are the guitar's volume knob and where the fuzz sits in the chain. Placement matters as much as the knobs: some fuzz circuits placed after a wah or a buffer sound thinner and harsher, and some become unstable or squeal. If a fuzz sounds wrong, move it to the front before you change its settings.",
            "Pickup choice is the second variable. The neck pickup gives a smooth, thick sound that can get muddy on low notes; the bridge pickup gives a cutting, raspy sound that can turn harsh. Rolling the tone knob back a little on the bridge pickup smooths the top end without losing the edge.",
            "You have gone too far when notes decay into a sputtering crackle, when low notes turn to mush, or when the fuzz is so loud it swamps the rest of the band. Lower the fuzz or the level, and check the order of the chain.",
          ],
        },
      ],
      keyPoints: [
        "Vintage fuzz is thick, woolly and harmonically rich.",
        "Many older fuzz circuits work best first in the chain, directly after the guitar.",
        "The guitar's volume knob moves the fuzz from full saturation to a bright crunch.",
        "Simple shapes such as power chords and octaves suit fuzz better than dense chords.",
      ],
      exercise: {
        title: "Play the volume knob",
        tool: LAB,
        steps: [
          "Open the pedal lab from the vintage-fuzz preset button on this lesson page.",
          "Play a single-note riff on the low strings with the guitar volume on full.",
          "Roll the volume to about 7 and play the same riff, then to about 5, and note how the fuzz cleans up.",
          "Play a full open chord and then a power chord at full volume and compare how clearly each comes through.",
          "On your own board, try the fuzz first in the chain and after other pedals and listen for the difference.",
        ],
      },
      quiz: [
        {
          q: "Where do many vintage-style fuzz circuits sound best?",
          options: [
            "At the very end of the chain",
            "After a buffer",
            "First in the chain, directly after the guitar",
            "In the amp's effects loop",
          ],
          answer: 2,
          why: "Many older fuzz circuits interact with the guitar's pickups, and a buffer in front changes how they respond.",
        },
        {
          q: "What happens when you roll back the guitar's volume with a vintage-style fuzz?",
          options: [
            "The fuzz usually cleans up towards a brighter crunch",
            "The fuzz gets thicker",
            "The pedal switches off",
            "The sound gets louder",
          ],
          answer: 0,
          why: "Less signal into the fuzz means less clipping, so many vintage-style fuzzes clean up as the guitar volume comes down.",
        },
      ],
      recipe: {
        preset: "vintage-fuzz",
        guitar: "A solid-body with single coils or humbuckers.",
        pickup: "Neck for smooth leads, bridge for riffs.",
        amp: "A clean or edge-of-breakup amp with the mids up.",
        settings: ["Gain: 3", "Bass: 5", "Mid: 6", "Treble: 5", "Master: 6", "Reverb: 2"],
        pedals: [
          "Fuzz, first in the chain: fuzz 8, level 5",
          "Spring-style reverb: mix 2",
        ],
        hands: "Use the guitar volume knob as a gain control, keep chords simple with power chords and octaves, and let big notes sustain.",
      },
    },
  ],
};
