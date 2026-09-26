import type { ToneModule } from "../types.ts";

/**
 * Module 2: amps. How an amp is laid out, where its distortion comes from,
 * how the tone stack really behaves, and how the speaker finishes the sound.
 * Every lesson that touches the inside of a tube amp carries the safety note.
 */
export const AMPS: ToneModule = {
  id: "amps",
  title: "Amps",
  blurb: "The voice of your rig: how an amp is built, where its distortion comes from, and how the tone stack and speaker shape it.",
  lessons: [
    {
      id: "how-an-amp-is-built",
      module: "amps",
      title: "How an amp is built",
      summary: "Follow your signal through preamp, tone stack, phase inverter, power amp, output transformer and speaker, and learn what each stage does.",
      minutes: 13,
      sections: [
        {
          heading: "The path through the amp",
          paragraphs: [
            "A guitar amp is a chain of stages, each with one job. In a typical tube amp the order is: preamp gain stages, the tone stack, the phase inverter, the power amp, the output transformer and finally the speaker. The exact layout varies by design, but almost every amp you meet is a version of this.",
            "The preamp makes the small guitar signal much bigger. The tone stack shapes the frequencies. The phase inverter prepares the signal for the power tubes. The power amp turns it into enough power to move a speaker. The output transformer matches the power tubes to the speaker. The speaker turns electrical power into sound, and colours it heavily as it does so.",
            "Knowing this order helps you understand the knobs. A gain or drive knob usually sits early, in the preamp. A master volume usually sits late, just before the phase inverter. The same amount of distortion can sound very different depending on which part of the chain is producing it.",
          ],
        },
        {
          heading: "Preamp and tone stack",
          paragraphs: [
            "Most tube preamps use small dual triode tubes, with the 12AX7 the most common type. Each half of the tube can be one gain stage. A simple clean amp might use two or three stages. A high-gain amp cascades more stages in a row, each one amplifying and clipping the output of the last.",
            "The tone stack is usually a passive network of resistors, capacitors and the bass, middle and treble pots. Passive means it can only cut, not boost, and it loses some signal, so a gain stage is often placed around it to make up the level. Where the stack sits varies: some designs put it right after the first gain stage, others later in the preamp. That placement changes how the EQ interacts with the distortion.",
            "When the preamp is pushed into distortion, the gain stages clip the signal. Preamp distortion is available at any listening volume, because the master volume can turn the result down afterwards. It tends to feel tighter, more compressed and more consistent than power-amp distortion.",
          ],
        },
        {
          heading: "Phase inverter, power amp and transformer",
          paragraphs: [
            "Most guitar amps use a push-pull power section: one tube or pair handles one half of the waveform and another handles the other half. The phase inverter splits the signal into two copies, one inverted, to drive each side. It can also distort when pushed hard, and that contributes to the sound of a cranked amp.",
            "The power tubes amplify those signals using high voltage from the power supply. Then the output transformer converts the high-voltage, low-current output of the tubes into the low-voltage, higher-current signal a speaker needs. It also matches the tubes to the speaker’s impedance, which is why the speaker load matters so much, as the speakers lesson explains.",
            "When the power section is driven hard, the tubes and the power supply start to limit. That produces power-amp distortion, which many players describe as fuller, looser and more dynamic, with a sense of bloom as notes sustain. The catch is that it only happens when the power amp is working hard, which usually means loud.",
          ],
        },
        {
          heading: "Safety before curiosity",
          paragraphs: [
            "Tube amps run at several hundred volts inside. The large filter capacitors in the power supply can hold a lethal charge for a long time after the amp is switched off and unplugged. Touching the wrong point inside the chassis can kill you.",
            "Leave all internal work to a qualified technician: biasing, capacitor replacement, repairs and modifications. Changing a plug-in tube with the amp switched off, unplugged and cooled down is usually treated as user maintenance, but check your amp’s manual first, and never open the chassis to look around.",
          ],
        },
      ],
      keyPoints: [
        "A typical tube amp runs preamp gain stages, tone stack, phase inverter, power amp, output transformer and speaker.",
        "Preamp distortion is available at any volume and tends to feel tight and compressed.",
        "Power-amp distortion needs the power section driven hard, so it usually needs volume, and it tends to feel fuller.",
        "The output transformer matches the power tubes to the speaker’s impedance.",
        "Tube amps hold lethal voltages even when unplugged; internal work belongs to a qualified technician.",
      ],
      exercise: {
        title: "Hear preamp and power-amp drive",
        steps: [
          "Open the pedal lab and turn off every pedal so only the amp is in the chain.",
          "Set gain high and master low. Play a few chords and note how tight and compressed the distortion feels.",
          "Now set gain low and master high, keeping your listening level safe with your device volume. Play the same chords and describe how the drive and dynamics differ.",
          "Find a middle setting that gives the amount of drive you like, and note both knob positions.",
          "If you have a real amp with gain and master controls, repeat the comparison at a volume that is safe for your ears and your neighbours.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "What is the job of the phase inverter in a push-pull amp?",
          options: [
            "To split the signal into two opposite-phase copies to drive each side of the power section",
            "To convert high voltage into a speaker-level signal",
            "To add reverb to the signal",
            "To remove hum from the power supply",
          ],
          answer: 0,
          why: "A push-pull power section needs two signals of opposite phase. The phase inverter creates them. Matching the tubes to the speaker is the output transformer’s job.",
        },
        {
          q: "Why can you get preamp distortion at low volume?",
          options: [
            "Preamp tubes run on batteries",
            "The master volume after the preamp can turn the distorted signal down",
            "The speaker produces the distortion",
            "Preamp distortion only happens at low volume",
          ],
          answer: 1,
          why: "The gain stages clip early in the chain. A master volume placed after them sets how loud the power amp plays that already distorted signal.",
        },
        {
          q: "Why is it dangerous to open a tube amp even after unplugging it?",
          options: [
            "The tubes stay hot enough to ignite the cabinet",
            "The speaker can still move",
            "The filter capacitors can hold a lethal charge after power is removed",
            "The transformer keeps generating current on its own",
          ],
          answer: 2,
          why: "Filter capacitors store high-voltage charge and can keep it for a long time. That is why internal work belongs to a qualified technician.",
        },
      ],
    },
    {
      id: "headroom-and-breakup",
      module: "amps",
      title: "Headroom and breakup",
      summary: "What headroom means, how sag and compression change the feel, and how to use the master volume and your hands to control breakup.",
      minutes: 13,
      sections: [
        {
          heading: "What headroom is",
          paragraphs: [
            "Headroom is how much signal an amp can handle before it starts to distort. An amp with lots of headroom stays clean even when you dig in or play loud. An amp with little headroom breaks up early, sometimes at conversation volume.",
            "Headroom depends on the whole rig, not just the amp’s power rating. Hot pickups and boost pedals use up headroom. Efficient speakers make the amp louder for the same power, so you reach a given volume before the amp is working hard. Your picking dynamics matter too: the same amp can be clean with a light touch and crunchy when you dig in.",
            "The zone just before an amp starts to distort is often called the edge of breakup. There, soft playing is clean and hard playing is gritty. Many players love this zone because the amp responds to your hands, and the guitar’s volume knob becomes a gain control.",
          ],
        },
        {
          heading: "Sag and compression",
          paragraphs: [
            "When a tube amp is driven hard, its power supply cannot always keep up with the demand. The supply voltage droops for a moment, which is called sag. Sag reduces the peak level, so hard notes do not get proportionally louder. You feel it as compression and a softer, slightly delayed attack.",
            "Amps with a tube rectifier tend to sag more than amps with a solid-state rectifier, though the rest of the power supply design also matters. Some players describe the feel as spongy or elastic and like how notes swell after the pick attack. Others prefer a stiffer response with a sharper attack, especially for fast, tight rhythm playing.",
            "Compression also comes from the gain stages themselves. As a stage clips, it flattens the peaks, so louder and quieter notes end up closer in level. The more gain, the more compression. That is why high-gain sounds sustain well but respond less to picking dynamics.",
          ],
        },
        {
          heading: "The master volume",
          paragraphs: [
            "Older amp designs often have a single volume control that sets how hard the preamp drives everything after it. To get distortion from them, you have to turn them up, and then the power amp is working hard too. The result can be a great sound at a volume far too loud for most rooms.",
            "A master volume adds a second control, usually between the preamp and the phase inverter. The gain knob sets how hard the preamp is driven, and the master sets how loud the result is. This lets you get preamp distortion at lower volumes.",
            "What a master volume cannot do is give you power-amp distortion at bedroom volume, because the power section is barely working. For that, players use smaller-wattage amps, efficient attenuation, or simply accept that some sounds need volume. When you do use an attenuator, follow the maker’s guidance on load and power ratings.",
          ],
        },
        {
          heading: "Using breakup in practice",
          paragraphs: [
            "Set the amp so it is just breaking up when you play hard with the guitar on full volume. Then use your hands and the guitar’s volume to move between clean and crunch. This is often more expressive than switching channels.",
            "For a band setting, less gain than you think usually sounds bigger. Heavy compression reduces dynamics and blurs note definition, which makes a part sound smaller in a mix. Start with the least gain that gives you the sustain you need, then add only if the part calls for it.",
            "Volume changes the picture too. An amp set at home to break up nicely may be far cleaner or far dirtier at rehearsal volume, because the power section and speaker are working at a different level. Check your settings at the volume you will actually play, and protect your hearing while you do.",
          ],
        },
      ],
      keyPoints: [
        "Headroom is how much signal an amp can take before it distorts, and it depends on pickups, pedals, speakers and playing.",
        "Sag is a momentary drop in supply voltage under hard playing that you feel as compression and bloom.",
        "A master volume lets you get preamp distortion at lower volumes, but not power-amp distortion.",
        "At the edge of breakup, picking strength and the guitar’s volume knob control the amount of drive.",
      ],
      exercise: {
        title: "Find the edge of breakup",
        steps: [
          "In the pedal lab, set the amp’s gain low and raise it slowly while strumming at a medium strength.",
          "Stop at the point where soft strumming is clean and hard strumming just starts to crunch.",
          "Play the same chord softly, then hard, four times each, and listen for the change in grit and attack.",
          "Keep that setting and turn the gain up by one step. Note how the difference between soft and hard playing shrinks as compression increases.",
          "Return to the edge setting and use it for a full verse of a song, controlling the drive only with your picking.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "What is sag in a tube amp?",
          options: [
            "A drop in supply voltage under heavy demand that softens and compresses the attack",
            "A loose speaker cone",
            "A tone control that cuts the treble",
            "The gradual wear of the tubes over years",
          ],
          answer: 0,
          why: "When the power supply cannot keep up, its voltage droops for a moment. That limits peaks, so you hear and feel compression.",
        },
        {
          q: "What does a master volume let you do?",
          options: [
            "Get power-amp distortion at very low volume",
            "Run the amp without a speaker",
            "Get preamp distortion at a lower overall volume",
            "Increase the amp’s wattage",
          ],
          answer: 2,
          why: "The master sits after the preamp, so it controls the level of an already distorted signal. The power section still needs to work hard for power-amp distortion.",
        },
        {
          q: "Which change uses up headroom and makes the amp break up sooner?",
          options: [
            "Lowering the pickups",
            "Turning the guitar’s volume down",
            "Playing more softly",
            "Adding a boost pedal before the amp",
          ],
          answer: 3,
          why: "A boost sends a stronger signal into the preamp, so it reaches its limit sooner. The other three reduce the signal level.",
        },
      ],
    },
    {
      id: "tubes-solid-state-and-modelling",
      module: "amps",
      title: "Tubes, solid state and modelling",
      summary: "Common tube types and their tendencies, what Class A and AB really mean, and a fair look at solid-state, modelling and captured amps.",
      minutes: 14,
      sections: [
        {
          heading: "Tube families and their tendencies",
          paragraphs: [
            "In the preamp, the 12AX7 is the common choice because it has high gain. Lower-gain types in the same family can be swapped into some positions to give more headroom, but check that your amp supports it before experimenting.",
            "Power tubes shape the character of the power section. The following are tendencies, not rules, because the circuit, the transformer and the speaker matter as much. The EL84 is common in smaller amps and is often described as chimey, with early breakup and a compressed midrange. The EL34 is often associated with a forward midrange and a crunchy, aggressive character when driven. The 6L6 is often associated with lots of clean headroom, firm low end and a slightly scooped, sparkly sound.",
            "Swapping power tubes of a different type is not like changing a pedal. Many amps need to be rebiased when power tubes are changed, and some cannot take a different type at all. Biasing involves the high voltages inside the chassis, so it is a job for a qualified technician. Tube amps hold lethal voltages even when unplugged, because of the filter capacitors.",
          ],
        },
        {
          heading: "Class A and Class AB, carefully",
          paragraphs: [
            "Amplifier class describes how much of the waveform each power tube conducts. In a true Class A stage, the tubes conduct over the whole cycle. In Class AB, each tube in a push-pull pair conducts for more than half but less than the whole cycle, handing over to the other. Class AB is more efficient, so it gets more power from the same tubes.",
            "In guitar amp marketing, “Class A” is used loosely. It is often applied to amps that are single-ended, or to cathode-biased push-pull amps that may move into Class AB as they are driven harder. The label is not a reliable description of how the circuit works under all conditions.",
            "More importantly, the class label says little about sound on its own. Two amps of the same class can sound nothing alike, and an amp’s character comes from the whole design: the preamp, the tone stack, the power supply, the transformer and the speaker. Judge an amp by listening, not by its class.",
          ],
        },
        {
          heading: "Solid state",
          paragraphs: [
            "Solid-state amps use transistors or integrated circuits instead of tubes. They are usually lighter, cheaper to run, more reliable and less sensitive to rough handling. They have no tubes to replace and no biasing to maintain.",
            "Solid-state clean sounds can be excellent, with lots of headroom, which is why many acoustic, bass and jazz players use them. The common criticism is overdrive: simple transistor clipping can sound harsher and less dynamic than a driven tube stage. Good solid-state designs work around this with careful circuit design, and many players get great results from a solid-state amp with pedals in front.",
          ],
        },
        {
          heading: "Modelling and captures",
          paragraphs: [
            "Modelling uses digital signal processing to simulate how an amp circuit behaves, including its gain stages, tone stack, power section and speaker. Modern modellers can be very convincing, especially recorded or through a full-range system. They put many amps and cabinets in one box, are consistent from night to night, and work at any volume.",
            "Profiling and capture are a related approach. Instead of simulating a circuit, the device measures a specific real amp at a specific setting and reproduces that result. A capture can sound very close to the original at that setting, but it is a snapshot. The knobs on the capture may not respond the way the real amp’s knobs would, because the real circuit’s interactions were not all captured.",
            "Neither approach is cheating, and neither is automatically worse than a tube amp. Latency, the speaker or monitor you play through, and how you set levels all matter. Choose by how the sound and feel work for your music, your volume limits and your budget.",
          ],
        },
      ],
      keyPoints: [
        "12AX7s are the usual preamp tube; EL84, EL34 and 6L6 power tubes each have tendencies, not fixed sounds.",
        "Changing power tube types can require rebiasing, which is technician work because of lethal internal voltages.",
        "Class A and AB describe how tubes conduct, and the label alone says little about how an amp sounds.",
        "Modelling simulates circuits; profiling and capture reproduce one amp at one setting, like a snapshot.",
      ],
      exercise: {
        title: "Compare by ear, not by label",
        steps: [
          "If you have access to more than one amp, or a modeller with several amp types, set each to a clean sound at the same listening volume.",
          "Play the same chord progression and single-note phrase through each, with the same guitar and pickup.",
          "Raise each amp to the edge of breakup and repeat. Note how early each breaks up and how the midrange changes.",
          "Write a one-line description of each sound without mentioning tube type or class, only what you hear and feel.",
          "Compare your notes with the tendencies in this lesson and note where they matched and where they did not.",
        ],
      },
      quiz: [
        {
          q: "What does the Class A or Class AB label tell you about an amp’s sound on its own?",
          options: [
            "Class A always sounds warmer",
            "Class AB always has more distortion",
            "Very little, because the whole circuit and speaker shape the sound",
            "Class A amps always have more headroom",
          ],
          answer: 2,
          why: "Class describes how the power tubes conduct. Tone comes from the whole design, so two amps of the same class can sound very different.",
        },
        {
          q: "What is the main difference between modelling and a profile or capture?",
          options: [
            "Modelling simulates a circuit; a capture reproduces one real amp at one setting",
            "Modelling is only for bass; captures are only for guitar",
            "Captures need tubes to work",
            "There is no difference",
          ],
          answer: 0,
          why: "A model simulates the circuit’s behaviour. A capture measures a specific amp at a specific setting, so it is a snapshot whose knobs may not behave like the original’s.",
        },
        {
          q: "You want to try a different power tube type in your amp. What is the safe approach?",
          options: [
            "Swap them while the amp is warm so they seat properly",
            "Open the chassis and adjust the bias yourself with a meter",
            "Swap them with the amp on standby",
            "Check the manual and have a qualified technician rebias if needed",
          ],
          answer: 3,
          why: "Many amps need rebiasing for a new tube type, and biasing means working near lethal voltages. That is a job for a qualified technician.",
        },
      ],
    },
    {
      id: "dialling-the-tone-stack",
      module: "amps",
      title: "Dialling the tone stack",
      summary: "Why bass, mid and treble interact, why all on 10 is not flat, and how to set mids that cut through a band mix.",
      minutes: 14,
      sections: [
        {
          heading: "A passive stack cuts, it does not boost",
          paragraphs: [
            "The bass, middle and treble controls on many amps form a passive tone stack. Passive means it can only remove energy from the signal. Turning a knob up does not boost that frequency range, it cuts it less. The stack also loses some overall level, which the gain stages around it make up.",
            "This changes how you should think about the knobs. Turning the treble to 10 does not add treble above flat. It means the stack is cutting as little treble as it can. If an amp sounds dull with the treble on 10, the problem is elsewhere: the pickups, the cable, the speaker, or a bright switch that is off.",
            "Some amps use an active EQ instead, which can boost as well as cut. Many modern and solid-state designs do this. Check your manual, because the same knob positions mean different things on the two types.",
          ],
        },
        {
          heading: "The knobs interact",
          paragraphs: [
            "In a passive tone stack, the controls share components, so turning one changes what the others do. Raising the bass can make the midrange seem to drop. Lowering the mid can make the bass and treble controls seem stronger. The same treble setting can sound different at different bass and mid settings.",
            "Because of this interaction, “all on 10” is not flat on many designs. On a common type of passive stack, all three at 10 gives a noticeable dip in the midrange. On some common designs, the settings closest to a flat response are roughly bass and treble low with the middle high. The exact settings vary by circuit, so use this as a reason to listen, not as a recipe.",
            "A practical approach is to start every control at noon, then adjust one at a time and listen after each change. When one knob changes more than you expect, try moving the others back toward noon before going further.",
          ],
        },
        {
          heading: "Mids matter in a band",
          paragraphs: [
            "Scooping the mids, with bass and treble high and the middle low, can sound huge when you play alone. In a band, that sound often vanishes. The bass guitar covers the low end, the cymbals and vocals cover the top, and guitar lives mostly in the midrange. A scooped guitar leaves a hole exactly where it needs to be heard.",
            "Turning the mid up is often the fastest way to cut through without turning up the volume. It makes notes clearer and chords more defined. It can sound honky or boxy on its own, and that is normal. Judge midrange settings with the band, or with a backing track, not in isolation.",
            "The bass knob deserves care too. Too much low end from a guitar competes with the bass guitar and kick drum and makes a mix muddy. It is common to set less bass on stage than you would at home, especially with a closed-back cabinet or when the amp is on the floor near a wall.",
          ],
        },
        {
          heading: "Presence, bright switches and the room",
          paragraphs: [
            "Many amps have a presence control in the power amp section. It works through the amp’s negative feedback loop to change the upper treble response. It sits after the tone stack, so it can add bite that the treble knob cannot.",
            "A bright switch or bright cap typically lets treble bypass part of the volume control. Its effect is strongest at low volume settings and fades as you turn up. Listen again after changing volume, because a setting that was glassy at low volume can become harsh when loud.",
            "Finally, the room changes everything. A hard, bare room sounds brighter than a soft, furnished one, and an amp on the floor gets more bass than one on a stand. Dial in where you will actually play, and at the volume you will actually use.",
          ],
        },
      ],
      keyPoints: [
        "A passive tone stack cuts rather than boosts; 10 means cutting as little as possible.",
        "The controls interact, so all on 10 is not flat on many designs and the knobs need to be set together.",
        "Mids are where a guitar lives in a band mix; a scooped sound often disappears.",
        "Presence and bright switches act in different places, and the room and volume change what you hear.",
      ],
      exercise: {
        title: "Set EQ for a mix, not for the bedroom",
        steps: [
          "Open the pedal lab and set bass, mid and treble all to the middle with a light crunch.",
          "Turn the mid fully down and play a riff, then fully up and play it again. Describe the difference in one sentence.",
          "Set all three to 10 and compare it with all at the middle. Note whether the midrange sounds weaker at 10.",
          "Play along with a backing track or a recording at low volume and adjust the mid until the guitar is clear without being louder overall.",
          "Use the EQ ear trainer for five minutes to practise identifying midrange boosts and cuts, then return and fine-tune your setting.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "On an amp with a passive tone stack, what does turning the treble to 10 do?",
          options: [
            "Boosts treble above flat",
            "Cuts as little treble as the stack allows",
            "Switches the amp to its bright channel",
            "Raises the amp’s wattage",
          ],
          answer: 1,
          why: "A passive stack can only remove energy. At 10 it removes the least treble it can, which is not the same as a boost.",
        },
        {
          q: "Why is “all on 10” often not a flat response?",
          options: [
            "The controls interact, and many passive stacks produce a midrange dip at those settings",
            "The pots are only rated to 8",
            "The speaker cannot reproduce treble",
            "Setting all knobs to 10 turns off the tone stack",
          ],
          answer: 0,
          why: "The tone controls share components in a passive stack. On many designs, full bass and treble with full mid still leave a dip in the midrange.",
        },
        {
          q: "Your guitar sounds huge alone but disappears when the band plays. What is the first thing to try?",
          options: [
            "Add more bass",
            "Add more gain",
            "Raise the midrange",
            "Scoop the mids further",
          ],
          answer: 2,
          why: "Bass guitar covers the lows and cymbals and vocals cover the highs. Raising the mids puts the guitar where there is room for it in the mix.",
        },
      ],
    },
    {
      id: "speakers-and-cabinets",
      module: "amps",
      title: "Speakers and cabinets",
      summary: "Match impedance safely, understand sensitivity and why 3 dB is a lot, and hear how open-back, closed-back and speaker breakup shape tone.",
      minutes: 14,
      sections: [
        {
          heading: "Impedance and the rule you must not break",
          paragraphs: [
            "Speakers are rated by nominal impedance, usually 4, 8 or 16 Ω. A tube amp’s output transformer is designed to drive a particular load, and many amps have an impedance selector or several output jacks for different loads. Match the amp’s setting to the total impedance of the speakers connected.",
            "Wiring two speakers of the same impedance in parallel halves the load, so two 8 Ω speakers give 4 Ω. Wiring them in series doubles it, so two 8 Ω speakers give 16 Ω. Many cabinets state their total impedance on the back panel. Some amps tolerate a mismatch of one step, but not all, so check the manual instead of assuming.",
            "Never run a tube amp without a speaker or a suitable load attached. With no load, the energy the amp produces has nowhere to go, and voltage spikes can damage the output transformer and the tubes. Always connect the speaker before you switch on, and do not unplug it while the amp is running. Solid-state amps usually behave differently, and many dislike too low a load more than no load, so follow the manual for yours.",
          ],
        },
        {
          heading: "Sensitivity and why 3 dB is a lot",
          paragraphs: [
            "Speaker sensitivity is how loud a speaker plays for a given input power, usually stated in dB at one watt measured one metre away. Guitar speakers vary widely, commonly spanning several decibels between models.",
            "A 3 dB difference sounds small on paper but is large in practice. Every extra 3 dB of output needs double the amplifier power. So a speaker 3 dB more sensitive gives the same volume as doubling your amp’s wattage. A speaker 3 dB less sensitive makes a powerful amp behave like one with half the power.",
            "This is useful for headroom and breakup. A more sensitive speaker gets you loud with less power, so the amp stays cleaner at a given volume. A less sensitive speaker makes the amp work harder for the same volume, so it breaks up sooner. Changing speakers is one way to move an amp’s sweet spot to a volume you can use.",
          ],
        },
        {
          heading: "Open back and closed back",
          paragraphs: [
            "An open-back cabinet has a partial or missing back panel, so sound comes out of the back as well as the front. The sound spreads more around the room and tends to feel airy and open, with a looser low end because the rear wave partly cancels some bass.",
            "A closed-back cabinet seals the back. The sound is more directional and focused, and it usually has a tighter, stronger low end. Closed backs are common for high-gain and heavier styles, where the extra punch helps palm-muted parts. The trade-off is a beam of sound that can be harsh straight ahead and quieter off to the side.",
            "Where you stand matters with either type. Many players stand in front of a closed-back cabinet and hear mostly low mids, while the audience hears the treble beam. Tilting the amp back or putting it on a stand often helps you hear what everyone else hears.",
          ],
        },
        {
          heading: "Speaker breakup is part of the tone",
          paragraphs: [
            "Guitar speakers are not designed to be accurate like studio monitors. Most have a limited frequency range and roll off steeply in the upper treble, which filters out harsh fizz from distortion. That filtering is a big part of why an amp and a speaker sound good together.",
            "At higher power, a guitar speaker’s paper cone flexes and stops moving as a single rigid piece. This speaker breakup adds its own compression and harmonic texture. Speakers rated for more power than the amp stay cleaner, while speakers closer to the amp’s power rating break up more. Always choose a total power rating at least as high as the amp’s output to avoid damage.",
            "This is also why amp simulators and direct recordings need a cabinet simulation, covered in the recording module. Without the speaker’s filtering, a distorted amp sounds thin and fizzy. The speaker is not a passive end point. It is one of the most important tone controls in the rig.",
          ],
        },
      ],
      keyPoints: [
        "Match the amp’s impedance setting to the total speaker load; parallel halves impedance and series doubles it.",
        "Never run a tube amp without a speaker or suitable load, because it can damage the output transformer.",
        "A 3 dB change in speaker sensitivity equals doubling or halving amp power at the same volume.",
        "Open backs sound airy and spread out; closed backs sound tighter and more focused.",
        "Guitar speakers filter treble and break up under power, and both are part of the tone.",
      ],
      exercise: {
        title: "Hear what the cabinet does",
        steps: [
          "In the pedal lab, set a medium-gain sound with the cab on and play a few chords and a single-note line.",
          "Turn the cab off and play the same parts at a similar volume. Note how much harsher and fizzier the sound becomes.",
          "Turn the cab back on and set the treble so the sound is bright but not harsh. Note how the cab changes the treble setting you prefer.",
          "If you have a real amp, check the impedance setting against the cabinet label with the amp switched off before you power it on.",
          "With a real amp, play at a moderate volume while standing directly in front and then off to the side, and describe the difference.",
        ],
        tool: "/tools/pedal-lab",
      },
      quiz: [
        {
          q: "You connect two 8 Ω speakers in parallel. What is the total load?",
          options: [
            "16 Ω",
            "8 Ω",
            "2 Ω",
            "4 Ω",
          ],
          answer: 3,
          why: "Two equal impedances in parallel give half the value, so 8 Ω and 8 Ω in parallel present 4 Ω. In series they would give 16 Ω.",
        },
        {
          q: "Why must a tube amp never run without a speaker load?",
          options: [
            "It will run too quietly to hear",
            "Voltage spikes with no load can damage the output transformer and tubes",
            "The preamp tubes will overheat",
            "The tone stack stops working",
          ],
          answer: 1,
          why: "With no load, the energy from the power section has nowhere to go, and the resulting voltage spikes can arc inside the output transformer or tubes.",
        },
        {
          q: "Speaker A is 3 dB more sensitive than speaker B. What does that mean in practice?",
          options: [
            "Speaker A gives the same volume as B with roughly half the amp power",
            "Speaker A is barely any louder",
            "Speaker A has three times the bass",
            "Speaker A needs double the power to reach the same volume",
          ],
          answer: 0,
          why: "Each 3 dB corresponds to a doubling of power. A speaker 3 dB more sensitive reaches the same volume with half the power.",
        },
      ],
    },
  ],
};
