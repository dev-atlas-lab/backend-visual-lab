#!/usr/bin/env python3
import json
import re
import sys

try:
    raw = sys.stdin.read().strip()
    payload = json.loads(raw) if raw else {}
except Exception:
    payload = {}

cmd = payload.get("toolCall", {}).get("args", {}).get("CommandLine", "") or ""

# 1. Prompt before any file deletion or destructive git commands
delete_pattern = re.compile(
    r"(^|[;&|]\s*)(rm|unlink|shred|git\s+(rm|clean|reset\s+--hard|checkout\s+--|restore|push\s+.*--force))\b"
)
if delete_pattern.search(cmd):
    print(json.dumps({
        "decision": "force_ask",
        "reason": "Command deletes or resets files/history. Please confirm before proceeding."
    }))
    sys.exit(0)

# 2. Prompt before modifying protected architecture/governance/config files via shell redirection
protected_files_pattern = re.compile(
    r"(\.env|AGENTS\.md|SPEC\.md|ARCHITECTURE\.md|docker-compose\.yml|frontend/package\.json|backend/pom\.xml|docs/adr/)"
)
write_redirect_pattern = re.compile(r"(>|tee\b|sed\s+-i|mv\b|cp\b)")
if protected_files_pattern.search(cmd) and write_redirect_pattern.search(cmd):
    print(json.dumps({
        "decision": "force_ask",
        "reason": "Command modifies or overwrites protected project governance or configuration files. Approval required."
    }))
    sys.exit(0)

# 3. Allow safe commands
print(json.dumps({"decision": "allow"}))
