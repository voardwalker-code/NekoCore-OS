#!/usr/bin/env node
// ── MA Fixer Generator ──────────────────────────────────────────────────────
// Reads MA core files, Base64-encodes them, wraps into a standalone Python
// repair script (ma_fixer.py). Same pattern as NekoCore's generate-fixer.js
// but scoped to MA files only.
//
// Usage: node scripts/generate-fixer.js
'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const MA_ROOT  = path.resolve(__dirname, '..');
const { CORE_REGISTRY } = require('../MA-server/MA-health');
const OUTPUT   = path.join(MA_ROOT, 'ma_fixer.py');

// ── Encode all core files ───────────────────────────────────────────────────
const dna = {};
let totalSize = 0, encoded = 0, skipped = 0;

for (const [rel, desc] of Object.entries(CORE_REGISTRY)) {
  const abs = path.join(MA_ROOT, rel);
  const key = rel.replace(/\\/g, '/');

  if (!fs.existsSync(abs) || fs.statSync(abs).size === 0) {
    console.log(`  SKIP: ${rel}`);
    skipped++;
    continue;
  }

  const content = fs.readFileSync(abs);
  dna[key] = {
    b64: content.toString('base64'),
    hash: crypto.createHash('sha256').update(content).digest('hex'),
    size: content.length,
    desc
  };
  totalSize += content.length;
  encoded++;
}

console.log(`Encoded: ${encoded} files (${(totalSize / 1024).toFixed(1)} KB), skipped: ${skipped}`);

// ── Build DNA entries for Python ────────────────────────────────────────────
const dnaEntries = Object.entries(dna).map(([key, e]) => {
  const lines = [];
  for (let i = 0; i < e.b64.length; i += 76) lines.push(e.b64.substring(i, i + 76));
  return `    "${key}": {\n        "b64": (\n            "${lines.join('\\n"\n            "')}"\n        ),\n        "sha256": "${e.hash}",\n        "size": ${e.size},\n        "desc": "${e.desc.replace(/"/g, '\\"')}"\n    }`;
});

// ── Generate Python script ──────────────────────────────────────────────────
const ts = new Date().toISOString();
const py = `#!/usr/bin/env python3
"""
MA — System Repair Script (ma_fixer.py)
Generated: ${ts}
Files: ${encoded} | Size: ${(totalSize / 1024).toFixed(1)} KB

Usage:
    python ma_fixer.py              # dry-run integrity check
    python ma_fixer.py --repair     # restore missing/empty files
    python ma_fixer.py --force      # overwrite all from DNA
    python ma_fixer.py --verify     # SHA-256 hash check
    python ma_fixer.py --list       # list embedded files

Zero dependencies — Python 3 stdlib only.
"""
import base64, hashlib, os, sys, argparse
from pathlib import Path

DNA = {
${dnaEntries.join(',\n')}
}

def find_root():
    for d in [Path.cwd(), Path(__file__).resolve().parent]:
        if (d / "MA-Server.js").exists():
            return d
        if (d / "server").is_dir() and (d / "client").is_dir():
            return d
    print("ERROR: Cannot find MA root (need MA-Server.js).")
    sys.exit(1)

def decode(entry):
    return base64.b64decode(entry["b64"].replace("\\n", "").replace(" ", ""))

def sha(data):
    return hashlib.sha256(data).hexdigest()

def run(args):
    root = find_root()
    print(f"MA root: {root}")
    print(f"Files in DNA: {len(DNA)}")
    print()

    issues = []
    for rel, entry in DNA.items():
        fp = root / rel
        expected = decode(entry)

        if not fp.exists():
            issues.append(("MISSING", rel, entry["desc"]))
            if args.repair or args.force:
                fp.parent.mkdir(parents=True, exist_ok=True)
                fp.write_bytes(expected)
                print(f"  RESTORED: {rel}")
        elif fp.stat().st_size == 0:
            issues.append(("EMPTY", rel, entry["desc"]))
            if args.repair or args.force:
                fp.write_bytes(expected)
                print(f"  RESTORED: {rel}")
        elif args.force:
            fp.write_bytes(expected)
            print(f"  OVERWRITTEN: {rel}")
        elif args.verify:
            actual = sha(fp.read_bytes())
            if actual != entry["sha256"]:
                issues.append(("MODIFIED", rel, f"expected {entry['sha256'][:12]}... got {actual[:12]}..."))
                print(f"  MISMATCH: {rel}")
            else:
                print(f"  OK: {rel}")
        elif args.list:
            print(f"  {rel:40s} {entry['size']:>8d} B  {entry['desc']}")

    if not args.list:
        print()
        if issues:
            print(f"Issues found: {len(issues)}")
            for sev, rel, desc in issues:
                print(f"  [{sev}] {rel} — {desc}")
        else:
            print("All files OK." if args.verify else f"All {len(DNA)} core files present.")

if __name__ == "__main__":
    p = argparse.ArgumentParser(description="MA System Repair")
    p.add_argument("--repair", action="store_true", help="Restore missing/empty files")
    p.add_argument("--force", action="store_true", help="Overwrite all files from DNA")
    p.add_argument("--verify", action="store_true", help="SHA-256 hash verification")
    p.add_argument("--list", action="store_true", help="List embedded files")
    run(p.parse_args())
`;

fs.writeFileSync(OUTPUT, py, 'utf8');
console.log(`\nGenerated: ${OUTPUT}`);
