import type { ToneModule } from "../types.ts";

export const SIGNAL_CHAIN: ToneModule = {
  id: "signal-chain",
  title: "Signal chain",
  blurb: "How to order pedals, keep treble through long cable runs, use an amp's effects loop, and hold levels steady from patch to patch.",
  lessons: [
    {
      id: "pedal-order",
      module: "signal-chain",
      title: "Pedal order",
      summary: "The conventional pedal order, the reasoning behind each step, and the deliberate exceptions that players use on purpose.",
      minutes: 14,
      sections: [
        {
          heading: "The conventional order",
          paragraphs: [
            "Most boards follow a similar order from the guitar to the amp: tuner, then filters such as wah, then compressor, then gain pedals, then modulation, then delay, then reverb. It is not a law, but it is the order in which each pedal gets the kind of signal it handles best, and it is the right place to start before you experiment.",
            "The logic follows the pedal families. Pedals that react to your playing, such as wah, compressor and drive, want to hear the guitar as directly as possible. Pedals that decorate a finished sound, such as modulation and time effects, want to receive the sound after it has been shaped and distorted, so their movement and repeats stay clean and clear.",
          ],
        },
        {
          heading: "Why each step sits where it does",
          paragraphs: [
            "The tuner goes first so it reads the plain guitar signal, and so that a tuner with a mute switch can silence everything after it while you tune. A wah or filter goes early because its moving peak is strongest when the clipping after it exaggerates the sweep. A compressor goes before the drive so it evens out the dynamics the drive receives, which makes the distortion more consistent.",
            "Gain pedals come next. If you use more than one, the usual approach is to put the lower-gain pedal first, then the higher-gain one, but both orders are worth trying because each sounds different. Modulation follows the gain, so the drive does not break up the chorus or phaser sweep into a harsh mess. Delay comes after modulation, and reverb comes last, because a reverb tail is the final layer of space, and distorting or modulating it tends to sound cluttered.",
          ],
        },
        {
          heading: "Deliberate exceptions",
          paragraphs: [
            "Wah after drive is a common alternative. Placed after the distortion, the wah filters an already distorted signal, which sounds more like an EQ sweep: smoother, more dramatic in the treble, and less interactive with your picking. Before the drive, the wah is more vocal and aggressive. Neither is wrong.",
            "A compressor after drive works differently from one before it. After the drive, it evens out the finished sound and can control level jumps when switching between clean and dirty, but it does not change how hard the drive is pushed. Many vintage-style fuzzes go first of all, even before the tuner or wah, because they need to see the guitar's pickup directly and can react badly to a buffer. That is covered in the next lesson.",
            "Some players put a delay before the drive for a smeared, older sound, or a tremolo last so it chops the reverb tail as well. Once you know why the conventional order works, each exception is a choice you can make on purpose and hear clearly.",
          ],
        },
        {
          heading: "How to test an order",
          paragraphs: [
            "Change one thing at a time. Swap two neighbouring pedals, play the same phrase at the same volume, and compare. If you move several pedals at once, you will not know which move changed the sound. Keep volumes matched too, because louder almost always sounds better at first listen and will skew your judgement.",
            "Test at the volume you play at and, if you can, with the band or a backing track. An order that sounds best alone in a quiet room can lose clarity in a mix, and the reverse is true too. When you find an order you like, write it down with the settings, so you can get back to it after trying something new.",
          ],
        },
      ],
      keyPoints: [
        "The conventional order is tuner, filter or wah, compressor, gain, modulation, delay, reverb.",
        "Pedals that react to your playing go early; pedals that decorate the finished sound go late.",
        "Wah after drive sounds smoother and less interactive than wah before it.",
        "Many vintage-style fuzzes go first so they can see the guitar's pickup directly.",
        "Change one pedal position at a time and match volumes before you compare.",
      ],
      exercise: {
        title: "Hear what order changes",
        steps: [
          "In the pedal lab, turn on the wah, compressor, overdrive, chorus, delay and reverb, and press the button to order them conventionally.",
          "Play a short phrase and keep it as your reference for the rest of the exercise.",
          "Move the reverb before the overdrive and play the same phrase. Listen for the tail being distorted, then move it back.",
          "Move the wah after the overdrive and compare the sweep with the wah before it.",
          "Move the chorus before the overdrive and listen to what happens to the sweep, then order everything conventionally again.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "Why does reverb usually go at the end of the chain?",
          options: [
            "It draws the most current",
            "Its tail is the final layer of space, and distorting or modulating it tends to sound cluttered",
            "It only works with a high-impedance input",
            "It must follow the tuner directly",
          ],
          answer: 1,
          why: "Placed last, reverb adds space around the finished sound rather than feeding a wash of reflections into drive or modulation.",
        },
        {
          q: "What does placing a compressor before an overdrive achieve that placing it after does not?",
          options: [
            "It evens out the dynamics the overdrive receives, making the distortion more consistent",
            "It removes all noise from the overdrive",
            "It prevents the overdrive from clipping",
            "It turns the overdrive into a fuzz",
          ],
          answer: 0,
          why: "Before the drive, the compressor changes what the drive is fed. After it, the compressor only evens out the finished sound.",
        },
        {
          q: "Which statement about wah placement is accurate?",
          options: [
            "Wah only works before a tuner",
            "Wah after drive is always wrong",
            "Wah before drive tends to sound more vocal and interactive; after drive, smoother and more like an EQ sweep",
            "Wah placement makes no audible difference",
          ],
          answer: 2,
          why: "Both positions are used. The clipping after a wah exaggerates its sweep, while a wah after the drive filters an already distorted sound.",
        },
      ],
    },
    {
      id: "buffers-and-true-bypass",
      module: "signal-chain",
      title: "Buffers and true bypass",
      summary: "Why long cable runs cost treble, what a buffer does about it, where one buffer belongs, and why adding more is not the fix.",
      minutes: 13,
      sections: [
        {
          heading: "Cable capacitance and lost treble",
          paragraphs: [
            "A passive guitar pickup has a high output impedance. Every cable has some capacitance between its centre conductor and its shield, and the longer the cable, the more capacitance it adds. Together, the pickup and the cable capacitance form a low-pass filter: the more capacitance, the lower the frequency where treble begins to roll off and the lower the pickup's resonant peak moves. The amount per metre varies between cables, so there is no single number to rely on.",
            "The cable that counts is the total run the pickup has to drive: the lead from the guitar, every patch cable between true-bypass pedals, the wiring inside those pedals, and the lead to the amp. On a large board with a long lead at each end, that total can be many metres. The result is a duller, less detailed sound, with less sparkle and pick attack than the same guitar plugged straight into the amp with a short cable.",
          ],
        },
        {
          heading: "True bypass versus buffered bypass",
          paragraphs: [
            "A true-bypass pedal, when switched off, connects its input directly to its output with a switch. Nothing electronic is in the path, so it adds no colour of its own, but it also does nothing to help the pickup drive the cable. Every true-bypass pedal in a row adds its cables to the total load the pickup sees.",
            "A buffered-bypass pedal keeps a small amplifier stage, the buffer, in the path even when it is off. A buffer has a high input impedance, so it barely loads the pickup, and a low output impedance, so it can drive a long cable run with far less treble loss. A good buffer has close to unity gain, adding little or no volume and, ideally, little colour.",
          ],
        },
        {
          heading: "Where to put one buffer",
          paragraphs: [
            "Usually one good buffer early in the chain is enough. It isolates the pickup from everything after it, so the cable and pedals beyond it no longer load the pickup. The common place is at or near the start of the board. If you use a vintage-style fuzz that needs to see the pickup directly, put the fuzz before the buffer and the buffer straight after the fuzz.",
            "On a very large rig, some players add a second buffer at the end of the board to drive a long cable to the amp. Beyond that, a buffer does not fix much. Many tuners and some other pedals are buffered already, so check what you have before you buy one.",
          ],
        },
        {
          heading: "Why more buffers are not the answer",
          paragraphs: [
            "Once one buffer is driving the chain, another one adds little. Each extra buffer is another active stage that can add a small amount of noise, colour or headroom limits, and a poorly designed buffer can sound harsh or thin. A board full of buffered pedals can also make it hard to tell where a tone problem comes from.",
            "Too little buffering has a cost too. Too much treble loss makes a guitar sound muffled and makes you reach for more treble on the amp, which brings up hiss. The goal is balance: enough buffering to keep the pickup's detail, placed deliberately, and no more. A simple test is to compare the guitar through a short cable straight to the amp with the guitar through the whole board with every pedal off. If the board sounds noticeably darker, you have a cable-loading problem that a buffer can help.",
          ],
        },
      ],
      keyPoints: [
        "Cable capacitance and a passive pickup form a low-pass filter; more total cable means less treble.",
        "True-bypass pedals add their cables to the load the pickup has to drive.",
        "A buffer has a high input impedance and a low output impedance, so it drives long runs cleanly.",
        "One good buffer early in the chain is usually enough; place a vintage fuzz before it.",
        "Stacking extra buffers adds stages that can add noise and colour without fixing more.",
      ],
      exercise: {
        title: "Test your board for treble loss",
        steps: [
          "Plug your guitar straight into your amp with your shortest cable. Set the amp clean and play a bright chord and some picked single notes.",
          "Now connect the guitar through your whole board with every pedal switched off, using your usual cables.",
          "Play the same chord and notes at the same volume and compare the brightness and pick attack.",
          "If the board sounds darker, note which pedals are true bypass and which are buffered, and add up your total cable length.",
          "If you have a buffered pedal, try moving it to the start of the chain, after any vintage-style fuzz, and repeat the comparison.",
        ],
      },
      quiz: [
        {
          q: "Why does a long total cable run make a passive guitar sound duller?",
          options: [
            "Cables add distortion",
            "Cable capacitance and the pickup's impedance form a low-pass filter that rolls off treble",
            "Long cables raise the supply voltage",
            "Longer cables make the pickup magnets weaker",
          ],
          answer: 1,
          why: "More capacitance lowers the frequency where treble starts to roll off, so detail and sparkle are lost.",
        },
        {
          q: "What makes a buffer good at driving long cables?",
          options: [
            "A low input impedance and a high output impedance",
            "A high input impedance and a low output impedance",
            "A high gain setting",
            "A true-bypass switch",
          ],
          answer: 1,
          why: "The high input impedance barely loads the pickup, and the low output impedance can drive cable capacitance without much treble loss.",
        },
        {
          q: "You use a vintage-style fuzz and want one buffer on the board. Where should it go?",
          options: [
            "Before the fuzz, as the first thing on the board",
            "Straight after the fuzz",
            "After the reverb only",
            "Inside the guitar's volume control",
          ],
          answer: 1,
          why: "The fuzz needs to see the pickup directly, so it goes first, with the buffer right after it to drive the rest of the chain.",
        },
      ],
    },
    {
      id: "effects-loops",
      module: "signal-chain",
      title: "Effects loops",
      summary: "What an amp's send and return do, series versus parallel loops, which pedals belong there, and how the four-cable method works.",
      minutes: 14,
      sections: [
        {
          heading: "Send and return",
          paragraphs: [
            "Many amps have an effects loop: a send jack and a return jack placed between the preamp and the power amp. The send carries the preamp's output out of the amp. You run it through some pedals and back into the return, which feeds the power amp. With nothing plugged in, the amp connects the two internally.",
            "The reason it exists is distortion. If the amp's preamp provides your drive, then any pedal in front of the amp is being distorted along with the guitar. A chorus, delay or reverb before a distorted preamp gets clipped and smeared. In the loop, the same pedals process the already distorted sound, so the repeats and sweeps stay clean and distinct, just as they would after a drive pedal on the board.",
          ],
        },
        {
          heading: "What goes where",
          paragraphs: [
            "Pedals that react to your guitar still go in front of the amp: tuner, wah, compressor and any drive pedals. Pedals that decorate the finished sound go in the loop: modulation, delay and reverb, and sometimes a noise gate or an EQ used to shape the overall sound. If your amp is clean and all your drive comes from pedals, the loop matters less, because the modulation and time effects already sit after the drive on the board.",
            "A volume pedal in the loop acts as a master volume that does not change the amount of preamp distortion, which is useful for swells with a driven sound. The same pedal in front of the amp changes how hard the preamp is pushed, so it cleans up the drive as well as lowering the level.",
          ],
        },
        {
          heading: "Series and parallel loops",
          paragraphs: [
            "In a series loop, the whole signal leaves through the send and must come back through the return. Everything passes through your loop pedals. This is the simplest kind and works with most pedals, but it means the quality of every loop pedal and cable affects the entire sound.",
            "In a parallel loop, the amp sends a copy of the signal out and blends what comes back with its own dry signal, usually with a mix control. The dry path stays inside the amp. This can keep the core tone intact, but any pedal in a parallel loop should be set to output only the effect, often called kill dry or 100 percent wet. Otherwise its own dry copy is mixed with the amp's dry copy, and small timing differences, especially in digital pedals, can cause comb filtering that sounds thin or hollow.",
          ],
        },
        {
          heading: "Levels and the four-cable method",
          paragraphs: [
            "Loop levels vary. Some loops run at instrument level, some at line level, and some offer a switch. Line level is higher than a guitar's output, so a pedal designed for instrument level can clip on the way in or sound too quiet on the way back. Check the amp's manual and each pedal's specifications, and listen for unwanted distortion or a level drop when you engage the loop.",
            "The four-cable method connects a multi-effects unit or switcher with its own loop to an amp so that some effects go before the preamp and some go in the amp's loop. Cable one runs from the guitar to the unit's input. Cable two runs from the unit's send to the amp's input. Cable three runs from the amp's send to the unit's return. Cable four runs from the unit's output to the amp's return. Your drive and filter pedals sit before the amp's preamp and your time effects sit after it, all controlled from one board.",
          ],
        },
      ],
      keyPoints: [
        "An effects loop sits between the preamp and power amp, via a send and a return.",
        "When the preamp supplies the drive, modulation and time effects usually sound clearer in the loop.",
        "A series loop routes the whole signal through the pedals; a parallel loop blends them with the dry signal.",
        "Pedals in a parallel loop should usually be set to kill dry to avoid comb filtering.",
        "Loop levels vary between instrument and line level, so check both amp and pedals.",
      ],
      exercise: {
        title: "Hear the difference a loop makes",
        steps: [
          "In the pedal lab, set the amp block to a driven sound and turn off the pedal overdrive and distortion.",
          "Place the delay and reverb before the amp block, then play a short phrase with space between notes.",
          "Move the delay and reverb after the amp block, which is where an effects loop would put them, and play the same phrase.",
          "Compare how clear the repeats and the reverb tail sound in each position.",
          "If your amp has a loop, check its manual for whether it is series or parallel and what level it runs at, and write that down with your pedal settings.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "Your amp's preamp provides the distortion. Where does a delay usually sound clearest?",
          options: ["Before the amp's input", "In the amp's effects loop", "Before the tuner", "Inside the guitar"],
          answer: 1,
          why: "In the loop, the delay repeats the already distorted sound instead of having its repeats distorted by the preamp.",
        },
        {
          q: "Why should a pedal in a parallel loop usually be set to kill dry?",
          options: [
            "To save battery power",
            "To avoid mixing its dry copy with the amp's dry copy, which can cause comb filtering",
            "Because parallel loops cannot pass any dry signal",
            "To add more distortion",
          ],
          answer: 1,
          why: "The amp already keeps a dry path. A second dry copy, slightly delayed, can cancel some frequencies and sound hollow.",
        },
        {
          q: "In the four-cable method, what connects to the amp's return?",
          options: [
            "The guitar",
            "The multi-effects unit's send",
            "The multi-effects unit's output",
            "The amp's own send",
          ],
          answer: 2,
          why: "The unit's output carries the post-preamp effects back into the amp's return, which feeds the power amp.",
        },
      ],
    },
    {
      id: "gain-staging",
      module: "signal-chain",
      title: "Gain staging",
      summary: "Unity gain, boosting before or after a drive, keeping volume steady between patches, and matching levels to an amp's input or loop.",
      minutes: 13,
      sections: [
        {
          heading: "Unity gain",
          paragraphs: [
            "Gain staging means managing the level of your signal at each point in the chain so every pedal gets a level it handles well and nothing jumps out or disappears when you switch. The starting point is unity gain: a pedal set so its output level is the same as its input when switched on. With every pedal at unity, you can switch any of them on or off without a change in volume, and the change you hear is the effect itself.",
            "Set unity by ear, one pedal at a time. Play a steady chord, switch the pedal on and off, and adjust its level until the volume stays the same. For a drive pedal this is harder, because distortion sounds louder even at the same level. Aim for the pedal to feel neither louder nor quieter in the room, and then adjust for the song.",
          ],
        },
        {
          heading: "Boost before or after a drive",
          paragraphs: [
            "A boost before a drive pedal or a driven amp pushes more signal into the clipping stage. The result is more distortion, more compression and more sustain, but not necessarily much more volume, because the clipping limits how loud it can get. This is the classic way to tighten and thicken a drive sound.",
            "A boost after a drive raises the level of the finished distorted sound without adding more distortion, as long as whatever comes next has the headroom for it. This is how you make a solo louder rather than dirtier. Many players keep one boost for each job. If a solo boost after the drive also makes the amp distort more, the amp's input is being pushed, and you may prefer to put that boost in the effects loop.",
          ],
        },
        {
          heading: "Volume steps between patches",
          paragraphs: [
            "The most common live problem is not tone but level. A clean sound that is quieter than the drive sound, a lead patch that disappears in the mix, or a delay that suddenly makes everything louder will make a set sound uneven, and the sound engineer can only guess which level you meant.",
            "Set levels at the volume you will actually play, with the band if you can, because the ear hears bass and treble differently at different volumes. Start with your main rhythm sound, match every other sound to it, then raise only the lead sound by a small, deliberate amount. Check the result from where the audience will stand, not only from above the board.",
          ],
        },
        {
          heading: "Front end versus effects loop levels",
          paragraphs: [
            "An amp's input and its effects loop expect different levels. The input is designed for instrument level from a guitar, and it is sensitive: a hot pedal output there pushes the preamp harder and adds distortion. The loop return often expects a higher, line-level signal, though some loops run at instrument level and products vary. A pedal that sounds fine into the input may sound quiet in a line-level loop, and a hot line-level signal can clip a pedal built for guitar level.",
            "When you move a pedal between the front of the amp and the loop, recheck its level. A boost in front of the amp mostly changes how much the preamp distorts. The same boost in the loop mostly changes volume. Knowing which one you want is the heart of gain staging.",
          ],
        },
      ],
      keyPoints: [
        "Unity gain means a pedal is the same volume on and off, so you hear only the effect.",
        "A boost before a drive adds distortion and sustain; a boost after it adds volume.",
        "Set patch levels at performance volume, matched to your main rhythm sound.",
        "An amp's input is sensitive to level; its loop often expects a higher line level, but products vary.",
        "Recheck levels whenever you move a pedal between the front of the amp and the loop.",
      ],
      exercise: {
        title: "Set every pedal to unity",
        steps: [
          "In the pedal lab, order the pedals conventionally and set the amp block to a clean sound at a comfortable volume.",
          "Turn on the compressor and adjust its level until switching it on and off causes no jump. Do the same for the EQ, chorus and delay.",
          "Turn on the overdrive with low drive and match its level so it feels neither louder nor quieter than the clean sound.",
          "Put the EQ before the overdrive and raise its level to hear a boost into a drive, then move it after the amp block and raise it again to hear a volume boost.",
          "Write down each level setting so you can repeat it on your own board.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "What does unity gain mean for a pedal?",
          options: [
            "The pedal is at maximum level",
            "The pedal's output level matches its input level when switched on",
            "The pedal has no effect at all",
            "The pedal is set to the same gain as the amp",
          ],
          answer: 1,
          why: "At unity, switching the pedal on or off changes the sound but not the overall volume.",
        },
        {
          q: "You want your solo to be louder but no dirtier. Where does a boost usually help most?",
          options: [
            "Before the drive pedal",
            "After the drive, or in the amp's effects loop",
            "Before the tuner",
            "In front of a vintage fuzz",
          ],
          answer: 1,
          why: "After the drive, a boost raises the finished sound's level instead of pushing the clipping stage harder.",
        },
        {
          q: "Why can a pedal sound too quiet when moved into an effects loop?",
          options: [
            "Loops always cut the treble",
            "Some loops run at a higher line level, while the pedal was set for instrument level",
            "Pedals do not work after a preamp",
            "The loop removes the power supply",
          ],
          answer: 1,
          why: "Line level is higher than instrument level, so a pedal matched to a guitar signal may need its level rechecked in a loop.",
        },
      ],
    },
  ],
};
