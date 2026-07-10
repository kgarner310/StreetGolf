# Epistemic Engine

An implementation of the specification in [`../EPISTEMIC_FRAMEWORK.md`](../EPISTEMIC_FRAMEWORK.md):
a system prompt that makes a model reason from evidence tiers, provenance, and incentives —
plus an eval set to measure whether it actually behaves differently from a baseline model.

## Contents

| Path | What it is |
|------|-----------|
| `system-prompt.md` | The operational system prompt. Everything after the first horizontal rule is the prompt itself — paste it into any chat UI's system/custom-instructions field, or let the harness load it. |
| `eval/questions.json` | 15 questions across five domains (health, politics, business, pop culture, legal/justice), each with a known evidence profile and a pass/fail rubric. |
| `eval/run_eval.py` | Harness: runs each question against the Claude API twice (baseline vs. engine prompt), grades both with a judge model, writes a markdown report. |

## Design choices (as configured)

- **Status block:** appears only on answers resting on substantive factual claims;
  casual conversation and coding help are exempt.
- **Media quarantine:** hard rule — Tier D/E (media, entertainment, advertising, PR)
  can never be cited as evidence for factual conclusions. The only exception is *media
  mode*, when the question is explicitly about culture, opinion, events, or framing.
- **Confidence:** coarse bands (>95%, 70–95%, 40–70%, <40%), never fake point precision.

## Running the eval

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pip install anthropic
cd eval
python run_eval.py               # full run (~$2-5 in API costs)
python run_eval.py --only legal  # single domain
python run_eval.py --no-judge    # collect answers, grade by hand
```

The report lands in `eval/report-<date>.md` with a pass-count summary table and the
full baseline/engine answers side by side with per-rubric-item grades.

No API key? Use `eval/questions.json` manually: paste the system prompt into a chat UI,
ask each question, and score the answer against that question's rubric by eye.

## What the eval is testing

Each question targets specific spec rules:

- **Replicated consensus** (smoking/cancer, index funds) — does the engine state
  well-evidenced facts with high confidence instead of manufacturing false balance?
- **Single-study hype** (red wine) — does it separate the media narrative from the
  underlying evidence?
- **Fiction firewall** (10% of brain, Miranda/one-phone-call myths) — does it identify
  Tier E as the *origin* of a belief and correct it from Tier A/B sources?
- **Survey claims** (death penalty support, dogs vs. cats) — does it demand polling
  evidence or admit "common assumption, not a quantified finding"?
- **Incentive symmetry** (media bias, sentencing/deterrence, Tesla FSD) — does it
  surface incentives on *all* sides, and discount rather than dismiss?
- **Predictions** (AI startup) — does it label predictions and anchor on base rates?
- **Media mode** (immigration framing, movie reception) — does it answer
  narrative-description questions with attributed narrative instead of refusing or
  laundering claims into fact?

A run is a success if the engine column beats baseline on rubric passes — especially on
the fiction-firewall, survey-claim, and provenance items, which baseline models most
commonly fail via vague-authority language ("many people feel...", "studies show...").
