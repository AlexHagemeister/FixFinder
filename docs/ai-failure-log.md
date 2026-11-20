# AI failure log

This log records mistakes made by FixFinder's AI step: the model calls the app makes when it runs. The final report needs at least 3 of them, each with how the interface handles it, so we write them down as we find them.

## What belongs here

- A wrong or bad answer from the app's AI step, seen while building or testing. For example, the wrong category for a photo, the wrong responsible party for a location, or a source that does not back the answer.

## What does not

- Mistakes by the coding agent that builds the app (Claude Code, Cursor, Codex, or another). Those get fixed in the PR, not logged here.
- Sample output from the stand-in AI step. The stand-in makes up its answers on purpose, so they are not model mistakes. This log is no reason to turn on real AI calls: see [README § AI usage](../README.md#ai-usage).

## How to add an entry

1. Copy the template below to the end of the Entries section. The first entry replaces "None yet."
2. Give it the next number. Numbers never change, so issues and PRs can point at them.
3. Note "Failure log: added entry N" in the related issue or PR.

If the interface does not handle the mistake yet, say so, and link the issue or PR that will fix it.

## Template

```markdown
### Entry N: <short name for the mistake>

- **Date:** YYYY-MM-DD
- **Found by:** <teammate, and their agent if one spotted it>
- **Model call or operation:** <which AI call, and which model>
- **Input:** <the photo, location, or prompt the call got>
- **What the model returned:** <its answer, quoted or summarized>
- **Why it was wrong:** <what the right answer was, and how we know>
- **How the interface handles it now:** <what the user sees and can do, or a link to the fix issue or PR>
```

## Entries

None yet.
