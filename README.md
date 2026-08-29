# Wheel of Pain Timer

Wheel of Pain Timer is a local-first circuit workout timer with an
unapologetically retro personality. Its name is a group-specific reference to
garage workouts and *Conan the Barbarian*. It supports Tabata-style work and
rest intervals and runs as an installable web app on a phone.

## Project status

The product specification, PWA delivery model, and initial technical baseline
are accepted. MVP implementation is underway. Product choices are final only
when recorded in the specifications.

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
