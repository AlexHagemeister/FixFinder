# FixFinder

**Photograph something broken in a public space. FixFinder finds who is responsible for fixing it and helps you report it.**

A CS 160 final project by Team 8, Octopod, at UC Berkeley, Fall 2026.

---

## What FixFinder is

Someone notices a pothole, a smashed bus shelter, or a broken streetlight. They take a photo. FixFinder uses the photo and their location to work out which agency owns the problem and how that agency takes reports. Then it helps them finish the report quickly.

Most people never report these problems, because finding the right agency is the hard part. FixFinder does that part for them. The user still checks the report and sends it themselves.

The full statement of what FixFinder is for lives in [VISION.md](VISION.md).

## The course

FixFinder is the semester project for **CS 160: User Interface Design and Development** at UC Berkeley, taught by Eric Paulos in Fall 2026. The course asks each team to build a web app that uses AI.

Deadlines, deliverables, and grading live on the [course site](https://teaching.paulos.net/cs160_FL2026/) and bCourses. Course questions go to Ed.

## The team

Octopod is Team 8:

- Allena Oglivie
- Alex Hagemeister
- Alan Li
- Brian Chu
- Angy He

Team chat happens in the Octopod Discord server.

## How the agent files work

We build FixFinder partly with AI coding agents, tools like Claude Code, Cursor, or Codex that read and write code. An agent starts every session knowing nothing about the project. Four files at the top of this repo give it that context, so its work stays pointed at what the team has decided. They are written mainly for agents, and they change as the project does.

**[VISION.md](VISION.md) steers agents toward the goal.** It says what FixFinder is for, in three parts. Core holds what stays true however the app gets built, and an agent that runs into a conflict with Core stops and raises it instead of working around it. Possibility space holds ideas we might build. Open tensions holds questions we have not settled. The file grows with the project: ideas get added, wording changes, and a feature moves into Core once the team decides FixFinder needs it. It holds no tasks, order, or status. Those live in issues.

**[DESIGN-VOCABULARY.md](DESIGN-VOCABULARY.md) gives the team and its agents shared design terms.** It defines the CS 160 vocabulary: affordances, signifiers, the two gulfs, Nielsen's heuristics, and more. Agents use these terms when they discuss or review design, so their feedback connects back to the course. The file changes when the team decides to add or reword a term.

**[GLOSSARY.md](GLOSSARY.md) gives everyone one word for each thing in FixFinder.** It defines the app's own terms (problem, report, responsible party, case) and lists the words to avoid, so teammates and agents mean the same thing in conversation, issues, code, and on screen. It also names the screens and UI elements, so "x on the y screen" has an answer. A term gets added when the team settles on a word.

**[AGENTS.md](AGENTS.md) holds the standing rules for agents.** Agents read it at the start of every session. It points them at the three files above and at this README's build section, and sets how they write design findings. A rule we want every agent to follow goes here.

**[REVIEWING.md](REVIEWING.md) is the checklist a reviewing agent follows.** It is not session context like the four files above: agents read it only when they review a PR, so it costs nothing the rest of the time.

When a design call comes up, name the principle at stake ("this is a gulf of evaluation problem", "this fails Nielsen 1"). Using the course's terms is part of how the team learns them.

## How we work

- **Issues are the to-do list.** Every piece of work starts as a [GitHub issue](https://github.com/AlexHagemeister/FixFinder/issues) that says what should change and how we will know it works. Don't keep task lists in files.
- **Milestones are phases.** Each [milestone](https://github.com/AlexHagemeister/FixFinder/milestones) names what the team is trying to find out and what ends the phase.
- **Every change goes through a pull request.** Work on a branch, open a PR, and merge into `main` when it is ready. Nobody has to wait on anyone else to keep moving.
- **Every PR gets offered a second look.** Before you merge, your agent offers a review by a fresh agent. To ask for one yourself, open a new agent session and paste: `Review PR <number> in this repo by following REVIEWING.md.`

This workflow is called GNADD. Its guide and agent skills are at [AlexHagemeister/gnadd](https://github.com/AlexHagemeister/gnadd).

## How FixFinder is built and shipped

**What it's made of.** FixFinder is a web app written in TypeScript with React. A tool called Vite turns that code into plain web files (HTML, JavaScript, CSS) that any phone browser can open. Bun installs the packages and runs the project's scripts, like `bun run build`.

**Where it lives.** Cloudflare hosts those files on its free plan. Nobody on the team pays anything for hosting.

**Where the AI runs.** Real AI calls run only on Cloudflare, in the Worker script in `worker/`, which answers the app's `/api/...` requests. The Worker holds the OpenRouter key, and every model call it makes goes through `worker/model-calls.ts`. That file records each call's operation, model, tokens, and cost in a Cloudflare database (D1). A test fails if any other file reaches OpenRouter, so no call goes unrecorded. The database's tables are defined in `migrations/`. After adding a migration there, apply it with `bunx wrangler d1 migrations apply fixfinder-model-calls --remote`. On your own machine, `bun run dev` sends `/api/...` requests to the live Worker, so you never need a key. To try a change to the Worker code itself, push the branch and use its preview link, or run the app locally against it with `FIXFINDER_API_TARGET=https://<branch-preview-link> bun run dev:real-ai`.

**Which AI steps there are.** Each AI step is a Worker route, and each can use its own model, set in `worker/models.ts`. Reading the photo (`POST /api/describe-photo`, in `worker/describe-photo.ts`) suggests a short description of the problem, like "Overflowing trash can", or says it couldn't tell. The route is open to the internet, so it guards the budget before every call: it refuses a photo over 10 MB or in a format the model can't read (it reads JPEG, PNG, WebP, and GIF), more than about 20 calls a minute (Cloudflare's limit lets a few extra through), and any call once the day's recorded spend (UTC) reaches $0.50. The app shrinks each photo to a JPEG 1024 pixels on its long side before sending it. A HEIC photo (iPhones save them, and so can some Android phones) that the browser can't show, as in Chrome and Firefox, is first turned into a JPEG by `heic-to`, which loads only then (about 800 KB gzipped). When the browser can't shrink a photo at all, it sends the photo as it is, and a photo the route refuses gets Retake photo and Describe it yourself on Working, not Try again.

**What happens when you push a branch.** Cloudflare builds the branch and puts it at its own preview link, so you can try your change on a phone before anyone merges it. The link is the branch name with slashes turned into dashes, then `-fixfinder.alexhagemeister.workers.dev`. For example, the branch `issue-1/phone-app-shell` lives at `issue-1-phone-app-shell-fixfinder.alexhagemeister.workers.dev`.

**What happens when you open a pull request.** Two automatic checks run on it. `ci` installs the app, checks the TypeScript, builds it, and runs the tests. `Workers Builds: fixfinder` is Cloudflare building the preview link. A red check means something broke.

**What happens when a pull request merges.** Cloudflare rebuilds `main` and updates the live link. A phone that already has FixFinder open or on its home screen downloads the new version the next time the app opens, then reloads into it on its own.

## Keys and secrets

**This repo is public. Never commit an API key.**

- The team's OpenRouter key lives only in Cloudflare, as a secret on the Worker, never in the app's own code, since everything in the app is sent to every phone. Nobody needs a copy of it to build FixFinder.
- Alex sets it. `bunx wrangler secret put OPENROUTER_API_KEY` sets it for the live app, and `bunx wrangler preview base-config secret put OPENROUTER_API_KEY` sets it for every branch preview created afterward. A branch pushed before that needs `bunx wrangler preview secret put OPENROUTER_API_KEY`, run on that branch. Without the key, the Worker fails and nothing is spent.
- If a key does get committed, tell the team right away so it can be revoked. Deleting it in a later commit does not remove it from the history.

## AI usage

Our AI usage through the course is limited. Build and test against the stand-in AI step, which returns made-up but realistic results. Real AI calls spend the team's shared course budget, so make them on purpose and keep an eye on spend with `bun run model-calls`.

**Stand-in or real.** `bun run dev` uses the stand-in photo reader: every photo gets the description "Pothole", nothing is sent, and Result marks the description with a Sample chip. The live app and every branch preview always use the real photo reader. To use it on your machine, run `bun run dev:real-ai` (it opens at http://localhost:5174). The tests never make real calls.

**When you need the real thing.** Use the stand-in for screens, flows, wording, and layout. Use the real photo reader only when the change is about what it says: its instructions or model in `worker/`, how the app handles its answers, or checking it on real photos. A page that retries in a loop can spend the day's cap in minutes.

Every model call is recorded with what it cost. `bun run model-calls` saves the records to `model-calls.json` (not committed) and prints total spend, the most expensive operation, and the spend for each operation. Agents can search that file, for example with `jq`. The same records are at https://fixfinder.alexhagemeister.workers.dev/api/model-calls.

Mistakes the app's AI step makes during development go in the [AI failure log](docs/ai-failure-log.md).

## Try it on your phone

FixFinder is a web app that you save to your home screen, so it opens like any other app.

**Live link:** https://fixfinder.alexhagemeister.workers.dev

- **iPhone:** open the link in Safari, open the Share menu, and tap **Add to Home Screen**.
- **Android:** open the link in Chrome, open the **⋮** menu, and tap **Add to Home screen** (some versions say **Install app**).

The app asks for your location the first time you use it. It needs your location to find the agency responsible for the spot you photographed.

## Run it locally

You need [Bun](https://bun.sh) 1.3 or later.

```sh
bun install      # install dependencies
bun run dev      # start the app at http://localhost:5173
bun run test     # run the tests once
bun run build    # build the app into dist/
```

`bun run typecheck` checks the TypeScript, for the app and for the Worker. Use `bun run test`, not `bun test`: the second runs Bun's own test runner instead of Vitest.

You don't need an API key. `bun run dev` sends the app's `/api/...` requests to the live Worker, which holds the key and records each call (see [Where the AI runs](#how-fixfinder-is-built-and-shipped)). Real AI calls from your machine still spend the team's budget.
