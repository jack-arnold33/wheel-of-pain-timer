# HTML media audio routing specification

## Purpose

This specification defines how the Wheel of Pain Timer moves audible output to
`HTMLAudioElement` playback so ordinary media routing can carry it to the
television used for mirrored workouts.

The migration covers two distinct kinds of audio:

1. An essential transition bell at three seconds remaining, which must remain bundled with the
   application and work offline.
2. Optional spoken motivation, which may use provider-generated audio only
   after the user has explicitly allowed the individual saying and participant
   name to be sent for online speech.

Timer correctness, visual cues, and workout controls remain independent of
audio availability.

## Decision and evidence boundary

Use `HTMLAudioElement` as the production playback transport for new timer-audio
work. Do not connect an `HTMLAudioElement` to an `AudioContext`, because doing
so would put playback back on the Web Audio output path this decision is meant
to replace.

The physical risk-lab exercise reportedly found that both HTML media and Web
Audio reached the target television. HTML media is selected because the
product needs file and buffered-blob playback rather than synthesis or audio
graph processing, and because its ready, playing, ended, pause, and error
events make the required lifecycle observable with less machinery.

This is a product-owner-reported result until the risk lab records the matched
physical-device runs. The implementation issue or pull request must link the
final evidence, including iPhone model and iOS version, launch mode, television
or receiver, routing configuration, output destination, start delay, and the
long-session result. The claim is limited to that tested setup.

## Goals

- Route essential timer sounds to the mirrored television through the normal
  HTML media path.
- Provide the same playback path for provider-generated spoken motivation.
- Preserve the exact cue schedule in T-005 and T-011.
- Keep all essential sounds available after an offline cold launch.
- Prevent delayed, duplicated, stale, or burst-replayed audio.
- Keep audio failure from pausing, delaying, or corrupting the timer.
- Preserve the independent Timer sounds and Spoken motivation settings.
- Preserve the consent and data-minimization rules in D-004 and A-007.
- Let the owner configure and use online speech entirely from the installed
  iPhone PWA after the application has been deployed.

## Non-goals

- Supporting multiple speech providers in the initial implementation
- Routing `speechSynthesis` itself to the television
- Mixing, equalization, pitch adjustment, or spatial effects
- Playing cues while the app is suspended or replaying cues missed there
- Guaranteeing an output route the operating system does not expose to the web
  application
- Changing phase timing, cue selection, Personality selection, or participant
  rotation

## Output architecture

```text
timer cue decision -> packaged audio asset ----+
                                                 +-> HTMLAudioElement -> system media route
speech selection -> OpenAI speech API -> Blob --+
```

The cue decision code remains the authority on whether a cue should occur. The
audio layer receives already-selected cue commands and does not inspect or
advance workout state.

### Essential timer sound

Use one versioned, app-owned media asset:

| Asset | Use | Required character |
| --- | --- | --- |
| `transition-bell` | Three seconds remain | Short, recognizable boxing bell |

The committed CC0 WAV file is the canonical product sound. Use one
iPhone-compatible encoded format and add a fallback source only if the
supported-device test matrix demonstrates a need.

Assets are part of the application build, covered by the service-worker
precache, and usable without a network after installation. The PWA asset glob
must explicitly include their file extension.

### Spoken motivation

Browser `speechSynthesis` is not the TV-compatible transport. TV-compatible
spoken motivation makes a direct browser request to the OpenAI speech endpoint
using a project API key supplied and stored by the owner on the current device.
The ordinary audio response is buffered as a `Blob`, assigned to an object URL,
and played by `HTMLAudioElement`.

The initial integration is deliberately OpenAI-specific:

- Request: one selected saying, the optional selected participant prefix,
  the selected Personality's voice instructions, configured OpenAI model and
  voice, MP3 response format, and supported speech rate.
- Response: one playable audio file plus its content type; no streaming is
  required for MVP.
- Credentials: a project-scoped key is entered after deployment and is never
  included in the PWA bundle, repository, or build output.
- Logging: application and diagnostic logs must not contain the saying,
  participant name, API key, Authorization header, or response bytes.

The app may request this response only when online speech consent is enabled.
It must not send an entire Personality, its saying collection, participant
roster, routine, or workout history. Sending the selected Personality's bounded
voice instructions with one utterance is part of the consented request.
Revoking consent cancels pending requests, discards prepared blobs, and prevents
new requests.

Local browser speech may remain as an explicitly labeled fallback, but the UI
must not imply that it will follow the television media route. If no generated
clip is ready at the scheduled moment, skip the saying rather than invoke an
unlabeled fallback or delay the timer.

## Direct OpenAI authentication decision

The product is a personal-use application controlled by its owner and is
intended to remain fully configurable from the iPhone after deployment. It does
not require an application server, serverless function, desktop generation
command, rebuild, or redeployment to create or speak a new Personality.

The owner accepts the bounded risk of storing an OpenAI project API key in the
PWA's device-local IndexedDB. This is a conscious exception to OpenAI's general
guidance not to expose API keys in browser or app client code. The exception is
not presented as suitable for a public multi-user product.

Official OpenAI documentation identifies two other credential mechanisms, but
neither meets this product constraint:

- Workload identity federation exchanges a trusted external workload identity
  for a short-lived credential and requires configured identity-provider and
  service-account mappings. It is intended for controlled workloads, not an
  unaided personal iPhone PWA.
- Realtime client secrets may be passed to browser or mobile clients, but a
  trusted service must create them using its credential and they authorize
  Realtime sessions rather than the ordinary speech endpoint selected here.

There is no documented OpenAI or ChatGPT end-user sign-in flow that authorizes
this PWA to call the speech endpoint against the owner's API billing without a
key or trusted service. If OpenAI later offers an appropriate browser-safe
credential for the speech endpoint, it may replace local key storage through a
separate design decision.

See the official
[OpenAI API authentication reference](https://developers.openai.com/api/reference/overview),
[workload identity token exchange](https://developers.openai.com/api/reference/workload-identity-federation),
[Realtime client-secret reference](https://developers.openai.com/api/reference/python/resources/realtime/subresources/client_secrets/methods/create),
and
[speech endpoint reference](https://developers.openai.com/api/reference/resources/audio/subresources/speech/methods/create).

### Required owner setup

The Settings flow instructs the owner to create a dedicated OpenAI project used
only by Wheel of Pain Timer. Before saving its project key, the owner must:

- apply an allowlist containing only the selected speech model where account
  controls make it available;
- configure a small project hard spend limit and a lower spend alert;
- use a project key, never an organization admin key; and
- understand how to revoke and replace the key.

OpenAI's current project controls include model allowlists, rate limits, spend
alerts, and a hard project spend limit. The app cannot configure or verify
these controls and must not claim that they are active merely because the key
works. See the official
[project controls reference](https://developers.openai.com/api/reference/typescript/resources/admin/subresources/organization/subresources/projects).

### Local key handling

- Settings provides a password-masked **OpenAI API key** field plus **Save on
  this device**, **Test speech**, **Replace key**, and **Remove key** actions.
- Saving requires a clear acknowledgement: the key remains on this device, any
  code running as this deployed app can access it, and OpenAI recommends
  server-side key storage.
- Store the key only in a dedicated IndexedDB credential record. Do not place
  it in local storage, session storage, a URL, DOM attribute, React state longer
  than needed, console output, error text, analytics, or a service-worker
  message or cache.
- Never include the credential record in application backup, restore, export,
  debug bundles, risk-lab evidence, or storage summaries. Existing generic
  preference backup code must not gain access to it.
- Show only a configured/not-configured state and, if useful, the final four
  characters. Never render or offer to copy the stored full key after saving.
- **Remove key** immediately deletes the credential, aborts any in-flight
  request, discards prepared speech, and makes online speech unavailable.
- An authentication failure disables further automatic requests for the
  workout and directs the owner to replace or remove the key. It never prints
  the rejected credential or upstream response body.
- Client-side encryption with an automatically stored decryption key is not
  treated as protection from same-origin JavaScript and is not required.

### Direct request boundary

Use a small `openAiSpeech` module and the browser Fetch API rather than adding a
general provider framework. It owns the endpoint URL, Authorization header,
request schema, timeout, model, voice, response validation, and normalized
errors. No other module receives the stored key.

The browser request is equivalent to:

```http
POST https://api.openai.com/v1/audio/speech
Authorization: Bearer <device-local project key>
Content-Type: application/json

{
  "model": "<validated speech model>",
  "input": "Jarno! Form first. Complaining second.",
  "voice": "<configured voice>",
  "instructions": "<fixed exact-reading rules plus selected Personality delivery style>",
  "response_format": "mp3",
  "speed": 1
}
```

The module accepts only the selected utterance and bounded Personality voice
instructions, not the pack's saying collection, participant roster, routine, or
history. It prepends non-editable rules requiring the model to read the supplied
text exactly, pronounce a participant name clearly, and finish the sentence.
It validates an `audio/mpeg` response, rejects an empty or oversized body, uses
an abortable timeout, and returns only a Blob or a bounded product error.
Provider error bodies are not retained or displayed.

Do not implement another provider abstraction now. If the product later moves
to ElevenLabs or another service, replace this isolated module and revise the
Settings credential contract then.

### Security posture

Public access to the GitHub Pages URL does not expose IndexedDB from the
owner's iPhone to another visitor. The accepted residual risk is that code
executing in the same deployed origin on the owner's device could read the key,
including a compromised deployment or dependency, an application injection
defect, a privileged browser extension, or a person with device access.

Reduce that risk by:

- serving scripts only from the application origin with a restrictive Content
  Security Policy and allowing network connections only to required origins;
- bundling dependencies rather than loading third-party scripts at runtime;
- rendering imported content as text and preserving the existing no-HTML rule;
- protecting the repository and deployment account with strong authentication;
- keeping the dedicated project's permissions and financial exposure small;
- making key removal and rotation straightforward; and
- verifying production build artifacts never contain a key used during tests.

This design limits exposure but does not make a browser-held API key equivalent
to a server-held secret.

## Deferred server-mediated alternative

The material below is not part of the initial implementation. It records the
safer conventional architecture if this application later becomes multi-user,
if direct browser CORS fails, or if the owner no longer accepts a browser-held
key.

The PWA does not call OpenAI, ElevenLabs, or another speech vendor directly. It
calls a product-owned HTTPS endpoint. This keeps credentials out of the public
bundle and prevents vendor-specific request fields, voice identifiers, error
formats, and URLs from becoming part of the client architecture.

The initial product endpoint is:

```http
POST /api/speech
Content-Type: application/json

{
  "text": "Jarno! Form first. Complaining second.",
  "voiceProfileId": "coach-default",
  "locale": "en-US",
  "rate": 1
}

200 OK
Content-Type: audio/mpeg
Cache-Control: no-store

<audio bytes>
```

The request contains no provider name, model name, provider voice ID, API key,
or output-format choice. `voiceProfileId` is a stable product identifier. The
server maps it to the configured provider's voice. Input length, locale, rate,
response size, content type, timeouts, and authentication or abuse controls are
validated at this boundary.

Because the current product is hosted as a static GitHub Pages application, it
cannot safely implement this endpoint by itself. TV-compatible generated
speech requires a separately deployed serverless function, edge worker, or
small backend. The deployment must provide HTTPS, narrowly configured CORS if
it is not same-origin, secret storage, request-size and rate limits, and an
abortable upstream request. The existing risk-lab proxy is evidence scaffolding
and is not production infrastructure.

### Provider adapter

The server selects one adapter through deployment configuration:

```ts
interface SpeechProvider {
  synthesize(
    request: ProviderSpeechRequest,
    signal: AbortSignal,
  ): Promise<ProviderSpeechResponse>
}

interface ProviderSpeechRequest {
  readonly text: string
  readonly deliveryInstructions: string
  readonly voiceProfileId: string
  readonly locale: string
  readonly rate: number
}

interface ProviderSpeechResponse {
  readonly bytes: Uint8Array
  readonly contentType: 'audio/mpeg'
}
```

The real implementation may stream internally, but the interface returns one
validated response for the initial buffered-playback design. The adapter also
owns provider model selection, credentials, request headers, voice mapping,
rate conversion, and error translation. It must not expose an upstream response
or error body to the client.

For example:

- The OpenAI adapter translates `text` to `input`, maps
  `deliveryInstructions` to `instructions`, selects its configured model and
  voice, requests MP3, sends Bearer authentication, and maps the product rate
  to the provider's supported speed.
- The ElevenLabs adapter places the mapped voice ID in the endpoint path,
  translates `text` and the configured model into its request body, selects an
  MP3 output format, sends `xi-api-key`, and maps the product rate only through
  a reviewed provider capability rather than assuming OpenAI's speed field
  exists.

The current vendor APIs support this shape: OpenAI's speech endpoint accepts
input, model, voice, output format, and speed and returns audio; ElevenLabs'
create-speech endpoint accepts text with a path-level voice ID, model and voice
settings and returns audio. See the official
[OpenAI create-speech reference](https://developers.openai.com/api/reference/resources/audio/subresources/speech/methods/create)
and
[ElevenLabs create-speech reference](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).

### Stable voice profiles

Do not persist a provider voice ID such as an OpenAI built-in voice name or an
ElevenLabs voice ID in device preferences. Persist a small product catalog:

```text
coach-default
coach-calm
coach-intense
```

Server configuration maps each profile to an available voice for the active
provider. A provider migration supplies a complete replacement mapping before
traffic changes. If a profile cannot be mapped, the server rejects deployment
configuration rather than silently changing that profile to an arbitrary
voice. The product may initially expose only `coach-default`; a small stable
catalog is easier to preserve across vendors than every voice a vendor offers.

Rate, locale, and delivery instructions are product-level capabilities. A
future server clamps or maps them per provider, and the UI offers only values
the active product contract can preserve. Other provider-only controls such as
stability, similarity, or pronunciation dictionaries remain outside the client
contract until the product deliberately adopts a portable equivalent.

### Provider selection and migration

Choose the initial provider with a recorded bake-off using the actual short,
high-energy sayings and target iPhone/TV setup. Compare:

- target-to-audible latency after one-event-ahead preparation;
- voice intelligibility over representative workout music and garage noise;
- consistency for participant names, numbers, and punctuation;
- MP3 compatibility and response-size distribution;
- price for expected characters per workout and concurrency;
- rate limits, timeout and availability behavior;
- data use, retention, logging controls, region, and contractual terms;
- supported languages and the portability of the chosen voice profiles; and
- operational complexity, observability, credential rotation, and abuse
  protection.

Starting with OpenAI is a reasonable implementation path because the risk-lab
adapter already exercises its speech endpoint, but that does not make OpenAI a
client dependency. OpenAI and ElevenLabs must pass the same adapter contract
tests and physical latency/listening script before either is selected.

A migration from OpenAI to ElevenLabs is:

1. Implement and contract-test `ElevenLabsSpeechProvider` without changing the
   PWA or `/api/speech` contract.
2. Supply and review the product voice-profile mappings.
3. Run golden-text pronunciation, latency, response-size, failure, privacy,
   and physical iPhone/TV tests against both providers.
4. Deploy the new adapter behind server configuration to a non-production
   environment and then a bounded rollout.
5. Switch the configured provider, monitor normalized success and latency
   metrics, and retain a rollback window.
6. Remove the old credential and adapter only after the rollback window closes.

Do not automatically fail over the same private utterance to a second provider
unless the user's consent language covers both providers and the duplicate
transmission and cost behavior have been explicitly approved. For MVP, skip
the announcement on provider failure.

### Contract verification

Every provider adapter runs the same tests:

- produces `audio/mpeg` for representative minimum, typical, and maximum text;
- maps every supported product voice profile or fails configuration validation;
- honors abort and timeout;
- normalizes authentication, throttling, invalid-input, provider, and malformed
  response failures without returning upstream details;
- rejects unexpected content type and oversized or empty audio;
- never logs text, participant names, credentials, or response bytes; and
- passes the same stale-result and one-event-ahead client integration tests.

Provider-specific tests cover only translation to that vendor's request shape.
The client tests use the product endpoint and do not mock an OpenAI or
ElevenLabs SDK.

## HTML media player design

Create one long-lived player service for the active application session. It
owns its `HTMLAudioElement` instances and exposes domain-oriented operations;
React components do not manipulate media elements directly.

The public boundary should support the equivalent of:

```ts
type AudioPlaybackResult =
  | 'started'
  | 'not-ready'
  | 'blocked'
  | 'failed'

interface TimerAudioPlayer {
  prime(): Promise<void>
  playCues(cues: readonly TimerCue[]): Promise<AudioPlaybackResult>
  prepareSpeech(request: SpeechRequest): Promise<PreparedSpeech | undefined>
  playPreparedSpeech(prepared: PreparedSpeech): Promise<AudioPlaybackResult>
  cancelSpeech(): void
  dispose(): void
}
```

Names may change during implementation, but the separation of cue selection,
speech preparation, and media playback must remain.

### Element ownership and readiness

- Create and retain one element per packaged cue so the browser can load the
  sources before a workout begins.
- Use two retained speech elements: one may play the current announcement
  while the other prepares the next announcement. Loading or replacing the
  prepared element must never pause the active element.
- Set `preload = "auto"` and call `load()` while preparing the pre-workout
  screen. Readiness is best effort; starting the workout must not wait on it.
- Set the available audio-session hint to playback as the existing code does,
  while treating that nonstandard capability as optional.
- Call `prime()` from the direct Play interaction. Priming must exercise the
  final HTML media path, not an `AudioContext`. Any silent or muted unlock
  technique must first be proven on the supported physical iPhone in both
  Safari and Home Screen mode; a desktop-only test is insufficient.
- A rejected `play()` promise is handled and reported through bounded
  diagnostics. It must never become an unhandled rejection.

### Playback rules

- Reset a cue element to its start before playing it.
- Play each emitted cue at most once.
- Emit and play the transition cue at most once per phase.
- A newer essential cue may interrupt an older essential cue if required to
  remain aligned with the visible timer. It must never delay timer state.
- Essential timer cues take priority over spoken motivation. When they would
  overlap, pause or skip the saying rather than mask the essential cue. Do not
  resume the remainder later.
- Disabling Timer sounds immediately stops an active timer cue and prevents
  later cues. Disabling Spoken motivation cancels current and prepared speech
  without changing Timer sounds.
- Pausing or ending a workout stops spoken motivation. Pausing does not invent
  or replay an essential cue.
- Visibility recovery, reload recovery, and elapsed-time catch-up do not play
  missed cues. Only cues selected from a current contiguous visible frame may
  reach the player.
- Every object URL is revoked after completion, cancellation, replacement, or
  disposal. Speech is bounded to one active and one prepared announcement and
  is not persisted in IndexedDB or included in backup.

## Speech preparation and stale-result handling

Speech generation is asynchronous, but the scheduled workout moment is not.
Each preparation receives an operation identifier and the exact target event,
such as the first Work of round 3, Cycle Rest 2, or Complete.

1. When Play starts the workout, select the first saying and participant using
   the newly initialized workout rotation and begin preparing that announcement.
2. After a prepared announcement starts or is skipped, begin preparing the
   next scheduled announcement on the standby element. Keep no more than one
   announcement active and one next announcement prepared or in flight.
3. Buffer the complete response and validate that its content type is an
   allowed audio type and its size is within a documented limit.
4. Accept it only if the operation is still current and its target event has
   not passed.
5. Consume it once at that target event, then revoke its object URL.

Play never waits for speech generation. In particular, when Prepare is zero
seconds and the first Work announcement is not ready when Work begins, skip
that announcement. Do not delay Work, generate the private announcement from
the pre-workout screen, substitute browser speech silently, or play the late
result after its target. Start preparing the next scheduled announcement
instead.

Changing Personality, participants, speech settings, routine, or workout;
skipping past the target; ending; completing another way; backgrounding; or
starting a newer preparation makes an older result stale. Abort the request
when possible, and reject a late response even if abort was not honored.

Network error, timeout, invalid content type, oversized response, decoding or
media error, stale response, and rejected playback all result in a skipped
saying. They do not retry during the workout and never affect timer state.

## Settings and user communication

Keep **Timer sounds** and **Spoken motivation** independent.

The speech settings must distinguish:

- **Device voice**: browser speech, availability varies, and TV routing is not
  promised.
- **TV-compatible online voice**: generated media routed through HTML audio;
  requires internet access and explicit consent to send one saying, the
  selected participant name, and the selected Personality's voice instructions.

Do not continue presenting browser-exposed voice choices as if they select the
OpenAI-generated voice. The online path uses a small allowlist of supported
OpenAI voices or a single documented default. The generic preview follows the
selected path and uses the selected Personality's voice instructions while
never sending private saying text or a participant name. Online voice controls
remain unavailable until a key is configured and the owner has enabled online
speech consent.

If the media path fails during a workout, avoid a persistent timer obstruction.
Record a compact status for later display in Settings or the pre-workout screen
and keep the visual timer authoritative. The UI must not claim that sound is
coming from the TV; the app cannot observe the selected system route.

## Offline behavior

- The packaged transition bell works offline.
- The app may reuse only a currently prepared, in-memory speech blob after a
  transient connection loss.
- It does not generate new online speech while offline.
- It does not persist private synthesized speech by default.
- Offline speech unavailability does not change the selected Personality,
  participant rotation, timer state, or completion behavior.

## Diagnostics

Development diagnostics may record:

- cue or target-event identifier;
- request start, response-ready, media-ready, playback-requested,
  playback-started, ended, interrupted, skipped, or failed;
- monotonic latency and media error category;
- launch mode, visibility state, and whether online speech consent was enabled.

Diagnostics must not record saying text, participant names, object URLs, API
keys, Authorization headers, or response bodies. Production telemetry is not
added by this specification.

## Verification

### Automated tests

- Maps the three-second transition command to the packaged bell asset.
- Preserves cue order and plays each command once.
- Handles `play()` resolution and rejection without affecting timer state.
- Gives essential cues priority over speech.
- Stops the correct channel when either audio setting is disabled.
- Rejects stale speech after every invalidating action.
- Skips an unready first Work announcement when Prepare is zero without
  delaying workout start or replaying the result later.
- Aborts replacement and cancellation requests and ignores late completion.
- Revokes every object URL on consumption, replacement, failure, and disposal.
- Makes no speech request without online consent.
- Makes no speech request without a configured credential and passes the key
  only to the isolated request module.
- Persists, replaces, and removes the credential only in its dedicated record.
- Excludes credential data from backup, export, restore, diagnostics, service
  worker messages, and application preferences.
- Redacts authentication and upstream failure details.
- Sends only the selected utterance fields and does not log private text.
- Includes all essential sound assets in the production precache manifest.

Use injected fake media elements in unit tests. DOM media stubs establish
control-flow correctness only; they do not establish audible output or routing.

### Physical acceptance matrix

Run the production build on the supported physical iPhone in Safari and as an
installed Home Screen PWA, first on the phone and then with the target TV route
active.

1. Start from a direct Play gesture and run a routine long enough to hear every
   cue type.
2. Confirm each cue is audible from the expected destination, aligned with its
   visual state, and not duplicated.
3. Repeat at least 20 cue or speech playbacks in a representative session.
4. Exercise pause/resume, Skip, background/foreground, rotation, an ordinary
   audio interruption, mute changes, and End Workout.
5. Play representative workout music and confirm essential cues remain usable;
   record system ducking rather than assuming the app controls it.
6. Cold-launch offline and confirm every essential cue still works.
7. The product owner reports that the direct authenticated Fetch request from
   the deployed browser succeeds and is not blocked by CORS. Preserve the
   formal Safari and Home Screen evidence without recording the Authorization
   value.
8. For generated speech, record request-to-ready and target-to-audible
   latency, stale cancellation, invalid and revoked key behavior, local key
   persistence and removal, offline failure, and consent revocation.

The migration is accepted when essential HTML media cues consistently use the
expected TV route on the tested setup, begin close enough to their visual event
to be usable, have no unexplained route changes or duplicate/late replay in the
long session, and remain fully available offline. Generated speech is accepted
separately only when prepared playback meets the risk-lab latency threshold and
all privacy and failure cases pass.

Direct OpenAI speech is a release blocker if browser CORS prevents the request
in either required launch mode. Do not add an unapproved proxy as a workaround;
return to the architecture decision if that gate fails.

If Web Audio and HTML media both pass, that does not change the selected
production transport. If HTML media fails scheduled playback after succeeding
only from a direct test button, the migration is not accepted until the
Play-gesture priming strategy is proven or the support boundary is revised.

## Implementation sequence

1. Run and record the direct-browser OpenAI key, CORS, credential-containment,
   latency, and HTML media routing risk-lab experiment.
2. Record and link the completed risk-lab HTML media and Web Audio runs.
3. Commit the three final cue assets and extend the PWA precache pattern.
4. Replace oscillator synthesis with the retained HTML media cue player while
   keeping the current `TimerCue` decision layer unchanged.
5. Add unit, integration, production-build, offline, and physical routing
   coverage for essential cues.
6. Add dedicated local-key storage, owner acknowledgement, project-setup
   guidance, direct OpenAI speech requests, and key removal.
7. Add single-event-ahead speech preparation beginning at Play, the zero-Prepare
   skip rule, stale rejection, and HTML media playback.
8. Update Settings copy and the requirements and acceptance scenarios only
   after the generated-speech path is selected for release.
9. Remove obsolete Web Audio oscillator code after the HTML media route passes
   the production physical matrix; remove or relabel browser speech only when
   the product decision for the device-voice fallback is complete.

## Requirement traceability

- T-005 and T-011: audible transition warning and visual transition behavior
- T-014: no replay of missed cues after recovery
- C-008, C-010, C-012, and C-013: optional saying schedule and participant
  selection
- D-004: explicit transmission boundary for one saying and participant name
- P-003 and P-005: offline essentials and truthful capability reporting
- A-002, A-005, A-006, and A-007: visual equivalents and independent audio
  controls

## Follow-up specification updates

When this design is approved for implementation:

- `pwa-risk-lab-findings.md` records the completed external-audio result and
  its exact tested environment.
- `timer-behavior.md` identifies packaged HTML media as the essential cue
  transport without changing cue timing.
- `content-packs.md`, `screens-and-flows.md`, and A-007 distinguish device
  speech from consented TV-compatible generated speech.
- `acceptance-scenarios.md` adds scheduled HTML media, stale speech, offline
  cue, consent, and target-TV cases.
