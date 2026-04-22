#!/usr/bin/env python3
"""
Wait for Fandom IP block to lift, then resume Phase 2 automatically.
Checks every 5 minutes. Runs Phase 2 + Phase 3 when unblocked.
"""
import time
import subprocess
import sys

try:
    from curl_cffi import requests
    IMPERSONATE = "chrome110"
except ImportError:
    import requests  # type: ignore
    IMPERSONATE = None

CHECK_INTERVAL = 300  # 5 minutes
TEST_URL = "https://prodigy-game.fandom.com/api.php"
TEST_PARAMS = {"action": "parse", "page": "Burnewt", "prop": "wikitext", "format": "json"}

def is_unblocked() -> bool:
    try:
        kwargs = {"timeout": 10}
        if IMPERSONATE:
            kwargs["impersonate"] = IMPERSONATE
        r = requests.get(TEST_URL, params=TEST_PARAMS, **kwargs)
        return r.status_code == 200
    except Exception:
        return False

def main():
    print("Waiting for Fandom IP block to lift...")
    print(f"Checking every {CHECK_INTERVAL // 60} minutes.\n")

    attempt = 0
    while True:
        attempt += 1
        now = time.strftime("%H:%M:%S")
        if is_unblocked():
            print(f"[{now}] IP UNBLOCKED! Starting Phase 2...")
            result = subprocess.run([sys.executable, "crawler.py", "--phase2"], check=False)
            if result.returncode == 0:
                print("\nPhase 2 done! Running Phase 3...")
                subprocess.run([sys.executable, "crawler.py", "--phase3"], check=False)
                print("\nAll done! Output files ready in ./output/")
            else:
                print("Phase 2 ended with error. Check and re-run manually.")
            break
        else:
            print(f"[{now}] Still blocked (attempt {attempt}). Retrying in {CHECK_INTERVAL // 60} min...")
            time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    main()
