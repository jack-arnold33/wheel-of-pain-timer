# Accepted PWA architecture

- **Status:** Accepted
- **Decision date:** 2026-08-27
- **Scope:** Wheel of Pain Timer MVP
- **Evidence:** [`pwa-risk-lab-findings.md`](pwa-risk-lab-findings.md)

## Context

The product needs an installable iPhone timer that works offline, keeps private
workout content local, remains legible while mirrored, and keeps the screen
awake during a workout. The required support target is iPhone 15 with iOS 26.6
or newer. App Store distribution, accounts, synchronization, and a required
backend are outside MVP scope.

A disposable risk lab exercised the highest-value PWA assumptions on the
physical target device. Installation, offline cold launch, offline timer
operation, callback-delay correction, and the required wake-lock lifecycle all
passed. A stale cached UI during deployment also exposed the need for explicit
service-worker update activation.

## Decision

Build the MVP as an installable, offline-first PWA using this initial technical
baseline:

| Concern | Selection |
| --- | --- |
| UI | React with TypeScript |
| Build and local development | Vite |
| PWA integration | `vite-plugin-pwa` using `injectManifest` |
| Offline worker | A small custom Workbox service worker |
| Local structured storage | IndexedDB through Dexie |
| Styling | Plain CSS |
| Initial hosting | Static HTTPS hosting on GitHub Pages |
| Server-side application | None required for MVP |
| Accounts and synchronization | None for MVP |
| Analytics and telemetry | None required for core operation |

The implementation should begin with current compatible stable dependency
versions and commit its lockfile. The versions used by the risk lab are
evidence of feasibility, not permanent product version constraints.

## Runtime model

- The service worker precaches the application shell and required built-in
  assets under the deployed repository scope.
- Routines, packs, participants, preferences, and recoverable workout state are
  stored locally. Private content is not included in the public bundle.
- Timer projection uses monotonic elapsed time while the process remains
  active. Persisted recovery behavior follows T-014.
- The active workout requests a screen wake lock from Play, retains it while
  paused and through Complete, observes platform release, and attempts
  foreground reacquisition.
- Wake-lock failure is visible and never changes timer correctness.
- A waiting service-worker update is surfaced to the user and activated only
  at a safe boundary. An active workout is not silently replaced.

## Why this architecture

- It satisfied the required Home Screen, offline, timing, and wake-lock smoke
  tests on the physical target device.
- It supports a static public application while keeping user-generated data on
  the device.
- It avoids App Store distribution and backend operations for the MVP.
- It is small enough for the initial product while retaining direct access to
  browser capabilities and IndexedDB.
- It matches the product's local-first privacy boundary.

## Consequences and constraints

- GitHub Pages application assets are public. No private content or secrets may
  be bundled or committed.
- Browser-managed storage can be cleared or evicted. Export, restore, and
  truthful data-loss guidance remain required.
- Service-worker versions can remain waiting or appear stale. Update status and
  safe activation are product features, not deployment documentation alone.
- Wake lock is a capability request rather than a guarantee. The UI must expose
  denial or release.
- Browser speech behavior and voice locality remain unvalidated and require
  implementation-stage privacy checks.
- Native-only capabilities are unavailable unless this decision is revisited.

## Not selected

- Native iOS or App Store distribution for MVP
- Server-rendered application architecture
- Mandatory accounts or cloud database
- Required cloud synchronization
- Third-party analytics for core operation
- A third-party speech provider without a separate privacy decision

## Implementation boundary

The risk lab is evidence, not a starter application. Product code may reuse the
selected technologies and behavioral conclusions, but it must establish its
own component structure, data model, migrations, tests, accessibility, error
handling, and release process.

## Revisit triggers

Reconsider this decision if:

- a required MVP behavior cannot be implemented reliably within the supported
  iPhone and iOS boundary;
- App Store distribution becomes a product requirement;
- required background execution exceeds PWA capabilities;
- local-first storage cannot meet validated durability and recovery needs; or
- a future feature requires accounts, synchronization, or server-side secrets.
