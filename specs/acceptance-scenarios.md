# MVP acceptance scenarios

These scenarios define observable MVP behavior. Each scenario cites the stable
requirement identifiers that it accepts. They refine behavior without choosing
an implementation stack.

Unless a scenario says otherwise, the app has Timer sounds enabled, no
Personality selected, no participant roster, and is in the foreground.

## Standard preset and routine management

### First launch provides the protected preset

**Requirements:** R-005, R-006, R-007, R-008

```gherkin
Given the app has no previously stored user data
When the user opens Home
Then Wheel of Pain is available with Prepare 00:10, Work 00:30,
  Exercise Rest 00:15, 3 exercises per round, 4 rounds per cycle,
  4 cycles, Cycle Rest 02:00, and Cooldown 00:00
And selecting Wheel of Pain opens its pre-workout screen
And pressing Play begins Prepare immediately
```

### The standard preset follows the exact nested sequence

**Requirements:** R-002, R-006, R-008, T-001, T-002, T-009

```gherkin
Given the standard Wheel of Pain preset
When the user completes it without pausing or skipping
Then Prepare runs once for 10 seconds
And cycles 1 through 3 each contain rounds 1 through 4
And each round visits exercise positions A, B, and C in that order
And every Work lasts 30 seconds
And a 15-second Rest follows every Work except the last Work of each cycle
And a 2-minute Cycle Rest replaces Rest after the last Work of cycles 1, 2, and 3
And cycle 4 has the same Work and Rest nesting but no rest after its last Work
And the zero-second Cooldown is omitted
And Complete follows the last Work of cycle 4 immediately
And the workout contains 48 Work phases, 44 Rest phases, 3 Cycle Rest phases,
  and a scheduled duration of 41:10
```

For clarity, each non-final cycle is exactly:

```text
Round 1: Work A -> Rest -> Work B -> Rest -> Work C -> Rest
Round 2: Work A -> Rest -> Work B -> Rest -> Work C -> Rest
Round 3: Work A -> Rest -> Work B -> Rest -> Work C -> Rest
Round 4: Work A -> Rest -> Work B -> Rest -> Work C -> Cycle Rest
```

The final cycle substitutes `Complete` for the final `Cycle Rest`. On entry to
the first Work, Work intervals remaining is 47; on entry to the last Work it is
0. The displayed cycle, round, and exercise position match the active Work or
the Work most recently completed during its following rest.

### Customizing the protected preset creates a copy

**Requirements:** R-003, R-007

```gherkin
Given Wheel of Pain is the protected preset
When the user chooses Customize
Then the routine editor opens with an editable copy of its configuration
And saving creates a user routine without changing Wheel of Pain
And the copy can later be renamed, edited, duplicated, or deleted
And Wheel of Pain still cannot be overwritten or deleted
```

### Routine changes persist locally

**Requirements:** R-001, R-002, R-003, R-004

```gherkin
Given the user creates or changes a valid user routine
When the save succeeds and the app is reopened offline
Then the saved routine and its configuration remain available on this device
And no account or network request was required
```

## Configuration validation and zero-duration phases

### Optional zero-duration phases are omitted

**Requirements:** R-009, T-005, T-011

```gherkin
Given Prepare, Exercise Rest, Cycle Rest, and Cooldown are all configured as zero
And Work and all counts are valid and positive
When the workout runs
Then it consists only of its Work phases followed by Complete
And omitted phases never appear at 00:00
And omitted phases do not produce duplicate transition cues
```

### Work and counts must be positive

**Requirements:** R-009

```gherkin
Scenario Outline: Reject a non-positive required value
  Given the user is editing a routine
  When <field> is set to <invalid value>
  Then the routine cannot be saved or started
  And an error identifies <field> and its valid range

Examples:
  | field             | invalid value |
  | Work duration     | 00:00         |
  | Exercises/round   | 0             |
  | Rounds/cycle      | 0             |
  | Cycles            | 0             |
```

### Individual and aggregate limits are enforced

**Requirements:** R-010

```gherkin
Scenario Outline: Reject a value beyond an individual limit
  Given the user is editing a routine
  When <field> is set to <invalid value>
  Then the routine cannot be saved or started
  And the error states <limit>

Examples:
  | field                  | invalid value | limit            |
  | any duration           | 60:00         | at most 59:59    |
  | Exercises/round        | 100           | from 1 through 99|
  | Rounds/cycle           | 100           | from 1 through 99|
  | Cycles                 | 100           | from 1 through 99|

Scenario: Reject too many Work intervals
  Given all individual fields are within their limits
  When exercises multiplied by rounds multiplied by cycles exceeds 10,000
  Then the routine cannot be saved or started
  And the aggregate Work-interval error is shown

Scenario: Reject excessive scheduled duration
  Given all individual fields and the Work-interval total are within their limits
  When the calculated scheduled duration exceeds 24 hours
  Then the routine cannot be saved or started
  And the scheduled-duration error is shown
```

Exactly 10,000 Work intervals and exactly 24 hours are valid boundaries when
all other limits are satisfied.

## Active controls and completion

### Pause freezes the active phase

**Requirements:** T-003, T-004, T-010

```gherkin
Given a timed phase is running with a fractional amount of time remaining
When the user presses Pause
Then the phase and its exact remaining duration freeze immediately
And periodic callbacks and time spent paused do not reduce it
And Play remains visible
```

### Resume uses a three-second countdown without consuming workout time

**Requirements:** T-003, T-004

```gherkin
Given the workout is paused partway through any timed phase
When the user presses Play
Then a visible 3, 2, 1 resume countdown begins
And no workout phase time or completion time is accumulated during it
And the same phase resumes with the same remaining duration after 1
And pressing Pause during the countdown cancels it and leaves the phase paused
```

### Phase countdown and transition cues are exact

**Requirements:** T-001, T-005, T-011, A-002

```gherkin
Given a timed phase has more than five seconds remaining
When it reaches each of 5, 4, 3, 2, and 1 seconds remaining
Then one countdown cue is produced for that number when Timer sounds is enabled
And a visual countdown state communicates the same information
And the display uses ceiling behavior and never lingers at 00:00
When the next non-omitted phase begins
Then one transition sound and visual phase change occur

Scenario: A phase shorter than five seconds has only applicable cues
  Given a timed phase is configured for 3 seconds
  When it runs normally
  Then it produces countdown cues for 3, 2, and 1 only
  And it produces one transition cue when the next non-omitted phase begins
```

### Resume never completes invisibly

**Requirements:** T-003, T-007, T-014

```gherkin
Scenario Outline: Interrupt a resume countdown
  Given a resume countdown is in progress
  When the app is <interruption>
  And the user returns to the workout
  Then the countdown is canceled
  And the same phase is recovered as paused
  And the user must press Play to begin a new three-second countdown

Examples:
  | interruption                     |
  | backgrounded                     |
  | reloaded                         |
  | terminated and later reopened    |
```

### Skip follows the normal phase sequence

**Requirements:** T-003, T-005, T-009

```gherkin
Scenario: Skip a running Work phase
  Given a Work phase is running
  When the user presses Skip Phase
  Then that Work counts as completed and is never retried
  And the next non-omitted phase begins immediately
  And one normal transition cue is produced

Scenario: Skip while paused
  Given a phase is paused
  When the user presses Skip Phase
  Then the next non-omitted phase is selected immediately
  And the workout remains paused at the full duration of that phase

Scenario: Skip during the resume countdown
  Given a resume countdown is in progress
  When the user presses Skip Phase
  Then the countdown is canceled
  And the next non-omitted phase is selected
  And the workout remains paused

Scenario: Skip Cooldown
  Given Cooldown is active
  When the user presses Skip Phase
  Then the workout enters Complete immediately
```

### End Workout is confirmed and safe

**Requirements:** T-003, T-010, T-013

```gherkin
Given a workout is running or in its resume countdown
When the user presses End Workout
Then phase time and any resume countdown stop immediately
And a confirmation presents Keep Workout Paused and End Workout
When the user chooses Keep Workout Paused
Then the confirmation closes and the workout remains paused
When the user instead confirms End Workout
Then current progress is discarded
And no completion presentation or finished saying occurs
And the same routine's pre-workout screen opens
And Play is required to start again
```

### Normal completion persists until dismissed

**Requirements:** T-012, T-013

```gherkin
Given the final non-omitted phase completes normally
When Complete is shown
Then it remains visible until Done is pressed
And workout time includes only elapsed timed-phase time
And paused time and resume countdowns are excluded
And a skipped phase contributes only time elapsed before Skip
When Done is pressed
Then the same routine's pre-workout screen opens
```

## Backgrounding, reload, termination, and recovery

### A brief background transition advances by elapsed time

**Requirements:** T-004, T-007, T-014

```gherkin
Given a workout is running
When the app is backgrounded long enough to cross one or more phase boundaries
And the same process returns to the foreground
Then monotonic elapsed time places the workout in the correct current phase
And the displayed remaining time and progress are correct
And missed countdown, transition, and spoken cues are not replayed
```

### A backgrounded paused workout remains frozen

**Requirements:** T-004, T-014

```gherkin
Given a workout is paused
When the app is backgrounded and later foregrounded
Then the same phase and exact remaining duration are still paused
And background time is not added to workout time
```

### Reload or process termination reconstructs a running workout

**Requirements:** T-007, T-014

```gherkin
Scenario Outline: Recover a running workout
  Given a running workout has a valid persisted timeline checkpoint
  When the app is <interruption> and reopened later
  Then wall-clock elapsed time since the checkpoint is applied once
  And the app opens directly to the correct active phase or Complete
  And a small non-blocking recovery notice is shown
  And missed cues and sayings are not replayed

Examples:
  | interruption       |
  | reloaded           |
  | fully terminated   |

Scenario Outline: Recover a paused workout
  Given a paused workout has a valid persisted checkpoint
  When the app is <interruption> and reopened later
  Then it opens directly to the same phase paused at the saved duration
  And a small non-blocking recovery notice is shown

Examples:
  | interruption       |
  | reloaded           |
  | fully terminated   |
```

### A backward wall-clock change fails safe

**Requirements:** T-007, T-014, P-005

```gherkin
Given a running workout is being reconstructed after full termination
And the current wall clock is earlier than the persisted checkpoint clock
When recovery is attempted
Then the saved phase is restored as paused without subtracting or inventing time
And a notice explains that timer accuracy could not be verified
And the user may resume or End Workout
```

A positive elapsed value advances normally. A long closure and a forward clock
adjustment cannot be reliably distinguished by a web app; this residual risk is
recorded in `ios-pwa-risks.md`.

## Screen wake lock

### Wake lock succeeds and follows the workout lifetime

**Requirements:** T-006, T-012

```gherkin
Given screen wake lock is supported and granted
When the active workout becomes visible
Then the app requests and holds the lock through running and paused phases
When the app returns to the foreground after the lock was released
Then it attempts to reacquire the lock
When the workout completes normally
Then it retains the lock on Complete until Done is pressed
When Done or confirmed End Workout is pressed
Then the lock is released
```

### Wake lock failure does not compromise the timer

**Requirements:** T-006, T-012, P-005, A-002

```gherkin
Scenario Outline: Report wake-lock failure
  Given screen wake lock is <condition>
  When an active workout is visible
  Then a concise notice says the screen may sleep
  And the notice does not rely on color alone
  And the timer and all controls remain usable and correct

Examples:
  | condition                         |
  | unsupported                       |
  | denied                            |
  | released and not reacquired       |
```

## Installation and offline completion

### Install and launch as a Home Screen web app

**Requirements:** P-001, P-002, P-005

```gherkin
Given the user opens the deployed app in a supported iPhone browser while online
When the user follows the browser's Add to Home Screen flow and opens its icon
Then the app launches in an app-like display mode when that mode is supported
And unsupported installation or display behavior is explained rather than
  reported as successful
```

First-time installation is not promised while offline. Offline acceptance
starts after a successful online load and installation.

### Complete a configured workout offline

**Requirements:** P-003, R-004, C-003, T-001, T-003, T-005

```gherkin
Given the installed app has previously loaded successfully
And a routine, preferences, participants, and a content pack are stored locally
When the device loses network access before launch
Then the app shell and stored data remain available
And the user can start, control, and complete the workout
And essential visual and locally available audible cues continue to work
And no online speech request is attempted
```

### An application update preserves local data

**Requirements:** P-004

```gherkin
Given routines, packs, participants, and preferences are stored locally
When a compatible application update becomes active
Then all supported stored data remains valid and available
And an unsuccessful migration does not partially overwrite the prior data
```

## Local storage and privacy

### Core local data stays on this device without tracking

**Requirements:** D-001, D-004, D-005

```gherkin
Given the user creates routines, imports packs, manages participants, or changes
  preferences without enabling online speech
When those actions and ordinary timer operation are observed
Then their persistent data is stored in browser-managed on-device storage
And no request containing a routine, pack, participant, or preference is sent
  to a server
And analytics or tracking is not required for any core operation
```

## Content-pack lifecycle

### Import a valid plain-text pack locally

**Requirements:** C-001, C-002, C-003, C-004, C-011

```gherkin
Given the user is on a routine's pre-workout screen
And tuesday-chaos.txt is UTF-8 with at least one valid non-empty line
When the user imports it through the device file picker
Then it is validated and normalized locally into the general category
And its initial display name is Tuesday Chaos
And it is saved on this device without a persistence question or upload
And it becomes the selected Personality
And the same pre-workout screen is restored
```

### Import and select valid structured categories

**Requirements:** C-001, C-003, C-010, C-011, C-014, C-015

```gherkin
Given a .timerpack.json file has schemaVersion 1, a valid name, and valid
  general, work, cycleRest, or finished categories within every limit
When the user imports it
Then the normalized pack is saved and selected atomically
And its supported categories are available offline
And unknown top-level fields are retained for portable re-export but never run
```

### Invalid import is actionable and atomic

**Requirements:** C-006, C-007, C-014, C-015

```gherkin
Scenario Outline: Reject an invalid pack
  Given saved packs already exist
  When the user imports a pack with <problem>
  Then no saved or selected pack changes
  And an error identifies <problem> and the applicable limit or field

Examples:
  | problem                                           |
  | a source file larger than 512 KB                  |
  | invalid JSON                                      |
  | a missing or unsupported schemaVersion            |
  | a missing or 0-character normalized name          |
  | a name longer than 80 Unicode characters          |
  | no non-empty supported saying category            |
  | a saying longer than 240 Unicode characters       |
  | more than 500 normalized sayings in one category  |
  | more than 1,000 normalized sayings in total       |
  | an unknown saying category                        |

Scenario: Treat imported markup as text
  Given a valid saying contains HTML or script-like text
  When the pack is inspected or spoken
  Then the content is treated as text and is never executed
```

Exact duplicates within one category are removed before category and total
limits are evaluated.

### An import conflict never silently overwrites

**Requirements:** C-005, C-006

```gherkin
Given a valid imported pack conflicts with an existing saved pack's identity or name
When validation completes
Then the existing pack has not changed
And the user may explicitly Replace, Save a Copy with a distinct name, or Cancel
And only the selected confirmed action is committed atomically
```

### Select, rename, inspect, export, and remove a pack

**Requirements:** C-003, C-005, C-008, C-009

```gherkin
Given at least one pack is saved on this device
When the user selects it from the pack library
Then it becomes the current pre-workout Personality
And it remains available after an offline reopen
When the user renames it to a valid non-conflicting name
Then its sayings and identity are unchanged
When the user inspects it
Then its name, category counts, total count, and privacy status are shown
When the user exports it
Then a documented schemaVersion 1 .timerpack.json file is produced locally
When the user confirms removal
Then it is removed from this device
And if it was selected, Personality becomes None - essential timer cues only
And routine operation and essential cues remain available
```

## Backup and full restore

### Export a complete portable backup

**Requirements:** C-009, D-002, D-003, D-008

```gherkin
Given the device contains user routines, packs, preferences, participants,
  and remembered attendance
When the user exports a local backup
Then one documented versioned JSON file is created locally
And it contains those local data collections
And it does not include the app-supplied protected preset as user data
And exporting does not upload the backup
```

### Preview and restore a valid full backup

**Requirements:** D-008, R-007

```gherkin
Given a supported-version backup validates completely
When the user reviews it for restore
Then a preview summarizes the user routines, packs, participants, and preferences
  that will replace the current device data
And the current data remains unchanged until explicit confirmation
When the user confirms Restore
Then all replacement collections are committed atomically
And the restored remembered attendance references only restored participants
And the app-supplied Wheel of Pain preset remains protected and available
```

### Reject an invalid backup without partial changes

**Requirements:** D-008, P-004

```gherkin
Given current device data exists
When a backup has invalid JSON, an unsupported version, an invalid contained
  routine or pack, inconsistent references, or a missing required collection
Then Restore is unavailable
And actionable validation errors are shown
And none of the current device data changes
```

## Spoken motivation, participants, voices, and privacy

### Category schedule and fallback

**Requirements:** C-008, C-010, C-015, A-005, A-006, A-007

```gherkin
Given spoken motivation is enabled and a Personality is selected
When each round's first Work begins
Then one work saying is spoken, falling back to general when work is empty
When each Cycle Rest begins
Then one cycleRest saying is spoken, falling back to general when cycleRest is empty
When normal completion occurs while cues can be presented
Then one finished saying is spoken, falling back to general when finished is empty
And when neither the specific category nor general has a saying, that
  announcement is skipped
And no saying is spoken after every exercise or after confirmed End Workout
And no missed saying is replayed after recovery
```

### Humor and essential cues remain independent

**Requirements:** C-008, A-005, A-006, A-007

```gherkin
Scenario Outline: Motivation does not control the timer
  Given <motivation state>
  When a phase changes
  Then essential visual state remains present
  And essential timer audio follows only the Timer sounds setting

Examples:
  | motivation state                     |
  | no Personality is selected           |
  | Spoken motivation is disabled        |
  | no eligible speech voice is available|
```

### Active participants use a per-workout shuffled rotation

**Requirements:** C-012, C-013, D-006, D-007

```gherkin
Given multiple saved participants are checked active on pre-workout
When the workout starts
Then the active attendance is snapshotted for that workout
And a new randomized participant order is initialized
And each announcement prefixes the next selected name to its saying
And every active participant is selected once before anyone repeats
And a new randomized order follows each complete pass
And the final name of one pass is not the first name of the next pass
When the workout ends
Then the attendance checks are remembered but rotation order is not carried to
  the next workout
```

### Empty and single-participant rosters behave predictably

**Requirements:** C-012, C-013, D-007

```gherkin
Scenario: No active participant
  Given the roster is empty or every saved participant is unchecked
  When a saying is spoken
  Then it is spoken without a participant name

Scenario: One active participant
  Given exactly one participant is active
  When multiple sayings are spoken
  Then that participant prefixes every saying
```

### Voice selection respects availability and online consent

**Requirements:** C-002, D-004, A-007

```gherkin
Scenario: Select and preview an eligible voice
  Given the browser exposes an eligible voice under the current online policy
  When the user selects it and chooses Preview
  Then generic built-in preview text is spoken at the selected Slow, Normal, or
    Fast speed
  And no private pack saying or participant name is used for the preview

Scenario: Selected voice disappears
  Given a previously selected voice is no longer exposed
  When speech is next prepared
  Then an eligible System Default is used and the fallback is reported
  Or spoken motivation is reported unavailable when no eligible default exists

Scenario: Online voices are not allowed
  Given Allow online voices is off
  When the browser identifies a voice as online
  Then that voice cannot be selected or receive text
  And if the browser cannot provide enough information to enforce the policy,
    online speech remains unavailable

Scenario: User explicitly allows online voices
  Given Settings explains that one saying and its selected participant name may
    be sent to the speech provider
  When the user explicitly enables Allow online voices and selects an online voice
  Then only the individual utterance needed at that moment may be transmitted
  And the pack and roster are never uploaded as collections
  When the user disables Allow online voices
  Then no future utterance is sent to an online voice
```

## Presentation and accessibility

### The landscape timer remains TV-readable

**Requirements:** T-001, T-002, T-008, T-009, T-010, A-001, A-002, A-003, A-004

```gherkin
Given an active workout is shown in landscape and mirrored to a television
When the phase or progress changes
Then remaining time and current phase dominate the display
And Work intervals remaining, cycle, round, exercise position, and Next are legible
And Play/Pause remains visible while Skip Phase and End Workout remain secondary
And no essential meaning depends only on color, sound, or animation
And reduced-motion preference removes or reduces decorative motion without
  hiding timer state
```
