# Portable local backup

## Purpose

A local backup preserves user-created routines, imported content packs,
participants, remembered attendance, and device preferences in one UTF-8 JSON
file. Export and restore operate entirely on the device and do not upload the
file or its contents.

The app-supplied Wheel of Pain routine and built-in Personality are not stored
as user data. They remain available after restore.

## Version 1 schema

The root object contains every required collection and one complete preference
object:

```json
{
  "schemaVersion": 1,
  "routines": [
    {
      "id": "routine:example",
      "name": "Example",
      "timing": {
        "prepareSeconds": 10,
        "workSeconds": 30,
        "exerciseRestSeconds": 10,
        "exercisesPerRound": 3,
        "roundsPerCycle": 4,
        "cycles": 4,
        "cycleRestSeconds": 120,
        "cooldownSeconds": 0
      },
      "createdAt": 0,
      "updatedAt": 0
    }
  ],
  "contentPacks": [],
  "participants": [],
  "preferences": {
    "themeId": "wheel-of-pain",
    "timerSoundsEnabled": true,
    "spokenMotivationEnabled": true,
    "allowOnlineVoices": false,
    "voiceId": null,
    "speechRate": 1,
    "selectedContentPackId": null,
    "activeParticipantIds": []
  }
}
```

Content-pack entries use the stored version 1 pack fields: `id`,
`schemaVersion`, `name`, `sayings`, `extensions`, `createdAt`, and `updatedAt`.
Participant entries use `id`, `name`, `createdAt`, and `updatedAt`.

## Validation and replacement

- Every collection and preference field is required.
- Routine timing and content-pack limits are identical to their normal editor
  and import rules.
- Routine, pack, and participant identifiers must be unique. Pack and
  participant names must also be unique without regard to case.
- Remembered attendance may reference only participants in the backup.
- The selected Personality may reference only a pack in the backup or an
  app-supplied built-in pack.
- App-supplied routine and pack identifiers are rejected as user data.
- Unsupported schema versions, invalid JSON, and inconsistent references are
  rejected before existing data changes.
- After preview and explicit confirmation, all user collections and preferences
  are replaced in one database transaction. A failure rolls back the entire
  replacement.
