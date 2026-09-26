import type { ToneModule } from "../types.ts";

export const PEDALS: ToneModule = {
  id: "pedals",
  title: "Pedals",
  blurb: "What each family of effects changes in your signal, and how to set the controls so a pedal helps the sound instead of burying it.",
  lessons: [
    {
      id: "pedal-families",
      module: "pedals",
      title: "The five pedal families",
      summary: "Dynamics, filter, gain, modulation and time: what each family of pedals changes, and why knowing the family tells you where it usually goes.",
      minutes: 12,
      sections: [
        {
          heading: "Sort by what the pedal changes",
          paragraphs: [
            "There are thousands of pedals, but almost all of them change one of five things about your signal: its dynamics, its frequency balance, its waveform, its movement over time in pitch or level, or its repetition in time. Sort a pedal by which of those it changes and you already know most of what it will do, how it reacts to the pedals around it, and roughly where it belongs on a board.",
            "The five families are dynamics, filter and EQ, gain, modulation, and time-based effects. Some pedals straddle two families. An overdrive with a strong tone control is part gain, part EQ. An envelope filter is a filter whose movement is driven by your dynamics. That is fine. The family is a way of thinking about what happens to the signal, not a strict label.",
          ],
        },
        {
          heading: "Dynamics and filters",
          paragraphs: [
            "Dynamics pedals change how loud the signal is over time without changing its basic shape. A compressor turns loud notes down and lets you bring the whole signal back up, so quiet and loud playing sit closer together. A noise gate mutes the signal when it falls below a threshold, which cuts hiss and hum between phrases. A volume pedal is the simplest dynamics tool of all: your foot sets the level.",
            "Filter and EQ pedals change the balance of frequencies. A graphic or parametric EQ boosts or cuts fixed or adjustable bands. A wah sweeps a narrow, resonant peak up and down the spectrum as you rock the treadle. An envelope filter moves a similar peak automatically in response to how hard you pick. None of these add distortion on their own. They decide which parts of the sound are loud.",
          ],
        },
        {
          heading: "Gain",
          paragraphs: [
            "Gain pedals add distortion by amplifying the signal until it clips, then shaping the result. Clean boosts sit at one end: they raise the level with as little clipping as they can manage. Overdrives clip gently and usually push the midrange. Distortions clip harder for a denser, more sustained sound. Fuzzes clip so hard that the waveform turns nearly square, with a thick, buzzy texture.",
            "Because a gain pedal multiplies whatever arrives at its input, it reacts strongly to its neighbours. A compressor before it evens out what it receives. A wah before it gets its sweep exaggerated by the clipping. A reverb before it gets distorted into a wash. That sensitivity is why gain usually sits early in the chain, and why the order around it matters so much.",
          ],
        },
        {
          heading: "Modulation and time",
          paragraphs: [
            "Modulation pedals make something move. A low-frequency oscillator, usually running slower than you can hear as a pitch, sweeps a parameter back and forth. Sweep volume and you get tremolo. Sweep pitch and you get vibrato. Mix a slightly delayed, pitch-swept copy with the dry sound and you get chorus. Sweep a series of phase shifts and you get a phaser. The rate control sets the speed and the depth control sets how far the sweep travels.",
            "Time-based pedals repeat the sound. A delay plays back distinct copies after a set time. A reverb creates thousands of dense reflections that blur into the impression of a room, a plate or a spring. Because they multiply everything in front of them, time effects usually go last, so their repeats and tails carry the finished sound rather than being distorted or modulated further down the line.",
          ],
        },
      ],
      keyPoints: [
        "Most pedals change one of five things: dynamics, frequency balance, clipping, movement, or repetition in time.",
        "Dynamics pedals change level over time; filter pedals change which frequencies are loud.",
        "Gain pedals clip the signal, and they exaggerate whatever the pedals before them did.",
        "Modulation pedals sweep a parameter with a slow oscillator; rate is speed and depth is travel.",
        "Time-based effects repeat the sound, which is why they usually sit at the end of the chain.",
      ],
      exercise: {
        title: "Hear one pedal from each family",
        steps: [
          "Open the pedal lab, bypass every pedal, and play a short phrase through the amp block so you have a clean reference.",
          "Turn on only the compressor and play the phrase softly, then hard. Note how much closer together the two levels sit.",
          "Swap it for the EQ, then the overdrive, then the chorus, then the delay, playing the same phrase each time.",
          "For each one, write a single sentence saying what changed: level over time, frequency balance, clipping, movement, or repeats.",
          "Press the button that orders the pedals conventionally and look at where each family ends up. Keep your five sentences for the next lessons.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "A pedal makes the sound swell louder and quieter in a steady pulse without changing its pitch. Which family is it in?",
          options: ["Time-based", "Modulation", "Gain", "Filter and EQ"],
          answer: 1,
          why: "That is tremolo: a slow oscillator sweeping volume. Sweeping a parameter over time is what defines modulation.",
        },
        {
          q: "Why does a gain pedal react so strongly to the pedals placed before it?",
          options: [
            "It amplifies and clips whatever arrives, so earlier changes are exaggerated",
            "It draws more current than other pedals",
            "It always contains a buffer that changes the tone of earlier pedals",
            "It filters out every frequency the earlier pedals added",
          ],
          answer: 0,
          why: "Clipping multiplies differences in level and frequency content, so anything shaped before the gain stage comes out larger and more obvious.",
        },
        {
          q: "Which of these is a dynamics effect rather than a filter?",
          options: ["Wah", "Graphic EQ", "Noise gate", "Envelope filter"],
          answer: 2,
          why: "A noise gate changes level over time by muting the signal below a threshold. The other three change the frequency balance.",
        },
      ],
    },
    {
      id: "compression",
      module: "pedals",
      title: "Compression",
      summary: "Threshold, ratio, attack, release and makeup gain, and how to set a compressor for gentle sustain instead of a squashed, lifeless attack.",
      minutes: 14,
      sections: [
        {
          heading: "What a compressor does",
          paragraphs: [
            "A compressor watches the level of your signal and turns it down when it gets loud. Then it turns the whole signal back up. The result is a smaller gap between your loudest and quietest notes. Soft picking comes forward, hard picking is held back, and a sustained note stays louder for longer before it fades into the noise.",
            "On guitar this does three useful jobs. It evens out a clean part so every note of an arpeggio is heard. It adds sustain, because the fading tail of a note is turned up relative to its start. And it can reshape the pick attack, either softening it or making it snap, depending on how you set the timing controls.",
          ],
        },
        {
          heading: "Threshold, ratio and makeup",
          paragraphs: [
            "The threshold is the level above which the compressor starts working. Below it, the signal passes unchanged. Many guitar compressors use a single sustain or compression knob that lowers the threshold and raises the ratio together, so turning it up means more of your playing is being compressed, and more strongly.",
            "The ratio says how hard the compressor pushes back. At 2:1, a note that goes 4 dB over the threshold comes out only 2 dB over. At 8:1, a note 8 dB over comes out 1 dB over. Low ratios sound natural. High ratios approach limiting, where the output barely rises no matter how hard you play.",
            "Because compression only ever turns things down, the output is quieter than the input. Makeup gain, often labelled level or volume, brings it back up. Set it so the pedal is about the same volume on and off, or you will judge the effect by loudness rather than by what it does to your playing.",
          ],
        },
        {
          heading: "Attack and release",
          paragraphs: [
            "Attack is how quickly the compressor clamps down once the signal crosses the threshold. Release is how quickly it lets go once the signal drops back. These two controls decide whether a compressor sounds invisible, punchy or squashed.",
            "A fast attack catches the pick transient, the brief spike at the very start of each note, and turns it down along with everything else. The result is smooth and even, but the note can lose its definition. A slower attack lets that first spike through before the compressor reacts, so each note keeps its click and snap while the body and tail are still evened out. For most rhythm and clean work, a moderate to slow attack sounds more alive.",
            "A release that is too fast makes the level pump audibly as the compressor grabs and lets go on every note. A release that is too slow keeps the gain turned down into the next note, so quiet notes after loud ones are lost. Set it so the level has recovered by the time you play the next note at your usual tempo.",
          ],
        },
        {
          heading: "Squash versus sustain",
          paragraphs: [
            "Guitar players often want one of two things from a compressor. Squash is the obvious, percussive effect: a low threshold, high ratio and fast attack flatten every note to the same level, which suits tight, clucky clean rhythm parts. Sustain is subtler: a moderate ratio with a slower attack keeps the pick attack but lifts the fading tail, so notes ring longer.",
            "Remember that heavy compression also raises the noise floor. Between notes, the compressor turns the gain up, which brings hiss and hum up with it. A compressor in front of a high-gain sound adds even more noise, which is one reason many players use little or none there, since heavy distortion already compresses the signal.",
          ],
        },
      ],
      keyPoints: [
        "A compressor turns loud signals down, then makeup gain brings the whole signal back up.",
        "The ratio sets how hard it pushes back; the threshold sets where it starts.",
        "A slower attack lets the pick transient through, so notes keep their definition.",
        "Release should recover before your next note, or the level will pump or stay held down.",
        "Match the on and off volume with makeup gain so you judge the effect, not the loudness.",
      ],
      exercise: {
        title: "Set a compressor for sustain, then for squash",
        steps: [
          "Open the pedal lab with only the compressor and a clean amp block active.",
          "Set a moderate ratio, a slow attack and a medium release. Adjust the level until bypassing the pedal causes no jump in volume.",
          "Play single notes and let them ring. Listen for the tail lasting longer while the pick attack stays clear.",
          "Now lower the threshold, raise the ratio and set the fastest attack. Play a muted funk-style rhythm and listen for the flattened, clucky squash.",
          "Switch between the two settings with a sustained chord and note which one raises the background noise more between chords.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "A compressor is set to a ratio of 4:1. A note goes 8 dB above the threshold. How far above the threshold is the output?",
          options: ["1 dB", "2 dB", "4 dB", "32 dB"],
          answer: 1,
          why: "At 4:1, every 4 dB above the threshold becomes 1 dB, so 8 dB over becomes 2 dB over.",
        },
        {
          q: "Your clean notes sound smooth but have lost their pick definition. Which change most directly helps?",
          options: ["Slow the attack", "Raise the makeup gain", "Speed up the release", "Raise the ratio"],
          answer: 0,
          why: "A slower attack lets the transient at the start of each note pass before the compressor reacts, restoring the click of the pick.",
        },
        {
          q: "Why does heavy compression make hiss more noticeable between phrases?",
          options: [
            "The compressor generates its own hiss only when the ratio is high",
            "When you stop playing, the gain rises and lifts the noise floor with it",
            "The attack control filters out the treble that normally masks hiss",
            "Compressors convert hum into hiss",
          ],
          answer: 1,
          why: "With no loud signal to turn down, the compressor applies its full makeup gain, so background noise comes up.",
        },
      ],
    },
    {
      id: "overdrive-distortion-fuzz",
      module: "pedals",
      title: "Overdrive, distortion and fuzz",
      summary: "How soft clipping, hard clipping and fuzz differ, what clipping diodes change, and why vintage-style fuzz usually wants to go first.",
      minutes: 16,
      sections: [
        {
          heading: "Clipping, soft and hard",
          paragraphs: [
            "Every gain pedal works the same basic way. It amplifies the signal past the point the circuit can pass cleanly, and the tops of the waveform are flattened. That flattening adds harmonics that were not in the original note, which is what we hear as drive. What separates overdrive, distortion and fuzz is how gently or abruptly the waveform is flattened, and how the pedal shapes the frequencies around it.",
            "Soft clipping rounds the peaks off gradually. Low-level playing stays nearly clean, and harder playing pushes further into drive, so the pedal cleans up when you pick lightly or roll back your guitar's volume. Hard clipping squares the peaks off abruptly, producing more high harmonics, more compression and more sustain, with less change between soft and hard picking.",
          ],
        },
        {
          heading: "Overdrive",
          paragraphs: [
            "Overdrive pedals aim for the sound of an amp pushed just past clean. They use soft clipping and modest gain, and many of them cut some bass before the clipping stage and have a pronounced mid hump in their response. Cutting bass keeps low notes from turning flabby. The mid emphasis helps a guitar cut through a band mix, which is why an overdrive can sound thin on its own and just right with a drummer.",
            "A common use is stacking an overdrive into an amp that is already on the edge of breakup. Set the pedal's drive low and its level high. The pedal adds a little clipping of its own, tightens the low end, lifts the mids, and pushes the amp's preamp harder, so the amp does most of the distorting. The result is often richer than either the pedal or the amp alone.",
          ],
        },
        {
          heading: "Distortion and diodes",
          paragraphs: [
            "Distortion pedals use more gain and usually harder clipping, often with a pair of diodes that shunt the signal to ground once it passes their forward voltage. The sound is denser and more sustained than overdrive, with a flatter or scooped midrange on many designs, and it stays distorted even when you pick softly.",
            "The type of clipping diode shapes the character, in general tendencies rather than rules. Silicon diodes start to conduct at roughly 0.6 to 0.7 V and give a firm, defined clip. Germanium diodes conduct at a lower voltage, often around 0.2 to 0.4 V depending on the part, with a softer knee that tends to sound smoother, more compressed and a little quieter. LEDs conduct at a higher voltage, varying with the colour and part, so they clip later, leaving more headroom and output with a more open sound. The rest of the circuit matters just as much, so treat these as tendencies.",
          ],
        },
        {
          heading: "Fuzz",
          paragraphs: [
            "Fuzz pedals clip so hard that the waveform becomes close to a square wave. Many classic fuzz circuits use only two or three transistors and very high gain. The sound is thick, woolly or buzzy, with long sustain and a characteristic decay: as a note fades, it can break up into a sputtery, gated texture. Some fuzzes include a bias control, or respond to a lower supply voltage, which exaggerates that gated, sputtering decay on purpose.",
            "Many vintage-style fuzz circuits have a low input impedance, so they load down the guitar's pickup and interact with it directly. With the guitar's volume rolled back, they clean up in a way few other pedals do. That same interaction is why they can sound harsh, thin or oscillate when placed after a buffer or another buffered pedal, because they no longer see the pickup they were designed around. This is the main reason fuzz is often placed first in the chain.",
            "Germanium-transistor fuzzes can also be sensitive to temperature, and their sound can shift in a hot room or cold venue. Silicon-transistor fuzzes are usually more consistent and brighter. Either way, try a fuzz straight from the guitar before deciding you dislike it.",
          ],
        },
      ],
      keyPoints: [
        "All three clip the signal; they differ in how hard, how much gain, and how they shape frequencies.",
        "Overdrive clips softly, often with a mid hump, and stacks well into an amp on the edge of breakup.",
        "Silicon, germanium and LED clipping diodes tend towards firm, soft and open clipping respectively.",
        "Fuzz is near square-wave clipping that can sputter and gate as notes decay.",
        "Many vintage fuzz circuits interact with the pickup and misbehave after a buffer, so they often go first.",
      ],
      exercise: {
        title: "Compare the three kinds of drive",
        steps: [
          "In the pedal lab, set the amp block clean and turn on only the overdrive with drive low and level high.",
          "Play a chord hard, then softly, then roll back your picking strength further. Note how much the drive cleans up.",
          "Switch to the distortion at a similar output level and repeat. Note how much less it changes between soft and hard picking.",
          "Switch to the fuzz and let single notes decay fully. Listen for the sputter at the end of each note.",
          "Put the fuzz after the compressor, then move it to the front. Note any change in how it responds to your picking.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "You want a drive pedal that mostly pushes an amp already on the edge of breakup. Which settings suit that?",
          options: ["Drive high, level low", "Drive low, level high", "Drive and level both at minimum", "Drive high, tone at minimum"],
          answer: 1,
          why: "Low drive and high level let the pedal tighten and lift the signal while the amp's preamp does most of the clipping.",
        },
        {
          q: "Compared with silicon clipping diodes, LEDs used as clippers generally:",
          options: [
            "Clip earlier and sound more compressed",
            "Clip later, leaving more headroom and output",
            "Remove all clipping from the pedal",
            "Change the pedal from overdrive to fuzz",
          ],
          answer: 1,
          why: "LEDs have a higher forward voltage, so the signal can swing further before clipping, which tends to give more output and a more open sound.",
        },
        {
          q: "A vintage-style fuzz sounds harsh and thin after a buffered tuner but good straight from the guitar. The most likely reason is:",
          options: [
            "The tuner is adding distortion",
            "The fuzz was designed around the pickup's impedance and reacts badly to a buffer before it",
            "The fuzz needs more current than the tuner allows",
            "Buffers cut all the bass from every pedal after them",
          ],
          answer: 1,
          why: "Many vintage fuzz circuits have a low input impedance and depend on interacting with the pickup. A buffer replaces the pickup with a low-impedance source and changes that interaction.",
        },
      ],
    },
    {
      id: "modulation",
      module: "pedals",
      title: "Modulation",
      summary: "Chorus, flanger, phaser, vibrato, tremolo and rotary effects: what each one sweeps, how they differ, and how to set rate and depth.",
      minutes: 14,
      sections: [
        {
          heading: "One idea, many sounds",
          paragraphs: [
            "Every modulation pedal uses a low-frequency oscillator, or LFO, to sweep something back and forth. The rate control sets how fast it sweeps and the depth control sets how far. What the LFO sweeps, and whether the dry signal is mixed back in, decides which effect you hear.",
            "Many pedals also let you choose the shape of the sweep. A sine or triangle wave moves smoothly. A square wave jumps between two states. Some pedals offer a random shape. A useful habit is to set the depth first at a slow rate, so you can hear how far the sweep goes, then bring the rate up to where it suits the song.",
          ],
        },
        {
          heading: "Chorus and flanger",
          paragraphs: [
            "A chorus copies your signal, delays the copy by a short time, typically in the range of a few to a few tens of milliseconds depending on the design, and sweeps that delay time slowly. Sweeping the delay time bends the copy's pitch slightly up and down. Mixed with the dry signal, the small pitch and timing differences sound like two instruments playing together, giving width and shimmer.",
            "A flanger uses the same parts with a much shorter delay and, usually, feedback from the output back to the input. At very short delays, mixing the copy with the dry signal cancels some frequencies and reinforces others in a regular comb pattern. Sweeping the delay moves those notches up and down, creating the jet-plane whoosh. More feedback makes the sweep more resonant and metallic.",
          ],
        },
        {
          heading: "Phaser and rotary",
          paragraphs: [
            "A phaser runs the signal through a chain of all-pass filter stages. These leave the level of every frequency alone but shift their phase by different amounts. When the shifted signal is mixed with the dry one, a small number of notches appear in the spectrum, and the LFO sweeps them. The result is softer and more vocal than a flanger, because the notches are fewer and not spaced in a regular comb. Pedals with more stages produce more notches and a stronger effect.",
            "A rotary effect imitates a speaker spinning inside a cabinet. As the speaker turns towards you and away, you hear pitch shifts from the Doppler effect, level changes, and tone changes all at once, often with separate rotors for treble and bass. Most rotary pedals have a slow and a fast speed and ramp between them, and the gradual speed-up and slow-down is a large part of the sound.",
          ],
        },
        {
          heading: "Vibrato versus tremolo",
          paragraphs: [
            "These two names are often mixed up, including on some older amps. The distinction is simple. Tremolo sweeps volume: the sound pulses louder and quieter while the pitch stays put. Vibrato sweeps pitch: the note bends slightly sharp and flat, with no dry signal mixed in, so there is nothing to compare against except the note moving.",
            "A vibrato pedal is essentially a chorus with the dry signal removed. That is why a slow, shallow vibrato sounds like a wobbly tape and a fast, deep one sounds seasick. Tremolo ranges from a gentle, smooth pulse with a sine wave to a hard, choppy stutter with a square wave. Setting a tremolo's rate to a subdivision of the song tempo helps it lock in with the band.",
          ],
        },
      ],
      keyPoints: [
        "Modulation pedals sweep a parameter with a slow oscillator; rate sets speed and depth sets travel.",
        "Chorus mixes a slightly delayed, pitch-wobbling copy with the dry sound for width.",
        "A flanger uses a very short delay with feedback to sweep a comb of notches.",
        "A phaser sweeps a few notches made by all-pass stages, for a softer, vocal movement.",
        "Tremolo sweeps volume; vibrato sweeps pitch with no dry signal.",
      ],
      exercise: {
        title: "Set depth first, then rate",
        steps: [
          "In the pedal lab, turn on only the chorus after a clean amp block. Set the rate to minimum and the depth to maximum.",
          "Hold a chord and listen to how far the pitch wobble travels. Lower the depth until the wobble is just noticeable.",
          "Now raise the rate slowly until the movement sounds like width rather than wobble. Note where it starts to sound seasick.",
          "Repeat the same process with the phaser, then compare the two on the same chord.",
          "Turn on the tremolo, open the metronome on the practice page at a slow tempo, and set the tremolo rate so its pulse lines up with the clicks.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "A pedal makes held notes bend slightly sharp and flat in a steady cycle, with no dry signal. It is a:",
          options: ["Tremolo", "Vibrato", "Phaser", "Noise gate"],
          answer: 1,
          why: "Vibrato sweeps pitch with only the wet signal, so the note itself moves up and down.",
        },
        {
          q: "What mainly separates a flanger from a chorus?",
          options: [
            "A flanger uses a much shorter delay, usually with feedback",
            "A flanger sweeps volume instead of delay time",
            "A chorus uses all-pass filters instead of a delay",
            "A chorus only works on distorted sounds",
          ],
          answer: 0,
          why: "Both sweep a delayed copy, but the flanger's very short delay and feedback create a regular comb of notches and a jet-like sweep.",
        },
        {
          q: "Why does a phaser sound softer than a flanger?",
          options: [
            "It has no rate control",
            "It creates only a few notches that are not evenly spaced",
            "It removes all the treble from the signal",
            "It only works at low volume",
          ],
          answer: 1,
          why: "All-pass stages create a small number of irregularly spaced notches, while a flanger's delay creates many evenly spaced ones.",
        },
      ],
    },
    {
      id: "delay-and-reverb",
      module: "pedals",
      title: "Delay and reverb",
      summary: "Analog, tape and digital delay, tap tempo, the dotted-eighth rhythm, trails, and the spring, plate, room, hall and shimmer reverb types.",
      minutes: 16,
      sections: [
        {
          heading: "The three delay controls",
          paragraphs: [
            "Most delays have three core controls. Time sets the gap between the dry note and each repeat. Feedback, sometimes labelled repeats, sets how much of the output is fed back into the input, which decides how many repeats you hear before they fade. Mix, level or blend sets how loud the repeats are against the dry signal.",
            "Short times with one repeat give a slapback, a quick doubling that thickens a note. Medium times with a few repeats add space behind a lead. Long times with high feedback create ambient layers. At very high feedback, many delays run away into self-oscillation, where the repeats grow instead of fading, which some players use deliberately and others avoid.",
          ],
        },
        {
          heading: "Analog, tape and digital",
          paragraphs: [
            "Analog delays usually use bucket-brigade chips, which pass the signal along a chain of tiny capacitors. They tend to have a limited maximum delay time and repeats that grow darker and softer with each pass, because filtering is needed to keep the circuit's noise and artefacts down. The darkening helps repeats sit behind the dry note rather than competing with it.",
            "Tape delays record onto a moving loop of tape and play it back from a head further along. The sound is shaped by the tape: slight pitch wobble from wow and flutter, saturation on loud notes, and a gradual loss of highs over repeats. Many digital pedals imitate these traits. Digital delays store the signal as numbers, so they can offer long times, clean and exact repeats, and features like modulation, reverse and presets. How clean or coloured a given pedal sounds varies by design.",
          ],
        },
        {
          heading: "Tempo, dotted eighths and trails",
          paragraphs: [
            "Tap tempo lets you set the delay time by tapping a footswitch in time with the song, so the repeats land on the beat. Many pedals also let you pick a subdivision, so the delay repeats at a fraction of the tapped beat.",
            "The dotted-eighth delay is the best-known rhythmic setting. A dotted eighth is three quarters of a beat. At 120 beats per minute a beat lasts 500 ms, so a dotted-eighth delay is 375 ms. If you play steady eighth notes, the repeats fall between your notes and create a busy, cascading sixteenth-note rhythm from a simple part. Keep the feedback low, around one or two audible repeats, or the pattern turns to mush.",
            "Trails describe what happens when you switch the pedal off. With trails on, the repeats or reverb tail already playing continue to fade naturally. With trails off, they cut out as soon as you stomp. Trails sound smoother between sections, but they only work as intended when the pedal's bypass design supports them, which varies by product.",
          ],
        },
        {
          heading: "Reverb types",
          paragraphs: [
            "Spring reverb sends the signal through metal springs and picks it up at the other end. It has a bright, boingy, slightly metallic character that is strongest on picked notes, and it is the reverb built into many guitar amps. Plate reverb uses a large, thin metal sheet. It is dense and smooth with a quick build, and flatters notes without much sense of a room.",
            "Room and hall settings simulate spaces. A room reverb is short and close, adding air without a noticeable tail. A hall is longer, with a slower build and a longer, smoother decay. Shimmer reverb adds a pitch shift, often up an octave, into the reverb's feedback, so the tail rises into a bright, organ-like wash that suits slow, ambient parts. With every type, too much decay or mix blurs fast playing. Set reverb so you notice it when it goes away more than when it is on.",
          ],
        },
      ],
      keyPoints: [
        "Time sets the gap, feedback sets the number of repeats, and mix sets their level.",
        "Analog repeats tend to darken, tape adds wobble and saturation, and digital can be clean and long.",
        "A dotted eighth is three quarters of a beat: 375 ms at 120 beats per minute.",
        "Trails let repeats and tails fade out after you switch the pedal off, when the design supports it.",
        "Spring is bright and boingy, plate dense and smooth, room short, hall long, and shimmer pitch-shifted.",
      ],
      exercise: {
        title: "Build a dotted-eighth delay",
        steps: [
          "Pick a tempo, such as 100 beats per minute, and start the metronome on the practice page.",
          "Work out the dotted-eighth time: divide 60,000 by the tempo, then multiply by 0.75. At 100 beats per minute that is 450 ms.",
          "In the pedal lab, set the delay to that time with low feedback and the mix just below the dry level.",
          "Play steady eighth notes on one or two strings in time with the metronome and listen for the repeats filling the gaps.",
          "Add the reverb after the delay with a short decay, then raise the decay until fast notes begin to blur, and back it off.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "What is the dotted-eighth delay time at 120 beats per minute?",
          options: ["250 ms", "375 ms", "500 ms", "750 ms"],
          answer: 1,
          why: "A beat at 120 beats per minute lasts 500 ms. A dotted eighth is three quarters of that: 375 ms.",
        },
        {
          q: "Which control decides how many repeats you hear before a delay fades out?",
          options: ["Time", "Mix", "Feedback", "Tap tempo"],
          answer: 2,
          why: "Feedback sets how much of the output is sent back into the delay, so it controls how long the repeats keep going.",
        },
        {
          q: "Which reverb type adds a pitch-shifted, often octave-up, rising wash to the tail?",
          options: ["Spring", "Room", "Plate", "Shimmer"],
          answer: 3,
          why: "Shimmer places a pitch shifter in the reverb's feedback, so each pass through the reverb rises in pitch.",
        },
      ],
    },
    {
      id: "wah-eq-and-filters",
      module: "pedals",
      title: "Wah, EQ and filters",
      summary: "How a wah sweeps a resonant peak, what a cocked wah is, how envelope filters follow your picking, and when an EQ pedal is a boost.",
      minutes: 13,
      sections: [
        {
          heading: "How a wah works",
          paragraphs: [
            "A wah is a band-pass filter with a resonant peak. It lets a fairly narrow range of frequencies through, emphasises the frequencies at the centre of that range, and turns down the rest. The treadle moves the centre of the peak. Heel down puts it low, for a dark, throaty sound. Toe down moves it high, for a bright, cutting one. Rocking between them produces the vowel-like wah sound.",
            "The width and height of the peak shape the character. A narrow, tall peak sounds vocal and dramatic. A wider, gentler one sounds smoother. The range of the sweep, where it starts and stops, varies between designs, and some pedals let you adjust it. Wah is especially expressive before a drive, because the clipping exaggerates the moving peak.",
          ],
        },
        {
          heading: "The cocked wah",
          paragraphs: [
            "You do not have to move a wah to use it. Leave the treadle part way and it becomes a fixed filter: a single, nasal peak in the midrange with the lows and highs pulled back. This is called a cocked wah. Into a driven amp it gives a honking, focused lead tone that cuts through a mix.",
            "Finding the right position takes some care. Play a sustained note, rock the treadle slowly, and stop where the note sounds most vocal without getting shrill. That spot will differ between guitars, pickups and amps, so check it each time you change something.",
          ],
        },
        {
          heading: "Auto-wah and envelope filters",
          paragraphs: [
            "An envelope filter moves the filter for you. It follows the envelope of your signal, meaning how its level rises and falls, and opens the filter as you play harder. A firm pick attack sweeps the peak up and it falls back as the note decays. The result is a quacky, funky sound that responds to your dynamics rather than your foot.",
            "The sensitivity or threshold control sets how hard you have to play to open the filter fully. Set it too high and every note sweeps to the top. Set it too low and nothing moves. Some auto-wahs instead sweep the filter with an LFO at a fixed rate, which is closer to a modulation effect. Because an envelope filter reads your dynamics, it usually works best before a compressor or drive, which would even out the dynamics it needs to hear.",
          ],
        },
        {
          heading: "EQ pedals as a tool",
          paragraphs: [
            "A graphic EQ pedal has sliders for fixed frequency bands. A parametric EQ lets you choose the frequency, the amount and, sometimes, the width of each band. Either can shape your tone more precisely than a guitar's tone knob or an amp's three-band stack.",
            "An EQ pedal is also a clean boost with control over what it boosts. Raise the overall level and lift the midrange, and you have a solo boost that helps you cut through without simply getting louder in the bass. Placed before a drive, an EQ changes what gets clipped: cutting some bass tightens the distortion. Placed after a drive, it shapes the finished distorted sound, much like an amp's tone controls. Try both positions and listen for the difference.",
          ],
        },
      ],
      keyPoints: [
        "A wah is a resonant band-pass filter whose peak the treadle sweeps from low to high.",
        "A cocked wah leaves the treadle part way for a fixed, nasal midrange peak.",
        "An envelope filter opens with your picking strength; sensitivity sets how hard you have to play.",
        "An EQ pedal can shape tone or act as a boost with control over which frequencies rise.",
        "EQ before a drive changes what gets clipped; EQ after a drive shapes the finished sound.",
      ],
      exercise: {
        title: "Find your cocked-wah spot",
        steps: [
          "In the pedal lab, put the wah first and turn on the overdrive after it, with a lightly driven amp block.",
          "Play a sustained note and sweep the wah slowly from heel to toe. Note where the sound is darkest, most vocal and brightest.",
          "Stop at the most vocal spot and play a short lead phrase with the wah fixed there.",
          "Bypass the wah, turn on the EQ before the overdrive, and cut some bass. Listen for tighter low notes.",
          "Move the EQ after the overdrive with the same settings and compare how the change sounds.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "What kind of filter is a wah?",
          options: ["A low-cut filter", "A resonant band-pass filter", "A comb filter", "An all-pass filter"],
          answer: 1,
          why: "A wah passes and emphasises a band around a moving centre frequency, with a resonant peak, and turns the rest down.",
        },
        {
          q: "An envelope filter barely moves no matter how hard you pick. What should you adjust first?",
          options: ["The sensitivity", "The delay time", "The supply voltage", "The tremolo rate"],
          answer: 0,
          why: "Sensitivity sets how much signal it takes to open the filter. If it is set too low, even hard picking will not sweep the peak.",
        },
        {
          q: "Why can an EQ pedal work as a solo boost?",
          options: [
            "It adds heavy clipping when turned up",
            "It can raise the overall level while lifting the frequencies that help a guitar cut through",
            "It lengthens the sustain of every note",
            "It removes all noise from the signal",
          ],
          answer: 1,
          why: "An EQ with a level control is a clean boost that also lets you choose which part of the spectrum rises, often the midrange.",
        },
      ],
    },
  ],
};
