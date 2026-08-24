# Product brief

## Identity

- Product name: **Wheel of Pain Timer**
- Repository name: `wheel-of-pain-timer`
- Name inspiration: the group's workouts and *Conan the Barbarian*
- Theme: playful garage workouts with an optional 1980s sword-and-sorcery
  visual style
- Voice: encouraging, ridiculous, affectionate, and never cruel

Display-name refinements can be made without changing the product specification.

## Problem

The workout group needs a fast, dependable interval timer for garage circuits
such as Tabata. Existing timer apps function adequately but do not reflect the
group's routines or personality.

## Product goal

Create an installable phone-friendly timer that works offline, is quick to use
during a workout, and can deliver user-supplied jokes and motivational sayings
without publishing that content with the application.

## Intended users

- The owner, who creates routines and content packs
- Workout-group members who may use the app on their own phones
- A person operating the timer for the group during a session

Version 1 does not require accounts or a centralized list of users.

## Experience principles

1. **Glanceable under stress.** The current state and remaining time must be
   obvious from several feet away.
2. **Reliable before clever.** Humor and visual effects must not compromise
   timer accuracy or controls.
3. **Local by default.** Routines, preferences, and imported content stay on the
   device unless the user explicitly exports them or opts in to online speech
   synthesis for sayings.
4. **Fun is configurable.** A generic timer works without a content pack; each
   user or workout group can supply its own personality.
5. **No workout-time surprises.** Core timer behavior works without a network
   connection after installation.

## MVP scope

- Create, edit, duplicate, and delete interval routines
- Configure prepare, work, exercise rest, exercises per round, rounds per cycle,
  cycles, Cycle Rest, and cooldown
- Start, pause, resume, skip a phase, and end a workout safely
- Show current phase, remaining time, workout progress, and next phase
- Provide audible and visual timer cues
- Keep the display awake when supported
- Store routines and preferences locally
- Configure a device-local participant roster for spoken motivation
- Import, select, and remove local-first content packs
- Save imported content packs on the current device for later selection or
  removal
- Export and restore a portable local backup containing routines, packs,
  preferences, and participants
- Install on an iPhone as a progressive web app and function offline

## Explicitly out of scope for MVP

- App Store distribution or a native iOS application
- User accounts or mandatory sign-in
- Cloud synchronization
- Public libraries of jokes or workout routines
- Apple Health integration
- Social feeds, leaderboards, or workout analytics
- Complex nested workout programming

## Success criteria

- A first-time user can create and start a Tabata routine without instructions.
- A saved routine can be started in no more than three intentional taps from
  app launch.
- An installed app can complete a previously configured workout offline.
- Timer state remains correct after ordinary browser callback delays or brief
  foreground/background transitions, within documented iOS limitations.
- A user can import a private pack without its contents being sent to a server.
- Online speech synthesis may transmit an individual saying and selected
  participant name only after explicit opt-in; pack files are never bundled
  with the app or committed to its public source repository.
- The participant roster is stored on-device and remains separate from portable
  content packs. Under the online-speech opt-in, the selected name may be sent
  with an individual saying for synthesis.
- The interface remains fully usable when all humorous content is disabled.

## Open product decisions

- Exact retro visual direction: sword-and-sorcery workout tape, cassette deck,
  VHS, arcade, or a restrained mixture
- Whether to add built-in routine presets beyond **Wheel of Pain**
- Whether a workout operator can temporarily suppress sayings mid-session
- Which voice and sound cues are both desirable and reliable on iOS

## Initial routine defaults

On first launch, the app provides a ready-to-use routine with the group's
standard configuration. The user does not need to create or configure a
routine before starting a workout.

- Prepare: 10 seconds
- Work: 30 seconds
- Exercise rest: 15 seconds
- Exercises per round: 3
- Rounds per cycle: 4
- Cycles: 4
- Rest between cycles: 2 minutes
- Cooldown: 0 seconds

The default routine is a protected preset named **Wheel of Pain**. It can be
started directly but cannot be overwritten or deleted. Choosing Customize
creates an editable saved copy. User-created routines can be renamed, edited,
duplicated, and deleted.
