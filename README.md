# ordinal-pringles

My remake of [Ordinal Markup](https://patcailmemer.github.io/Ordinal-Markup/) by Patcail.

Ordinal Pringles is a browser incremental game about growing Ordinals (up to and beyond
ε₀, Γ₀ and the Bachmann–Howard Ordinal) and spending them across layer after layer of prestige:
Markup, Boosters, Collapse, Obliteration, Pringles & Purity, Singularity, Baselessness,
Purification, Instability, and finally the Ringularity and the Endgame.

## Playing

There is no build step and nothing to install - it is a plain static site:

1. Clone or download this repository.
2. Open `index.html` in a modern browser (any static file server works too).

Progress is kept in `localStorage`. When the game is hosted on
[galaxy.click](https://galaxy.click/play/8) it also uses the Galaxy cloud-save integration
(`src/data/cloud.js`).

## Version

This fork follows the upstream version numbers. The current version is
**v0.5.0 "The Ringularity Update"** (September 28th, 2026) - see [CHANGELOG.md](CHANGELOG.md).

## Development

* `index.html` loads every script directly - no bundler, no package manager, no dependencies.
* Offline smoke tests (Node.js only, no browser required):

  ```sh
  node tests/endgame.smoke.js "<path to repository root>"
  node tests/ringularity.smoke.js "<path to repository root>"
  node tests/imaginaryShifts.smoke.js "<path to repository root>"
  node tests/nanGuards.smoke.js "<path to repository root>"
  node tests/ordinalRecursion.smoke.js "<path to repository root>"
  node tests/fuzz.smoke.js "<path to repository root>"
  ```

  Each suite loads the real game scripts in `index.html` order under DOM stubs, checks the
  mechanics it covers, and exits non-zero if any check fails.
* Documentation: [`docs/REQUIREMENTS-RINGULARITY-ENDGAME.md`](docs/REQUIREMENTS-RINGULARITY-ENDGAME.md)
  (English) - the requirements analysis and implementation status of the v0.5.0 work
  ([中文](docs/REQUIREMENTS-RINGULARITY-ENDGAME.zh-CN.md)).

## Credits

* **Original game**: [Ordinal Markup](https://patcailmemer.github.io/Ordinal-Markup/) by
  **Patcail**, released under the MIT license. Ordinal Pringles is a remake of it.
* **Remake**: [ordinal-pringles](https://github.com/FlamemasterNXF/ordinal-pringles) by
  **FlamemasterNXF and contributors**.
* **This fork's additions** (v0.5.0, September 28th, 2026): **FlamemasterNXF and contributors**.

## Changes

This repository contains **modified material**: the Ringularity mechanic, Energy Upgrades
106 / 305 / 402, the Imaginary Shifts, the Endgame and the "The End" congratulations screen were
added between v0.4.3p3 and v0.5.0. See [CHANGELOG.md](CHANGELOG.md) for the full list and for the
earlier commits of this repository that the designs were rebuilt from.

## Third-party resources

| Resource | Location | License |
| --- | --- | --- |
| [vis-network](https://visjs.github.io/vis-network/) | `src/lib/vis-network.min.js` | MIT (copyright header kept in the file) |
| ExpantaNum | `src/lib/ExpantaNum.js` | MIT |
| BreakEternity | `src/lib/BreakEternity.js` | MIT |
| [Dosis](https://fonts.google.com/specimen/Dosis) font | `styles/Dosis/` | SIL Open Font License (`styles/Dosis/OFL.txt`) |
| Game art (Pringles, the gwa easter egg, ...) | `res/` | Part of this project, distributed under the license below |

## License

This project is distributed under the
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/)
license - see the [`license`](license) file, which must not be replaced.

In short, you may share and adapt the project, but you must:

1. give appropriate credit, provide a link to the license, and indicate if changes were made;
2. not use the material for commercial purposes (no ads, paywalls, paid unlocks or sponsorships);
3. distribute your contributions under the same license as the original.

_Not affiliated with Patcail or the original Ordinal Markup project._


