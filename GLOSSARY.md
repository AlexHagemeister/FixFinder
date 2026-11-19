# FixFinder glossary

The words the team and its agents use for things in FixFinder. One word per idea: when a term lists words to avoid, use the term instead, in conversation, in issues, in code, and on screen. Course design terms (affordance, gulf of evaluation, Nielsen's heuristics) live in [DESIGN-VOCABULARY.md](DESIGN-VOCABULARY.md), not here.

A term is added when the team settles on a word, not before. When a screen, flow, or UI element gets a name, it goes under a **Screens and flows** heading with the same rules.

## The problem and the report

**Problem**:
Something broken or wrong that a user wants fixed, like a pothole or a smashed bus shelter.
_Avoid_: issue (that means a GitHub issue), hazard, incident

**Photo**:
The picture the user takes of a problem. It is the starting point of every report.
_Avoid_: image, picture, snapshot

**Category**:
The kind of problem FixFinder thinks it is looking at, like "pothole" or "broken streetlight."
_Avoid_: type, label, classification

**Location**:
Where the problem is, said the way a person would describe it (a street address, an intersection, a landmark).
_Avoid_: place, spot, coordinates, GPS

**Report**:
The message about one problem that goes to the responsible party. FixFinder drafts it, the user checks it, and only the user submits it.
_Avoid_: ticket, complaint, request, submission

## Who fixes it

**Responsible party**:
Whoever owns fixing a given problem at a given location: a public agency, a landlord, or a business. Finding it is FixFinder's central job.
_Avoid_: owner, handler, authority

**Agency**:
A public organization that is a responsible party, called by its public name (Berkeley Public Works, AC Transit, Caltrans).
_Avoid_: department, office, city

**Reporting channel**:
How a responsible party takes reports: an email address, an online portal, a phone number, or an API.
_Avoid_: method, contact, intake

**Source**:
Where FixFinder's answer about the responsible party came from, shown to the user so they can check it.
_Avoid_: citation, reference, evidence

## After the report

**Case**:
A responsible party's own record of a report once it has been received, often with a case number and a status.
_Avoid_: ticket, request, issue

**Report status**:
Where a report stands, from submitted to resolved, as far as FixFinder can tell. When a case exists, its status feeds the report status.
_Avoid_: hearing back, follow-up, updates

## Screens and flows

**Home**:
The first screen, where the user starts a report by taking a photo.

**Working**:
The screen FixFinder shows after the photo is taken, listing each step it takes (reading the photo, pinning down the location, finding who is responsible) and whether each one worked.

**Location needed**:
The screen FixFinder shows when the user denies location. It says FixFinder needs the location to find who is responsible and stops there, and offers Ask again, which carries on with the same photo. When the phone will likely not ask again, it lists the steps for turning location back on in the phone's settings.

**Result**:
The screen that shows what FixFinder found: the user's photo, the category with a short description, the responsible party, and its source. Retake photo opens the camera for a new report, and Done goes back to Home.

**Placeholder result**:
The chip and note on Result that say its content is sample output, shown while FixFinder does not read photos yet.

**Notice**:
A short orange message that says why FixFinder stopped, like Home's message when FixFinder could not find the location, or Location needed's line when location is still off after Ask again.

**Report flow**:
The path one photo takes through the screens: Home, then Working, then Result, or Location needed when the user denies location. In code, `ReportFlow` holds the report in progress.
