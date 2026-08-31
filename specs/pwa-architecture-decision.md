# Accepted PWA architecture

- **Status:** Accepted
- **Decision date:** 2026-08-27
- **Last amended:** 2026-08-31 (record built-in themes and font delivery)
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
| UI and component library | React with TypeScript and Material UI (MUI) |
| Build and local development | Vite |
| PWA integration | `vite-plugin-pwa` using `injectManifest` |
| Offline worker | A small custom Workbox service worker |
| Local structured storage | IndexedDB through Dexie |
| Styling and themes | MUI `ThemeProvider`, typed theme definitions, generated CSS variables, component overrides, and `sx` |
| Initial hosting | Static HTTPS hosting on GitHub Pages |
| Server-side application | None required for MVP |
| Accounts and synchronization | None for MVP |
| Analytics and telemetry | None required for core operation |

The implementation should begin with current compatible stable dependency
versions and commit its lockfile. The versions used by the risk lab are
evidence of feasibility, not permanent product version constraints.

MUI is the primary component and presentation system. Screens should compose
MUI components and layout primitives, use semantic values from the active MUI
theme, and place shared visual decisions in theme configuration rather than
repeat them in individual components. Narrowly scoped custom styling remains
appropriate for product-specific presentation such as the large active timer,
mirrored landscape layout, and decorative theme assets; plain CSS is not a
parallel general-purpose component system.

Each built-in app theme is a complete, typed MUI theme definition registered
under the stable identifier required by A-009. The registry supplies the theme
to the root `ThemeProvider`. Adding a built-in theme must not change screen
structure, component meaning, timer behavior, or stored domain data. If a
stored identifier is unavailable, the registry supplies the built-in default.
The registry currently provides Wheel of Pain, Cold Steel, Neon Circuit, and
Day Shift plus preview metadata for the Settings selector.

Barlow Condensed weights used by Wheel of Pain are packaged WOFF2 application
assets and precached with the application shell. Optional theme definitions may
identify a public font stylesheet that the root presentation layer loads only
while that theme is active. Every optional font stack ends in local system-font
fallbacks; loading or retaining a remote font is not part of the offline
application guarantee.

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
- MUI supplies accessible component foundations and centralized, typed theme
  configuration, reducing bespoke control and styling code while supporting
  future built-in themes.

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
- MUI becomes a deliberate application dependency. Product code should prefer
  its public component and theme APIs, keep library-specific presentation out
  of timer and persistence modules, and verify the resulting controls against
  the app's touch-target, contrast, reduced-motion, and TV-legibility criteria.
- Theme configuration may change appearance and decorative assets, but it must
  not encode workout state transitions or make essential meaning depend on
  color or animation.
- Optional theme font providers receive an ordinary public asset request when
  the corresponding theme is active. No private workout or participant content
  is included, and font-provider availability is never required for timer use.
- Native-only capabilities are unavailable unless this decision is revisited.

## Not selected

- Native iOS or App Store distribution for MVP
- Server-rendered application architecture
- Mandatory accounts or cloud database
- Required cloud synchronization
- Third-party analytics for core operation
- A third-party speech provider without a separate privacy decision
- Plain CSS as the primary component and theming system
- A utility-first CSS framework as an additional styling layer for MVP

## Implementation boundary

The risk lab is evidence, not a starter application. Product code may reuse the
selected technologies and behavioral conclusions, but it must establish its
own component structure, data model, migrations, tests, accessibility, error
handling, and release process. The component structure must also establish a
small app-facing presentation boundary around MUI so timer and storage logic do
not depend on component-library objects.

## Revisit triggers

Reconsider this decision if:

- a required MVP behavior cannot be implemented reliably within the supported
  iPhone and iOS boundary;
- App Store distribution becomes a product requirement;
- required background execution exceeds PWA capabilities;
- local-first storage cannot meet validated durability and recovery needs; or
- a future feature requires accounts, synchronization, or server-side secrets.
