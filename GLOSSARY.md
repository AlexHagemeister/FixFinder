# FixFinder glossary

The words the team and its agents use for things in FixFinder. One word per idea: when a term lists words to avoid, use the term instead, in conversation, in issues, in code, and on screen. Course design terms (affordance, gulf of evaluation, Nielsen's heuristics) live in [DESIGN-VOCABULARY.md](DESIGN-VOCABULARY.md), not here.

A term is added when the team settles on a word, not before. When a screen, flow, or UI element gets a name, it goes under a **Screens and flows** heading with the same rules.

## The problem and the report

**Problem**:
Something broken or wrong that a user wants fixed, like a pothole or a smashed bus shelter.
_Avoid_: issue (that means a GitHub issue), hazard, incident

**Photo**:
The picture of a problem that the user takes, or chooses from the photos already on their phone. It is the starting point of every report.
_Avoid_: image, picture, snapshot

**Description**:
A short phrase saying what the problem is, like "Pothole" or "Window smashed on bus stop." FixFinder suggests it from the photo, and the user can edit it. FixFinder uses it, with the photo and the location, to find the responsible party.
_Avoid_: category, classification, label, type

**Location**:
Where the problem is, said the way a person would describe it (a street address, an intersection, a landmark). When the phone's reading is rough, it says "Near" and names only the street.
_Avoid_: place, spot, coordinates, GPS

**Location detail**:
The fuller record of where the problem is, for FixFinder's lookup and never shown as it is: the exact position from the phone, how accurate it is, the address parts, and any landmarks there. The location is the phrase the user sees, and the location detail is what the lookup works from.
_Avoid_: location data, geocode, coordinates

In code, `ReverseGeocode` names Nominatim's own answer for a position, which the location detail is built from. It is not another word for the location detail.

**Report**:
The message about one problem that goes to the responsible party. FixFinder drafts it, the user checks it, and only the user submits it.
_Avoid_: ticket, complaint, request, submission

**Report text**:
The body of the report, saying what the problem is and where. FixFinder drafts it, and the user can edit it before submitting.
_Avoid_: description, message, body

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
The first screen, where the user starts a report by taking a photo or choosing one already on their phone. It is the first tab in the tab bar.

**Choose from your photos**:
Home's quieter button, under Take a photo. It opens the phone's photo picker, and the chosen photo goes through the same report flow as a taken one. The location is still where the phone is now, not where the photo was taken.

**Tab bar**:
The bar at the bottom of the main screens (Home, My reports, and Settings), with one tab for each. It marks the current tab, and it hides during the report flow, so a tap on a tab cannot drop a report in progress.
_Avoid_: nav bar, menu, bottom bar

**My reports**:
The tab and screen that will list the reports the user has sent, each with its report status. For now it is a placeholder screen with sample reports.

**Settings**:
FixFinder's own settings tab and screen. For now it is a placeholder screen with sample rows that do nothing. The phone's settings are always "the Settings app" or "your phone's settings", never just "Settings".
_Avoid_: preferences, options

**Placeholder screen**:
A screen whose real content is not built yet. It shows sample content that gives a feel for what will go there, under a chip and note that say so. My reports and Settings are placeholder screens for now.

**Placeholder section**:
A section of a real screen that shows sample content, marked with a Sample chip under a Placeholder note. Home's placeholder sections (Your latest report, Problems near you, Is this still there?) come from the mockup, and the team will likely put something different there.

**Working**:
The screen FixFinder shows after the photo is taken, listing each step it takes (reading the photo, pinning down the location, finding who is responsible) and whether each one worked.

**Location needed**:
The screen FixFinder shows when the user denies location. It says FixFinder needs the location to find who is responsible and stops there, and offers Ask again, which carries on with the same photo. When the phone will likely not ask again, it lists the steps for turning location back on in the phone's settings.

**Result**:
The screen that shows what FixFinder found: the user's photo, the description, the location, the responsible party, and its source. Retake photo opens the camera for a new report, and Done goes back to Home.

**Placeholder result**:
The chip and note on Result that name what on it is sample output: the responsible party and source, while FixFinder does not look them up yet, and the description too when it came from the stand-in.

**Photo reader**:
The AI step that reads the photo and suggests the description, or says it couldn't tell what the problem is. It runs in the Worker (`POST /api/describe-photo`). "Can't reach the photo reader" covers no connection, no answer in time, and the photo reader refusing a call to protect the budget.
_Avoid_: classifier, vision model, image AI

**Stand-in**:
A part of FixFinder that answers with made-up but realistic output instead of doing the real work, so the team can build without spending the AI budget. `bun run dev` uses the stand-in photo reader, and the lookup is a stand-in for now.
_Avoid_: mock (that means a test double), fake, dummy

**Notice**:
A short orange message that says why FixFinder stopped, like Home's message when FixFinder could not find the location, or Location needed's line when location is still off after Ask again.

**Report flow**:
The path one photo takes through the screens: Home, then Working, then Result, or Location needed when the user denies location. In code, `ReportFlow` holds the report in progress.
