# AGENTS.md

## Repository role

This repository is the Glsoop mobile app code repository.

It owns:

- Expo Router app screens
- mobile UI components
- mobile API service calls
- mobile auth/session handling
- app navigation
- mobile QA and E2E tests
- EAS build configuration

## Branching rules

- `main` is the store/production-stable line. Only release-ready changes integrated and verified on `dev` move to `main`.
- `dev` is the next-release integration line. Feature and fix branches merge into `dev` first.
- Start all work from the `dev` branch.
- Do not work directly on `main`, `master`, or `dev`.
- Create a focused task branch from `dev` before making changes.
- Use descriptive branch names such as `feature/...`, `fix/...`, `chore/...`, or `docs/...`.
- Keep release direction one-way: task branch -> `dev` -> `main`. Do not merge `main` back into task branches as a routine workflow.
- Store builds and submissions are tied to an explicitly approved `main` release, never to an arbitrary task branch.

## Code/document separation

- Keep this repository focused on mobile app code.
- Keep only code-adjacent technical docs here.
- Product planning, feature proposals, QA, release, app review, operations, policy, marketing, and design documents should be written in `glsoop-docs`.
- If a mobile change requires documentation, update or create the related Markdown file in `glsoop-docs`.

## Server/mobile compatibility

- Unless explicitly instructed otherwise, mobile features should work consistently with the `glsoop` server.
- Prefer using `glsoop` server APIs instead of duplicating business logic in the mobile app.
- Mobile should focus on presentation, interaction, navigation, local UI state, and safe API mapping.
- Do not invent server behavior on the client.
- If a needed API does not exist, document the required server change instead of creating a disconnected mobile-only implementation.
- When server responses use existing shapes, preserve compatibility through mapping and fallback logic.

## Cross-repository checks

- For API-dependent work, inspect `../glsoop` server routes when available.
- If the server API does not support the needed behavior, document the required server change instead of implementing fake client-only behavior.
- Do not silently hardcode server-derived policy, reward, moderation, notification, or purchase behavior in the mobile app.
- When documentation is needed, check `../glsoop-docs` from this repository root before creating docs inside this repository.
- If `../glsoop-docs` is unavailable, mention that documentation should be added there instead of creating product, QA, release, operations, policy, marketing, or design docs here.

## Source of truth

- Treat the real `glsoop` server API response as the source of truth.
- If docs and server behavior differ, follow the actual server behavior and update docs when appropriate.
- Shared policy decisions such as auth, blocking, reporting, safety, moderation, rewards, notifications, and purchase state should remain server-driven.

## Pre-work reading

Before editing, read the relevant flow at least once.

For screen work, inspect:

- target screen under `app/`
- related components under `src/components/`
- related hooks under `src/hooks/`
- related services under `src/services/`
- related types under `src/types/`
- navigation assumptions

For API work, inspect:

- service function
- API config
- response mapping
- related server route if available
- existing error handling and loading states

## Non-breaking rules

- Do not break existing app navigation paths unless explicitly requested.
- Do not remove existing response mapping fallbacks without confirming the server contract.
- Do not change bundle identifiers, package IDs, EAS credentials, signing settings, or store-related configuration unless explicitly requested.
- Avoid large UI rewrites when a targeted fix is enough.
- Preserve existing UX unless the task asks for a redesign.

## Maintainable implementation

- Organize new code by feature and keep independently changing responsibilities in small, focused files, components, hooks, and functions.
- Extract a responsibility when it has its own state, side effects, fallback behavior, or test boundary; do not split trivial one-line helpers only to reduce line counts.
- Keep screen and route files focused on orchestration. Move reusable presentation, request lifecycle, mapping, and validation logic into feature-local modules.
- Add comments actively around intent, contracts, concurrency guards, fallback decisions, platform differences, and non-obvious product rules.
- Comments should explain why the code exists or what must remain true. Avoid narrating obvious syntax, and update comments when behavior changes.

## Product direction

- Glsoop is a text-centered literary platform, not an image/video-first social feed.
- Protect the quiet, reading-focused, sincere, paper-like product feeling.
- Avoid changes that make the product feel like a generic Instagram-style clone unless explicitly requested.
- Prioritize writing, reading, saving, and literary discovery experiences.
- Keep mobile UI consistent with the existing Glsoop color, spacing, paper surface, and literary mood.

## Safety and UGC

- Do not weaken reporting, blocking, moderation, account safety, legal consent, or community guideline flows.
- Blocking should remove blocked users' content from the user's experience as immediately as possible.
- UGC-related changes must consider App Store and Google Play review expectations.
- Keep Terms of Service, Privacy Policy, and Community Guidelines flows accessible.

## Release and environment

- Production API base should remain compatible with `https://glsoop.com`.
- Do not assume `m.glsoop.com` is suitable for the mobile API.
- Do not change iOS `bundleIdentifier` or Android `applicationId` unless explicitly requested.
- Do not change EAS build credentials, signing, store metadata, or release configuration unless explicitly requested.
- Be careful with changes that affect TestFlight, App Store Connect, Google Play tracks, or production builds.

## Verification

After changes:

- Run the most relevant available checks from `package.json` when practical.
- For TypeScript changes, run type/lint checks if available.
- For UI changes, describe at least 3 manual QA scenarios.
- For API changes, verify loading, success, empty, and error states.
- If a check cannot be run, explain why.

## Final report

When reporting back, include:

- summary of changes
- files changed
- verification performed
- skipped checks with reasons
- remaining risks
- documentation updates made in `glsoop-docs`, if any
