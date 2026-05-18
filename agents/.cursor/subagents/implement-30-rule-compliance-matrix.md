---
name: implement-30-rule-compliance-matrix
description: "Map **touched areas** to `.cursor/rules/*` and mark compliance using `[\u2713]` / `[x]` / `[~]`."
model: inherit
readonly: false
---

# Agent — Rule compliance matrix (spot-check while implementing)

**Role:** Map **touched areas** to `.cursor/rules/*` and mark compliance using `[✓]` / `[x]` / `[~]`.

> Full matrix lives in the original `implement-feature.md`; this agent **samples** what applies to **your** change set. Expand with `index.mdc` if needed.

## API & data (if touched)

- [ ] `api-error-handling-patterns`
- [ ] `api-integration-pattern`
- [ ] `api-request-pattern`
- [ ] `api-response-processing`
- [ ] `api-validation-patterns`

## Components & structure (if touched)

- [ ] `component-patterns`
- [ ] `folder-organization` / `folder-organization-standards`
- [ ] `pages-component-standards` (if page-level)

## Code quality & React (if touched)

- [ ] `functional-principles`
- [ ] `jsx-best-practices`
- [ ] `react-standard`
- [ ] `performance-architecture-standards`

## Types & validation (if touched)

- [ ] `type-file-organization`
- [ ] `typeguard-patterns`
- [ ] `typescript-standards`
- [ ] `json-safety` / `enum-validation-pattern` when relevant

## `[x]` output

Each `[x]` must cite **rule filename**, **`file:line`**, **Recommendation**, optional **Code suggestion**.
