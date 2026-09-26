import type { ToneModule } from "../types.ts";

/**
 * Module 1: pickups. The source of the signal, how it is shaped by magnets,
 * coils, height, pots and switching before it ever reaches a pedal or an amp.
 */
export const PICKUPS: ToneModule = {
  id: "pickups",
  title: "Pickups",
  blurb: "Where your tone starts: how a pickup turns string movement into voltage, and how height, controls and switching shape it.",
  lessons: [
    {
      id: "how-pickups-work",
      module: "pickups",
      title: "How pickups work",
      summary: "A pickup is a magnet and a coil. Learn how a moving steel string makes a voltage, and why coil, cable and load shape the sound.",
      minutes: 12,
      sections: [
        {
          heading: "A magnet, a coil and a steel string",
          paragraphs: [
            "A magnetic pickup is a permanent magnet wrapped in a coil of very fine insulated copper wire. The magnet sets up a steady magnetic field around the pole pieces, and that field reaches up to the strings. A steel string sitting in that field becomes weakly magnetised itself.",
            "When you pluck the string, it moves back and forth through the field. That movement disturbs the magnetic flux passing through the coil. A changing magnetic flux through a coil induces a voltage across the ends of the wire. This is electromagnetic induction, the same principle a generator uses, just on a tiny scale.",
            "The voltage rises and falls with the motion of the string, so it carries the string’s pitch and its overtones. That small alternating voltage, typically well under a volt for a passive pickup, is your guitar signal. Everything after it, from pedals to the amp to the speaker, is a way of amplifying and shaping it.",
          ],
        },
        {
          heading: "Why the string has to be steel",
          paragraphs: [
            "The pickup only responds to strings that interact with a magnetic field. Plain steel strings and nickel-wound strings with a steel core do that well. Nylon strings do not, which is why a classical guitar needs a piezo or microphone system rather than a magnetic pickup.",
            "This also explains some everyday differences. String material changes how strongly the string is magnetised, so pure nickel wraps tend to sound a little softer and lower in output than nickel-plated steel. Acoustic strings with bronze wraps still have steel cores, but the wrap contributes little, so they sound thin and uneven over a magnetic pickup.",
            "String gauge matters too. A heavier string has more steel in the field and moves more air, so it generally produces more output and a fuller low end. That is one reason the same guitar can sound different after a string change even when nothing else has moved.",
          ],
        },
        {
          heading: "Turns, inductance and the resonant peak",
          paragraphs: [
            "A pickup coil has thousands of turns of wire. More turns mean more voltage for the same string movement, so the pickup is louder. More turns also raise the coil’s inductance, and inductance is what gives each pickup its tonal fingerprint.",
            "The coil’s inductance works together with capacitance, mostly from your guitar cable, to form a resonant circuit. The result is a resonant peak: a range where the pickup emphasises frequencies, followed by a roll-off above it. For many passive pickups this peak sits somewhere in the low kilohertz range, and its exact position varies by design and by what the pickup is plugged into.",
            "Higher inductance moves the peak lower, which is why hotter, more heavily wound pickups tend to sound thicker and darker. Lower inductance keeps the peak higher, which is part of why lower-output pickups often sound clearer and more articulate. DC resistance, the number often printed on spec sheets, is only a rough guide, because it also depends on the wire gauge.",
          ],
        },
        {
          heading: "The cable and the load are part of the pickup",
          paragraphs: [
            "Guitar cable adds capacitance, commonly somewhere around 50 to 150 pF per metre depending on how it is made. A longer or higher-capacitance cable pulls the resonant peak lower and softens the top end. With a passive guitar straight into an amp, a long cable is not neutral. It is a tone control you cannot turn off.",
            "The pots in the guitar and the input of whatever you plug into also load the pickup. A lighter load lets the resonant peak stay taller and sharper, so the sound is brighter and more present. A heavier load flattens the peak and the sound gets smoother and duller.",
            "This is why a buffer early in the chain, covered in the signal chain module, can change the sound of a passive guitar. Once the signal has been buffered, the cable after it has much less effect on the pickup’s response.",
          ],
        },
      ],
      keyPoints: [
        "A vibrating steel string changes the magnetic flux through the coil, and that induces the signal voltage.",
        "Nylon strings do not disturb the field, so magnetic pickups cannot hear them.",
        "More coil turns give more output and more inductance, which moves the resonant peak lower and darker.",
        "Cable capacitance and the load of the pots and amp input shape a passive pickup’s treble response.",
      ],
      exercise: {
        title: "Hear the cable as a tone control",
        steps: [
          "Plug your guitar into a clean amp setting with the shortest cable you have, and set the amp’s treble and bass to the middle.",
          "Play the same open chord and a few notes high on the neck with the bridge pickup. Listen closely to the top end and the pick attack.",
          "Swap to the longest cable you have, or chain two cables with a coupler, without touching any other setting.",
          "Play the same phrase again at the same volume. Note whether the top end sounds softer or the attack less defined.",
          "Use the EQ ear trainer to practise telling apart boosts and cuts in the 2 to 5 kHz region, then repeat the comparison and name what changed.",
        ],
        tool: "/tools/eq-ear-trainer",
      },
      quiz: [
        {
          q: "What creates the signal voltage in a magnetic pickup?",
          options: [
            "The string’s vibration changing the magnetic flux through the coil",
            "The string touching the pole pieces as it vibrates",
            "Pressure from the string on the saddle bending a crystal",
            "Sound waves from the guitar body hitting the coil",
          ],
          answer: 0,
          why: "A moving steel string disturbs the magnetic field, and a changing flux through a coil induces a voltage. Pressure on a crystal describes a piezo pickup, not a magnetic one.",
        },
        {
          q: "You fit a much longer, higher-capacitance cable between a passive guitar and the amp. What usually happens?",
          options: [
            "The output gets louder",
            "The resonant peak moves lower and the top end softens",
            "Hum from the single coils disappears",
            "The low end gets thinner while the treble stays the same",
          ],
          answer: 1,
          why: "Cable capacitance combines with the pickup’s inductance. More capacitance lowers the resonant peak, so the highs roll off earlier.",
        },
        {
          q: "Why can’t a standard magnetic pickup amplify nylon strings?",
          options: [
            "Nylon strings vibrate too slowly",
            "Nylon strings are tuned too low",
            "Nylon is not magnetic, so it does not disturb the pickup’s field",
            "Nylon strings produce too many overtones for the coil",
          ],
          answer: 2,
          why: "The pickup depends on a ferromagnetic string moving in its field. Nylon has no effect on the field, so nothing is induced in the coil.",
        },
      ],
    },
    {
      id: "single-coils-humbuckers-p90s",
      module: "pickups",
      title: "Single coils, humbuckers and P-90s",
      summary: "Why single coils hum, how a humbucker cancels the hum while keeping the signal, and where the P-90 sits between them.",
      minutes: 12,
      sections: [
        {
          heading: "The narrow single coil",
          paragraphs: [
            "A classic single coil is one tall, narrow coil wound around six magnetic pole pieces. It senses a short section of each string, which helps give it a clear, bright, detailed sound with a quick attack. Its inductance is usually modest, so its resonant peak sits relatively high.",
            "The catch is hum. A coil of wire is also an antenna for changing magnetic fields around it, and mains wiring, transformers, lighting dimmers and screens all radiate them. The result is a steady buzz at the mains frequency, 60 Hz in some countries and 50 Hz in others, plus its harmonics.",
            "Single-coil hum changes as you turn toward or away from the source, which is a quick way to tell it apart from a grounding fault. If the noise gets louder or quieter as you rotate on the spot, the pickup is picking up a field. If it stays constant and drops when you touch the strings, suspect a grounding issue instead.",
          ],
        },
        {
          heading: "How a humbucker cancels hum",
          paragraphs: [
            "A humbucker uses two coils side by side. The second coil is wound in the opposite direction and sits over magnets of the opposite polarity. Those two reversals are the whole trick.",
            "External hum reaches both coils in roughly the same way. Because the second coil is wound the other way, the hum it produces is inverted relative to the first, and when the coils are connected the two hum signals cancel. The string signal is different. Its polarity is reversed twice, once by the winding and once by the magnet, so the two string signals come out in phase and add together.",
            "Most humbuckers join their coils in series, which adds the two voltages and the two inductances. That gives more output and a lower resonant peak than a typical single coil, so humbuckers tend to sound thicker, warmer and stronger in the midrange. The wider sensing area along the string also smooths some of the sharpest overtones.",
          ],
        },
        {
          heading: "The P-90",
          paragraphs: [
            "A P-90 is a single coil, but it is built differently from the narrow type. Its coil is wide and flat, wound around adjustable screw poles, with bar magnets underneath. It usually has more turns and a wider field than a narrow single coil.",
            "The result is a sound many players describe as between the two families: more output and midrange grit than a narrow single coil, with more bite and openness than a typical humbucker. P-90s are known for driving an amp into a raw, textured breakup.",
            "Because it is still one coil, a P-90 hums like any single coil, and sometimes more noticeably because of its output. Moving away from screens and lighting and using well-shielded cables helps. There is no free lunch: the openness and the hum come from the same design.",
          ],
        },
        {
          heading: "Choosing between them",
          paragraphs: [
            "There is no best type, only a better fit for a sound. Clean, glassy tones with sharp pick attack are easy with narrow single coils. Thick, sustaining drive with less noise is easy with humbuckers. P-90s suit players who want grit and midrange without losing the sense of the string.",
            "Output alone does not decide it. A low-output humbucker can sound clearer than a hot single coil, and the amp and pedals you use matter as much as the pickup. Before swapping pickups, try adjusting height and your amp’s gain and mids, which are covered later in this course.",
            "Mixed layouts are common for the same reason. A guitar with a humbucker at the bridge and single coils elsewhere gives a thick, quiet drive sound and clear cleans from one instrument. Listen to each position on its own terms rather than expecting one type to do everything.",
          ],
        },
      ],
      keyPoints: [
        "Single coils sound bright and clear but pick up mains hum at 50 or 60 Hz and its harmonics.",
        "A humbucker’s reverse-wound, reverse-polarity second coil cancels hum while the string signal adds.",
        "Series humbuckers have more output and a lower resonant peak, so they tend to sound thicker.",
        "A P-90 is a wide single coil with more midrange and output than a narrow single coil, and it still hums.",
      ],
      exercise: {
        title: "Find the hum and the cancellation",
        steps: [
          "Plug in to a clean amp at a moderate volume and select a single-coil or P-90 position, or split a humbucker if your guitar allows it.",
          "Mute the strings with your fretting hand and slowly turn on the spot through a full circle. Note the direction where the hum is loudest and where it is quietest.",
          "Face the loudest direction and switch to a humbucker, or on a three-single-coil guitar to a two-pickup position that is hum-cancelling on many instruments.",
          "Compare the hum level, then play the same chord in each position and describe the difference in thickness and top end in one sentence each.",
        ],
      },
      quiz: [
        {
          q: "In a humbucker, why does the string signal add while the hum cancels?",
          options: [
            "The second coil has a filter that removes 50 and 60 Hz",
            "The second coil is reverse wound and has reversed magnetic polarity, so only the string signal comes out in phase",
            "The second coil is shielded from outside fields",
            "The two coils are tuned to different resonant peaks",
          ],
          answer: 1,
          why: "Reversing the winding inverts both hum and signal. Reversing the magnet inverts only the string signal back again, so the string signals add and the hum signals cancel.",
        },
        {
          q: "A single-coil guitar’s buzz changes as you turn around in the room. What is the most likely cause?",
          options: [
            "A broken ground wire in the guitar",
            "Dead strings",
            "An outside magnetic field such as mains wiring, a transformer or a screen",
            "The tone pot being set to 10",
          ],
          answer: 2,
          why: "Hum that depends on the guitar’s orientation comes from the coil picking up a field. A grounding fault usually stays constant regardless of direction.",
        },
        {
          q: "Which description best fits a P-90?",
          options: [
            "A single coil with a wide, flat coil and more midrange and output than a narrow single coil",
            "Two narrow coils in series that cancel hum",
            "An active pickup powered by a battery",
            "A piezo element under the saddle",
          ],
          answer: 0,
          why: "A P-90 is a single coil built wide and flat, with bar magnets under the coil. It has more output and midrange than a narrow single coil but does not cancel hum.",
        },
      ],
    },
    {
      id: "pickup-height-and-magnets",
      module: "pickups",
      title: "Pickup height and magnets",
      summary: "Set pickup height by ear and ruler, avoid magnetic pull and wolf tones, and understand what magnet types can and cannot do.",
      minutes: 15,
      sections: [
        {
          heading: "Why height matters so much",
          paragraphs: [
            "The magnetic field gets weaker quickly as you move away from the pole pieces. So a small change in pickup height makes a real difference in output and character. Raising a pickup gives more output, a stronger attack and more drive into the amp. Lowering it gives a softer, rounder, more open sound with more headroom.",
            "Height is also how you balance a guitar. If the bridge pickup is much louder than the neck, every switch change becomes a volume jump. Most players set the pickups so that switching feels even in volume, then fine-tune for tone.",
            "It is the cheapest tone change you can make. Before buying new pickups, spend twenty minutes with a screwdriver and a ruler. Many guitars leave the factory with heights that are a reasonable average rather than right for your strings and playing.",
          ],
        },
        {
          heading: "Too close causes real problems",
          paragraphs: [
            "Pickup magnets pull on the strings. When a pickup is set too close, that pull is strong enough to interfere with the string’s natural vibration. Sustain drops, notes can sound choked, and the pitch can wobble or beat as the note decays.",
            "The problem is usually worst on the wound bass strings high up the neck, where the string is closest to the pickup over its vibrating length. You may hear false harmonics, sour warbling overtones, or a pitch that does not settle. Players call the result a wolf tone. It can also throw off intonation, because the magnet is effectively damping part of the string.",
            "Strong magnets and narrow single coils with magnetic pole pieces are the most prone to this. Humbuckers with steel pole pieces generally pull less, but the same rule applies: if notes high on the neck sound unstable, lower the pickup before blaming the strings or the setup.",
          ],
        },
        {
          heading: "How to measure",
          paragraphs: [
            "Measure with the guitar in tune and in playing position. Fret each outer string at the last fret, then measure from the bottom of the string to the top of the pole piece. Fretting at the last fret gives the closest point the string will ever reach, which is what matters for magnetic pull.",
            "There is no universal number, and makers publish different starting points. As a rough range, many suggest somewhere between about 1.5 mm and 3 mm, with the bass side set lower, meaning further away, than the treble side because the heavier strings move more and pull harder. Narrow single coils with strong magnets often start further away than humbuckers. Check your pickup maker’s guidance if it exists.",
            "After you have a starting point, make changes of a quarter or half a turn of the height screw at a time. Listen for output balance first, then clarity, then any warble on the wound strings high up the neck. The pole pieces on many pickups can be adjusted individually to balance string-to-string volume.",
          ],
        },
        {
          heading: "Magnet types, without the mythology",
          paragraphs: [
            "Most pickup magnets are either an alnico alloy or ceramic. Alnico grades such as II, III and V differ in strength and in how they respond. As general tendencies, alnico V is relatively strong and gives a clear, punchy sound, while alnico II and III are weaker and often described as softer and smoother. Ceramic magnets are strong and inexpensive and are common in higher-output designs, often associated with a tighter, brighter or more aggressive character.",
            "Treat those descriptions as tendencies, not rules. The number of turns, the wire, the coil shape, the pole pieces, the pickup height and the rest of the circuit all shape the sound at least as much as the magnet. The same magnet grade can sound very different in two different pickups.",
            "Magnet strength also affects string pull. A stronger magnet may need to sit further from the strings to avoid the problems described above, which changes its effective output. Choose by listening to a pickup at a sensible height, not by the magnet grade printed on the box.",
          ],
        },
      ],
      keyPoints: [
        "Closer pickups are louder with more attack; further away is rounder, softer and more open.",
        "Too close causes magnetic pull, lost sustain, false harmonics and wolf tones on the wound strings.",
        "Measure from the bottom of the string to the pole piece with the string fretted at the last fret.",
        "Starting heights vary by maker; set the bass side lower than the treble side and adjust in small steps.",
        "Magnet grades have general tendencies, but the coil, the height and the circuit matter as much.",
      ],
      exercise: {
        title: "Set and check your pickup heights",
        steps: [
          "Tune up, then fret the low E at the last fret and measure from the bottom of the string to the top of the nearest pole piece. Repeat for the high E. Write both numbers down for each pickup.",
          "Lower the bass side of the bridge pickup by half a turn of its screw. Play the wound strings at the 12th fret and above and listen for warble or a pitch that will not settle.",
          "Use the intonation checker to compare the open string with the 12th-fret note on the low E and A. If the fretted note drifts or beats, lower that side further.",
          "Adjust the neck and middle pickups so that switching between positions keeps a similar volume on a clean amp.",
          "Play one clean and one driven passage and keep the heights that sound balanced. Record your final measurements for next time.",
        ],
        tool: "/tools/intonation-checker",
      },
      quiz: [
        {
          q: "Where should you measure pickup height from?",
          options: [
            "From the top of the pickguard to the string, open",
            "From the bottom of the string, fretted at the last fret, to the top of the pole piece",
            "From the top of the string, fretted at the 12th fret, to the pickup cover",
            "From the body to the bottom of the pickup",
          ],
          answer: 1,
          why: "Fretting at the last fret gives the string’s closest approach to the pickup, which is where magnetic pull is strongest. Measuring to the pole piece reflects the part that actually creates the field.",
        },
        {
          q: "Notes on the wound strings high up the neck warble and lose sustain. What is the first thing to try?",
          options: [
            "Raise the pickup to get more output",
            "Fit heavier strings",
            "Lower the bass side of the pickup to reduce magnetic pull",
            "Turn the tone control down",
          ],
          answer: 2,
          why: "Warble and short sustain on wound strings are classic signs of magnetic pull from a pickup set too close. Lowering it is the direct fix.",
        },
        {
          q: "Which statement about magnet types is most accurate?",
          options: [
            "Ceramic magnets always sound harsh",
            "Alnico II always makes a pickup vintage-sounding",
            "Magnet grade is the single biggest factor in pickup tone",
            "Magnet grades have general tendencies, but coil design and height matter as much",
          ],
          answer: 3,
          why: "Alnico and ceramic grades have tendencies in strength and character, but windings, pole pieces, height and the circuit shape the sound just as much.",
        },
      ],
    },
    {
      id: "volume-and-tone-controls",
      module: "pickups",
      title: "Volume and tone controls",
      summary: "What pot values and tone caps actually do, why rolling back volume cleans up a driven amp, and how a treble bleed helps.",
      minutes: 14,
      sections: [
        {
          heading: "Pots are part of the tone",
          paragraphs: [
            "The volume and tone pots in a passive guitar are variable resistors, and even when they are turned fully up they sit across the pickup as a load. A higher-value pot loads the pickup less, so more treble and a taller resonant peak get through. A lower-value pot loads it more and softens the top end.",
            "That is why 250k pots are typical with single coils and 500k pots are typical with humbuckers. Single coils are already bright, and the heavier load of 250k takes a little edge off. Humbuckers are darker because of their higher inductance, and the lighter load of 500k keeps more of their clarity. These are conventions, not laws, and some players choose the other value on purpose.",
            "Pots also have a taper. An audio or logarithmic taper changes resistance unevenly so that the volume sounds like it changes smoothly. A linear taper changes resistance evenly, which often feels like nothing happens until the last part of the turn when used for volume. Either can be used for tone, and the choice changes how the sweep feels rather than the end points.",
          ],
        },
        {
          heading: "How the tone control works",
          paragraphs: [
            "A typical passive tone control is a capacitor in series with a pot, connected between the signal and ground. A capacitor passes high frequencies more easily than low ones. As you turn the tone knob down, the pot’s resistance drops, and more of the highs are shunted to ground through the capacitor. Together with the pickup, the capacitor forms a low-pass filter.",
            "Common values are 0.022 µF and 0.047 µF. Those are common, not rules. A larger capacitor starts cutting from a lower frequency and makes the fully rolled-off sound darker and thicker. A smaller one gives a slightly brighter rolled-off sound.",
            "Near the bottom of its travel the tone control does something beyond cutting highs. The capacitor and the pickup’s inductance form a new, lower resonance, which gives a vocal, slightly nasal, woolly sound with a bump in the midrange. With drive, this is a useful lead sound, not just a darker version of the normal one.",
          ],
        },
        {
          heading: "Rolling back the volume",
          paragraphs: [
            "Turning the guitar’s volume down sends less signal into the amp. If the amp or a drive pedal is set for a crunchy sound at full guitar volume, rolling back to around 6 or 7 often gives a cleaner, more open sound without touching the amp. Turning back up brings the drive back. This is one of the most useful habits you can build, because it gives you several sounds from one amp setting.",
            "On many passive guitars the volume control also dulls the tone as you roll it back. As the pot turns down, its resistance ends up in series with the signal, and together with the cable capacitance that forms a low-pass filter. The more you turn down, the more treble you lose.",
            "A treble bleed fixes much of this. It is a small capacitor, sometimes with a resistor, wired across the volume pot so that high frequencies bypass the pot as it turns down. Values vary with the pickup and taste. Too much treble bleed can make the lower settings sound thin or bright, so it is worth trying before and after rather than assuming it is always better.",
          ],
        },
        {
          heading: "Cable length and the whole circuit",
          paragraphs: [
            "Everything in this lesson interacts with the cable. Guitar cable commonly adds roughly 50 to 150 pF per metre, which is about 15 to 45 pF per foot. That capacitance sits in parallel with the pickup and works with the volume pot and tone circuit. A long cable makes a rolled-back volume sound even darker.",
            "If you use a long cable, or roll back the volume a lot, a buffer near the guitar or a treble bleed can keep things clearer. Neither is required. Some players like the softer sound. The point is to know what is causing it, so you can choose.",
          ],
        },
      ],
      keyPoints: [
        "250k pots are typical with single coils and 500k with humbuckers because the pot is a load that trims treble.",
        "The tone cap and pickup form a low-pass filter; 0.022 µF and 0.047 µF are common values, not rules.",
        "Rolling back guitar volume reduces signal into a driven amp, which cleans up the sound.",
        "A treble bleed lets highs bypass the volume pot so rolled-back settings stay clearer.",
      ],
      exercise: {
        title: "Map your volume and tone knobs",
        steps: [
          "Set your amp, or amp plus a drive pedal, to a crunchy sound with the guitar volume on 10.",
          "Play the same chord at guitar volume 10, 8, 6 and 4. Note where the sound becomes clean and whether the top end drops.",
          "Return to 10 and play a single-note line at tone 10, 7, 4 and 0 on the neck pickup. Note where the tone knob starts to do something audible.",
          "At tone 0 with drive on, play a lead phrase and listen for the midrange bump near the bottom of the sweep.",
          "Write down two settings you will actually use, for example volume 7 for rhythm and volume 10 with tone 3 for lead.",
        ],
      },
      quiz: [
        {
          q: "Why are 500k pots typically used with humbuckers?",
          options: [
            "They make the guitar louder by adding gain",
            "They load the pickup less, preserving treble that a darker humbucker needs",
            "They cancel the hum more effectively",
            "They protect the pickup from high voltage",
          ],
          answer: 1,
          why: "A pot is a load across the pickup. A higher value loads it less, so a naturally darker humbucker keeps more top end. Passive pots cannot add gain.",
        },
        {
          q: "What does a treble bleed do?",
          options: [
            "Lets high frequencies bypass the volume pot so the tone stays clearer when rolled back",
            "Adds a treble boost at full volume",
            "Reduces hum on single-coil pickups",
            "Lowers the resonant peak of the pickup",
          ],
          answer: 0,
          why: "A treble bleed is a small capacitor, sometimes with a resistor, across the volume pot. It offsets the treble loss that happens as the pot turns down.",
        },
        {
          q: "Your amp breaks up at guitar volume 10. What happens if you roll the guitar volume back to about 6?",
          options: [
            "The distortion gets heavier",
            "Nothing, because the amp’s gain knob decides the distortion",
            "The amp receives less signal and cleans up",
            "The amp switches to its clean channel",
          ],
          answer: 2,
          why: "The amount of distortion depends on how hard the input is driven. A lower guitar volume means less signal into the gain stages, so there is less clipping.",
        },
      ],
    },
    {
      id: "active-pickups-and-switching",
      module: "pickups",
      title: "Active pickups and switching",
      summary: "How active pickups work, why you unplug to save the battery, and what splits, taps, series, parallel and 5-way positions do.",
      minutes: 15,
      sections: [
        {
          heading: "What makes a pickup active",
          paragraphs: [
            "An active pickup has a small preamp built in, usually powered by a battery in the guitar. The coils themselves are typically low impedance, with fewer turns of wire than a passive pickup, so they produce less raw signal and less noise. The preamp then brings the signal up to a usable level.",
            "The preamp has a low output impedance, so the signal is not dulled by long cables or by the load of pots and pedal inputs the way a passive pickup is. The tone stays consistent from a short cable to a long one. Active pickups are also typically very quiet, which is one reason they are popular for high-gain playing.",
            "The trade-off is a different feel. Because the preamp controls the output, active pickups are often described as more even and compressed, with less of the response to cable and load that shapes passive pickups. Some players find that controlled, and some find it less dynamic. Neither is wrong.",
          ],
        },
        {
          heading: "Batteries and the stereo jack",
          paragraphs: [
            "Most active guitars use a stereo output jack even though the signal is mono. Plugging in a normal mono cable connects the jack’s ring to its sleeve, and that connection completes the battery circuit. Unplugging disconnects it.",
            "So the practical rule is simple: unplug the cable when you are not playing. Leaving a guitar plugged in overnight keeps the preamp running and drains the battery. It is not a fault, it is how the switching is designed.",
            "A dying battery usually shows up as a weaker, fuzzy or sputtering sound, especially on hard pick attacks. If an active guitar suddenly sounds broken, change the battery before anything else. Keeping a spare in your case is a small habit that saves a gig.",
          ],
        },
        {
          heading: "Splits, taps, series and parallel",
          paragraphs: [
            "A coil split turns a humbucker into a single coil by shorting one of its two coils to ground. You get a brighter, thinner sound, and you lose the hum cancelling. A coil tap is different. It uses an extra wire brought out partway through a single coil’s winding, so switching to it uses fewer turns of that same coil. The result is lower output and a brighter sound. The two terms are often mixed up, but they are not the same thing.",
            "Humbucker coils are usually wired in series, which adds their voltages and inductances for a thick, strong sound. Wiring the same two coils in parallel keeps the hum cancelling but lowers the output and the inductance. The resonant peak moves up, so the sound is brighter and more open, somewhere between a series humbucker and a single coil.",
            "Two pickups can also be wired out of phase, so one pickup’s signal is inverted relative to the other. Frequencies that both pickups share, especially the low end, cancel. What remains is thin, hollow and nasal. It is a distinctive sound, often used for cutting, quirky parts, but it is much quieter and thinner than any other position.",
          ],
        },
        {
          heading: "The 5-way switch on three single coils",
          paragraphs: [
            "On a typical guitar with three single coils and a 5-way switch, the positions are the bridge pickup alone, bridge and middle together, the middle alone, middle and neck together, and the neck alone. Makers disagree about whether position 1 is the bridge or the neck, so go by what you hear rather than a number.",
            "The two in-between positions combine two pickups in parallel. Because each pickup senses the string at a different point, some frequencies partly cancel and others reinforce. That gives the scooped, glassy sound these positions are known for. This happens with the pickups in phase; it is not the same as the out-of-phase wiring above, which is much thinner.",
            "On many guitars of this type, the middle pickup is reverse wound with reverse magnetic polarity. That makes the two in-between positions hum-cancelling while the single-pickup positions still hum. If your in-between positions are noticeably quieter in terms of hum, that is why.",
          ],
        },
      ],
      keyPoints: [
        "Active pickups use low-impedance coils plus an onboard preamp powered by a battery, giving a quiet, consistent signal.",
        "On the usual stereo-jack design, unplugging the cable disconnects the battery, so unplug when you stop playing.",
        "A coil split shorts one coil of a humbucker; a coil tap uses fewer turns of one coil. They are different.",
        "Parallel wiring is brighter and quieter than series; out-of-phase wiring cancels lows and sounds thin and hollow.",
        "The in-between positions on a three-single-coil guitar combine two pickups and are hum-cancelling on many instruments.",
      ],
      exercise: {
        title: "Tour every switch position",
        steps: [
          "Plug into a clean amp setting and play the same four-bar phrase in every pickup position your guitar has.",
          "For each position, write one line on output level, low end, top end and hum with the strings muted.",
          "If you have a split, parallel or out-of-phase option, compare it with the standard setting of the same pickup and note which gets thinner and which stays hum-free.",
          "Add a light drive and repeat the tour, then pick one rhythm position and one lead position you would use in a song.",
          "If your guitar is active, finish by unplugging the cable so the battery is disconnected.",
        ],
      },
      quiz: [
        {
          q: "What is the difference between a coil split and a coil tap?",
          options: [
            "There is no difference; the terms mean the same thing",
            "A split shorts one coil of a humbucker; a tap uses fewer turns of one coil",
            "A split adds a coil; a tap removes a pickup from the circuit",
            "A split reverses phase; a tap reverses magnetic polarity",
          ],
          answer: 1,
          why: "Splitting silences one of a humbucker’s two coils. Tapping uses a wire brought out partway through a winding, so a single coil runs with fewer turns.",
        },
        {
          q: "Why does leaving an active guitar plugged in drain its battery?",
          options: [
            "The pickups’ magnets draw current",
            "The amp sends power back up the cable",
            "The mono plug connects the stereo jack’s ring to sleeve, completing the battery circuit",
            "The tone control leaks current when set to 10",
          ],
          answer: 2,
          why: "On the typical design the stereo jack acts as the power switch. A mono plug bridges ring and sleeve, which connects the battery to the preamp.",
        },
        {
          q: "Two pickups are wired out of phase. What will you hear?",
          options: [
            "A louder, thicker sound than either pickup alone",
            "No sound at all",
            "The same sound as the neck pickup alone",
            "A thin, hollow, nasal sound because shared frequencies cancel",
          ],
          answer: 3,
          why: "Inverting one pickup cancels the content both pickups share, mostly the low end. The two pickups sense the string differently, so some treble and midrange survive, giving a thin, hollow tone.",
        },
      ],
    },
  ],
};
