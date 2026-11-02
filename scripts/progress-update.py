"""Read-only progress report for a script-only Hermes Telegram schedule."""
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parents[1]
state_file = root / ".local-server" / "progress.json"
try:
    state = json.loads(state_file.read_text(encoding="utf-8"))
except (OSError, ValueError) as error:
    print(f"Sloppy Soccer: progress snapshot unavailable ({type(error).__name__}). No new progress is being claimed.")
    raise SystemExit(0)

def git(*args):
    result = subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, timeout=10)
    return result.stdout.strip() if result.returncode == 0 else "unavailable"

print("Sloppy Soccer progress")
print("Report time: " + datetime.now(timezone.utc).isoformat(timespec="minutes"))
print("Branch: " + git("branch", "--show-current"))
print("Status: " + state.get("state", "unknown") + " / " + state.get("phase", "unknown"))
print("Last architect update: " + state.get("updatedAt", "unknown"))
for text in state.get("completed", []):
    print("Done: " + str(text))
for text in state.get("remaining", []):
    print("Next: " + str(text))
print("Checks: " + state.get("tests", "No verified test result recorded."))
print(state.get("live", ""))
