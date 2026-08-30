# Requirements

Requirement identifiers are stable references for acceptance tests, issues, and
pull requests. A requirement may be refined, but its identifier should not be
reused for a different behavior.

## Routine management

- **R-001:** The user can create a routine with a name and uniform durations
  for prepare, work, exercise rest, rest between cycles, and cooldown.
- **R-002:** The user can set the exercises per round, rounds per cycle, and
  number of cycles. Every round in a routine contains the same number of
  anonymous exercise positions.
- **R-003:** The user can edit, duplicate, and delete a saved routine.
- **R-004:** The app stores routines on the current device without requiring an
  account or network request.
- **R-005:** The app provides a fast path from a saved routine to starting it.
- **R-006:** On first launch, the app provides a ready-to-use routine with the
  documented standard configuration.
- **R-007:** The ready-to-use default is protected from overwrite and deletion.
  Customizing it creates an editable saved copy.
- **R-008:** Selecting a routine opens a pre-workout review, and starting the
  workout from that screen begins Prepare immediately.
- **R-009:** Prepare, Exercise Rest, Cycle Rest, and Cooldown may be zero and
  are then omitted. Work duration and every configured count must be positive.
- **R-010:** Duration fields are limited to `59:59`, count fields to 1 through
  99, total work intervals to 10,000, and scheduled duration to 24 hours.

## Active workout

- **T-001:** The app displays the current phase and remaining time prominently.
- **T-002:** The app displays the current cycle, round, and exercise position
  plus the next phase.
- **T-003:** The user can start, pause, resume, skip a phase, or end a workout
  safely. End Workout immediately pauses for confirmation and replaces separate
  restart and cancel actions. Skip advances while preserving a paused state.
- **T-004:** While the app process remains active, timer state is calculated
  from monotonic elapsed time rather than by assuming each periodic callback
  occurs on schedule. Recovery after full termination uses persisted timeline
  evidence as specified in T-014.
- **T-005:** The app communicates phase changes using visual and audible cues.
- **T-006:** The app requests screen-wake behavior only when the browser reports
  support, with a usable fallback and clear notice when unavailable. Vibration
  is not part of MVP.
- **T-007:** An accidental navigation or reload during an active workout does
  not silently create an incorrect timer state.
- **T-008:** The active workout emphasizes the current phase and remaining time
  in portrait and landscape layouts, including when mirrored to a television.
- **T-009:** The app shows work intervals remaining plus the current cycle,
  round, and exercise position.
- **T-010:** Play/Pause remains visible throughout an active workout; Skip and
  End Workout are secondary actions.
- **T-011:** Countdown cues begin with three seconds remaining, and a phase
  transition has an audible and visual cue.
- **T-012:** While an active workout is visible, the app requests a screen wake
  lock, retains it while paused, and reports when the capability is unavailable
  or denied. Normal completion retains the lock until Done is pressed.
- **T-013:** Normal completion remains visible until dismissed, speaks one
  `finished` saying when available and present at completion, and then returns
  to the same pre-workout screen. End Workout bypasses the completion
  presentation.
- **T-014:** After reload or process termination, a recoverable running workout
  is reconstructed from its saved timeline and a paused workout remains paused.
  An interrupted resume countdown recovers as paused. A backward wall-clock
  change fails safe as paused with an accuracy warning. Missed cues are not
  replayed.

## Content packs

- **C-001:** The user can import a supported content-pack file using the
  device's standard file picker.
- **C-002:** Import processing and pack storage occur locally. Importing a pack
  does not upload it; an individual saying and selected participant name may
  leave the device only under the separately enabled online-speech policy.
- **C-003:** A successfully imported pack is saved on the current device and is
  available offline for later workouts.
- **C-004:** Importing a pack does not require a separate session-only or
  persistence choice.
- **C-005:** The user can select, rename, inspect, and remove saved packs.
  Import conflicts never silently overwrite an existing pack.
- **C-006:** The app validates a pack before use and presents actionable errors
  without partially importing invalid content.
- **C-007:** Imported text is rendered as text and is never executed as HTML or
  script.
- **C-008:** The timer remains completely functional when no pack is selected.
- **C-009:** The user can export a saved pack or local backup in a documented,
  portable format.
- **C-010:** Structured sayings have distinct `work`, `cycleRest`, and
  `finished` categories. The app speaks at the beginning of each round, each
  Cycle Rest, and normal workout completion respectively.
- **C-011:** A successfully imported pack is selected automatically and the
  user returns to the originating pre-workout screen.
- **C-012:** Spoken sayings can address a participant selected from a
  configurable name list.
- **C-013:** Participant selection uses a shuffled rotation that selects every
  name before repeating and avoids an immediate repeat across reshuffles when
  at least two names exist. Rotation is initialized per workout from the active
  attendance snapshot.
- **C-014:** A v1 pack is limited to 512 KB, a name of 1 through 80 Unicode
  characters, sayings of 1 through 240 Unicode characters, 500 sayings per
  category, and 1,000 sayings total.
- **C-015:** V1 supports `general`, `work`, `cycleRest`, and `finished` saying
  categories. A missing specific category falls back to `general`; unknown
  saying categories are rejected.
- **C-016:** A protected generic starter Personality is included with the app
  so spoken motivation can be used without importing a pack. It can be selected
  or inspected but not renamed, exported, or removed.
- **C-017:** The user can create a Personality on the current device by copying
  an app-generated prompt to an AI assistant, pasting the response, reviewing
  and editing categorized sayings, and choosing Save & select. The app does not
  contact the assistant or transmit the authoring fields itself.
- **C-018:** Pasted authoring content accepts a valid v1 JSON object with or
  without a Markdown code fence, or plain text as general sayings. It uses the
  same validation and conflict rules as file import.
- **C-019:** An unfinished Personality authoring draft is saved locally as it
  changes and is recovered after the PWA reloads. Successful save clears it.

## Local storage and privacy

- **D-001:** The app stores persistent routines, packs, participant roster, and
  preferences in browser-managed on-device storage.
- **D-002:** The app explains that clearing site data or removing the app may
  delete locally stored information.
- **D-003:** The app provides an export path before destructive bulk deletion.
- **D-004:** The app makes no network request containing a routine, pack, or
  preference except when the user explicitly exports or shares it. After a
  separate opt-in, the app may transmit an individual saying and selected
  participant name for online speech synthesis but must not upload the pack or
  roster as a collection.
- **D-005:** The app does not require analytics or tracking for core operation.
- **D-006:** The user can manage an optional participant roster stored on the
  current device. Names are independent of content packs and routines.
- **D-007:** The pre-workout screen lets the user include or exclude saved
  participants for the workout and remembers the last attendance selection.
- **D-008:** The user can export and restore a portable local backup containing
  routines, packs, preferences, and participants. Restore shows the proposed
  replacement, validates the complete backup, and atomically replaces user data
  without replacing the app-supplied protected preset.

## PWA and offline operation

- **P-001:** The application can be installed to an iPhone Home Screen from a
  supported browser.
- **P-002:** The installed application launches in an app-like display mode.
- **P-003:** The application shell and previously stored user data are available
  without internet access after initial installation.
- **P-004:** Application updates do not corrupt existing routines, packs,
  participants, or preferences.
- **P-005:** The app clearly reports when a capability is limited by the browser
  or operating system rather than pretending it succeeded.
- **P-006:** When a complete compatible application update is waiting, the app
  presents a visible, safe activation path. It does not replace the active
  version during a workout or serve a mixture of assets from different
  versions.

## Accessibility and presentation

- **A-001:** Primary controls meet mobile touch-target and contrast needs.
- **A-002:** Meaning is never conveyed by color, sound, or animation alone.
- **A-003:** The active timer remains legible from several feet away in typical
  garage lighting.
- **A-004:** Decorative motion can be reduced or disabled.
- **A-005:** Humor can be muted without muting essential timer cues.
- **A-006:** Motivational sayings may be spoken instead of displayed on the
  active timer and never replace essential visual or audible timer cues.
- **A-007:** Timer sounds and spoken motivation can be enabled independently.
  Voice selection offers browser-exposed choices, a generic preview, speech
  speed, and a safe System Default fallback.
- **A-008:** App presentation is provided by named, replaceable themes. A theme
  may define visual tokens and decorative assets, but it does not change screen
  structure, control meaning, timer behavior, stored routines, or content-pack
  behavior. Every theme must continue to satisfy A-001 through A-004.
- **A-009:** MVP may ship with only one built-in default theme and need not show
  a theme selector in that state. The active theme is represented by a stable
  identifier in device-local preferences so additional built-in themes can be
  offered later without changing timer or content data. An unavailable theme
  identifier falls back to the default theme without blocking app use.

## Acceptance scenarios

The MVP Given/When/Then suite is maintained in
[`acceptance-scenarios.md`](acceptance-scenarios.md). Scenarios cite these
identifiers so requirements, future implementation work, and verification stay
traceable.
