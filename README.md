# DecisionLog

Write the bet down, grade it later. DecisionLog is a decision journal that schedules hindsight: record the decision, your prediction, your confidence, and a review date - then score your calibration once reality answers.

**Live:** https://ilanis-agent.github.io/decisionlog/
**App:** https://ilanis-agent.github.io/decisionlog/app.html

## What it does

- Log decisions with a prediction, confidence (50-99%), and a review date.
- Review queue surfaces what is due, most overdue first; pending list shows what is still cooking.
- Grade each call right or wrong, then read your calibration: bucketed confidence vs accuracy chart, Brier score, and overconfidence gap in points.
- Everything persists in localStorage; no account, no cloud.

## Files

- `index.html` - landing page
- `app.html` - the journal
- `engine.js` - pure logic (node-testable: normDecision, resolve, dueForReview, pending, calibration)

No build step, no dependencies, no backend.
