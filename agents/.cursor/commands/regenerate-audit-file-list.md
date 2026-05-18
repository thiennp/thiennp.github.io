---
name: regenerate-audit-file-list
description: Regenerate .cursor/todo/FILE_LIST.json for SOLID audit drivers
---

# Regenerate audit file list

From the repository root.

## Command

```text
python3 .cursor/scripts/audit/generate_file_list.py
```

Run when the source tree changes and audit skills need an up-to-date **`FILE_LIST.json`**.
