# PWA risk-lab findings

## Purpose

This document transfers validated conclusions from the disposable
[Wheel of Pain Risk Lab](https://github.com/jack-arnold33/wheel-of-pain-risk-lab)
into the product repository. It records evidence and product implications, not
reusable implementation code.

The detailed evidence boundary is preserved in the risk lab's
[closeout report](https://github.com/jack-arnold33/wheel-of-pain-risk-lab/blob/main/docs/closeout.md)
and
[result log](https://github.com/jack-arnold33/wheel-of-pain-risk-lab/blob/main/docs/test-results.md).

## Tested environment

- Required device: physical iPhone 15
- Product support floor: iOS 26.6
- Delivery: public GitHub Pages project site over HTTPS
- Launch modes exercised: Safari and installed Home Screen PWA during the lab
- Offline condition: airplane-mode cold launch after a successful online load
- Fixtures: synthetic timer and evidence data only

The repository does not contain exported run JSON independently confirming the
exact iOS build or every launch-mode repetition. Results below are
tester-reported engineering evidence and must not be generalized to untested
devices or older operating systems.

## Results

| Capability | Result | Evidence-based conclusion |
| --- | --- | --- |
| GitHub Pages delivery | Pass | Static HTTPS hosting can deliver the installable application. |
| Home Screen installation and launch | Pass | The PWA can be installed and opened in app-like mode on the required iPhone. |
| Offline cold launch | Pass | The installed application shell loads after the device is fully offline. |
| Offline timer completion | Pass | Core timer behavior does not require a network after installation. |
| Foreground timer sequence | Pass | The deterministic sequence advances without lingering at zero. |
| Controlled callback delay | Pass | Elapsed-time calculation catches up rather than stretching a phase. |
| Wake lock while running | Pass | A granted screen wake lock kept the display awake beyond Auto-Lock. |
| Wake lock while paused | Pass | Pausing did not release the requested screen wake lock. |
| Wake-lock foreground return | Pass | Platform release was observable and reacquisition succeeded after return. |
| Wake lock through completion | Pass | The lock remained through Complete and released after Done. |
| Wake lock after early end | Pass | End released the lock immediately. |
| Installed update adoption | Partial | The new version was retrieved, but the old cached UI appeared until the service-worker update was adopted. |

## Product decisions derived from the evidence

1. Retain requirements T-004, T-006, T-012, and P-001 through P-005.
2. Add P-006 so a waiting service-worker version has a visible and safe
   activation path.
3. Request screen wake lock as part of the Play interaction. Retain it through
   running, pause, and the persistent Complete screen.
4. Observe release, attempt reacquisition after returning to the foreground,
   and show a truthful warning when the capability is unavailable or denied.
5. Release wake lock on confirmed End Workout and when Done dismisses Complete.
6. Calculate running state from elapsed time, not callback count. Timer
   correctness must remain independent of wake-lock success.
7. Precache the application shell and required built-in assets. First-time
   installation while offline is not supported.
8. Keep user data local by default and keep private content out of the public
   application bundle.

## Deferred and unvalidated areas

These areas were not proven by the lab and remain implementation-stage risks:

- timer background, reload, termination, resume-countdown, and wall-clock edge
  cases beyond the foreground callback-delay experiment;
- interrupted service-worker download or activation and mixed-version failure;
- IndexedDB quota failure, eviction, atomic replacement, and backup restore;
- browser voice discovery, offline speech, voice locality, and privacy
  enforcement;
- landscape legibility, television overscan, and the exact TV-mirroring setup;
- the full unsupported or denied wake-lock matrix on the required iPhone.

The product owner intentionally closed the risk lab without expanding these
experiments. Existing requirement T-014 remains an implementation and
acceptance expectation, not a lab-validated result.

## Infrastructure observation

The lab's first GitHub Pages deployment emitted a Node.js 20 deprecation
warning from `pnpm/action-setup@v4`. Updating to `pnpm/action-setup@v6`
removed the warning without changing the deployed application. This is CI
maintenance evidence, not an iPhone product requirement.

## Conclusion

The tested evidence supports an installable PWA as the Wheel of Pain Timer MVP
delivery model on the required iPhone 15 environment. The accompanying
architecture decision promotes the proven stack from candidate to accepted
technical baseline while keeping the lab disposable.
