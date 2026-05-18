# Local RAG (two-pass hybrid)

Run the **mandatory** EnergyCenter hybrid RAG workflow before substantive answers, file edits, or reading **`frontend/src/`**, unless the user message is pure meta (for example thanks — see **`.cursor/rules/rag-local-corpus.mdc`**).

1. Follow **`.cursor/rules/rag-local-corpus.mdc`** (hard gate: first **`rag:query`**, then **refined** second **`rag:query`** using anchors from the first JSON).
2. Use the step-by-step checklist: **`.cursor/docs/workflows/playbooks/rag/rag-first-task-workflow.md`**.
3. From **repository root**: `npm --prefix .cursor/tools run rag:query -- "<question>"` — install/index first run per that playbook if **`.rag/index.json`** is missing.

Orientation only: **`.cursor/skills/local-rag-two-pass/SKILL.md`**.
