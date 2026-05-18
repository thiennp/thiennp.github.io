# Agent — Security (proportionate, PR diff)

**Role:** Flag **obvious** security issues introduced by the PR (injection, unsafe HTML, secrets, authz gaps).

## Verification

- [ ] **XSS / HTML:** no unsanitized `dangerouslySetInnerHTML` or equivalent unless tightly justified with sanitizer pattern.
- [ ] **Secrets:** no tokens/keys/passwords committed or logged.
- [ ] **Authz:** client-side checks mirror server expectations; no “hide UI only” as sole protection for sensitive actions.
- [ ] **URL / redirect:** open redirects not introduced via unchecked query params.
- [ ] **Dependencies:** no obviously risky patterns (dynamic `eval`, string-constructed `Function`) in touched code.

## `[x]` output

Classify severity (**Critical** vs **Hardening**), cite `file:line`, give **Recommendation** + **Code suggestion** or mitigation pattern.

---
