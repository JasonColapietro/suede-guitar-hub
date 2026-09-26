import type { ToneModule } from "../types.ts";

export const POWER: ToneModule = {
  id: "power",
  title: "Power",
  blurb: "How to power pedals safely, why isolated outputs keep a board quiet, and how to track down hum and noise one step at a time.",
  lessons: [
    {
      id: "pedal-power-basics",
      module: "power",
      title: "Pedal power basics",
      summary: "Voltage, polarity, plug size and current draw: how to read a pedal's power label and choose a supply that powers it safely.",
      minutes: 13,
      sections: [
        {
          heading: "The common standard, and why to check anyway",
          paragraphs: [
            "Most guitar pedals run on 9 V DC through a 2.1 mm barrel plug with the centre pin negative. This is so widespread that it is easy to assume every pedal uses it. Many do not. Some pedals need 12 V or 18 V, some use a different plug size such as 2.5 mm, some use centre-positive polarity, and some run on AC rather than DC.",
            "Every pedal states its power needs somewhere: on the label near the jack, on the enclosure, or in the manual. Before you plug in a supply, check four things: the voltage, whether it is AC or DC, the polarity, and the current draw. Most mistakes that damage pedals come from skipping this check once.",
          ],
        },
        {
          heading: "Voltage and polarity",
          paragraphs: [
            "Never give a pedal more voltage than its rated maximum. Too much voltage can overheat or destroy parts inside, and the damage may not be obvious until the pedal fails. Some pedals are designed to accept a higher voltage, often 18 V, for more headroom, which means the signal can swing further before the circuit clips. Only do this when the maker says the pedal supports it. Otherwise, use exactly the voltage stated.",
            "Polarity matters just as much. A centre-negative pedal given a centre-positive supply receives its power backwards. Some pedals have protection against this and simply will not turn on. Others do not, and reverse polarity can damage them. Polarity symbols on the label show which part of the plug is positive and which is negative. If you are unsure, check before connecting, not after.",
            "Some pedals, including certain vintage-style and larger units, need an AC supply rather than DC. Never plug a DC supply into an AC-only pedal, or an AC supply into a DC pedal. The label will say AC or DC. When it is not clear, the manual will.",
          ],
        },
        {
          heading: "Current draw",
          paragraphs: [
            "Current is measured in milliamps, written mA. Each pedal draws as much current as it needs, and its label or manual gives a figure. Many simple analog pedals draw only a few to a few tens of mA. Digital pedals, with processors and memory, often draw far more, sometimes several hundred mA. Figures vary widely, so always read the label rather than guessing by pedal type.",
            "A supply's current rating is the most it can deliver, not what it forces into the pedal. A pedal that needs 100 mA will draw 100 mA whether the supply can give 200 mA or 2000 mA. So the supply output must meet or exceed the pedal's draw. A supply rated below the draw may cause the voltage to sag, which can make a pedal crackle, reset, sound wrong or fail to start. Leave some margin, because a supply running near its limit may also run warm.",
          ],
        },
        {
          heading: "Charge pumps and batteries",
          paragraphs: [
            "Some pedals run internally at a higher voltage than they are given. A charge pump is a small circuit that switches rapidly to double, or sometimes invert, the supply voltage, so a pedal fed 9 V can run parts of its circuit at around 18 V for extra headroom. This is done inside the pedal, so you still supply the rated voltage. Charge pumps raise the current the pedal draws, and on some designs their switching can add a faint whine if the circuit is not well filtered.",
            "Batteries are clean and isolated, because each one is its own separate supply, so they cannot cause ground loops. Their voltage falls as they drain, which affects some pedals, especially certain fuzzes, and they run down faster in pedals with a higher draw. Most battery-capable pedals stay on while a cable is in the input jack, so unplug the input when you finish to save the battery. Dispose of spent batteries properly and remove them from pedals you store.",
          ],
        },
      ],
      keyPoints: [
        "9 V DC centre-negative on a 2.1 mm plug is common but not universal, so check every pedal.",
        "Never exceed a pedal's rated voltage; use 18 V only when the maker says it supports it.",
        "Reverse polarity and AC-versus-DC mistakes can damage pedals.",
        "A pedal draws only the current it needs, so a supply output must meet or exceed that draw.",
        "A charge pump raises voltage inside the pedal, so you still feed it its rated voltage.",
      ],
      exercise: {
        title: "Make a power table for your board",
        steps: [
          "List every pedal you use in running order, including the tuner.",
          "For each one, find the label or manual and note the voltage, AC or DC, polarity, plug size and current draw in mA.",
          "Mark any pedal that is not 9 V DC centre-negative on a 2.1 mm plug, and any pedal that draws more than your supply's per-output rating.",
          "Add up the total current draw and compare it with what your supply can deliver in total and per output.",
          "Label each power cable or supply output with the pedal it belongs to, so nothing gets swapped by mistake.",
        ],
      },
      quiz: [
        {
          q: "A pedal needs 9 V DC and draws 100 mA. Which supply output suits it?",
          options: [
            "9 V DC, 50 mA",
            "9 V DC, 500 mA",
            "18 V DC, 500 mA",
            "9 V AC, 500 mA",
          ],
          answer: 1,
          why: "The voltage and type must match, and the output must meet or exceed the draw. The pedal only draws the 100 mA it needs.",
        },
        {
          q: "When is it safe to run a pedal at 18 V?",
          options: [
            "Always, because more voltage gives more headroom",
            "Only when the maker states the pedal supports 18 V",
            "Whenever the pedal has a charge pump",
            "Whenever the pedal is analog",
          ],
          answer: 1,
          why: "Exceeding a pedal's rated voltage can damage it. Only the maker's specification tells you whether 18 V is allowed.",
        },
        {
          q: "What does a charge pump inside a pedal do?",
          options: [
            "Lets you safely feed the pedal double its rated voltage",
            "Raises the voltage internally so parts of the circuit can run higher from the rated supply",
            "Converts the pedal from DC to AC",
            "Charges the pedal's battery from the supply",
          ],
          answer: 1,
          why: "The charge pump works inside the pedal. You still supply the rated voltage, and the pedal generates the higher internal voltage itself.",
        },
      ],
    },
    {
      id: "isolated-supplies-and-ground-loops",
      module: "power",
      title: "Isolated supplies and ground loops",
      summary: "Daisy chains versus isolated outputs, why digital pedals add noise, what a ground loop is, and how to fix one without touching safety earth.",
      minutes: 14,
      sections: [
        {
          heading: "Daisy chains",
          paragraphs: [
            "A daisy chain is a single cable with several plugs, powering several pedals from one supply output. It is cheap and tidy, and with a few low-draw analog pedals it can work without trouble. But every pedal on the chain shares the same supply and the same ground connection, and that shared path is where problems start.",
            "When pedals share a supply, the current each one draws flows through the same ground wiring. Small voltage differences along that path can end up in the audio as hum, whine or ticking. A pedal with a busy digital circuit or a charge pump can inject switching noise into the shared line that other pedals then pick up. The total draw also adds up: a daisy chain rated for less than the combined current will sag.",
          ],
        },
        {
          heading: "Isolated outputs",
          paragraphs: [
            "An isolated supply gives each output its own separate, electrically isolated source, typically with separate transformer windings or isolated converters. Each pedal's power is independent of the others, so noise from one output cannot travel into another through the supply, and the supply does not create extra ground paths between pedals.",
            "Isolated outputs are the most reliable way to power a board that mixes digital and analog pedals, high-gain pedals, or pedals with charge pumps. They usually cost more and take more space than a daisy chain. A sensible middle path is to put digital and high-draw pedals on their own isolated outputs and only share outputs between simple analog pedals that behave well together.",
          ],
        },
        {
          heading: "What a ground loop is",
          paragraphs: [
            "A ground loop happens when two pieces of equipment are connected to ground by two different paths, for example through their mains safety earths and also through the shield of an audio cable between them. The two ground points are rarely at exactly the same voltage, so a small current flows around the loop, and the audio cable carries it into your signal as a steady hum at the mains frequency and its harmonics.",
            "Common triggers are an amp and a computer interface, two amps plugged into different outlets, a pedal with its own mains supply feeding into an amp, or a board powered from one outlet and an amp from another on a different circuit. The hum is steady, it does not change with the guitar's volume or position, and it often changes or stops when you unplug one audio cable.",
          ],
        },
        {
          heading: "Fixing ground loops safely",
          paragraphs: [
            "Never defeat the safety earth. Do not remove, cut, tape over or bypass the earth pin on an amp, pedal supply or any other mains equipment, and do not use adapters that disconnect it. The safety earth protects you from electric shock if a fault puts mains voltage on the chassis or strings. Hum is annoying; a missing earth can kill.",
            "The safe fixes work on the audio path and the power layout instead. Plug the amp and the pedal supply into the same outlet or power strip, so they share one earth point. Use an isolated pedal supply. Use short, good-quality cables. Where two devices must connect and a loop remains, use a device designed to break the audio ground while leaving mains earth intact, such as an audio isolation transformer, or the audio ground-lift switch on a DI box, which lifts only the signal shield, never the mains earth. If hum persists, have the equipment and the building wiring checked by a qualified technician.",
          ],
        },
      ],
      keyPoints: [
        "A daisy chain shares one supply and one ground, which can pass noise between pedals.",
        "Isolated outputs give each pedal its own source, which keeps digital noise from spreading.",
        "A ground loop is two ground paths between devices, producing a steady mains hum.",
        "Never defeat the safety earth on an amp, supply or any mains equipment.",
        "Fix loops by sharing one outlet, using isolated supplies, or isolating the audio path.",
      ],
      exercise: {
        title: "Map your ground paths",
        steps: [
          "Draw your rig as boxes: guitar, board, pedal supply, amp, and anything else connected, such as an interface or second amp.",
          "Draw every audio cable between them and every mains cable to the wall, noting which outlet each one uses.",
          "Circle any pair of devices joined by an audio cable and also earthed through different outlets. Those are possible loops.",
          "Move the amp and pedal supply onto the same power strip and listen for any change in hum with the guitar volume down.",
          "Mark which pedals share a daisy chain and plan which ones should move to isolated outputs, starting with digital pedals.",
        ],
      },
      quiz: [
        {
          q: "Why do isolated supply outputs reduce noise compared with a daisy chain?",
          options: [
            "They supply a higher voltage",
            "Each output is an independent source, so noise cannot travel between pedals through the supply",
            "They filter the guitar signal",
            "They remove the need for audio cables",
          ],
          answer: 1,
          why: "Without a shared supply and ground path, switching noise from one pedal has no route into another pedal's power.",
        },
        {
          q: "Your amp hums when an audio interface is connected to it, and stops when the cable is removed. What is the most likely cause?",
          options: ["A dead battery", "A ground loop", "A faulty pickup", "Too much reverb"],
          answer: 1,
          why: "Two devices earthed separately and joined by an audio cable create two ground paths, which is a ground loop.",
        },
        {
          q: "Which of these is a safe way to deal with a ground loop?",
          options: [
            "Remove the earth pin from the amp's plug",
            "Use an adapter that disconnects the mains earth",
            "Plug the amp and pedal supply into the same power strip",
            "Tape over the earth contact on the supply",
          ],
          answer: 2,
          why: "Sharing one earth point removes the second path without touching the safety earth. The other options defeat the safety earth and must never be done.",
        },
      ],
    },
    {
      id: "finding-hum-and-noise",
      module: "power",
      title: "Finding hum and noise",
      summary: "A methodical way to find hum, buzz and hiss: strip the rig down, add one piece at a time, and check pickups, cables and the room.",
      minutes: 15,
      sections: [
        {
          heading: "Name the noise first",
          paragraphs: [
            "Different noises have different causes, so describe what you hear before you change anything. A low, steady hum at the mains frequency or its harmonics often points to a ground loop or a transformer's field. A harsher buzz that changes as you move the guitar or turn around usually comes from single-coil pickups picking up interference. A high whine or ticking that follows a pedal's power often comes from digital circuits or charge pumps. A steady hiss that rises with gain is the circuit's own noise, which a gate or lower gain can manage but not remove.",
            "Notice what changes the noise. Does it stop when you touch the strings, when you turn the guitar's volume down, when you turn around, or when you switch a particular pedal off? Each answer narrows the search.",
          ],
        },
        {
          heading: "Strip it down, then build it back",
          paragraphs: [
            "The reliable method is simple and slow. Unplug everything. Connect the guitar straight to the amp with one short cable you trust, with the amp at your usual settings. If the noise is still there, the problem is in the guitar, the amp, the cable or the room, not the pedals.",
            "If it is quiet, add one thing at a time: the pedal supply, then one pedal, then the next, checking after each step with the guitar's volume both up and down. The moment the noise appears, the last thing you added, or its cable or power connection, is the suspect. Try it on a different supply output, with a different patch cable, or in a different position before deciding the pedal itself is at fault.",
            "Only change one thing per step. Swapping two cables and a supply output at once may cure the noise without telling you which change did it, and it will come back the next time you rebuild the board.",
          ],
        },
        {
          heading: "Pickups, transformers and the room",
          paragraphs: [
            "Single-coil pickups act like antennas for magnetic interference. Power transformers in amps, computer screens, older lighting and other mains equipment all radiate fields that a single coil picks up as buzz. With the guitar plugged in, turn slowly on the spot and move closer to and further from the amp. You will usually find an orientation where the buzz drops sharply. Humbuckers cancel much of this, which is why the problem is mostly a single-coil one.",
            "Look at the room as well. Dimmer switches are a common source of harsh buzz, as are some lighting ballasts, phone chargers and other switching power supplies. Try switching room lights off, unplugging nearby chargers, and moving the amp away from screens and other equipment. If the noise changes, you have found at least part of it.",
          ],
        },
        {
          heading: "Cables and digital pedals",
          paragraphs: [
            "Cables fail quietly. A damaged shield, a loose jack or a cracked solder joint can add hum, crackle or intermittent drop-outs. Wiggle each connection gently while playing to find a crackle, and replace any cable that fails that test. Keep audio cables away from power cables where you can, and cross them at right angles where they must meet.",
            "Digital pedals are a frequent source of whine. Give them their own isolated supply outputs, keep them away from high-gain pedals on the board if their noise gets amplified, and try a different position in the chain. If a hum remains that seems to come from the mains, never defeat the safety earth to stop it. Use the safe fixes from the previous lesson and, if needed, have the equipment and wiring checked by a qualified technician.",
          ],
        },
      ],
      keyPoints: [
        "Describe the noise and what changes it before you touch anything.",
        "Start with guitar, one good cable and amp, then add one item at a time until the noise returns.",
        "Single coils pick up buzz from transformers and screens; turning the guitar can reduce it sharply.",
        "Dimmer switches, lighting and chargers in the room can be the whole problem.",
        "Never defeat the safety earth to stop hum; use safe fixes and a qualified technician.",
      ],
      exercise: {
        title: "Run a noise hunt",
        steps: [
          "With your full rig on, turn the guitar's volume down and write down what you hear: hum, buzz, whine, hiss or crackle.",
          "Unplug everything and connect the guitar straight to the amp with one short, trusted cable. Note whether the noise remains.",
          "With the guitar volume up, turn slowly on the spot and move nearer and further from the amp. Note the quietest orientation.",
          "Switch off room dimmers and nearby lights and unplug chargers one at a time, listening for changes.",
          "Rebuild the board one supply output and one pedal at a time, checking after each, and write down the step where the noise returns.",
        ],
      },
      quiz: [
        {
          q: "The buzz from your single-coil guitar drops sharply when you turn to face a different direction. What is the likely source?",
          options: [
            "A dead battery in a pedal",
            "Magnetic interference from a transformer, screen or lighting nearby",
            "Too much delay feedback",
            "Reverse polarity on the tuner",
          ],
          answer: 1,
          why: "Single coils pick up magnetic fields, and the pickup of that interference depends on the guitar's orientation to the source.",
        },
        {
          q: "You strip your rig to guitar, cable and amp and the noise is gone. What is the next step?",
          options: [
            "Replace the amp",
            "Add the supply and pedals back one at a time, checking after each",
            "Add every pedal back at once to save time",
            "Remove the amp's earth pin",
          ],
          answer: 1,
          why: "Adding one item at a time shows exactly which pedal, cable or supply output brings the noise back.",
        },
        {
          q: "Which noise is most likely to be the circuit's own noise rather than a fault?",
          options: [
            "A steady hiss that rises with the gain setting",
            "A crackle when you move a cable",
            "A hum that stops when one audio cable is unplugged",
            "A whine that follows one digital pedal's power output",
          ],
          answer: 0,
          why: "Every active circuit has some noise, and more gain amplifies it. The others point to a cable fault, a ground loop and power noise.",
        },
      ],
    },
  ],
};
