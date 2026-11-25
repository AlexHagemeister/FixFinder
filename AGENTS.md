# Agent conventions for FixFinder

- Read [VISION.md](VISION.md) at the start of a session. When an implementation choice fights a Core invariant, stop and raise it instead of working around it.
- Read [DESIGN-VOCABULARY.md](DESIGN-VOCABULARY.md). When discussing or reviewing design, name the principle at stake (affordance, signifier, gulf of execution, Nielsen 1, and so on), so the team connects course principles to design decisions.
- Write heuristic findings as `[heuristic][severity] problem + fix`.
- Use the terms in [GLOSSARY.md](GLOSSARY.md) in conversation, issues, code, and on screen, and never the words it lists to avoid. When the team settles a new term, add it there in the same change.
- When a new screen, flow, or UI element gets a name that meets the glossary's rule for what goes in (essential, and could get mixed up), add it under the glossary's Screens and flows heading in the same PR. On-screen copy does not go in.
- How the app is built, tested, and deployed lives in [README.md § How FixFinder is built and shipped](README.md#how-fixfinder-is-built-and-shipped). Read it there, and change it there when it changes.
- The staff's full instructions for the final deliverables are in [docs/project-instructions/](docs/project-instructions/README.md). Don't read them at session start. Open the relevant file when a task touches what staff require: the demo, labeling AI output, handling slow or wrong responses, or what the report needs from the repo. If a copy there disagrees with bCourses, bCourses wins.
- Stop a dev preview once the work it was for is done (merged, or the human is finished trying it). Don't leave it running and ask.

## Logging the app's AI mistakes

- When you see FixFinder's AI step give a wrong or bad answer while building or testing, add an entry to [docs/ai-failure-log.md](docs/ai-failure-log.md), following its instructions. Then note "Failure log: added entry N" in the related issue or PR.
- Only mistakes by the app's own AI step go in the log. Your own mistakes as a coding agent do not, and neither does the stand-in's sample output.

## Claiming issues

- Before starting work on an issue, assign it to the person you're working for: `gh issue edit <N> --add-assignee @me`. That's the team's claim.
- If the issue is already assigned to someone else, stop and tell your user. Don't start it unless they've cleared it with that person.
- Whenever you list open issues (including the snapshot from `/prime-gnadd`), mark each one as open or assigned, with the assignee's name. Fetch them with `gh issue list --state open --json number,title,assignees`, since prime's own listing leaves assignees out.

## Reviewing pull requests

- Whenever you are asked to review a PR, however the request is worded, follow [REVIEWING.md](REVIEWING.md).
- Before a PR's merge is approved, offer the human a review by a fresh agent: "Want a fresh agent to review this PR before you decide?" If nobody is there to answer (an unattended run), run the review instead of offering it. Changes to docs or comments alone skip this. Config counts as code.
- A fresh agent has none of the build conversation. Start it as a subagent if your tool has them. Otherwise, give the human this prompt to paste into a new session. Either way, the brief is exactly: `Review PR <number> in this repo by following REVIEWING.md.`
- The reviewer reports to the human, who decides what to fix. Fix only what they pick. The human merges.

<!-- gnadd:conventions -->
## GNADD

This repo runs GNADD (Git-Native Agent-Driven Development): GitHub issues,
branches, PRs, and git history are the sole system of record. No task files,
no progress notes. Start every session with `/prime-gnadd`. Every change
lands through an issue, a branch, and a PR, or through `/quickfix-gnadd` for
a trivial one. Project intent lives in `VISION.md` when present.

Preview launch: bun run dev
<!-- /gnadd:conventions -->
