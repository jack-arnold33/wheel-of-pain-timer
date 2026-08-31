# Wheel of Pain Timer

Wheel of Pain Timer is a local-first circuit workout timer with an
unapologetically retro personality. Its name is a group-specific reference to
garage workouts and *Conan the Barbarian*. It supports Tabata-style work and
rest intervals and runs as an installable web app on a phone.

## Project status

The documented MVP is implemented. The product specification, PWA delivery
model, and technical baseline are accepted, and the automated test and
production build suites cover the repository implementation. Release validation
on the supported physical iPhone, Home Screen launch modes, and a mirrored
display remains required before calling a deployment supported.

Product choices are final only when recorded in the specifications.

## Included features

- A protected **Wheel of Pain** routine plus locally saved custom routines
- Accurate pause, resume, skip, completion, and interrupted-workout recovery
- Essential timer audio, optional spoken Personalities, and participant rotation
- Local-first Personality authoring, import, selection, and management
- Portable backup and atomic restore of user routines, packs, participants,
  attendance, and preferences
- Four selectable appearances: **Wheel of Pain**, **Cold Steel**,
  **Neon Circuit**, and **Day Shift**
- Installable PWA delivery with offline application resources, safe update
  activation, and capability notices

The default Wheel of Pain display font is packaged with the application.
Optional theme fonts are requested only when their theme is active and fall
back to usable system fonts without blocking offline timer operation.

## Development

The application uses Node.js 22 or newer and pnpm. From the repository root:

```text
pnpm install
pnpm dev
```

Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` before opening
a pull request.

## Specifications

- [Product brief](specs/product.md)
- [Requirements](specs/requirements.md)
- [Local-first content packs](specs/content-packs.md)
- [Portable local backup](specs/local-backup.md)
- [MVP timer behavior](specs/timer-behavior.md)
- [MVP screens and flows](specs/screens-and-flows.md)
- [MVP acceptance scenarios](specs/acceptance-scenarios.md)
- [iOS and PWA capability risks](specs/ios-pwa-risks.md)
- [PWA risk lab specification](specs/risk-lab.md)
- [PWA risk-lab findings](specs/pwa-risk-lab-findings.md)
- [Accepted PWA architecture](specs/pwa-architecture-decision.md)
