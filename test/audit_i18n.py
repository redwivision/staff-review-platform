# -*- coding: utf-8 -*-
"""Full i18n audit: dictionary integrity + t() key coverage across src/."""
import os
import re
from collections import Counter

DICT = "src/i18n/am.ts"
src = open(DICT, encoding="utf-8").read()

rows = re.findall(r'^\s*"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)"', src, re.M)
dups = [k for k, c in Counter(k for k, _ in rows).items() if c > 1]
print(f"dictionary entries: {len(rows)}")
print("duplicate keys:", dups or "none")

FOREIGN = [(0x0980, 0x09FF, "Bengali"), (0x0900, 0x097F, "Devanagari"),
           (0x0D00, 0x0D7F, "Malayalam"), (0x0E00, 0x0E7F, "Thai"),
           (0x0400, 0x04FF, "Cyrillic")]
leaks = {}
for k, v in rows:
    for ch in v:
        o = ord(ch)
        for lo, hi, name in FOREIGN:
            if lo <= o <= hi:
                leaks.setdefault(k, set()).add(name)
        if o in (0xFFFD, 0x0007):
            leaks.setdefault(k, set()).add("control/replacement")
print("foreign-script leaks:", {k: sorted(v) for k, v in leaks.items()} or "none")

# Key coverage. t() must be followed by a string literal for this to work;
# keys built at runtime fall back to English, which is acceptable.
known = {k for k, _ in rows}
missing = {}
files = []
for root, _, names in os.walk("src"):
    for n in names:
        if n.endswith((".ts", ".tsx")):
            files.append(os.path.join(root, n))

for path in sorted(files):
    text = open(path, encoding="utf-8").read()
    used = set(re.findall(r'(?<![A-Za-z0-9_$.])t\(\s*"((?:[^"\\]|\\.)*)"', text))
    gone = sorted(k for k in used if k not in known)
    if gone:
        missing[path] = gone

if missing:
    print("\nUNTRANSLATED t() KEYS:")
    for path, gone in missing.items():
        print(f"  {path} ({len(gone)})")
        for k in gone:
            print(f"     {k!r}")
else:
    print("\nuntranslated t() keys: none")
