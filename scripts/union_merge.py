#!/usr/bin/env python3
"""Union-merge a dropped ("theirs") chunk back into a resolved file.

For declaration-only modules (icon sets, constant maps) taking one side of a
conflict silently removes exports the other side built. This re-adds any
`export function NAME` / `export const NAME` block from the discarded side that
is not already defined, so the module becomes the union of both.

Usage: python3 scripts/union_merge.py <target-file> <dropped-chunk-file>
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

DECL = re.compile(r"^export (?:async )?(?:function|const|type|interface) (\w+)", re.M)


def blocks(text: str):
    """Yield (name, source) for each top-level export declaration."""
    lines = text.splitlines(keepends=True)
    i = 0
    while i < len(lines):
        m = DECL.match(lines[i])
        if not m:
            i += 1
            continue
        name = m.group(1)
        start = i
        depth = 0
        seen_brace = False
        while i < len(lines):
            line = lines[i]
            depth += line.count("{") - line.count("}")
            if "{" in line:
                seen_brace = True
            i += 1
            if not seen_brace and line.rstrip().endswith(";"):
                break
            if seen_brace and depth <= 0:
                break
        yield name, "".join(lines[start:i])


def main() -> int:
    target = Path(sys.argv[1])
    dropped = Path(sys.argv[2])
    body = target.read_text()
    discarded = dropped.read_text()
    # strip the "--- hunk #n ... ---" annotations this repo's resolver writes
    discarded = re.sub(r"^--- hunk #\d+.*---$", "", discarded, flags=re.M)

    added = []
    for name, src in blocks(discarded):
        if re.search(rf"^export (?:async )?(?:function|const|type|interface) {re.escape(name)}\b", body, re.M):
            continue
        body = body.rstrip() + "\n\n" + src.strip() + "\n"
        added.append(name)

    target.write_text(body)
    print(f"{target}: re-added {len(added)} declaration(s)")
    if added:
        print("  " + ", ".join(added))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
