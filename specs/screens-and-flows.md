# MVP screens and flows

This document records the product's screen model and navigation decisions. It
does not prescribe a UI framework or implementation architecture.

## Primary workout flow

```text
Home / Routines
  -> select a routine
Pre-workout
  -> press Play
Prepare begins immediately
  -> timed workout phases
Active workout
  -> End Workout -> confirmation
     -> Keep Workout Paused -> Active workout, paused
     -> confirm End Workout -> Pre-workout for the same routine
  -> workout completes -> Completion -> press Done
     -> Pre-workout for the same routine
```

This is a two-tap path from launch to starting the protected default routine:
select **Wheel of Pain**, then press Play. The pre-workout screen prevents a
single accidental tap on Home from starting the timer.

## Home / Routines

Home presents the protected **Wheel of Pain** preset and any user-created
routines. Selecting a routine opens its pre-workout screen rather than starting
the timer immediately.

The protected preset can be customized by creating an editable saved copy. It
cannot be overwritten or deleted. User-created routines can be renamed, edited,
duplicated, and deleted.

## Pre-workout

The pre-workout screen is a concise review and launch point. It shows:

- Routine name
- Configured phase durations and workout structure
- Total work intervals
- Calculated total duration
- Active content pack, including a clear no-pack state
- Active participant count
- A prominent Play control

Content-pack selection appears as a compact **Personality** row. It shows the
selected pack name or a clear `None - essential timer cues only` state.
Choosing Change opens the content-pack library, where the user may select a
saved pack or import a new pack to save on this device, then returns to
pre-workout.

Participant attendance appears as a compact **Participants** row showing the
number of active names. Choosing Change opens a checklist of the saved roster
for inclusion in this workout and then returns to pre-workout. The last active
selection is remembered, so the user does not normally need to revisit it.
Adding, renaming, and removing roster entries remains in Settings.

Pressing Play begins the configured Prepare phase immediately. A zero-second
Prepare is omitted and the first Work phase begins.

Both confirmed End Workout and any future fresh start after resetting progress
return to this screen for the same routine. Play must be pressed to begin again.

## Active workout

The detailed display hierarchy and controls are specified in
`timer-behavior.md`. Navigation away from an active workout must not silently
discard or corrupt timer state.

Content-pack selection and management are not shown on the active workout
screen.

Motivational sayings are spoken rather than displayed, keeping the mirrored
timer visually focused on phase, time, and progress.

End Workout opens a simple confirmation and immediately pauses phase time. It
offers **Keep Workout Paused** and the destructive **End Workout**. Canceling
does not resume automatically. Confirming ends progress without showing
Completion.

## Settings

Settings contains the explicit opt-in for online speech synthesis. The option
explains that an individual saying and the participant name used to address it
may be sent to a speech provider when spoken. This permission is not requested
within the pre-workout or active workout flow.

Audio settings are:

- **Timer sounds**, on by default, for countdown and transition cues
- **Spoken motivation**, on by default when a Personality is selected
- **Voice**, defaulting to the system voice
- **Speech speed**, with Slow, Normal, and Fast choices and Normal as default
- **Allow online voices**, off by default and serving as the explicit privacy
  opt-in

The Voice screen lists System Default plus the voices currently exposed by the
browser, grouped or labeled as on-device and online where that distinction is
available. Online choices are unavailable until Allow Online Voices is enabled.
Each voice has a preview action that speaks generic built-in text rather than
private pack content, such as `The Wheel of Pain awaits.`

When Allow Online Voices is off, speech must not use a voice identified as
online. If the browser does not provide enough information to honor that rule,
the app reports the limitation instead of sending text without consent.

If a selected voice is no longer available, speech falls back to an eligible
System Default under the current online-voice policy and Settings reports the
fallback. If no eligible default exists, spoken motivation is unavailable.
Pitch adjustment is not part of MVP.

Settings also provides a **Participants** roster. The user can add, rename, and
remove names stored on the current device. The roster is optional and applies
to spoken sayings from any selected content pack; it does not appear in routine
configuration or content-pack export.

### Appearance and themes

Presentation uses a named theme while keeping screen structure, labels,
controls, timer states, and accessibility semantics independent of that theme.
Themes may supply visual tokens and decorative assets; they do not supply
workout logic or user content.

MVP may include only the default theme. When only one theme is available,
Settings need not show a redundant theme selector. If additional built-in
themes are added later, an **Appearance** setting lists them by name and stores
the selected stable theme identifier as a device-local preference. The choice
applies across all screens and is included with preferences in backup and
restore. If a restored or previously selected identifier is unavailable, the
app uses the default theme and reports the fallback in Settings without
blocking timer use.

## Routine editor

The routine editor contains the routine name, five duration fields, three count
fields, and continuously updated totals for Work intervals and scheduled
duration. Optional durations explicitly allow `00:00`; Work and all counts must
be positive. Errors identify the field or aggregate limit and block Save.

Customizing **Wheel of Pain** opens the editor with a new user-owned copy. The
protected preset itself is never an edit target. Editing a user routine changes
that routine; Duplicate creates another editable user routine. Deleting a user
routine requires confirmation that names the routine and returns to Home.

## Content-pack library

The library is opened from the pre-workout Personality row and shows None plus
saved packs. Selecting a pack or completing a valid import returns to the
originating pre-workout screen. Pack inspection shows the pack name, category
counts, total saying count, and that it is saved on this device; sayings need
not be presented on the active workout screen.

Import errors remain in the import flow, identify the invalid field or limit,
and do not change saved data. A name or identity conflict offers Replace, Save
a Copy with a distinct name, or Cancel only after the incoming pack validates.
Rename rejects an invalid or conflicting name. Removing a pack requires a
named confirmation; removing the selected pack changes Personality to None.

## Backup and restore

Settings provides local backup export and restore. Before export and before
destructive bulk actions, the screen explains that browser data or app removal
can erase local information.

Restore validates the complete file before offering confirmation. Its preview
summarizes the routines, packs, participants, and preferences that will replace
current device data. Confirmation performs one atomic replacement of user data;
the app-supplied protected preset remains available. Invalid or unsupported
backups show actionable errors and never enable a partial restore.

## Capability notices

Wake-lock, offline-resource, storage, voice, and installation limitations use
short notices outside the primary timer hierarchy. A notice never obscures
Play/Pause or the remaining time and never claims a capability succeeded when
the browser or operating system did not provide it.

## Completion

Normal completion opens a simple, persistent completion screen suitable for the
mirrored display. It shows a large **Complete** state, a short generic themed
celebration such as `The wheel is conquered`, the workout time, and a prominent
Done action. The selected pack's `finished` saying is spoken once and addresses
the next active participant in the shuffled rotation.

Workout time is accumulated time actually spent in workout phases. It excludes
paused time and resume countdowns. When a phase is skipped, only the time spent
in that phase before Skip contributes.

The completion screen remains until the user presses Done. Done returns to the
same routine's pre-workout screen. End Workout does not show the completion
screen or speak the finished saying. The app retains its requested screen wake
lock through completion and releases it when Done is pressed.

## Interrupted-workout recovery

Reloading or reopening the app with a recoverable workout returns directly to
the correct active phase, paused state, or Complete state. A small notice says
that the workout was recovered; it does not block the timer. Missed cues and
sayings are not replayed. End Workout remains available through the ordinary
secondary controls.

If the workout completed while the app could not present cues, recovery shows
Complete but does not speak the missed `finished` saying.

## Screens still to define

- Exact selectable timer-sound assets
