# Changelog

All notable changes to this fork of **ordinal-pringles** are documented in this file.

This repository follows the upstream version numbers, so the first entry below is the v0.5.0
milestone; everything before it (v0.0.6 - v0.4.3p3) is only documented by the git history this fork
inherits. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.5.0] "The Ringularity Update" - 2026-09-28

### Added

- **Ringularity**: a second Singularity with its own Density (up to H<sub>&omega;<sup>3</sup>2</sub>
  = 2000, the Endgame), raised with the shared Charge pool.
  - Five Ringularity Milestones (Density 100 / 300 / 600 / 1000 / 1500) that raise the Singularity's
    Density cap by +50 / +100 / +200 / +400 / +800 and strengthen the Singularity's three Effects.
  - `singEffects[3..5]` (Cardinal gain, Incrementy gain, all Aleph effects) are implemented and
    hooked into the calculation chains; the first one is unlocked by Energy Upgrade 106.
  - Ringularity panel (`#singularity1`, `#ringularityControls`, cap/Endgame texts) and a one-time
    tutorial when the Ringularity is unlocked.
- **Energy Upgrade 305** - "Cardinals boost all Perfected Pringles": multiplies the effect of the
  Pringles named "Perfected" (indices 2, 5 and 8) by `log10(Cardinals + 10)^2` (1x with no Cardinals,
  clamped to `Number.MAX_VALUE`).
- **Energy Upgrade 402** - "Unlock Imaginary Shifts" and the Imaginary Factor layer behind it: seven
  Imaginary Shifts with Ordinal Power requirements (1e105 ... 1e255), each unlocking the next
  Imaginary Factor (`Factor 1i` ... `Factor 7i`) and resetting the Imaginary Factor counts (the shift
  count itself is permanent).
- **The End**: once the Endgame is reached, a "The End" button appears (sidebar and Singularity
  subtab) and opens a full-screen congratulations screen with career stats and three actions -
  "Download your Save", "Start from Scratch" (confirmation, then a full wipe + reload) and
  "Keep Playing".
- Achievements: "The Endgame", "Imagination", "A Rift in the Factor Plane".
- `docs/REQUIREMENTS-RINGULARITY-ENDGAME.md`: the requirements analysis and implementation status of
  this release, in English (a Chinese translation lives in
  `docs/REQUIREMENTS-RINGULARITY-ENDGAME.zh-CN.md`).
- Offline smoke tests (`node tests/<name>.smoke.js "<repository root>"`, no browser, no build step):
  `endgame` (71 checks), `ringularity` (70), `imaginaryShifts` (89), `nanGuards` (106),
  `ordinalRecursion` (48) and `fuzz` (randomized trials + save corruptions).

### Changed

- Version bumped from `0.4.3p3` "The Pringle Update" to **`0.5.0` "The Ringularity Update"**;
  `fixOldSaves()` gets a `0.4.3` / `0.4.3p3` -> `0.5.0` marker (no structural migration is needed,
  every new field already has a default).
- Energy Upgrade 106 is now "Unlock the Ringularity's first Singularity Effect" (`isUnlock`,
  cost 3), and the Energy Tree hover text no longer prints `Infinity`.
- The Singularity's Density cap is `500 +` the Ringularity Milestone bonus, and both Singularities
  draw from the same Charge ledger.
- The Charge requirement, the Hierarchy buyables and the Factor max-buy path use the correct ledgers.
- `README.md`: attribution, license link and a "changes were made" statement (CC BY-NC-SA 4.0).

### Fixed

- Crash chain that ended in `RangeError: Maximum call stack size exceeded`:
  - `format()` returns `"NaN"` instead of recursing forever on a broken Decimal (`formatTime()` too).
  - `opGain()` and `calcOrdPoints()` got depth/progress guard rails.
  - Ordinal displays share a `MAX_ORD_DISPLAY_DEPTH` recursion budget, `preConvertHex` is iterative,
    and `changeTrim` is clamped to `MIN_ORD_TRIM` / `MAX_ORD_TRIM`.
  - Hardy falls back to `bigHardy()` for Ordinals ExpantaNum cannot parse (layered BreakEternity
    notation such as `(e^6)...`).
- Value chains that used to poison everything downstream:
  - Overflow: `getOverflowGain()` computes in Decimal space (so `0 * Infinity` stays 0) and
    `mainLoop()` repairs and saturates a non-finite Booster Power and Overcharge.
  - Hierarchies: a NaN gain is treated as no gain, and broken Hierarchy Ordinals are reset.
  - Booster Upgrades: the total Aleph effect is multiplied in Decimal space (it used to overflow to a
    plain-number `Infinity` and poison Incrementy gain).
  - `buyRUP()` ignores unmapped indices (3-5 used to call a non-existent cost scaling) and
    `chargeReq()` / `sacrificeIncrementy()` clamp non-finite exponents.
  - Darkness: out-of-range Drain indices are ignored and a broken Charge ledger is repaired.
- Saves: `unpackSave()` no longer throws on `null` entries, and `fixOldSaves()` repairs NaN/Infinity
  values in the Incrementy, Ordinal, Ordinal Powers, Booster Power/Overcharge, Darkness, Aleph,
  Cardinal and Decrementy fields, clamps the Ordinal Length, and normalises the Imaginary and
  Singularity ledgers.
- Leftovers from the earlier, unfinished versions of these features: `factorEffect()` read
  `data.imaginary[n]`, `buyMaxFactor()` compared against the normal Factor ledger, and every iFactor
  button bought Factor 1.
- `downloadSave()`'s error path called `closeModal(1)` (a missing element) instead of
  `closeModal('prompt')`.
- The "Start from Scratch" confirmation was painted behind the full-screen End screen - modal
  containers now sit above it, and notifications above the modal layer.

### Design references

The Ringularity, Energy Upgrade 106/305/402 and Imaginary Shift designs were rebuilt from this
repository's own earlier, unfinished commits (all still CC BY-NC-SA 4.0):

| Commit | Content |
| --- | --- |
| `21cbf58` feat: Ringularity | Ringularity UI, data and the Density-based unlock (threshold 300 at the time); the effects were never implemented |
| `3cb4f6c` chore: Hide Ringularity | appended "(Coming Soon!)" and commented out `#singularity1` |
| `990879a` chore: WIP Mechanic, decided to save for later | Imaginary Shifts stub and the "Unlock Imaginary Shifts" (EUP 402) idea |
| `42ff10e` feat: New 3xx Branch | the original EUP 305 wording, "Cardinals boost all Perfected Pringles" |

Alternatives that were looked at and **not** adopted: `d22c73d` and `4f20fb3` (the v0.5 rewrite on
`origin/singularity-2`, which removes the Singularity), `49b8e93` (`origin/v05-destabilization`,
Destabilized Realm) and `8dc106f` (Remove Singularity).

