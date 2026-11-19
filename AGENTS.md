# Agent conventions for FixFinder

- Read [VISION.md](VISION.md) at the start of a session. When an implementation choice fights a Core invariant, stop and raise it instead of working around it.
- Read [DESIGN-VOCABULARY.md](DESIGN-VOCABULARY.md). When discussing or reviewing design, name the principle at stake (affordance, signifier, gulf of execution, Nielsen 1, and so on), so the team connects course principles to design decisions.
- Write heuristic findings as `[heuristic][severity] problem + fix`.
- Use the terms in [GLOSSARY.md](GLOSSARY.md) in conversation, issues, code, and on screen, and never the words it lists to avoid. When the team settles a new term, add it there in the same change.
- Naming a new screen, flow, or UI element is part of building it: add the name under the glossary's Screens and flows heading in the same PR.
