#!/usr/bin/env python3
"""Start/stop the whole RESET AI app (backend + web) for local development.

Usage:
    python run_app.py start     Launch the FastAPI backend (:8000) and the
                                Next.js web app (:3000) in the background.
    python run_app.py stop      Stop both.
    python run_app.py restart   Stop, then start.
    python run_app.py status    Show whether each is running/reachable.

PIDs and logs live under .run/ (gitignored). Reads backend/.env for the LLM
mode - this just launches what's already configured there, it doesn't set
LLM_MODE itself.
"""

from __future__ import annotations

import json
import platform
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
WEB_DIR = ROOT / "web"
RUN_DIR = ROOT / ".run"
STATE_FILE = RUN_DIR / "state.json"
BACKEND_LOG = RUN_DIR / "backend.log"
WEB_LOG = RUN_DIR / "web.log"

BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 8000
WEB_PORT = 3000
IS_WINDOWS = platform.system() == "Windows"


def _load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {}


def _save_state(state: dict) -> None:
    RUN_DIR.mkdir(exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))


def _is_alive(pid: int | None) -> bool:
    if not pid:
        return False
    if IS_WINDOWS:
        result = subprocess.run(
            ["tasklist", "/FI", f"PID eq {pid}"], capture_output=True, text=True
        )
        return str(pid) in result.stdout
    import os

    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def _kill(pid: int) -> None:
    if IS_WINDOWS:
        # /T kills the whole process tree - npm/uvicorn spawn child processes
        # that survive a plain taskkill on just the parent PID otherwise.
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)
    else:
        import os
        import signal

        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except ProcessLookupError:
            pass


def _port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        return sock.connect_ex(("127.0.0.1", port)) == 0


def _wait_for(url: str, timeout: float = 45.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except Exception:
            time.sleep(1)
    return False


def _start_one(pid_key: str, label: str, cmd: list[str], cwd: Path, log_path: Path, port: int, health_url: str) -> dict:
    state = _load_state()
    if state.get(pid_key) and _is_alive(state[pid_key]):
        print(f"{label} already running (PID {state[pid_key]}).")
        return state

    if _port_in_use(port):
        print(
            f"{label}: port {port} is already occupied by something this script isn't tracking "
            f"(not started via `start`). Stop whatever's using it, or run `python run_app.py stop` "
            f"first if a previous run left it behind."
        )
        return state

    print(f"Starting {label} ({cmd[0]} in {cwd})...")
    RUN_DIR.mkdir(exist_ok=True)
    with open(log_path, "w", encoding="utf-8") as log:
        proc = subprocess.Popen(cmd, cwd=cwd, stdout=log, stderr=subprocess.STDOUT)
    state[pid_key] = proc.pid
    _save_state(state)

    if _wait_for(health_url):
        print(f"{label} is up (PID {proc.pid}).")
    else:
        print(f"{label} did not respond within the timeout - check {log_path}")
    return state


def start() -> None:
    _start_one(
        "backend_pid",
        "Backend",
        [sys.executable, "-m", "uvicorn", "main:app", "--host", BACKEND_HOST, "--port", str(BACKEND_PORT)],
        BACKEND_DIR,
        BACKEND_LOG,
        BACKEND_PORT,
        f"http://{BACKEND_HOST}:{BACKEND_PORT}/health",
    )
    _start_one(
        "web_pid",
        "Web app",
        ["npm.cmd" if IS_WINDOWS else "npm", "run", "dev"],
        WEB_DIR,
        WEB_LOG,
        WEB_PORT,
        f"http://localhost:{WEB_PORT}",
    )
    print(f"\nOpen http://localhost:{WEB_PORT} in your browser.")
    print(f"Logs: {BACKEND_LOG}  {WEB_LOG}")


def stop() -> None:
    state = _load_state()
    for pid_key, label in (("backend_pid", "Backend"), ("web_pid", "Web app")):
        pid = state.get(pid_key)
        if pid and _is_alive(pid):
            print(f"Stopping {label} (PID {pid})...")
            _kill(pid)
        else:
            print(f"{label} was not running.")
    _save_state({})


def status() -> None:
    state = _load_state()
    checks = (
        ("backend_pid", "Backend", f"http://{BACKEND_HOST}:{BACKEND_PORT}/health"),
        ("web_pid", "Web app", f"http://localhost:{WEB_PORT}"),
    )
    for pid_key, label, url in checks:
        pid = state.get(pid_key)
        alive = bool(pid) and _is_alive(pid)
        reachable = _wait_for(url, timeout=2) if alive else False
        state_str = "running" if alive else "stopped"
        reach_str = "responding" if reachable else ("not responding yet" if alive else "")
        print(f"{label}: {state_str} (pid={pid}) {reach_str}".rstrip())


def main() -> None:
    valid = {"start", "stop", "restart", "status"}
    if len(sys.argv) != 2 or sys.argv[1] not in valid:
        print(__doc__)
        raise SystemExit(1)

    command = sys.argv[1]
    if command == "start":
        start()
    elif command == "stop":
        stop()
    elif command == "restart":
        stop()
        time.sleep(1)
        start()
    elif command == "status":
        status()


if __name__ == "__main__":
    main()
