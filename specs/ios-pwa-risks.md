# iOS and PWA capability risks

This is a product risk record, not a browser-support promise or implementation
plan. Capability behavior must be verified on the supported iPhone and iOS
versions before release. Feature detection and truthful fallback notices remain
required even where a platform release claims support.

## Current evidence

- iOS and iPadOS support adding websites to the Home Screen. A manifest with an
  app-like display mode has historically controlled standalone behavior; iOS 26
  also lets the user choose whether the item opens as a web app. The product
  therefore cannot assume that every Home Screen icon launches in standalone
  mode. See [Web Push for Web Apps on iOS and iPadOS][web-apps-164] and
  [WebKit Features in Safari 26.0][safari-26].
- WebKit announced Screen Wake Lock for iOS/iPadOS 16.4, but its Home Screen web
  app implementation remained broken until iOS/iPadOS 18.4. Older supported
  devices or releases may expose a missing or ineffective capability. Even on
  newer releases a lock can be denied or released. See [WebKit bug 254545][wake-bug]
  and [Safari 18.4 release notes][safari-184-notes].
- Service workers and the Cache API can support offline app resources, but
  service-worker lifetime is controlled by the browser and is not a continuous
  background execution guarantee. Timer recovery must use saved timeline
  evidence rather than rely on callbacks or a worker running while suspended.
  See [Workers at Your Service][service-workers].
- IndexedDB, Cache API, service-worker registrations, and other origin data are
  subject to quota and possible eviction under storage pressure unless
  persistent mode is granted. WebKit may grant persistence based on heuristics,
  including Home Screen use, but it is not guaranteed. Export, restore, storage
  failure handling, and data-loss warnings remain product requirements. See
  [Updates to Storage Policy][storage-policy].
- WebKit supports web speech synthesis, but the browser controls which voices
  are exposed and their availability can change. The current evidence does not
  guarantee that every exposed voice is reliably classified as on-device or
  online. The app must withhold private utterances whenever it cannot enforce
  the user's online-voice policy. See [New WebKit Features in Safari 14.1][speech].

## Residual MVP risks and required responses

| Risk | Required product response |
| --- | --- |
| The OS suspends or terminates the app while timing. | Persist recoverable timeline checkpoints; reconstruct on return; never replay missed cues. |
| The wall clock moves forward while the process is gone. | Advance by positive elapsed time. Document that a long closure cannot be distinguished reliably from a forward manual clock change. |
| The wall clock moves backward while the process is gone. | Restore the checkpoint as paused, warn that accuracy could not be verified, and offer Resume or End Workout. |
| Wake lock is unavailable, denied, released, or ineffective. | Keep timer behavior correct and show a concise notice that the screen may sleep. Attempt reacquisition when visible. |
| A Home Screen launch does not use app-like display mode. | Report the limitation and remain usable in the browser. Do not claim installation mode succeeded. |
| Cached application resources are missing or evicted. | Do not promise offline readiness until the application has loaded successfully; expose a truthful offline failure rather than a broken timer. |
| Browser-managed local data is evicted or cleared. | Warn users, provide portable export/restore, and handle missing data as a clean local state. |
| Audio or speech is blocked, interrupted, delayed, or unavailable. | Preserve all essential visual cues; report speech unavailability outside the critical timer hierarchy; never let speech delay phase progression. |
| Voice locality cannot be determined. | Treat the voice as ineligible while online voices are disallowed. Never infer consent from voice selection alone. |
| Device mirroring, TV overscan, orientation behavior, or safe areas differ. | Test the landscape timer on representative phones and mirrored displays; keep essential content away from unsafe edges and avoid orientation-lock dependence. |

## Release validation still required

Before calling the iPhone MVP supported, test at least:

1. Add to Home Screen and standalone/app-like launch on each supported iOS line.
2. First online load followed by airplane-mode cold launch and full workout.
3. Foreground, background, lock-screen, reload, and force-termination recovery.
4. Wake-lock grant, denial, release, foreground reacquisition, and completion.
5. IndexedDB retention, quota failure, site-data clearing, backup, and restore.
6. Local voice discovery, missing selected voice, audio interruption, and the
   inability to classify voice locality.
7. Landscape readability and controls on the phone and a mirrored television.

[web-apps-164]: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
[safari-26]: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
[wake-bug]: https://bugs.webkit.org/show_bug.cgi?id=254545
[safari-184-notes]: https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes
[service-workers]: https://webkit.org/blog/8090/workers-at-your-service/
[storage-policy]: https://webkit.org/blog/14403/updates-to-storage-policy/
[speech]: https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/
