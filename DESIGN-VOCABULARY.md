# Design vocabulary

The CS 160 design terms this team and its agents use when they talk about FixFinder's design. Name the principle at stake ("that's a gulf of evaluation problem", "this fails Nielsen 1") so a design call connects back to the course. VISION.md invariant 10 says why.

This is reference text. It changes only when the team decides to add or reword a term.

## Norman's vocabulary

- **Affordance:** what actions are possible, which depends on both the object and the person. A chair affords sitting.
- **Signifier:** the cue that shows where or how to act, like a "PUSH" label or a handle. Affordances exist whether or not you can see them. Signifiers are how you find them.
- **Mapping:** how controls relate to their effects. Stove knobs are the classic failure.
- **Feedback:** a timely, informative result of an action, like an elevator button lighting up.
- **Constraints,** in four kinds: physical (a door plate you can't pull), cultural (red means stop), semantic (a car's trunk is at the back), and logical (the last puzzle piece fits the last gap).
- **Conceptual model:** someone's understanding of how a thing works, like files and folders.
- **System image:** the designer's model reaches the user only through the interface, its behavior, and its docs, and becomes the user's model. Norman's fridge has two knobs that both set temperature, a system image that misleads.

## The seven stages and the two gulfs

The cycle runs goal, then plan, specify, and perform. Then the world responds, and the user perceives, interprets, and compares.

- **Gulf of execution:** "I know what I want. How do I make it do that?" Signifiers, mappings, and constraints bridge it.
- **Gulf of evaluation:** "Did it work?" Feedback and visible system status bridge it.

## Modes and metaphors

- **Mode:** the same action does different things depending on hidden state, which invites mode errors. The fix is to go modeless or make the mode visible. A **quasimode** lasts only while you hold it (Shift, unlike Caps Lock).
- **Metaphor:** a metaphor can be too limited, too powerful, too cute (Microsoft Bob), or mismatched.

## Nielsen's 10 heuristics

1. Visibility of system status
2. Match between system and real world
3. User control and freedom (undo)
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation

Write each finding as `[heuristic][severity] problem + fix`.

## Human performance

- **Model Human Processor:** about 100 ms to perceive, 70 ms to think, and 70 ms to move, so a simple reaction takes about 240 ms. Working memory holds 7 ± 2 items (Miller) or 4 ± 1 chunks (Cowan). Recognition beats recall.
- **Fitts's law:** bigger and closer targets are faster to hit, and screen edges help.
- **Hick's law:** choice time grows with the log of the number of options.
- **Power law of practice:** most of the speedup comes early, so let study participants practice before you time them.
