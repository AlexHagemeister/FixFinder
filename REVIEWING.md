# Reviewing a pull request

You are reviewing a FixFinder PR you did not build. Read this whole file before you start.

## What to read

1. The linked issue's acceptance criteria. If the PR has no issue, its description is the spec. A PR that does not say what it must do gets that as its first finding.
2. The Core section of [VISION.md](VISION.md).
3. The diff.

Treat the PR description's claims (what was tested, what works) as claims to check, not as facts.

## What to do

1. Look for where the PR fails its criteria or fights a Core invariant. A pass means you looked for failure and found none.
2. Run the tests, or say there are none.
3. If the PR changes what a user sees and a preview exists, open it at a phone viewport (390 by 844), walk the flow the PR touches, and check the result after each step. Write design findings as `[heuristic][severity] problem + fix`, using the terms in [DESIGN-VOCABULARY.md](DESIGN-VOCABULARY.md).
4. Check for secrets: no API keys, tokens, or `.env` contents in the diff. This repo is public.
5. Check that the AI step uses the stand-in by default. Never turn on real AI calls yourself.
6. If the PR touches the AI step, sign-in, or stored user data, read every changed line for bugs and security problems, not only the flow.
7. Change nothing: no edits, commits, or pushes.

## What to report

1. Post one comment on the PR. Open it with "Agent:", name the head commit you checked, number your findings, and end with what you ran and what you could not check.
2. If you cannot post to GitHub, give the human the comment text to paste.
3. Tell the human the result in a few plain sentences: whether it passed, and what needs fixing.

Anything you could not do (run the tests, open a browser, post the comment) goes in the could-not-check list. It is not a pass.

## Re-checks

A re-check covers only the fixes: the diff since the commit the last review named. Mark each earlier finding as fixed, or say the answer given holds. After three rounds without a clean review, stop and tell the human what is still open.
