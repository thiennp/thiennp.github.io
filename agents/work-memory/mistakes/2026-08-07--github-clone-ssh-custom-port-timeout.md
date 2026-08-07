---
id: wm-20260807-001
date: 2026-08-07
type: mistake
severity: high
projects: [thiennp.github.io, global]
tags: [git, ssh, github, clone]
status: active
summary: GitHub SSH via custom port 42022 times out; use HTTPS or ssh -p 22
---

# GitHub clone SSH custom-port timeout

## Context
Cloning `git@github.com:thiennp/thiennp.github.io.git` while restoring global Cursor assets.

## What happened
Default `git clone` over SSH hung then failed: `ssh: connect to host github.com port 42022: Operation timed out`. HTTPS and `GIT_SSH_COMMAND="ssh -p 22"` both reached the repo.

## Do
- Prefer `git clone https://github.com/thiennp/<repo>.git` when SSH on the configured custom port fails
- Or force port 22: `GIT_SSH_COMMAND="ssh -p 22 -o ConnectTimeout=10" git clone git@github.com:thiennp/<repo>.git`
- Verify with `git ls-remote` before a long clone

## Don't
- Assume GitHub SSH works on the machine’s default non-22 port without a quick connectivity check
- Block the task waiting on a hung SSH handshake

## Related
- [wm-20260807-002](../decisions/2026-08-07--cross-project-work-memory-home.md)
