# FixFinder vision

This file says what FixFinder is for. It is not a plan: tasks, order, and status live in GitHub issues and pull requests. When an implementation choice fights an invariant below, stop and raise it instead of working around it. When a tool turns out not to fit, drop the tool, not the invariant.

## Core

### The experience at the center

Someone notices something broken in a public space, like a pothole or a smashed bus shelter. They take a photo, and FixFinder uses that photo plus their location to find the party responsible for fixing it and to help them complete the report efficiently.

### Invariants

1. **FixFinder finds who is responsible, so the user does not have to know.** Why: working out which agency owns a problem, and how that agency takes reports, is the step that stops people from reporting.
2. **AI is part of how FixFinder works.** It does at least some of the work of finding the responsible party and drafting the report. Why: the course asks for a web app with AI, and turning a photo and a place into a report is where AI helps.
3. **Reporting is quick and low-effort on a phone.** Why: people notice these problems on the move, outdoors, distracted, hands busy, and short on time.
4. **The answer shows its source.** When FixFinder names a responsible party, the user can see where that answer came from. Why: a report sent to the wrong place goes nowhere, and the user needs a reason to trust the lookup.
5. **The user stays in charge of the report.** FixFinder proposes, the user corrects, and nothing goes out until the user checks it and submits it. Why: AI can misread a photo or a place, and fixing its mistakes has to be easy.
6. **FixFinder opens like an app.** It is a web app that the user saves to their phone's home screen, so it launches like any other app. Why: a web app keeps the team focused on fast iteration and core functionality, and the home-screen launch keeps the feel of a native app.
7. **The user always knows what FixFinder is doing and whether its own steps worked.** While it identifies the problem, finds the responsible party, drafts the report, and hands it off, the user can see where things stand. Why: an AI step that runs silently reads as broken (the gulf of evaluation, Nielsen 1).
8. **The user fixes FixFinder's guesses by recognizing, not recalling.** FixFinder shows what it thinks the problem is, where it is, and who is responsible, and the user corrects what they see instead of describing it from scratch. Why: people use it on the move, with little attention to spare (Nielsen 6).
9. **FixFinder speaks in places and names people know.** Location reads the way a person would describe it, and agencies go by their public names. Why: a report the user cannot read is one they cannot check (Nielsen 2).
10. **Building FixFinder is also how the team learns CS 160's design principles.** Design discussion between the team and its agents uses the course's vocabulary, defined in [DESIGN-VOCABULARY.md](DESIGN-VOCABULARY.md). Why: shared terms keep the team and its agents on the same page and connect course principles to design decisions.

### Constraints

- The course requires a web app with AI.
- Agencies take reports in different ways: email, an online portal, a phone number, and occasionally an API.
- A web app gets the user's location only when the user allows it.

## Possibility space

Nothing in this section is a commitment. A thread moves into a GitHub issue when it is time to build it.

**Hearing back.** Ideally the user hears back on a report: that it arrived, and where it stands. Agencies that publish case status could feed this. A teammate's in-class look at SF311's API found resolution details and after-photos.

**Shared problems.** People could see that others hit the same problem, add their photo to an existing report, and follow it. A report could show a gallery of matching photos and a count of followers. Support could escalate in tiers, with a few hundred backers alerting the responsible office and a thousand reaching the mayor. People could form coalitions around a cause, with guardrails that keep it from becoming Reddit.

**Sending the report.** By API where an agency offers one. By an email drafted for the user's own mail client. By an in-app browser that fills an agency's portal for the user to submit. Or, at minimum, a link to the exact reporting page with the drafted text ready to paste. A teammate's in-class check found Berkeley's 311 API shows existing cases but takes no new reports, which points Berkeley reports at the portal or email.

**When the problem is unclear.** The app could ask questions (is this an AC Transit stop? is it on campus?) and ask for another photo for context.

**Beyond breakage.** Reports could cover wants as well as fixes: a bench, a stop sign, a lower speed limit, routed to the office that takes suggestions. The city could ask residents too, for example about a proposed roundabout or bike lane. The app could explain why a construction site is held up (permits, budget, contracting).

**Tone.** The app could carry a constructive, positive framing, not only complaints about government.

**Following a fix.** A report could carry a history of the fix, with agency updates and after-photos.

**Keeping reports current.** Nearby users could be asked whether an old issue is still there.

**Engagement.** Achievements, grouping by zip code, and wins shared within a neighborhood could keep people coming back.

**Reach.** FixFinder could cover one city and switch cities by GPS.

**Buy-in.** Stories that could win support: an official's record of fixes at reelection time, perks or reputation for active reporters, or city governments that want this without a budget for it.

## Open tensions

- **What reaches the agency.** Each person's own report may read as more trustworthy than one pooled report from an app. Pooling support behind one report (joining, petitions, escalation tiers) pulls the other way.
- **How much is AI.** AI does some of the work. How much is AI and how much is fixed, predictable logic is not known yet.
- **A helpful follow-up versus one more chatbot.** Asking the user questions helps them correct the app. Too much of it turns FixFinder into one more chatbot.
- **Whose email sends the report.** The user's own address keeps replies and status with them. A shared app inbox keeps their address private.
- **Keeping reports current versus location privacy.** Checking whether an old issue is still there needs people nearby. Users may not want their location shared all the time, and the prompts could be an imposition.
- **Whether hearing back is feasible.** It depends on agencies exposing the status of a report.
- **Where FixFinder's edge lies.** In four Berkeley test cases, a general AI assistant with web browsing found 311 every time. If that holds, the edge may lie in the exact location, in carrying the photo through to the report, and in hearing back, more than in finding the agency.
- **Whether agencies act on citizen reports.** Earlier 311 apps went unmaintained, and how receptive agencies are to citizen feedback is not known.
