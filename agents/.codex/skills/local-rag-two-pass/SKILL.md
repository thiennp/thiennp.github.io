---
name: local-rag-two-pass
description: >-
  Runs the EnergyCenter mandatory hybrid RAG workflow before substantive answers
  or edits. Use for any task touching docs, rules, or frontend; when the user
  mentions RAG, rag:query, .rag/index.json, or local corpus search.
---

# Local hybrid RAG (two-pass)

## When this applies

Follow **before** reading **`frontend/src/`** or editing application code, or giving substantive technical answers, unless the user message is pure meta (for example thanks). See **`.cursorrules`** and **`.cursor/rules/rag-local-corpus.mdc`** for the full hard gate.

## Steps (repository root)

1. **First query:** derive one natural-language question from the user’s request. Show **`RAG query:`** and the question, then run:

   `npm --prefix .cursor/tools run rag:query -- "<same question>"`

2. **Second query (required):** from the first JSON’s **`results`**, build a **new** question using anchors (`sourcePath`, `heading`, `category`, or a short phrase from **`text`**). Show **`RAG query (refined):`**, then run **`rag:query`** again. Optional: **`--path-filter`** / **`--category`** (see **`.cursor/tools/rag/README.md`**).

3. **Use both** result sets to orient; **open and verify** real source files — RAG is assistive only.

4. **After** you change **`frontend/`** application code in the same session, run **`npm run test-update`** from **`frontend/`** per **`.cursor/rules/task-verification.mdc`** (separate from RAG).

5. **Index:** if missing, install once (`npm install --prefix .cursor/tools/rag`) then `npm --prefix .cursor/tools run rag:index`. After changing indexed docs or files under **`.cursor/rules/`**, refresh the index per **rag-local-corpus.mdc**.

## Checklist prompt

For a single copy-paste block that mirrors the rule, use **`.cursor/docs/workflows/playbooks/rag/rag-first-task-workflow.md`**.

## Reference

- **`.cursor/docs/rag/README.md`** — commands and index scope
- **`.cursor/rules/rag-local-corpus.mdc`** — canonical steps and exceptions
