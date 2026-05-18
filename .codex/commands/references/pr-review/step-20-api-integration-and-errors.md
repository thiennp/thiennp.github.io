# Agent — API integration, errors, requests (PR diff)

**Role:** Check **changed** client API code against **project** API patterns (`api-request-pattern`, `api-integration-pattern`, `api-error-handling-patterns`, `api-response-processing`, `api-validation-patterns`).

## Verification

- [ ] **Request construction:** correct HTTP method, headers, auth, query/body separation.
- [ ] **Validation:** inputs validated before send where applicable; responses validated before use.
- [ ] **Error handling:** user-visible vs silent errors consistent with feature patterns; no swallowed errors without comment.
- [ ] **Response mapping:** DTO → view-model/domain types without unsafe casts.
- [ ] **Retries / cancellation:** `AbortSignal` or equivalent respected if introduced.
- [ ] **Logging / PII:** no sensitive data logged in new paths.

## `[x]` output

Tie findings to **rule name** + `file:line` + **Recommendation** + optional **Code suggestion** (typed guard, `try/catch` shape, error mapping helper).

---
