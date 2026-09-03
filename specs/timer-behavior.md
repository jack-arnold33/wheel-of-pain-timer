# MVP timer behavior

This document records timer decisions made during product discussion. It is a
behavioral specification, not a technical implementation design.

## Terminology and configuration

A routine has one uniform work duration and one uniform exercise-rest duration.
Individual exercises are anonymous because group members may perform different
movements at the same time.

- **Prepare:** Time before the first work interval.
- **Exercise:** One anonymous timed work position within a round.
- **Round:** One rotation through every exercise position in order.
- **Cycle:** The configured number of rounds.
- **Exercise rest:** The short rest that normally follows a work interval.
- **Cycle rest:** The longer rest between cycles.
- **Cooldown:** Optional time after the final work interval.

The exercise count is fixed within a routine. Every round visits each exercise
position exactly once in the same order. Different routines may have different
exercise counts.

For three exercises and four rounds, one cycle is:

```text
A, B, C, A, B, C, A, B, C, A, B, C
```

Exercise labels such as A, B, and C describe position only and do not prescribe
movements.

## Phase sequence

Selecting a routine from Home opens its pre-workout screen. Pressing Play on
that screen begins Prepare immediately. There is no additional ready screen or
second start action after Play.

Every work interval is normally followed by Exercise Rest. After the final
exercise of a non-final cycle, Cycle Rest replaces Exercise Rest; the two rest
periods are never placed back to back. After the final work interval, the timer
enters Cooldown when its duration is greater than zero and otherwise completes
immediately. There is no Exercise Rest after the final work interval.

The general sequence is:

```text
Prepare
  -> Work -> Exercise Rest -> Work ...
  -> final Work of a non-final cycle -> Cycle Rest
  -> first Work of the next cycle ...
  -> final Work of the final cycle -> optional Cooldown -> Complete
```

A zero-second Prepare or Cooldown is omitted.

Prepare, Exercise Rest, Cycle Rest, and Cooldown may each be zero seconds. Work
must be greater than zero. Exercises per round, rounds per cycle, and cycles
must each be at least one. Any zero-duration optional phase is omitted without
  playing an extra sound at the skipped boundary.

Configuration limits are:

- Each duration field is at most `59:59`.
- Exercises per round, rounds per cycle, and cycles are each from 1 through 99.
- Exercises x rounds x cycles must not exceed 10,000 work intervals.
- The calculated scheduled workout duration must not exceed 24 hours.

The aggregate limits apply even when every individual field is within range.

## Default configuration

- Prepare: 10 seconds
- Work: 30 seconds
- Exercise rest: 15 seconds
- Exercises per round: 3
- Rounds per cycle: 4
- Cycles: 4
- Cycle rest: 2 minutes
- Cooldown: 0 seconds

This configuration contains 48 work intervals. Under the phase rules above, it
lasts 41 minutes and 10 seconds. It is available as a ready-to-use routine on
first launch, so a new user can start without completing routine setup.

The ready-to-use routine is a protected preset named **Wheel of Pain**. It can
be started directly but not overwritten or deleted. Choosing Customize creates
an editable saved copy; ordinary saved routines can be renamed, edited,
duplicated, and deleted.

## Active workout display

The timer and phase are the most important elements. The active screen must be
simple, legible on a phone, effective in landscape orientation, and readable
when the phone is mirrored to a television.

The visual hierarchy is:

1. Remaining time for the current phase
2. Current phase: Prepare, Work, Rest, Cycle Rest, Cooldown, or Complete
3. Total scheduled workout time remaining
4. Work intervals left
5. Current cycle, round, and exercise position
6. Workout controls

Total workout time remaining includes the unelapsed portion of the current
phase and every scheduled future phase. It does not decrease while paused or
during the resume countdown, and skipped phase time is removed immediately.

Work intervals left excludes a currently active work interval. It
decreases when a new Work phase begins and does not change during the rest that
follows. Cycle, round, and exercise position provide supporting context.

Exercise names are neither configured nor displayed.

The active-screen label **Rest** denotes the configured Exercise Rest phase;
**Cycle Rest** identifies the longer between-cycle phase.

## Transition cue and phase transitions

Each phase gives one boxing-bell cue at three seconds remaining. No additional
sound plays when the next phase begins. The visual state changes at the exact
phase boundary, and the timer remains understandable when audio is muted or
unavailable. A phase that begins with three seconds or less remaining cues the
bell immediately so its upcoming transition is still announced.

Whole seconds are displayed using ceiling behavior. A 30-second phase begins
at `00:30`, shows `00:01` throughout its final fractional second, and moves
directly to the next phase without lingering at `00:00`.

## Controls

Play/Pause is always visible. When running it pauses the workout; when paused it
starts a three-second resume countdown.

- Pausing freezes the current phase and remaining time immediately.
- The resume countdown is 3, 2, 1 and does not consume workout time.
- The paused phase continues only after the resume countdown ends.
- Pausing during the resume countdown cancels it and leaves the workout paused.
- The resume countdown applies to every timed phase.
- Backgrounding, reloading, or terminating the app during the resume countdown
  cancels it. Recovery returns to the same phase paused at its saved remaining
  duration; a workout never resumes while it is not visible.

Skip Phase and End Workout are secondary actions.

Skip immediately advances through the normal sequence without playing a bell.
A skipped Work interval counts as completed and is not retried.
Skipping Cooldown completes the workout. When Skip is used while paused, the
next non-omitted phase is selected at its full duration and remains paused. If
Skip is used during the resume countdown, the countdown is canceled first and
the next non-omitted phase remains paused.

End Workout requires confirmation. Opening the confirmation immediately stops
phase time and cancels any resume countdown. Its actions are **Keep Workout
Paused** and the destructive **End Workout**. Keeping the workout closes the
confirmation and leaves the current phase paused. Confirming End Workout
discards current progress and returns to the same routine's pre-workout screen.
The user must press Play to start again. There is no separate Restart action
because it would have the same result.

## Backgrounding, recovery, and wake lock

A running workout continues according to elapsed time when the app is briefly
backgrounded or suspended. On return, the app reconstructs the correct phase
and remaining time, including advancing across multiple phases. If the workout
would already have ended, it shows Complete. A paused workout remains frozen.

The app also persists a recovery checkpoint for reload or full process
termination. Monotonic elapsed time governs while the process remains active;
after termination, recovery uses persisted timeline evidence and the current
wall clock. When reopened, the app restores a paused workout exactly as paused
or reconstructs a running workout. It returns directly to the correct phase, or
to Complete when the workout elapsed while closed. A small recovery notice
explains that state was reconstructed.

If the current wall clock is earlier than the persisted checkpoint clock, the
app cannot verify elapsed time. It restores the checkpoint phase as paused,
does not subtract or invent time, and shows a notice that accuracy could not be
verified. The user may resume or End Workout. A positive elapsed value advances
normally; a long closure and a forward manual clock change cannot be reliably
distinguished by a web app and remain a documented platform risk.

Missed transition bells and spoken sayings are not replayed in a burst after
recovery. End Workout remains available if the
recovered workout is no longer relevant.

The app requests a screen wake lock for the full active-workout lifetime,
including Prepare, Work, rests, Cooldown, and paused state. It attempts to
reacquire the lock after returning to the foreground. End Workout releases it
immediately. Normal completion retains it through the persistent completion
screen and releases it when Done is pressed.

Wake lock is a capability request rather than a guarantee. If it is unsupported,
denied, or released by the browser or operating system, the app reports that
limitation without compromising timer correctness.

## Completion

Normal completion shows a persistent Complete screen and speaks one `finished`
saying. It remains until Done is pressed, then returns to the same routine's
pre-workout screen. Confirmed End Workout bypasses this completion state. If
completion occurred while the app could not present cues, recovery does not
speak the missed `finished` saying.

The completion screen's workout time is accumulated active phase time. Pauses
and resume countdowns are excluded. A skipped phase contributes only the time
elapsed before it was skipped.

## Decisions still needed

- Exact selectable timer-sound assets
