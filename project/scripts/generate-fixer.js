#!/usr/bin/env node
// ============================================================
// NekoCore OS — System Repair Generator
//
// Reads every core file from the live project, Base64-encodes it,
// and wraps them all into a standalone Python repair script:
//   neko_fixer.py
//
// The generated script is zero-dependency (Python 3 stdlib only),
// cross-platform, and can rebuild any missing or corrupted core
// file from its embedded "DNA dictionary."
//
// Usage:
//   node scripts/generate-fixer.js                  # generate neko_fixer.py
//   node scripts/generate-fixer.js --output /path   # custom output dir
//   node scripts/generate-fixer.js --dry-run        # preview, no write
//
// The generated neko_fixer.py supports:
//   python neko_fixer.py                # dry-run integrity check
//   python neko_fixer.py --repair       # repair missing/empty files
//   python neko_fixer.py --force        # overwrite all files from DNA
//   python neko_fixer.py --verify       # verify hashes of existing files
//   python neko_fixer.py --list         # list all embedded files
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const { CORE_REGISTRY } = require('./health-scan');

const DEFAULT_OUTPUT = path.join(PROJECT_ROOT, 'neko_fixer.py');

function generateFixer(options = {}) {
  const { outputPath = DEFAULT_OUTPUT, dryRun = false } = options;

  console.log('NekoCore OS — System Repair Generator');
  console.log('='.repeat(50));

  // ---- Step 1: Read and encode all core files ----
  const dna = {};
  let totalSize = 0;
  let encodedCount = 0;
  let skippedCount = 0;

  for (const [relPath, description] of Object.entries(CORE_REGISTRY)) {
    const abs = path.join(PROJECT_ROOT, relPath);
    // Normalize to forward slashes for cross-platform Python dict
    const key = relPath.replace(/\\/g, '/');

    if (!fs.existsSync(abs)) {
      console.log(`  SKIP (missing): ${relPath}`);
      skippedCount++;
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(abs);
    } catch (e) {
      console.log(`  SKIP (unreadable): ${relPath} — ${e.message}`);
      skippedCount++;
      continue;
    }

    if (content.length === 0) {
      console.log(`  SKIP (empty): ${relPath}`);
      skippedCount++;
      continue;
    }

    const b64 = content.toString('base64');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    dna[key] = { b64, hash, size: content.length, description };
    totalSize += content.length;
    encodedCount++;
  }

  console.log(`\nEncoded: ${encodedCount} files (${(totalSize / 1024).toFixed(1)} KB)`);
  if (skippedCount > 0) console.log(`Skipped: ${skippedCount} files (missing/empty)`);

  // ---- Step 2: Build the Python script ----
  const timestamp = new Date().toISOString();
  const dnaEntries = [];

  for (const [key, entry] of Object.entries(dna)) {
    // Split long base64 strings into 76-char lines for readability
    const lines = [];
    for (let i = 0; i < entry.b64.length; i += 76) {
      lines.push(entry.b64.substring(i, i + 76));
    }
    const b64Str = lines.join('\n        ');

    dnaEntries.push(`    "${key}": {
        "b64": (
            "${b64Str}"
        ),
        "sha256": "${entry.hash}",
        "size": ${entry.size},
        "desc": "${entry.description.replace(/"/g, '\\"')}"
    }`);
  }

  const pythonScript = `#!/usr/bin/env python3
"""
NekoCore OS — System Repair Script (neko_fixer.py)
Generated: ${timestamp}
Files embedded: ${encodedCount}
Total uncompressed: ${(totalSize / 1024).toFixed(1)} KB

This is the "BIOS" for NekoCore OS. It contains Base64-encoded copies of every
core system file. When run, it can detect missing or corrupted files and rebuild
them from its internal DNA dictionary.

Once core files are restored, the Neko Entity takes over repair of the rest.

Usage:
    python neko_fixer.py                # Dry-run integrity check (safe, read-only)
    python neko_fixer.py --repair       # Repair missing and zero-byte files only
    python neko_fixer.py --force        # Overwrite ALL files from DNA (full restore)
    python neko_fixer.py --verify       # Verify SHA-256 hashes of existing files
    python neko_fixer.py --list         # List all embedded files and sizes

Zero dependencies — uses only Python 3 standard library.
Cross-platform: Windows, macOS, Linux.
"""

import base64
import hashlib
import os
import sys
import argparse
from pathlib import Path


# ============================================================
# DNA DICTIONARY
# Each entry: relative_path -> { b64, sha256, size, desc }
# ============================================================

DNA = {
${dnaEntries.join(',\n')}
}


# ============================================================
# REPAIR ENGINE
# ============================================================

def find_project_root():
    """
    Find the project root by looking for markers.
    neko_fixer.py should be placed in or near the project root.
    """
    # Try current directory first
    cwd = Path.cwd()
    
    # Check if we're in the project root (has server/ and client/)
    if (cwd / "server").is_dir() and (cwd / "client").is_dir():
        return cwd
    
    # Check if neko_fixer.py is in the project root
    script_dir = Path(__file__).resolve().parent
    if (script_dir / "server").is_dir() and (script_dir / "client").is_dir():
        return script_dir
    
    # Check parent directory
    parent = script_dir.parent
    if (parent / "server").is_dir() and (parent / "client").is_dir():
        return parent
    
    # Check if we're in the project/ subdirectory of a workspace
    if (cwd / "project" / "server").is_dir():
        return cwd / "project"
    
    if (script_dir / "project" / "server").is_dir():
        return script_dir / "project"
    
    print("ERROR: Cannot find project root (need server/ and client/ directories).")
    print(f"  Checked: {cwd}")
    print(f"  Checked: {script_dir}")
    print("  Place neko_fixer.py in or near the project root and try again.")
    sys.exit(1)


def decode_file(entry):
    """Decode a DNA entry back to bytes."""
    raw_b64 = entry["b64"].replace("\\n", "").replace(" ", "")
    return base64.b64decode(raw_b64)


def hash_bytes(data):
    """SHA-256 hash of bytes."""
    return hashlib.sha256(data).hexdigest()


def check_integrity(project_root, verbose=False):
    """
    Check all core files against DNA. Returns lists of issues.
    """
    missing = []
    zero_byte = []
    corrupted = []
    healthy = []

    for rel_path, entry in DNA.items():
        abs_path = project_root / rel_path
        
        if not abs_path.exists():
            missing.append(rel_path)
            if verbose:
                print(f"  [MISSING]   {rel_path} — {entry['desc']}")
            continue
        
        file_size = abs_path.stat().st_size
        if file_size == 0:
            zero_byte.append(rel_path)
            if verbose:
                print(f"  [ZERO-BYTE] {rel_path} — {entry['desc']}")
            continue
        
        # Hash check
        try:
            existing = abs_path.read_bytes()
            existing_hash = hash_bytes(existing)
            if existing_hash != entry["sha256"]:
                corrupted.append(rel_path)
                if verbose:
                    print(f"  [MODIFIED]  {rel_path} — hash mismatch")
            else:
                healthy.append(rel_path)
                if verbose:
                    print(f"  [OK]        {rel_path}")
        except Exception as e:
            corrupted.append(rel_path)
            if verbose:
                print(f"  [ERROR]     {rel_path} — {e}")

    return missing, zero_byte, corrupted, healthy


def repair_file(project_root, rel_path, entry, force=False):
    """
    Restore a single file from DNA.
    Returns True if file was written, False if skipped.
    """
    abs_path = project_root / rel_path
    
    # Safety: don't overwrite healthy files unless forced
    if not force and abs_path.exists() and abs_path.stat().st_size > 0:
        existing_hash = hash_bytes(abs_path.read_bytes())
        if existing_hash == entry["sha256"]:
            return False  # Already healthy
    
    # Decode from DNA
    content = decode_file(entry)
    
    # Verify decoded content matches expected hash
    if hash_bytes(content) != entry["sha256"]:
        print(f"  [DNA-ERROR] {rel_path} — decoded content hash mismatch (DNA may be corrupt)")
        return False
    
    # Create parent directories
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write file
    abs_path.write_bytes(content)
    return True


# ============================================================
# CLI
# ============================================================

def cmd_check(project_root):
    """Dry-run integrity check."""
    print("NekoCore OS — Integrity Check (dry-run, read-only)")
    print("=" * 50)
    print(f"Project root: {project_root}")
    print(f"DNA files:    {len(DNA)}")
    print()
    
    missing, zero_byte, corrupted, healthy = check_integrity(project_root, verbose=True)
    
    print()
    print("SUMMARY")
    print("-" * 30)
    print(f"  Healthy:    {len(healthy)}")
    print(f"  Missing:    {len(missing)}")
    print(f"  Zero-byte:  {len(zero_byte)}")
    print(f"  Modified:   {len(corrupted)}")
    
    total_issues = len(missing) + len(zero_byte)
    if total_issues == 0:
        print("\\n  All core files present and non-empty.")
        print("  Modified files may be intentional updates since DNA was generated.")
    else:
        print(f"\\n  {total_issues} file(s) need repair. Run with --repair to fix.")
    
    return total_issues


def cmd_repair(project_root):
    """Repair missing and zero-byte files only."""
    print("NekoCore OS — System Repair")
    print("=" * 50)
    print(f"Project root: {project_root}")
    print()
    
    missing, zero_byte, corrupted, healthy = check_integrity(project_root)
    needs_repair = set(missing + zero_byte)
    
    if not needs_repair:
        print("All core files present and non-empty. Nothing to repair.")
        return 0
    
    print(f"Repairing {len(needs_repair)} file(s)...\\n")
    repaired = 0
    failed = 0
    
    for rel_path in sorted(needs_repair):
        entry = DNA[rel_path]
        try:
            if repair_file(project_root, rel_path, entry, force=True):
                print(f"  [RESTORED] {rel_path}")
                repaired += 1
            else:
                print(f"  [SKIPPED]  {rel_path}")
        except Exception as e:
            print(f"  [FAILED]   {rel_path} — {e}")
            failed += 1
    
    print(f"\\nRepaired: {repaired}  Failed: {failed}")
    return failed


def cmd_force(project_root):
    """Force-overwrite ALL files from DNA."""
    print("NekoCore OS — Full System Restore (FORCE)")
    print("=" * 50)
    print(f"Project root: {project_root}")
    print(f"This will overwrite ALL {len(DNA)} core files.\\n")
    
    confirm = input("Type 'RESTORE' to confirm: ").strip()
    if confirm != "RESTORE":
        print("Aborted.")
        return 1
    
    print()
    restored = 0
    failed = 0
    
    for rel_path, entry in sorted(DNA.items()):
        try:
            repair_file(project_root, rel_path, entry, force=True)
            print(f"  [RESTORED] {rel_path}")
            restored += 1
        except Exception as e:
            print(f"  [FAILED]   {rel_path} — {e}")
            failed += 1
    
    print(f"\\nRestored: {restored}  Failed: {failed}")
    return failed


def cmd_verify(project_root):
    """Verify SHA-256 hashes of all existing files."""
    print("NekoCore OS — Hash Verification")
    print("=" * 50)
    
    mismatches = 0
    for rel_path, entry in sorted(DNA.items()):
        abs_path = project_root / rel_path
        if not abs_path.exists():
            print(f"  [MISSING] {rel_path}")
            mismatches += 1
            continue
        
        try:
            existing_hash = hash_bytes(abs_path.read_bytes())
            if existing_hash == entry["sha256"]:
                print(f"  [MATCH]   {rel_path}")
            else:
                print(f"  [DIFFER]  {rel_path}")
                mismatches += 1
        except Exception as e:
            print(f"  [ERROR]   {rel_path} — {e}")
            mismatches += 1
    
    print(f"\\n{len(DNA) - mismatches}/{len(DNA)} files match DNA hashes.")
    return mismatches


def cmd_list():
    """List all embedded files."""
    print("NekoCore OS — Embedded File Inventory")
    print("=" * 50)
    print(f"{'Size':>8}  {'File'}")
    print("-" * 50)
    
    total = 0
    for rel_path, entry in sorted(DNA.items()):
        size_kb = entry["size"] / 1024
        print(f"{size_kb:7.1f}K  {rel_path}")
        total += entry["size"]
    
    print("-" * 50)
    print(f"{total/1024:7.1f}K  TOTAL ({len(DNA)} files)")


def main():
    parser = argparse.ArgumentParser(
        description="NekoCore OS System Repair Script",
        epilog="Default mode is dry-run integrity check (safe, read-only)."
    )
    parser.add_argument("--repair", action="store_true",
                        help="Repair missing and zero-byte core files")
    parser.add_argument("--force", action="store_true",
                        help="Force overwrite ALL core files from DNA (requires confirmation)")
    parser.add_argument("--verify", action="store_true",
                        help="Verify SHA-256 hashes of existing files")
    parser.add_argument("--list", action="store_true",
                        help="List all embedded files and sizes")
    parser.add_argument("--root", type=str, default=None,
                        help="Explicit project root path")
    
    args = parser.parse_args()
    
    if args.list:
        cmd_list()
        return
    
    if args.root:
        project_root = Path(args.root).resolve()
    else:
        project_root = find_project_root()
    
    if args.force:
        sys.exit(cmd_force(project_root))
    elif args.repair:
        sys.exit(cmd_repair(project_root))
    elif args.verify:
        sys.exit(cmd_verify(project_root))
    else:
        sys.exit(cmd_check(project_root))


if __name__ == "__main__":
    main()
`;

  // ---- Step 3: Write or preview ----
  if (dryRun) {
    console.log(`\n[DRY RUN] Would write ${(pythonScript.length / 1024).toFixed(1)} KB to: ${outputPath}`);
    console.log(`First 80 lines:\n`);
    console.log(pythonScript.split('\n').slice(0, 80).join('\n'));
    return { encodedCount, skippedCount, totalSize, outputPath, dryRun: true };
  }

  try {
    fs.writeFileSync(outputPath, pythonScript, 'utf-8');
    const outSize = fs.statSync(outputPath).size;
    console.log(`\nGenerated: ${outputPath}`);
    console.log(`Output size: ${(outSize / 1024).toFixed(1)} KB`);
    console.log(`\nTo verify: python neko_fixer.py`);
    console.log(`To repair: python neko_fixer.py --repair`);
  } catch (e) {
    console.error(`\nFailed to write output: ${e.message}`);
    process.exitCode = 1;
  }

  return { encodedCount, skippedCount, totalSize, outputPath, dryRun: false };
}

// Export for programmatic use & tests
module.exports = { generateFixer };

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx >= 0 && args[outputIdx + 1]
    ? path.resolve(args[outputIdx + 1], 'neko_fixer.py')
    : DEFAULT_OUTPUT;

  generateFixer({ outputPath, dryRun });
}
