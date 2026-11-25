#!/usr/bin/env python3
"""Resolve committed merge-conflict markers by keeping the HEAD ("ours") side.

The HEAD side of every conflict is the dark market-terminal implementation
(TerminalShell + terminal tokens). That is the design system the project is
standardising on, so it is the side we keep.

Usage:
  python3 scripts/resolve_conflicts.py          # dry run, reports only
  python3 scripts/resolve_conflicts.py --write  # rewrite files in place
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGETS = ["src", "supabase", "scripts", "tests", "."]

OURS = re.compile(r"^<<<<<<< ")
MID = re.compile(r"^=======\s*$")
THEIRS = re.compile(r"^>>>>>>> ")


def resolve(text: str):
    out: list[str] = []
    discarded: list[str] = []
    hunks = 0
    dropped = 0
    in_ours = in_theirs = False
    hunk_start = 0
    for line in text.splitlines(keepends=True):
        if OURS.match(line):
            hunks += 1
            in_ours, in_theirs = True, False
            hunk_start = len(out)
            continue
        if in_ours and MID.match(line):
            in_theirs = True
            discarded.append(f"\n--- hunk #{hunks} (after kept line {hunk_start}) ---\n")
            continue
        if in_ours and THEIRS.match(line):
            in_ours = in_theirs = False
            continue
        if in_theirs:
            dropped += 1
            discarded.append(line)
            continue
        out.append(line)
    return "".join(out), hunks, dropped, "".join(discarded)


def iter_files():
    for base in TARGETS:
        for p in (ROOT / base).rglob("*"):
            if p.is_file() and p.suffix in {".ts", ".tsx", ".css", ".sql", ".mjs", ".json", ".md", ".sh"}:
                yield p


def main() -> int:
    write = "--write" in sys.argv
    report = []
    for path in iter_files():
        try:
            text = path.read_text()
        except UnicodeDecodeError:
            continue
        if "<<<<<<< " not in text:
            continue
        fixed, hunks, dropped, discarded = resolve(text)
        rel = str(path.relative_to(ROOT))
        report.append({"file": rel, "hunks": hunks, "lines_dropped": dropped})
        if dropped:
            out = ROOT / "review" / "dropped" / (rel.replace("/", "__") + ".txt")
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(discarded)
        if write:
            path.write_text(fixed)

    report.sort(key=lambda r: (-r["hunks"], r["file"]))
    total_hunks = sum(r["hunks"] for r in report)
    print(f"{'RESOLVED' if write else 'WOULD RESOLVE'} {len(report)} files, {total_hunks} hunks")
    for r in report[:40]:
        print(f"  {r['hunks']:>3} hunk(s)  -{r['lines_dropped']:>4} lines  {r['file']}")
    if len(report) > 40:
        print(f"  … {len(report) - 40} more")
    (ROOT / "review" / "conflict-resolution.json").write_text(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
