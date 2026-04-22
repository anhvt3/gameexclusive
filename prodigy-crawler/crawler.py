#!/usr/bin/env python3
"""
Prodigy Math Wiki Crawler
Usage:
  python crawler.py           -- full run (resumes from checkpoint if interrupted)
  python crawler.py --phase1  -- discovery only
  python crawler.py --phase2  -- fetch only (requires phase1 done)
  python crawler.py --phase3  -- output only (requires phase2 done)
  python crawler.py --reset   -- delete checkpoint and start fresh
"""
import os
import sys


def main():
    args = set(sys.argv[1:])

    if "--reset" in args:
        for f in ["checkpoint.json", "master_pages.txt"]:
            if os.path.exists(f):
                os.remove(f)
                print(f"  Deleted {f}")
        print("  Reset done. Re-run without --reset to start fresh.")
        return

    from phase1_discover import discover_all_pages
    from phase2_fetch import fetch_all
    from phase3_output import generate

    print("=" * 50)
    print("  Prodigy Math Wiki Crawler")
    print("=" * 50)

    run_all = not (args & {"--phase1", "--phase2", "--phase3"})

    if run_all or "--phase1" in args:
        print("\n[Phase 1] Discovering pages via category BFS...")
        pages = discover_all_pages()
        print(f"  {len(pages)} unique pages discovered\n")
    else:
        from config import MASTER_PAGES_FILE
        if os.path.exists(MASTER_PAGES_FILE):
            with open(MASTER_PAGES_FILE, encoding="utf-8") as _f:
                pages = [line.strip() for line in _f if line.strip()]
            print(f"[Phase 1] Skipped -- {len(pages)} pages from {MASTER_PAGES_FILE}\n")
        else:
            from checkpoint import load
            pages = load().get("discovered", [])
            print(f"[Phase 1] Skipped -- {len(pages)} pages from checkpoint\n")

    if run_all or "--phase2" in args:
        print("[Phase 2] Fetching page content...")
        fetch_all(pages)
        print()

    if run_all or "--phase3" in args:
        print("[Phase 3] Generating output files...")
        generate()

    print("\nDone. Output files in ./output/")
    print("Load individual files into Claude/Antigravity as needed.")


if __name__ == "__main__":
    main()
