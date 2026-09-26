import type { ToneModule } from "../types.ts";

export const RECORDING: ToneModule = {
  id: "recording",
  title: "Recording",
  blurb: "How to capture the tone you built: a mic on the amp, a direct signal into the computer, safe levels, low latency and a mix that leaves room for the guitar.",
  lessons: [
    {
      id: "miking-an-amp",
      module: "recording",
      title: "Miking an amp",
      summary: "Where to put one dynamic mic on a guitar cabinet, how position changes the tone, and what goes wrong when you add a second mic.",
      minutes: 14,
      sections: [
        {
          heading: "Start with one dynamic mic, close",
          paragraphs: [
            "The simplest reliable way to record an amp is one dynamic microphone placed close to the speaker grille, a few centimetres away or touching the cloth. A dynamic mic handles the high sound pressure right in front of a speaker without complaint, it is not fragile, and it picks up very little of the room. That last part matters at home, where the room usually sounds worse than the amp.",
            "Close miking records the speaker, not the space. What you hear in the headphones is a focused, direct sound that sits well in a mix and can be shaped later with EQ and reverb. You can always add space afterwards. You cannot easily take a bad room out of a recording.",
            "Before you move the mic at all, get the amp sounding right in the room. Stand where you would normally listen, set the tone, and only then put the mic up. A mic cannot fix an amp that sounds wrong to your ears, and chasing the tone with mic position when the real problem is the amp settings wastes an afternoon.",
          ],
        },
        {
          heading: "Position: centre, edge, distance and angle",
          paragraphs: [
            "A speaker does not sound the same across its face. Near the centre, in line with the dust cap, the sound is brighter and more direct, with more pick attack and upper-mid bite. As you move the mic out towards the edge of the cone, the sound gets darker and rounder, with less fizz. Most usable positions sit somewhere between the two, and a move of two or three centimetres is enough to hear a difference.",
            "Distance changes the low end. Directional mics show the proximity effect: the closer they are to the source, the more bass they pick up. Right on the grille the sound can be thick and heavy; pull back to 10 or 15 centimetres and the low end thins while a little more of the room creeps in. If a close position sounds boomy, back off before you reach for an EQ.",
            "Angle is a third control. Pointing the mic straight at the cone (on-axis) gives the brightest result. Tilting it off-axis, say 30 to 45 degrees, softens the top end because most mics are less sensitive to high frequencies arriving from the side. Angling is a gentle way to tame a harsh amp without moving the mic across the cone.",
            "Speakers also differ from one another, even in the same cabinet. If you have a cab with more than one speaker, listen to each one up close at low volume and put the mic on the one you like best.",
          ],
        },
        {
          heading: "Room mics and two-mic phase",
          paragraphs: [
            "A second mic further back, from half a metre to a few metres away, adds the sound of the room: air, depth and a sense of the amp in a space. In a good-sounding room this can be lovely when blended quietly under the close mic. In a small untreated bedroom it often adds boxiness instead, so try it before you commit.",
            "When two mics hear the same source at different distances, the sound reaches the far mic later. Sound travels at roughly 343 metres per second, so each 30 centimetres of extra distance adds a little under a millisecond of delay. Mixed together, the two signals reinforce some frequencies and cancel others in a regular pattern called comb filtering. For a 30 centimetre difference the first deep cancellation falls around 570 Hz, right in the body of the guitar, which is why a badly blended pair can sound hollow or thin.",
            "Check this by ear. Solo the two mics together, then flip the polarity of one (the button is often labelled with a circle and a slash, or called phase invert). Whichever setting sounds fuller and has more low mids is usually the right one. You can also nudge the later track earlier in time in your recording software until the waveforms line up, and listen again. Trust the result you hear over the one you see on screen.",
          ],
        },
        {
          heading: "Volume, hearing and neighbours",
          paragraphs: [
            "A guitar amp in a small room can be loud enough to damage hearing over a session. Wear hearing protection when you are in the room with a loud amp, keep sessions short, and monitor on headphones at a moderate level. Ringing ears after a session is a sign you went too far.",
            "You rarely need full volume to get a good recording. A lower-wattage amp pushed into its sweet spot often records better than a large amp barely turned up. Many amps also have a master volume that lets you get preamp drive at a lower level.",
            "An attenuator sits between the amp and the speaker and lets you run the power section harder at a lower volume. Use one only in the way the amp maker and the attenuator maker both allow, match the impedance, and never let a tube amp run without a proper load connected. Some makers advise against attenuators for particular amps, so check before you plug in. Your neighbours will also thank you for a quieter amp, closed windows and sensible hours.",
          ],
        },
      ],
      keyPoints: [
        "Start with one dynamic mic a few centimetres from the grille and get the amp right in the room first.",
        "The centre of the cone sounds brighter and the edge sounds darker; small moves make a real difference.",
        "Moving closer adds bass through the proximity effect, and angling off-axis softens the top end.",
        "Two mics at different distances cause comb filtering, so check polarity and alignment by ear.",
        "Protect your hearing, and use attenuators only within the amp maker's guidance with a proper load connected.",
      ],
      exercise: {
        title: "Map one speaker in five takes",
        steps: [
          "Set the amp to a clean or lightly driven sound at a moderate volume and wear hearing protection in the room.",
          "Place a dynamic mic touching the grille, pointed at the centre of the dust cap, and record eight bars of the same riff.",
          "Record the same eight bars with the mic moved halfway to the edge of the cone, then at the edge.",
          "Return to the halfway position and record once pulled back 10 centimetres, and once angled about 45 degrees off-axis.",
          "Play the five takes back at matched loudness and write down one word for each, such as bright, thick or thin.",
          "Pick your favourite position and mark it on the cabinet with a small piece of tape for next time.",
        ],
      },
      quiz: [
        {
          q: "You move a close mic from the centre of the speaker towards the edge of the cone. What usually happens?",
          options: [
            "The sound gets darker and rounder",
            "The sound gets brighter and thinner",
            "The bass disappears completely",
            "Nothing changes, because the whole cone moves together",
          ],
          answer: 0,
          why: "The centre of the cone carries more high-frequency content, so moving towards the edge gives a darker, rounder sound.",
        },
        {
          q: "A close mic right on the grille sounds boomy. What is the first thing to try?",
          options: [
            "Turn the amp's gain up",
            "Pull the mic back a little to reduce the proximity effect",
            "Add a second mic across the room",
            "Record at a higher sample rate",
          ],
          answer: 1,
          why: "Directional mics pick up more bass the closer they are to the source, so a small move back reduces the boom before you reach for EQ.",
        },
        {
          q: "You blend a close mic with a mic 30 centimetres further back and the sound turns hollow. What is the likely cause?",
          options: [
            "The mics are the wrong brand",
            "The recording level is too low",
            "Comb filtering from the time difference between the two mics",
            "The speaker is damaged",
          ],
          answer: 2,
          why: "The far mic hears the sound slightly later, so blending the two cancels some frequencies. Flipping polarity or aligning the tracks by ear usually fixes it.",
        },
      ],
    },
    {
      id: "direct-recording-and-amp-sims",
      module: "recording",
      title: "Direct recording and amp sims",
      summary: "Record the guitar straight into an interface, keep a clean DI for later, and understand what amp sims, captures and impulse responses do.",
      minutes: 13,
      sections: [
        {
          heading: "The instrument input",
          paragraphs: [
            "A guitar pickup is a weak, high-impedance source. Plug it into an input designed for microphones or line-level gear and it loses level and top end, because that input loads the pickup down. That is why audio interfaces have an instrument input, often marked Hi-Z or INST, with a high input impedance, commonly around 1 megohm, though the exact figure varies by interface.",
            "Plug the guitar straight into that input, set the input gain so your hardest playing peaks well below the top of the meter, and you have a DI track: the dry sound of the guitar with no amp at all. On its own it sounds thin and plain. That is normal. It is raw material, not a finished tone.",
            "If your pedalboard has a buffer or your first pedal is always on, the interface sees that pedal's output rather than the pickups directly. That is fine, but it will sound slightly different from plugging the guitar in on its own, so decide which you want and keep it consistent across a project.",
          ],
        },
        {
          heading: "Record a clean DI alongside the amp",
          paragraphs: [
            "Even when you mic a real amp, it is worth recording a clean DI at the same time. Split the guitar signal before the amp, with a DI box that has a thru output or an interface with a second instrument input, and record both tracks together. The mic track is your sound; the DI is insurance.",
            "Later you can send that DI back out through a different amp or different settings and record it again. This is called reamping. It lets you change the tone after the performance is finished, which is useful when a part was played well but the sound no longer fits the mix.",
            "Reamping needs a reamp box. The interface outputs a line-level signal at low impedance, but an amp or pedal input expects the lower level and high source impedance of a guitar. A reamp box converts the line output back to something that behaves like a guitar, so pedals and amp inputs react the way they would to your pickups. Plugging a line output straight into a pedal often sounds harsh or too hot.",
          ],
        },
        {
          heading: "Amp sims, captures and profiles",
          paragraphs: [
            "An amp simulator is software or hardware that models an amp's behaviour digitally, usually stage by stage: preamp, tone stack, power section and speaker. Good ones respond to your picking dynamics and guitar volume knob in a way that feels close to a real amp, and they let you record silently at any hour.",
            "Captures and profiles take a different approach. Instead of modelling circuits from the design, they measure a specific amp at specific settings by sending test signals through it and analysing what comes out. Some newer systems train a neural network on that input and output so it learns the amp's behaviour. The result can be very convincing for the settings that were captured, but it is a snapshot: turning a knob on the capture does not always behave like turning the same knob on the original amp.",
            "None of these approaches is automatically better. Modelling tends to be flexible, captures tend to be precise at one setting, and all of them depend on how they were made. Judge them by ear in the context of a mix rather than on paper.",
          ],
        },
        {
          heading: "Cabinet impulse responses",
          paragraphs: [
            "A speaker cabinet and a microphone together act like a fixed filter: they shape the frequency response and add a short resonance. An impulse response, or IR, is a measurement of that filter. Someone places a particular mic at a particular spot on a particular cab, plays a test signal through it and records the result. Loading the IR applies that exact response to your signal.",
            "Because an IR is one mic at one position, everything from the miking lesson still applies. Different IRs of the same cab can sound as different as moving a real mic from the centre to the edge of the cone. If a sim sounds fizzy or harsh, try a different IR before you change the amp settings; the cab stage is often where the problem is.",
            "Most amp sims include cab simulation. If you use an IR loader, turn the sim's built-in cab off so you are not filtering the signal twice.",
          ],
        },
      ],
      keyPoints: [
        "Plug a guitar into the interface's instrument (Hi-Z) input, not a mic or line input.",
        "Record a clean DI alongside a miked amp so you can reamp later if the sound needs to change.",
        "A reamp box converts the interface's line output back to guitar-like level and impedance.",
        "Modelling, captures and neural captures all have strengths; judge them by ear in a mix.",
        "A cabinet IR is a measurement of one cab and one mic at one position, and swapping IRs changes the tone a lot.",
      ],
      exercise: {
        title: "Record once, choose the tone later",
        steps: [
          "Plug the guitar into the interface's instrument input and set the gain so hard strums peak well below the top of the meter.",
          "Record a clean DI of a four-bar chord part with no processing on the input.",
          "Put an amp sim on the track and pick a tone you like; the sim processes the playback, so the DI stays untouched.",
          "Try three different cab IRs or cab settings on the same sim and note how each changes the brightness and body.",
          "Pick the combination that sits best under a simple drum loop and save it as a preset.",
        ],
      },
      quiz: [
        {
          q: "Why should a guitar go into the Hi-Z instrument input rather than a line input?",
          options: [
            "The instrument input adds distortion that guitars need",
            "The instrument input has a high impedance that does not load down the pickups",
            "Line inputs only work with microphones",
            "The instrument input records at a higher sample rate",
          ],
          answer: 1,
          why: "Pickups are a high-impedance source. A high-impedance input keeps their level and top end, while a lower-impedance input dulls them.",
        },
        {
          q: "What does a reamp box do?",
          options: [
            "Converts a line-level output back to guitar-like level and impedance for an amp input",
            "Boosts the guitar before the interface to raise the recording level",
            "Removes latency from the monitoring path",
            "Stores amp settings for later recall",
          ],
          answer: 0,
          why: "An interface output is line level at low impedance. The reamp box makes it behave like a guitar so the amp and pedals react normally.",
        },
        {
          q: "A cabinet impulse response is best described as:",
          options: [
            "A recording of a whole song played through an amp",
            "A model of the preamp tubes",
            "A measurement of one cab and one mic at one position",
            "A reverb that simulates a large hall",
          ],
          answer: 2,
          why: "An IR captures the fixed filtering of a particular cab, mic and placement, which is why different IRs of the same cab sound different.",
        },
      ],
    },
    {
      id: "levels-and-latency",
      module: "recording",
      title: "Levels and latency",
      summary: "Record at 24-bit with plenty of headroom, avoid converter clipping, and set the buffer so you can play in time.",
      minutes: 12,
      sections: [
        {
          heading: "Record at 24-bit and leave headroom",
          paragraphs: [
            "Set your recording software to 24-bit. Each bit adds about 6 dB of theoretical dynamic range, so 24-bit gives far more room between the noise floor and the top of the scale than 16-bit does. In practice that means you do not need to record hot to stay clear of noise. The quiet parts are captured cleanly even when the peaks are well below the maximum.",
            "The top of a digital meter is 0 dBFS, full scale. Nothing can go above it. A common guideline is to set input gain so the loudest peaks land somewhere around −12 to −6 dBFS, with the average level lower than that. Treat this as a starting point rather than a rule: a gentle clean part may peak lower, and that is fine at 24-bit.",
            "Set the level while playing as hard as you will in the real take, not while noodling. Players almost always dig in harder when the red light is on.",
          ],
        },
        {
          heading: "Why converter clipping cannot be fixed",
          paragraphs: [
            "Clipping in an analogue amp is a sound. Clipping in the converter is a failure. When the signal tries to exceed 0 dBFS at the input, the converter simply flattens the tops of the waveform. The information that should have been there is never recorded, so no plugin can bring it back. It usually sounds like a harsh crackle or a brittle edge on the loudest notes.",
            "Turning the track fader down afterwards does not help, because the damage happened before the signal reached the software. The only fix is to lower the input gain on the interface and record again.",
            "Headroom is the space between your loudest peak and 0 dBFS. It is your safety margin for the unexpected: a harder strum, a feedback swell, a boost pedal you forgot was on. Giving away a few decibels of level costs nothing at 24-bit, while running out of headroom costs you the take.",
          ],
        },
        {
          heading: "Where latency comes from",
          paragraphs: [
            "Your computer processes audio in chunks called buffers. The buffer size is the number of samples in each chunk, and the time one buffer takes is the buffer size divided by the sample rate. At 48 kHz, a 128-sample buffer is 128 ÷ 48,000 ≈ 2.7 milliseconds. A 256-sample buffer at the same rate is about 5.3 milliseconds, and 64 samples is about 1.3 milliseconds.",
            "That figure is one way, for one buffer. When you play through an amp sim, the sound goes in through a buffer and out through another, so the round-trip latency is at least two buffers, plus the time the converters and driver add. That overhead varies by interface and driver, and many recording programs report the real round-trip figure in their audio settings. So a 128-sample buffer at 48 kHz means a round trip of at least 5.3 milliseconds, and in practice a little more; check the figure your software reports.",
            "For a sense of scale, sound in air travels about a metre in 3 milliseconds, so a few milliseconds is like standing a little further from your amp. Many players find a round trip under about 10 milliseconds comfortable to play through, though sensitivity varies from person to person.",
          ],
        },
        {
          heading: "Tracking low, mixing high, or monitoring direct",
          paragraphs: [
            "Small buffers mean low latency but more work for the computer. If the buffer is too small for your session, you hear clicks, pops and dropouts. Large buffers are smooth and stable but feel sluggish to play through. The usual approach is to lower the buffer while tracking, so the part feels immediate, and raise it while mixing, when you are not playing live and want room for many plugins.",
            "Direct monitoring sidesteps the computer altogether. Most interfaces can send the input straight to the headphones before it reaches the software, with close to zero latency. The catch is that you hear the dry input, not the amp sim or effects running in the computer. That is ideal when you are miking a real amp or recording through pedals, and less useful when the sim is the sound.",
            "If you use direct monitoring, mute the software monitoring on that track or you will hear both signals slightly apart, which sounds like a short slap or a phasey doubling.",
          ],
        },
      ],
      keyPoints: [
        "Record at 24-bit so you can leave generous headroom without adding noise.",
        "A common guideline is peaks around −12 to −6 dBFS with averages lower; adjust to the part.",
        "Clipping in the converter destroys the waveform and cannot be repaired afterwards.",
        "One buffer lasts buffer size divided by sample rate; 128 samples at 48 kHz is about 2.7 ms one way.",
        "Lower the buffer while tracking, raise it while mixing, or use direct monitoring for zero-latency listening.",
      ],
      exercise: {
        title: "Set a safe level and a playable buffer",
        steps: [
          "Set the project to 24-bit and note the sample rate, for example 48 kHz.",
          "Play the loudest passage of your part as hard as you would in a real take and set the input gain so peaks sit around −12 to −6 dBFS.",
          "Calculate the one-way buffer time for 64, 128 and 256 samples at your sample rate by dividing the buffer size by the rate.",
          "Play through an amp sim at each buffer size and note where it starts to feel late or where clicks appear.",
          "Choose the smallest buffer that runs cleanly for tracking, and write down a larger one to switch to when mixing.",
        ],
      },
      quiz: [
        {
          q: "About how long is one 128-sample buffer at 48 kHz?",
          options: [
            "About 0.27 milliseconds",
            "About 2.7 milliseconds",
            "About 27 milliseconds",
            "About 128 milliseconds",
          ],
          answer: 1,
          why: "128 divided by 48,000 is about 0.0027 seconds, or 2.7 milliseconds, one way and before converter and driver overhead.",
        },
        {
          q: "A take has crackly peaks because the interface input clipped. What fixes it?",
          options: [
            "Pull the track fader down in the mix",
            "Add a limiter plugin to the track",
            "Lower the input gain and record the part again",
            "Export the song at a higher bit depth",
          ],
          answer: 2,
          why: "Converter clipping removes the tops of the waveform before the software sees it, so the only fix is a new take at a lower input level.",
        },
        {
          q: "What is the main trade-off of direct monitoring on an interface?",
          options: [
            "You hear the dry input, not the effects running in the computer",
            "It doubles the round-trip latency",
            "It lowers the recording bit depth",
            "It only works with microphones",
          ],
          answer: 0,
          why: "Direct monitoring sends the input to the headphones before the software, so latency is near zero but software effects and amp sims are not heard.",
        },
      ],
    },
    {
      id: "double-tracking-and-the-mix",
      module: "recording",
      title: "Double tracking and the mix",
      summary: "Why two real performances panned apart sound wide, how to make guitars sit with bass and drums, and how to check your mix in mono.",
      minutes: 13,
      sections: [
        {
          heading: "Two performances, not one copied",
          paragraphs: [
            "Double tracking means recording the same part twice, as two separate performances, and panning one hard left and the other hard right. The result is a wide, full wall of guitar that seems to surround the centre of the mix, where the vocal, bass and kick usually live.",
            "The width comes from the small differences between the two takes. Your timing drifts by a few milliseconds, your picking lands slightly differently, a bend goes a touch further, one chord rings a fraction longer. Your ears hear two related but different sources and place them apart. Those tiny imperfections are the whole effect.",
            "Copying one take to a second track and panning the two apart does not do this. The two sides are identical, so your ears hear one source in the middle, just louder. Delaying the copy by a few milliseconds creates some width, but it also creates comb filtering and collapses badly in mono. Playing the part twice is the reliable way.",
          ],
        },
        {
          heading: "Make the two sides a little different",
          paragraphs: [
            "The tighter your two performances, the better a double sounds, so learn the part well before recording it. You want the same rhythm and the same chord voicings in both takes, played as close as you can manage. The natural human differences will provide the width.",
            "You can go further by changing the source between takes. Use a different guitar, a different pickup, a slightly different amp setting or a different mic position for the second pass. A humbucker on one side and a single coil on the other, or the same guitar through two amps, gives a richer result than two identical sounds.",
            "Changing the voicing works too. Play open chords on one side and the same chords higher up the neck, or with a capo, on the other. The two parts support each other without stacking up exactly on the same frequencies.",
          ],
        },
        {
          heading: "EQ and gain in the mix",
          paragraphs: [
            "Guitars share space with bass and kick drum, and they almost always have more low end than a mix needs. A high-pass filter on the guitar tracks, often set somewhere between 80 and 150 Hz depending on the part and the key, clears room for the bass and kick without making the guitar sound thin in context. Set it by listening to the full mix, not the soloed guitar, because a guitar that sounds great alone often sounds muddy with everything else playing.",
            "Distorted rhythm guitars usually need less gain than you think. Heavy saturation compresses the signal and smears the attack, so stacked tracks turn into a wash that feels big alone but small in the mix. Turning the gain down a few notches restores note definition and punch, and doubling adds back the size.",
            "Reach for cuts before boosts. If the guitars sound harsh, look for a narrow resonance in the upper mids and reduce it. If they clash with the vocal, a gentle dip in the range where the voice is strongest can make room without lowering the whole guitar.",
          ],
        },
        {
          heading: "Check in mono",
          paragraphs: [
            "Many people will hear your mix on a single speaker: a phone, a small smart speaker, a shop sound system. Summing to mono is the quickest way to find out what they will hear. Most recording software has a mono button on the master bus, or you can insert a utility plugin to fold the mix to mono.",
            "Double-tracked guitars made from two real takes usually hold up well in mono; they get narrower, but the part is still there. Tracks that rely on a short delay copy, stereo wideners or two mics with phase problems can drop in level or turn hollow when summed. If the guitars disappear in mono, go back and fix the source rather than adding more processing.",
            "Flip between stereo and mono a few times while mixing. If the balance between guitars, vocal and drums still works in mono, it will work almost everywhere.",
          ],
        },
      ],
      keyPoints: [
        "A double is two separate performances panned hard left and right, not a copied track.",
        "The small timing and picking differences between takes are what create the width.",
        "Changing guitar, pickup, amp setting or voicing between takes gives a fuller result.",
        "A high-pass filter on guitars and less gain on distorted rhythm parts make room for the bass and kick.",
        "Check the mix in mono and fix sources that collapse rather than adding more processing.",
      ],
      exercise: {
        title: "Hear the difference a real double makes",
        steps: [
          "Record a four-bar rhythm part and pan it hard left.",
          "Copy the track, pan the copy hard right and listen: note that it sounds centred, not wide.",
          "Mute the copy, record a second real performance of the same part and pan it hard right.",
          "Compare the copy and the real double, then switch the master to mono and compare again.",
          "Add a high-pass filter to both real takes and raise its frequency slowly until the guitars start to sound thin against a bass or drum loop, then back it off a little.",
        ],
      },
      quiz: [
        {
          q: "You copy a guitar track and pan the original left and the copy right. What do you hear?",
          options: [
            "A wide stereo double",
            "A louder mono guitar in the centre",
            "A guitar only in the left speaker",
            "A chorus effect",
          ],
          answer: 1,
          why: "Identical signals in both speakers are heard as one source in the middle. Width needs the small differences of two separate performances.",
        },
        {
          q: "Why add a high-pass filter to rhythm guitars in a mix?",
          options: [
            "To make them louder than the vocal",
            "To remove pick noise",
            "To clear low frequencies so the bass and kick have room",
            "To add distortion",
          ],
          answer: 2,
          why: "Guitars carry low end the mix rarely needs, and removing it lets the bass and kick sit clearly without the guitar losing its character in context.",
        },
        {
          q: "Your stereo guitars get much quieter and hollow when you switch to mono. What is the likely cause?",
          options: [
            "Phase problems from a short delay copy, a widener or badly aligned mics",
            "The guitars were recorded at 24-bit",
            "The high-pass filter is set too low",
            "The guitars were played too tightly in time",
          ],
          answer: 0,
          why: "Signals that are nearly identical but slightly offset cancel each other when summed. Two real performances, or aligned mics, hold up much better in mono.",
        },
      ],
    },
  ],
};
