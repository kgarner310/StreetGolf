#!/usr/bin/env python3
"""Run the epistemic-engine eval set against the Claude API.

For each question, gets two answers — baseline (no system prompt) and engine
(the epistemic-engine system prompt) — then has a judge model score both
against the question's rubric. Writes a markdown report.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    pip install anthropic
    python run_eval.py                 # full run
    python run_eval.py --only legal    # one domain
    python run_eval.py --only legal-01 # one question
    python run_eval.py --no-judge      # collect answers only, grade by hand

Costs a few dollars for a full run (15 questions x 2 answers + 30 judge calls).
"""

import argparse
import json
import sys
from datetime import date
from pathlib import Path

try:
    import anthropic
except ImportError:
    sys.exit("pip install anthropic")

HERE = Path(__file__).parent
ANSWER_MODEL = "claude-sonnet-5"
JUDGE_MODEL = "claude-opus-4-8"
MAX_TOKENS = 1500

JUDGE_PROMPT = """You are grading an AI answer against a rubric. For each rubric item,
decide pass or fail based only on the answer text. Be strict: vague gestures at a
criterion do not pass it. Judge calibration, provenance, and quarantine behavior — not
writing style.

Question asked: {question}
Expected evidence profile: {profile}

Rubric:
{rubric}

Answer to grade:
---
{answer}
---

Respond with JSON only, no prose:
{{"scores": [{{"item": 1, "pass": true, "note": "<=15 words"}}, ...], "total_pass": <int>}}"""


def ask(client, question: str, system: str | None) -> str:
    kwargs = dict(
        model=ANSWER_MODEL,
        max_tokens=MAX_TOKENS,
        messages=[{"role": "user", "content": question}],
    )
    if system:
        kwargs["system"] = system
    return client.messages.create(**kwargs).content[0].text


def judge(client, q: dict, answer: str) -> dict:
    rubric = "\n".join(f"{i+1}. {item}" for i, item in enumerate(q["rubric"]))
    prompt = JUDGE_PROMPT.format(
        question=q["question"], profile=q["profile"], rubric=rubric, answer=answer
    )
    text = client.messages.create(
        model=JUDGE_MODEL,
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    ).content[0].text
    start, end = text.find("{"), text.rfind("}") + 1
    try:
        return json.loads(text[start:end])
    except (json.JSONDecodeError, ValueError):
        return {"scores": [], "total_pass": -1, "error": text[:200]}


def load_system_prompt() -> str:
    text = (HERE.parent / "system-prompt.md").read_text()
    # The operational prompt is everything after the first horizontal rule.
    return text.split("\n---\n", 1)[1].strip()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="run only this domain or question id")
    ap.add_argument("--no-judge", action="store_true", help="skip judge grading")
    ap.add_argument("--out", default=None, help="report path")
    args = ap.parse_args()

    client = anthropic.Anthropic()
    system_prompt = load_system_prompt()
    questions = json.loads((HERE / "questions.json").read_text())["questions"]
    if args.only:
        questions = [
            q for q in questions
            if q["id"] == args.only or q["domain"] == args.only
        ]
        if not questions:
            sys.exit(f"no questions match --only {args.only}")

    rows = []
    for q in questions:
        print(f"[{q['id']}] asking baseline...", flush=True)
        baseline = ask(client, q["question"], system=None)
        print(f"[{q['id']}] asking engine...", flush=True)
        engine = ask(client, q["question"], system=system_prompt)

        row = {"q": q, "baseline": baseline, "engine": engine}
        if not args.no_judge:
            print(f"[{q['id']}] judging...", flush=True)
            row["baseline_grade"] = judge(client, q, baseline)
            row["engine_grade"] = judge(client, q, engine)
        rows.append(row)

    out = Path(args.out) if args.out else HERE / f"report-{date.today()}.md"
    write_report(rows, out, graded=not args.no_judge)
    print(f"\nreport written to {out}")


def write_report(rows: list, out: Path, graded: bool) -> None:
    lines = ["# Epistemic engine eval report", ""]
    if graded:
        lines += ["| id | rubric items | baseline pass | engine pass |",
                  "|----|----|----|----|"]
        for r in rows:
            n = len(r["q"]["rubric"])
            b = r["baseline_grade"].get("total_pass", "?")
            e = r["engine_grade"].get("total_pass", "?")
            lines.append(f"| {r['q']['id']} | {n} | {b} | {e} |")
        bt = sum(r["baseline_grade"].get("total_pass", 0) for r in rows)
        et = sum(r["engine_grade"].get("total_pass", 0) for r in rows)
        nt = sum(len(r["q"]["rubric"]) for r in rows)
        lines += ["", f"**Totals: baseline {bt}/{nt}, engine {et}/{nt}**", ""]
    for r in rows:
        q = r["q"]
        lines += [f"## {q['id']} — {q['domain']}", "",
                  f"**Q:** {q['question']}", "",
                  f"**Profile:** {q['profile']}", ""]
        for label, key, gkey in (("Baseline", "baseline", "baseline_grade"),
                                 ("Engine", "engine", "engine_grade")):
            lines += [f"### {label}", "", r[key], ""]
            if graded and gkey in r:
                for s in r[gkey].get("scores", []):
                    mark = "PASS" if s.get("pass") else "FAIL"
                    idx = s.get("item", "?")
                    item_text = ""
                    if isinstance(idx, int) and 1 <= idx <= len(q["rubric"]):
                        item_text = q["rubric"][idx - 1]
                    lines.append(f"- **{mark}** {item_text} — {s.get('note', '')}")
                lines.append("")
    out.write_text("\n".join(lines))


if __name__ == "__main__":
    main()
