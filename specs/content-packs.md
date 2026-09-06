# Local-first content packs

## Purpose

Content packs let the same timer have a personality specific to a user or
workout group. Private jokes and sayings are data supplied by the user; they are
not application source code and are not included in the deployed application.

## Privacy model

```text
Deployed app       Timer logic, UI, schema, and generic defaults
Imported pack      User-selected sayings and labels
On-device storage  Saved packs, routines, participants, and preferences
Server             Stores no imported pack or roster; may receive an individual
                   saying and selected name only after explicit speech opt-in
```

The application being publicly reachable does not make imported local content
public, and private packs are not committed to the application's source
repository or bundled deployment. Anyone with access to an exported pack file
can read its contents, so a pack is private through ordinary file handling
rather than encryption in MVP.

Import, validation, and on-device storage do not upload a pack. Local speech
synthesis may speak sayings without transmitting them. A user may separately
opt in to online speech synthesis, in which case an individual saying and the
selected participant name used to address it may be sent to the selected speech
service when spoken. The app does not upload or cloud-store the pack or roster
as a collection, and disabling the opt-in stops future online speech requests.

## Import behavior

- Parse and validate the file locally.
- Save the normalized pack in IndexedDB.
- Make it available offline for later workouts.
- Leave the current workout Personality unchanged.
- Allow the user to remove or export it.

MVP does not provide a session-only import mode. Every successfully imported
pack is saved on the current device. The user does not need to choose between
temporary and persistent storage during import.

The interface should describe this as “saved on this device”; implementation
details such as IndexedDB do not need to be exposed to ordinary users.

## Supported MVP formats

### Phone-first authoring

The primary creation path is **Create Personality** in the Settings Personality
library.
The user supplies a name and optional guidance for tone, themes or inside jokes,
and subjects to avoid. The app creates a prompt that the user can copy to an AI
assistant. The app does not contact the assistant or upload this guidance.
The prompt explicitly requests exactly one `json` code block containing a
complete raw JSON object rather than quoted or escaped JSON, with nothing
outside the block. In addition to categorized sayings, it requests one concise
`voiceInstructions` value describing the Personality's tone, energy, pacing,
emphasis, and emotional style without names, sayings, sound effects, or extra
spoken content. This supports reliable use of an assistant's Copy code action.
It forbids line-continuation backslashes and asks the assistant to use ordinary
spaces rather than HTML whitespace entities and verify that the content inside
the block is valid JSON before returning it. The paste parser normalizes common
HTML whitespace entities introduced by rich-text copying before validation.

After returning to the app, the user pastes the generated response. Version 1
accepts the documented JSON object, including JSON copied inside a Markdown code
fence. Plain pasted text is also accepted as one work saying per non-empty
line. New authoring presents only `work`, `cycleRest`, and `finished`; it does
not request or create fallback `general` sayings. The user reviews and may edit
the AI voice instructions and every category before choosing **Save
Personality**. Saving uses the same validation, conflict handling, and local
storage as file import. Neither creation nor import changes the current workout
selection.

The v1 schema continues to accept `general` for backward compatibility with
existing packs and plain-text file imports. It remains an internal fallback for
those packs rather than a category shown during new Personality authoring. If a
legacy pasted JSON object contains general sayings but no work sayings, the
creator moves those sayings into Work for review rather than discarding them.

The unfinished authoring draft is saved locally as fields change so that mobile
operating systems may discard and later reload the PWA while the user switches
to an AI assistant. Successfully saving clears that authoring draft. File import
remains available as the secondary interchange workflow.

### Plain text

A UTF-8 `.txt` file contains one general-purpose saying per non-empty line.
This is the easiest format to create and share.

Because plain text has no embedded name, its initial pack name is derived from
the filename: the final `.txt` extension is removed, surrounding whitespace is
trimmed, and separator-style words are converted to a readable display name
(for example, `tuesday-chaos.txt` becomes `Tuesday Chaos`). The user may rename
the saved pack afterward.

```text
Prepare your excuses.
Form first. Complaining second.
Enjoy all seven seconds of retirement.
```

### Structured JSON

A `.timerpack.json` file supports categorized sayings and future extensions.
Its required `name` field is authoritative rather than the filename.

```json
{
  "schemaVersion": 1,
  "name": "Tuesday Chaos Crew",
  "voiceInstructions": "Sound dry, theatrical, and encouraging. Use crisp pacing and confident emphasis without shouting.",
  "sayings": {
    "general": ["Prepare your excuses."],
    "work": ["Form first. Complaining second."],
    "cycleRest": ["Enjoy all two minutes of retirement."],
    "finished": ["Nobody died. Outstanding."]
  }
}
```

## Initial schema rules

- `schemaVersion` is required and must equal a supported integer version.
- `name` is required, trimmed, and must contain 1 through 80 Unicode
  characters.
- `voiceInstructions` is trimmed and must contain 1 through 500 Unicode
  characters when supplied. Older JSON packs and plain-text imports without
  the field receive the built-in default instructions; every normalized,
  saved, backed-up, and exported pack contains an explicit value.
- `sayings` is required and must contain at least one non-empty supported
  category after normalization.
- Supported v1 categories are `general`, `work`, `cycleRest`, and `finished`.
- Each saying is trimmed and must contain 1 through 240 Unicode characters.
- A category may contain at most 500 sayings and a pack at most 1,000 sayings
  total after exact duplicates within a category are removed.
- The source file may not exceed 512 KB.
- Plain-text lines normalize into the `general` category.
- Unknown saying categories are rejected as likely mistakes.
- Unknown top-level fields are retained for forward compatibility and portable
  re-export but never interpreted or executed.
- HTML is displayed literally or safely escaped.
- Import is atomic: validation succeeds completely before saved data changes.

## Selection and playback

- The app includes a protected generic **Workout Starter** pack so a fresh
  install offers spoken motivation without requiring a file import. It can be
  selected and inspected, but it cannot be renamed, exported, or removed. Its
  built-in voice instructions are the default for older or plain-text packs.
- Built-in sayings are application content. Private or group-specific sayings
  remain user-supplied data and are never bundled into the deployment.
- Zero or one pack is active for an MVP workout.
- The pre-workout screen shows the selected pack in a compact **Personality**
  row, or clearly shows that no pack is selected.
- Changing Personality opens a focused picker containing None and the packs
  already available on the device. Selecting an option returns to the same
  pre-workout screen.
- Creating, importing, inspecting, renaming, exporting, and removing packs are
  managed from Settings rather than the pre-workout picker.
- Sayings are selected from the category matching the current workout moment.
- If the matching specific category is absent or empty, selection falls back to
  `general`. If neither contains a saying, that announcement is skipped.
- Repetition should be minimized within a workout when the pack is large enough.
- Essential phase labels and timer cues never depend on a pack.
- Muting humorous content does not mute essential audio cues.
- Sayings are spoken rather than shown on the active timer so users do not need
  to read while exercising.
- Permission to send a saying and selected participant name to online speech is
  an explicit opt-in in Settings, not an interruption in the workout or
  pack-selection flow.
- Timer sounds and spoken motivation have independent settings. Spoken
  motivation is on by default when a Personality is selected.
- The user may select System Default or a browser-exposed voice and choose a
  Slow, Normal, or Fast speech speed. A missing selected voice falls back to an
  eligible System Default under the current online-voice policy. If none is
  eligible, spoken motivation is unavailable. Pitch adjustment is not part of
  MVP.
- When online voices are not allowed, no voice identified as online may receive
  text. If the browser cannot provide enough information to enforce that
  policy, online speech remains unavailable rather than transmitting without
  consent.

The default announcement schedule is intentionally less frequent than timer
phase changes:

- Speak one `work` saying when each round begins, at the start of its first Work
  interval.
- Speak one `cycleRest` saying when each Cycle Rest begins.
- Speak one `finished` saying when the workout completes normally.

These moments use separate saying lists. Sayings are not spoken after every
exercise and are not spoken for confirmed End Workout.

The product supports a configurable device-local participant roster and
addresses a selected participant in spoken sayings. The roster is independent
of content packs: pack import and export do not include names. A broader local
backup includes the roster.

Participant selection uses a shuffled rotation:

- Every participant is selected once before anyone repeats.
- A new randomized order is created after each complete pass.
- The last person in one pass is not immediately repeated as the first person
  in the next pass when the roster has more than one name.
- With one participant, that person is used for every saying.
- With an empty roster, sayings are spoken without a name.

The rotation is initialized independently for each workout from a snapshot of
the participants checked active when Play is pressed. Rotation order is not
carried across workouts. The remembered attendance checks are device-local and
do carry across workouts.

Only participants checked as active on the pre-workout screen take part in the
rotation. The last attendance selection is remembered for later workouts. If
no names are active, sayings are spoken without a name.

The app addresses the selected person by prefixing the saying with their name,
for example, `Jarno! Form first. Complaining second.` Pack authors do not need
to include a name placeholder in saying text.

## Export and recovery

- A saved pack can be exported as versioned JSON.
- A portable local backup includes routines, packs, preferences, and
  participants in one documented, versioned file.
- Restoring a backup shows what will change and validates the entire backup
  before committing any change.
- The app warns that uninstalling it or clearing browser site data may remove
  on-device data.

A valid import never silently overwrites a saved pack. When its normalized name
or portable identity conflicts with an existing pack, the user may explicitly
replace the existing pack, save a copy under a distinct valid name, or cancel.
The incoming pack is fully validated before those actions are offered, and the
selected action is committed atomically. Removing a selected pack changes the
current Personality to None; it does not affect routines or essential cues.

The portable backup is a UTF-8 JSON file with an integer `schemaVersion` and
collections for user routines, packs, preferences, and participants, including
remembered attendance. The protected Wheel of Pain preset is app-supplied and
is not serialized as user data. Restore is a full replacement of those user
collections, not a merge. A preview summarizes what will be replaced, and the
complete backup—including contained routine and pack rules and cross-references—
must validate before confirmation can change any current data. The replacement
is atomic and the protected preset remains available afterward.

## Deferred extensions

- Multiple active packs or layered packs
- Images, custom audio clips, or compressed pack bundles
- Encrypted packs
- Cloud synchronization
- Direct PWA share-target integration
- Collaborative editing inside the app
