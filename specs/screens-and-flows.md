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
Choosing Change opens a focused picker containing None and the Personalities
already available on this device. Selecting an option returns to pre-workout.

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

Settings contains the explicit opt-in for TV-compatible online speech. The
option explains that one saying and the participant name used to address it
may be sent to OpenAI. This permission is not requested within the pre-workout
or active workout flow.

Audio settings are:

- **Timer sounds**, on by default, for the transition bell at three seconds
- **Transition bell volume**, independently adjustable and 50% by default
- **Spoken motivation**, on by default when a Personality is selected
- **Motivational voice volume**, independently adjustable and 100% by default
- **Voice**, defaulting to the device System Default or OpenAI Alloy when the
  TV-compatible path is enabled
- **Speech speed**, with Slow, Normal, and Fast choices and Normal as default
- **Voice output**, an explicit choice between **Device voice** (free, offline,
  and not guaranteed to follow the television route) and **TV voice through
  OpenAI** (internet and API credit required). Selecting the OpenAI choice
  reveals its key storage, acknowledgment, and enablement controls; those
  controls remain hidden while Device voice is selected. Its confirmation
  serves as the explicit privacy opt-in.

The device path lists System Default plus on-device voices exposed by the
browser. Browser-identified online voices are not presented as TV-compatible.
The OpenAI path presents a small supported voice allowlist and plays its media
through `HTMLAudioElement`. Each path previews generic built-in text rather
than private pack content, such as `The Wheel of Pain awaits.`

The online control remains unavailable until Settings reports a locally saved
OpenAI project key. Key entry is password-masked, requires acknowledgement of
the client-side storage risk, and provides save, replace, test, and remove
actions. Only a redacted configured state is shown after saving; the key is not
included in local backup.

If a selected device voice is no longer available, speech falls back to an
eligible System Default and Settings reports the fallback. If an OpenAI voice
identifier is unavailable, Alloy is used. Pitch adjustment is not part of MVP.

Settings also provides a **Participants** roster. The user can add, rename, and
remove names stored on the current device. The roster is optional and applies
to spoken sayings from any selected content pack; it does not appear in routine
configuration or content-pack export.

Settings also provides a **Personalities** library. The user can create, import,
inspect, rename, export, and remove packs stored on the current device. Saving a
pack makes it available to the pre-workout picker without changing the current
Personality selection.

### Appearance and themes

Presentation uses a named theme while keeping screen structure, labels,
controls, timer states, and accessibility semantics independent of that theme.
Themes may supply visual tokens and decorative assets; they do not supply
workout logic or user content.

Settings begins with an **Appearance** section containing responsive visual
previews for four built-in themes:

- **Wheel of Pain**: warm bronze and charcoal
- **Cold Steel**: industrial blue-black and ice blue
- **Neon Circuit**: deep indigo with cyan and magenta
- **Day Shift**: warm daylight surfaces and safety red

Choosing a preview stores its stable identifier as a device-local preference
and applies the theme immediately across all screens. The choice is included
with preferences in backup and restore. If a restored or previously selected
identifier is unavailable, the app uses Wheel of Pain and reports the fallback
in Settings without blocking timer use.

Wheel of Pain's display font is packaged with the app. The other themes may
load a theme-specific public font while online. Settings explains this boundary,
and every optional theme retains a readable fallback so font loading never
becomes a dependency for offline timer use.

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

The management library is opened from Settings. Pack inspection shows the pack name, AI voice
instructions, category counts, total saying count, and that it is saved on this
device; sayings need not be presented on the active workout screen.

**Create Personality** opens a phone-first authoring screen. The user enters a
name and optional tone, theme or inside-joke context, and subjects to avoid.
**Copy prompt for ChatGPT** copies a self-contained schema-aware prompt while
also showing it for manual copying. The app does not open or contact ChatGPT.
The user returns, pastes JSON or plain text, and chooses **Review sayings**.
**Clear pasted response** empties only the response field so the complete AI
output can be replaced without clearing the name or authoring guidance.

Review provides an editable AI voice-instructions field, uses plain-language
category names, shows one saying per editable line, and explains when each
category is spoken. Editor-only bullets and spacing make individual sayings
visually distinct without becoming part of saved or spoken content. **Save
Personality** validates and stores the pack without changing the current workout
selection. The draft persists locally through app switching and reload until a
successful save. File import is a secondary action in the Settings library.

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
