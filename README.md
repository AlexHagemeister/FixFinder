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

We build FixFinder partly with AI coding agents, tools like Claude Code, Cursor, or Codex that read and write code. An agent starts every session knowing nothing about the project. Three files at the top of this repo give it that context, so its work stays pointed at what the team has decided. They are written mainly for agents, and they change as the project does.

**[VISION.md](VISION.md) steers agents toward the goal.** It says what FixFinder is for, in three parts. Core holds what stays true however the app gets built, and an agent that runs into a conflict with Core stops and raises it instead of working around it. Possibility space holds ideas we might build. Open tensions holds questions we have not settled. The file grows with the project: ideas get added, wording changes, and a feature moves into Core once the team decides FixFinder needs it. It holds no tasks, order, or status. Those live in issues.

**[DESIGN-VOCABULARY.md](DESIGN-VOCABULARY.md) gives the team and its agents shared design terms.** It defines the CS 160 vocabulary: affordances, signifiers, the two gulfs, Nielsen's heuristics, and more. Agents use these terms when they discuss or review design, so their feedback connects back to the course. The file changes when the team decides to add or reword a term.

**[AGENTS.md](AGENTS.md) holds the standing rules for agents.** Agents read it at the start of every session. It points them at the two files above and sets how they write design findings. A rule we want every agent to follow goes here.

When a design call comes up, name the principle at stake ("this is a gulf of evaluation problem", "this fails Nielsen 1"). Using the course's terms is part of how the team learns them.

## How we work

- **Issues are the to-do list.** Every piece of work starts as a [GitHub issue](https://github.com/AlexHagemeister/FixFinder/issues) that says what should change and how we will know it works. Don't keep task lists in files.
- **Milestones are phases.** Each [milestone](https://github.com/AlexHagemeister/FixFinder/milestones) names what the team is trying to find out and what ends the phase.
- **Every change goes through a pull request.** Work on a branch, open a PR, and merge into `main` when it is ready. Nobody has to wait on anyone else to keep moving.

This workflow is called GNADD. Its guide and agent skills are at [AlexHagemeister/gnadd](https://github.com/AlexHagemeister/gnadd).

## Keys and secrets

**This repo is public. Never commit an API key.**

- Deployed keys live in the Vercel project's environment variable settings.
- Local keys go in a `.env` file on your own machine. `.env` files never get committed.
- If a key does get committed, tell the team right away so it can be revoked. Deleting it in a later commit does not remove it from the history.

## AI usage

Our AI usage through the course is limited. Build and test against the stand-in AI step, which returns made-up but realistic results. Turn on real AI calls only on purpose, and check in the team Discord first.

## Try it on your phone

FixFinder is a web app that you save to your home screen, so it opens like any other app.

**Live link:** _added after the first deploy._

- **iPhone:** open the link in Safari, open the Share menu, and tap **Add to Home Screen**.
- **Android:** open the link in Chrome, open the **⋮** menu, and tap **Add to Home screen** (some versions say **Install app**).

The app asks for your location the first time you use it. It needs your location to find the agency responsible for the spot you photographed.

## Run it locally

_Setup steps arrive with the first version of the app._
