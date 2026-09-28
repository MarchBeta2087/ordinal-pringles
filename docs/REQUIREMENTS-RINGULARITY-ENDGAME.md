# Ringularity & Endgame — Requirements Analysis

🌐 **English** | [中文](REQUIREMENTS-RINGULARITY-ENDGAME.zh-CN.md)

> **Status**: **implemented** (v0.5.0 "The Ringularity Update", 2026-09-28) - see Appendix D and
> `CHANGELOG.md` for the details and the per-item verification; the §0-§12 "draft" chapters are kept
> for traceability.
> **Baseline**: Ordinal PRINGLES `v0.4.3p3` "The Pringle Update" (`VERSION_DATE = February 16th, 2025`)
> -> this release: `v0.5.0`
> **Document date**: 2026-09-28
> **License**: the project as a whole is licensed under **CC BY-NC-SA 4.0** (see `license` in the repository root)
> **Scope of this document**: it describes *what* to build, *why*, and *how to accept it*; the actual
> implementation is defined by the code and Appendix D.

---

## 0. Document information and revision history

| Version | Date | Author | Notes |
| --- | --- | --- | --- |
| 0.1 | 2026-09-28 | — | First version: baseline audit + FR-1…FR-6 + Endgame + license compliance |

**Review verdict**: (accept / reject / accept with changes) - left blank.

---

## 1. Background and goals

`ordinal-pringles` is a spiritual successor to and remake of *Ordinal Markup* (original by Patcail,
MIT; remake in this repository by FlamemasterNXF). It is built around growing Ordinals, layering
Markup -> Boosters -> Collapse -> Obliteration -> Pringle/Purity/Instability on top of each other.

Problems found (player feedback + code audit):

1. **The Ringularity is half-finished**: its UI, data structures, achievements and unlock texts
   already exist, but the mechanic was never implemented and is hard-hidden in the code.
2. **The Energy Tree still has three placeholder upgrades (106 / 305 / 402)**: they cost `Infinity`
   and can never be bought - an obvious "unfinished" marker.
3. **There is no explicit Endgame**: no completion check and no completion feedback, so players lack a
   goal after 1750 ℶ<sub>ω</sub>.
4. `(Coming Soon)` / `???` placeholders are still scattered around the repository.

**Goals for this work:**

- G1: finish the **Ringularity** mechanic (including the Singularity <-> Ringularity feedback loop).
- G2: fill in **Energy Upgrade 106 / 305 / 402** (content and costs).
- G3: define and implement an **explicit Endgame** (the goal = **Ringularity Density 2000**).
- G4: remove every placeholder and finish the accompanying achievements/tutorials/saves/version bump.
- G5: satisfy the **CC BY-NC-SA 4.0** Attribution, NonCommercial and ShareAlike requirements throughout.

---

## 2. Scope

**In scope**

- The Ringularity's numeric rules, data contract, UI and hook-up to the effect calculation chains.
- The content, costs and `isUnlock` semantics of EUP 106 / 305 / 402, plus the Energy Tree display fix.
- The Endgame check, progress display, completion achievement and completion feedback.
- Save compatibility (`getDefaultPlayer` / `fixOldSaves`) and the version bump (`VERSION`, ...).
- The license-compliance deliverables (README attribution and so on, **without modifying the `license` text**).

**Out of scope**

- The "remove the Singularity" v0.5 rewrite from the unmerged `origin/singularity-2` /
  `origin/v05-destabilization` branches (see §4.4).
- Introducing a build system, bundler or test framework (the repository is a plain static site).
- Refactoring unrelated systems (Ordinal display, BMS/Y-Sequence, ...).
- Any commercial use, ads or paid content (license requirement).

---

## 3. Glossary

| Term | Meaning | Code location |
| --- | --- | --- |
| Singularity / Ringularity | The two "singularities"; their Density is displayed as an ordinal (`H_x`) and they are high-tier prestige layers | `src/collapse/singularity.js:1` |
| Total Density | The sum of both Densities, used for the `singFunctions` thresholds | `src/collapse/singularity.js:172` |
| Density | The level of a Singularity, 0-500 / 0-2000, shown in base 10 as an ordinal | `src/ordinal/ordinal.js:2` |
| Charge | The resource that raises Density, derived from the total Incrementy | `src/boosters/incrementy.js:167` |
| singFunction | A "Singularity Function" unlocked by Total Density (an unlock or a bonus) | `src/collapse/singularity.js:155` |
| singEffect | A passive effect granted by Density (three per Singularity) | `src/collapse/singularity.js:81` |
| EUP / Energy Upgrade | An Energy Tree upgrade bought with Fractal Energy | `src/obliterate/energyUpgrades.js` |
| Fractal Energy | The high-tier currency of Obliteration | `src/obliterate/obliterate.js:5` |
| Ringularity Cap Bonus | The Density cap that Ringularity Milestones grant to the Singularity | added by FR-1 in this document |
## 4. Baseline audit

### 4.1 Version and engineering

| Item | Value | Location |
| --- | --- | --- |
| Version | `0.4.3p3` / "The Pringle Update" | `src/data/saving.js:2-5` |
| Version date | `February 16th, 2025` | `src/data/saving.js:4` |
| Latest commit | `c9df18d` (2025-04-07, Merge PR #58) | `git log -1` |
| License | CC BY-NC-SA 4.0 | `license` |
| Loading | `index.html` loads every script in `defer` order | `index.html:13-71` |
| Build / tests | no `package.json`, no test framework (plain static site) | repository root |

### 4.2 Ringularity: the scaffolding exists, the mechanic does not (and is hidden)

| Fact | Location |
| --- | --- |
| The two-Singularity name array is already defined | `src/collapse/singularity.js:1` |
| The Density cap is hardcoded to `500`, and both Singularities share the same Charge pool | `src/collapse/singularity.js:90` |
| `singEffects` has 6 slots; `[0..2]` belong to the Singularity, `[3..5]` are **Ringularity placeholders** (`"Coming Soon!"` / `"???"` / `"???"`) | `src/collapse/singularity.js:81-89` |
| Unlock text: `Unlock a Ringularity (Coming Soon!), but cap the Singularity's Density at H_ω²5` (`requiredLevel: 500`) | `src/collapse/singularity.js:165` |
| The Ringularity UI already exists in full (`#singularity1` / `sing1Level` / `sing1Level2` / `sing1Effect0..2` / `singSlider1`) | `index.html:436-449` |
| It is hard-hidden (its display is always `none`) | `src/helpers/tabs.js:79` |
| Known defect marker: `changeSingLevel` still reads `data.sing.level[0]` | `src/collapse/singularity.js:94` |
| Same defect: the Charge ledger only subtracts the first Singularity's Density | `src/boosters/incrementy.js:167`, `src/collapse/collapse.js:312` |
| An achievement already references the Ringularity | `src/minor/achievements.js:380-383` ("The Blugularity", `hasSingFunction(9)`) |
| The data structure is already designed for 2 Singularities (length-2 arrays) | `src/data/player.js:30` |

**Conclusion**: the Ringularity is missing "mechanics and effect definitions", not "infrastructure".

### 4.3 EUP 106 / 305 / 402: the nodes exist, their content is a placeholder

| Node | Data location | Current content | Notes |
| --- | --- | --- | --- |
| 106 | `energyUpgradeData[1][5]` | `desc: '??? (Coming Soon)'`, `cost: Infinity`, `eff: D(1)` | source comment `// Unlock a new Singularity Effect` (`src/obliterate/energyUpgrades.js:77-88`) |
| 305 | `energyUpgradeData[3][4]` | `desc: "??? (Coming Soon!)"`, `cost: Infinity` | 3xx branch = Pringle (`...:249-260`) |
| 402 | `energyUpgradeData[4][1]` | `desc: "??? (Coming Soon!)"`, `cost: Infinity` | 4xx branch = Instability/Realm (`...:275-286`) |

- The Energy Tree nodes and edges are already in place: `src/obliterate/energyTree.js:9` (106), `:25`
  (305), `:28` (402), `:38` (105 -> 106), `:56` (304 -> 305), `:60` (401 -> 402).
- The purchase prerequisite logic is generic: `canPurchaseTreeUpgrade()` uses `id-1`, so none of the
  three nodes needs new logic (`src/obliterate/energyTree.js:130-135`).
- **Side defect**: `updateEnergyTreeText()` renders `Infinity` verbatim as "Can be Activated for
  Infinity Fractal Energy" (`src/obliterate/energyTree.js:155`) - this has to be fixed as well.

### 4.4 Historical design index (this repository's own git history, not external material)

> Everything below comes from **this repository's own** commits and may be reused under the license
> (see §8).

| Commit | Branch | Design relevant to this work |
| --- | --- | --- |
| `21cbf58 feat: Ringularity` | already in `main` history | Ringularity UI + data structures + unlock by Total Density (threshold `300` = H_ω²3 at the time) |
| `3cb4f6c chore: Hide Ringularity` | `main` history | appended "(Coming Soon!)" to the text and commented out the `#singularity1` display |
| `990879a chore: WIP Mechanic, decided to save for later` | `main` history | **Imaginary Shifts** (a fourth Factor Shift set) + EUP402 = "Unlock Imaginary Shifts" (unfinished) |
| `42ff10e feat: New 3xx Branch` | branch history | 3xx branch rework; **305** used to be `"Cardinals boost all Perfected Pringles"` |
| `d22c73d feat: ... impl EUP106` | `origin/singularity-2` (unmerged) | EUP106 = "The Stable Hypercharge Effect applies to Cardinal Gain" (depends on the v0.5 systems, **not applicable**) |
| `4f20fb3 feat: EUP305` | `origin/singularity-2` | EUP305 = "Factor Boosts no longer reset ANYTHING" (**not applicable**) |
| `49b8e93 feat: Add EUP402` | `origin/v05-destabilization` | EUP402 = "Permanently convert the Forgotten Realm to the Destabilized Realm" (an alternative) |
| `8dc106f feat: Remove Singularity!` | `origin/singularity-2` | the v0.5 rewrite deletes the Singularity entirely (**not adopted here**) |

**Key conclusion**: the Ringularity's "effects" and "resource model" were **never** designed in the
history (`singEffects[3..5]` were always placeholders). Defining that design is therefore the core
value of this document.

### 4.5 Imaginary Shifts (where EUP402 lands): current state

- The storage field already exists: `imaginary: { shifts: 0, factors: Array(7).fill(0) }` (`src/data/player.js:35`).
- The Factor system already supports an `imaginary` argument: `factorCost(n, imaginary)` /
  `hasFactor(n, imaginary)` / `factorEffect(n, imaginary)` / `buyFactor(n, imaginary)`
  (`src/markup/factors.js:27-59`), and `buyMaxFactor()` already has an imaginary branch (`...:63-66`).
- **What is missing**: `hasFactor(n, true)` depends on `data.imaginary.shifts`, but nothing ever
  increments it; `imaginaryShiftData` is an empty array, `getImaginaryShiftReq` is undefined, and
  `imaginaryShift()` is an empty shell inside a commented-out block (`src/markup/markup.js:153-163`).
- On the UI side there are no `imaginaryShiftButton` / `iFactor*` elements (adding them to
  `index.html` and `switchSubtab` was planned historically).

## 5. Functional requirements

### FR-1 The Ringularity mechanic

**FR-1.0 Confirmed design constraints (from the requester)**

1. The Ringularity "upgrades" the **Singularity** in return: by **raising the Singularity's Density
   cap**, and by **strengthening the Singularity's three effects** at its Milestones.
2. The Endgame goal = **Ringularity Density reaches 2000**.

**FR-1.1 Numeric rules**

| Rule | Definition |
| --- | --- |
| Singularity base cap | 500 (H<sub>0</sub> … H<sub>ω<sup>2</sup>5</sub>), unchanged |
| Ringularity cap | **2000** (H<sub>0</sub> … **H<sub>ω<sup>3</sup>2</sub>**; `makeGenericOrd` was verified to render it, see `src/ordinal/ordinal.js:2-16`) |
| Unlock condition | `hasSingFunction(9)`, i.e. Total Density >= 500; only then is `#singularity1` shown |
| Effective Singularity cap | `singCap(0) = 500 + ringularityCapBonus()`, where `ringularityCapBonus()` accumulates the Ringularity Milestones |
| Effective Ringularity cap | `singCap(1) = 2000` |
| Total Density | `getTotalSingDensity() = level[0] + level[1]`, theoretical maximum ≈ `500 + bonus + 2000` |

**FR-1.2 Ringularity Milestones (suggested values; these are tunable balance parameters)**

| Ringularity Density | Effect |
| --- | --- |
| 100 | Singularity cap +50; strengthens Singularity effect 1 (`singEffects[0]`) |
| 300 | Singularity cap +100; strengthens Singularity effect 2 (`singEffects[1]`) |
| 600 | Singularity cap +200; strengthens Singularity effect 3 (`singEffects[2]`) |
| 1000 | Singularity cap +400; strengthens all three Singularity effects again |
| 1500 | Singularity cap +800 |
| **2000** | **Endgame reached** (see FR-5) |

> Suggested strengthening method: give each `singEffects[i]` a "Ringularity multiplier", i.e. multiply
> or add a term driven by `getRingularityMilestoneCount(i)` on top of the existing formula (the
> coefficient still needs balancing). **The index and meaning of `singEffects[0..2]` in the existing
> code must not change** (`singEffects[0]` is used by `collapse.js:183`, `singEffects[1]` by
> `challenges.js:120` and `singEffects[2]` by `tick.js:14`).

**FR-1.3 The Ringularity's own three effects (`singEffects[3..5]`)**

Current placeholders: `{desc: () => "Coming Soon!", effect: () => 1}` /
`{desc: () => "???", effect: () => 1}` / `{desc: () => "???", effect: () => 1}`
(`src/collapse/singularity.js:86-88`).

Requirements:

- They must be completed into **functional `desc()` + `effect()` pairs** that are **actually wired
  into a calculation chain** (a description nobody reads does not count).
- The effect numbering follows the existing `(n*3)+i` index rule: the Ringularity slots are fixed at
  3/4/5 (`src/collapse/singularity.js:32-35`).
- Suggestion (subject to review): slot 3 = a multiplier for the growth loop (Cardinal/Aleph flavoured);
  slot 4 = a boost to the energy line (Fractal Energy / Energy Upgrade effects); slot 5 = an
  Endgame-related global multiplier. The final text and formulas are decided during balancing.

**FR-1.4 Resource and ledger (recommended approach)**

- **Recommended**: the Ringularity reuses the single `incrementy.charge` pool (the scaffolding was
  designed that way: `maxSingLevel` uses `incrementy.charge` and `singCostText` displays Charge).
- **Hardcodes that must be fixed** (otherwise the second Singularity cannot take part in the ledger):
  - `src/collapse/singularity.js:90` `maxSingLevel(i)` must return the cap per Singularity
    (0 -> `singCap(0)`, 1 -> `2000`).
  - The `500` literals in `src/collapse/singularity.js:130` / `:147` (`singControl`'s "fill up" check)
    must become `singCap(n)`.
  - `src/collapse/singularity.js:94` `changeSingLevel`'s `data.sing.level[0]` must become
    `data.sing.level[i]` (fulfilling that line's `//TODO: Allow for multiple Singularities here.`).
  - `src/boosters/incrementy.js:167` and `src/collapse/collapse.js:312`: `totalCharge - level[0]` ->
    `totalCharge - level[0] - level[1]`.
- **Alternative**: a separate resource for the Ringularity (not recommended: it needs new production,
  display and save fields for little benefit).

**FR-1.5 UI / text requirements**

- Un-hide it: restore `src/helpers/tabs.js:79` to `hasSingFunction(9) ? 'flex' : 'none'`.
- Drop "(Coming Soon!)" from the text at `src/collapse/singularity.js:165`.
- Replace the placeholder `Important Text!!!!` of the `singSlider1` label (`index.html:444`) with a
  proper description; `singSlider1.max` must be set to 2000 dynamically by `loadSingularityHTML` /
  `changeSingLevel`.
- `sing1Effect0..2` and `sing0Effect*` need distinct colours (today slot 0 is warm and slot 1 is blue).
- The three Ringularity control buttons: the existing `singControl(i, n)` already supports the `n`
  argument, but `index.html:451-457` only ever passes 0; add a button group for the Ringularity (or
  switch between the two Singularities within one group).

**FR-1.6 Edge cases**

- With a shared Charge pool, `incrementy.charge >= 0` must hold at all times; shrinking a Density must
  refund exactly as much Charge as it cost.
- The Singularity must not be usable inside `inPurification(3)` (`singControl` / `changeSingLevel`
  already check this; keep it consistent for both Singularities).
- `obliterateReset()` zeroes both `level`/`highestLevel` (`src/obliterate/obliterate.js:59-62`);
  `ringularityCapBonus` must follow and leave no residue.
- No `NaN` / `Infinity` may appear (Charge and Density are plain Number/Decimal values; mind the
  `Number.MAX_VALUE` limit).

### FR-2 Energy Upgrade 106 (`energyUpgradeData[1][5]`)

| Item | Requirement |
| --- | --- |
| Theme | 1xx branch = Singularity / Charge / Baselessness |
| Content | **Unlock the Ringularity's 1st effect (`singEffects[3]`)** |
| Basis | the source comment `// Unlock a new Singularity Effect`; `singEffects[3]` already belonged to the Ringularity in `21cbf58` (the Ringularity is a "Singularity" too) |
| Type | `isUnlock: true` (a one-time unlock, not numeric) |
| Cost | `cost: 3` (following the branch curve: 101-104 = 1, 105 = 2) |
| Prerequisite | `canPurchaseTreeUpgrade` already requires 105 to be active |
| Presentation | `desc: 'Unlock the Ringularity's first Singularity Effect'`; `eff` returns `D(1)` (the existing convention for unlock nodes) |

**Related requirements**

- This unlock complements `singFunctions[9]` (which unlocks the Ringularity itself): **having the
  Ringularity but not 106 means the 1st effect does nothing**; having 106 but no Ringularity means the
  effect is inactive for now.
- The UI must show "Unlocked!" correctly (the `isUnlock` branch already exists in
  `energyTree.js:155`).

**Alternatives (if this is rejected during review)**

- B1: 106 unlocks the Singularity's 4th effect (needs more UI slots and is a bigger change).
- B2: 106 lowers the Ringularity's unlock threshold (conflicts with the 500 gate in `singFunctions[9]`;
  not recommended).

### FR-3 Energy Upgrade 305 (`energyUpgradeData[3][4]`)

| Item | Requirement |
| --- | --- |
| Theme | 3xx branch = Pringle |
| Content | **"Cardinals boost all Perfected Pringles"** |
| Basis | the original wording of node 305 in this repository's commit `42ff10e feat: New 3xx Branch` |
| Type | numeric (`sign: 'x'`, `baseValue: 1`) |
| Cost | `cost: 2` (301-304 in the same branch = 1) |
| Hook | `getPringleEffect(i)` (`src/obliterate/pringles.js:238-240`); add a `x` multiplier for the Pringles named "Perfected" (indices 2 and 5) |

**Implementation details that need confirmation**

- "Perfected Pringles" means `pringleData[2]` (Perfected Green) and `pringleData[5]` (Perfected Orange).
  Whether both should benefit needs a review decision (suggested: both).
- The multiplier is suggested as `x log10(cardinals + 10)^k`, with a `Number.MAX_VALUE` clamp.

**Alternatives**

- B1: adopt `origin/singularity-2`'s "Factor Boosts no longer reset ANYTHING" (a QoL/automation wrap-up
  that does not fit the Pringle theme of the 3xx branch; not recommended).
### FR-4 Energy Upgrade 402 (`energyUpgradeData[4][1]`)

| Item | Requirement |
| --- | --- |
| Theme | 4xx branch = Instability / Realm |
| Content | **"Unlock Imaginary Shifts"** plus finishing the Imaginary Shift mechanic |
| Basis | this repository's commit `990879a`; the storage already exists in `src/data/player.js:35`; `src/markup/factors.js:27-59` already supports `imaginary` |
| Type | `isUnlock: true` |
| Cost | `cost: 2` |
| Prerequisite | 401 must be active |

**Sub-items that have to be finished (otherwise EUP402 has no content)**

1. `imaginaryShiftData`: define the requirement and effect of each Imaginary Shift (currently an empty
   array at `src/markup/markup.js:153-155`).
2. `getImaginaryShiftReq(shifts)`: define the requirement of the next Imaginary Shift.
3. `imaginaryShift()`: increment `data.imaginary.shifts` and run the matching reset (currently an empty
   shell at `src/markup/markup.js:156-162`).
4. UI: the `imaginaryShiftButton` and `iFactorContainer` / `iFactor{i}` elements have to be added to
   `index.html` and shown/hidden by `getEUPEffect(4,1)` when `switchSubtab('factor','markup')` runs
   (see how `990879a` changed `switchSubtab`).
5. Presentation: `updateMarkupHTML()` has to output the iFactor information (there is a reference
   implementation in `990879a`).
6. The `data.imaginary` save field already exists, so **no migration is needed**; but `hasFactor(n, true)`
   depends on `data.imaginary.shifts`, so old saves must read the default 0.
7. Note that the historical implementation in `990879a` has a typo (`data.imaginary[n]` should be
   `data.imaginary.factors[n]`) that must be fixed when porting it.

**Alternative**: `origin/v05-destabilization`'s "Permanently convert the Forgotten Realm to the
Destabilized Realm" (little content, it only renames the Realm / changes lock values; not recommended as
the main pre-Endgame content).

### FR-5 Endgame

**Definition: Ringularity Density reaching 2000 (H<sub>ω<sup>3</sup>2</sub>) is the Endgame.**

| Sub-item | Requirement |
| --- | --- |
| Check | `data.sing.level[1] >= 2000` (or `hasReachedRingularityEndgame()`) |
| Progress display | show `Ringularity progress x / 2000` plus the ordinal form on the Singularity page (or in the status bar) |
| Completion feedback | on completion: a one-time alert (`createAlert`/`showNotification`) plus a permanent marker (a status-bar badge / a permanently lit entry) |
| Completion achievement | a new achievement (suggested at the end of `achievements` so existing indices keep working; `data.achs` grows automatically through the existing `Array(achievements.length)` default) |
| Placeholder cleanup | `(Coming Soon)` / `???` must no longer appear as player-visible text anywhere |
| Numeric safety | new multipliers go through ExpantaNum or `softcap` / `Math.min(..., Number.MAX_VALUE)` |
| Replayability | after 2000 the content enters a "finished" state; no new mechanic is forced (whether to offer a post-completion loop is an open question in §11) |

**Interfaces with the other systems**

- Make `EUP 106 / 305 / 402` signposts on the way to 2000 (they unlock the Singularity effect, boost the
  Pringles and extend the Factor Shifts respectively).
- Allow new `singFunctions` thresholds above 500 (Total Density can already exceed 500), filling the
  500 -> 2000 range with goals; new functions generate their UI automatically (`initSingularityFunctions`
  uses `createElement`, `src/collapse/singularity.js:64-78`), but `data.sing.hasEverHadFunction` and the
  achievements have to be extended in step.

### FR-6 Supporting requirements (UI / achievements / tutorials / status bar / settings)

| Sub-item | Requirement | Location |
| --- | --- | --- |
| Achievements | add Ringularity Milestone, Imaginary Shift and Endgame achievements; **new achievements always go at the end** | `src/minor/achievements.js:1`, `initAchs()` |
| Tutorial | the `sing` subtab tutorial has to cover the Ringularity (today it only explains the Singularity) | `src/helpers/tabs.js:74-77` |
| Status bar | if the Endgame introduces a new "mode/state", the status text has to follow | `src/helpers/worldStatus.js:16` |
| Settings | **high risk**: a new toggle means changing `SETTINGS_DESCS`, `settingsDefaults` and the `settingsToggleN` buttons in `index.html`; a changed array length shifts every `data.sToggles` index in existing saves | `src/minor/settings.js:3-15`, `index.html:611-653` |
| Energy Tree text | fix the `Infinity` display; the `desc` of 106/305/402 must not contain placeholders | `src/obliterate/energyTree.js:155` |
## 6. Data and save requirements

1. **Defaults**: every new field has to be declared in `getDefaultPlayer()` (`src/data/player.js`).
2. **Backwards compatibility**: `unpackSave()` only walks the keys a save actually contains, so old
   saves automatically keep the defaults for missing keys (no extra handling needed).
3. **Array growth**: `data.sing.level` / `highestLevel` are already length-2 arrays
   (`src/data/player.js:30`), so **no migration is needed** for this work; if `singFunctions` grows
   (optional, FR-5), `data.sing.hasEverHadFunction` relies on its `Array(singFunctions.length)` default
   and old saves hold a shorter array - those have to be padded explicitly in `fixOldSaves()` together
   with a version bump.
4. **Version bump**: change `VERSION` / `VERSION_NAME` / `VERSION_DATE` (`src/data/saving.js:2-4`) and
   add a migration branch in `fixOldSaves()` following the existing style (the newest one at the time was
   `0.4.3p3`; `0.5.0` was suggested).
5. **Migration style**: keep using the existing
   `if(data.loadedVersion === "old") { ...; data.loadedVersion = "new" }` chain.
6. **No destructive migrations**: never reset a player's existing `sing.level` / `energyUpgrades`
   (`energyUpgrades` is an array, so new nodes need no migration).
7. **Cloud saving**: if Cloud Saving is enabled, the version-incompatibility messaging has to stay
   consistent (`src/data/cloud.js`).

---

## 7. Non-functional requirements

| Category | Requirement |
| --- | --- |
| Numeric safety | no new multiplier may produce `NaN` / `Infinity`; use ExpantaNum (`D()`) for Decimal math and `softcap` / `Math.min(..., Number.MAX_VALUE)` for plain numbers |
| Performance | no O(n)-or-worse recomputation inside `mainLoop` (50 ms interval); `singEffects` / Milestone checks have to be O(1) or near-constant |
| Compatibility | usable on desktop and mobile (`isMobileMode()`); new UI must not overflow in `mobile.css` |
| Maintainability | follow the existing style (no frameworks, global functions, `let` + arrow functions); new logic lives in the matching module file |
| Observability | zero console errors; new logic must not swallow exceptions outside the existing `try/catch` (`energyTree.js:94-97`) |
| Testability | no test framework; acceptance is a manual checklist + console + save round-trips (see §9) |
| Localisation | in-game text follows the existing English style (as the rest of the repository); no multi-language support |

---

## 8. License and attribution compliance (CC BY-NC-SA 4.0)

**License in force**: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
(`license` in the repository root, including the tl;dr summary).

| # | Obligation (from the `license:1-12` summary) | Deliverable for this work |
| --- | --- | --- |
| 1 | **Attribution**: give appropriate credit, provide a link to the license | `README.md` must state the original *Ordinal Markup* (Patcail, MIT) and the remake `ordinal-pringles` (FlamemasterNXF and contributors), and link the license (`https://creativecommons.org/licenses/by-nc-sa/4.0/`) |
| 2 | **NonCommercial**: do not use the material for commercial purposes | no ads, paywalls, donation-gated content or sponsorships; the project may not be sold |
| 3 | **ShareAlike**: distribute contributions under the same license | contributions stay under CC BY-NC-SA 4.0; **the `license` file must not be replaced with another license** |
| 4 | **Indicate changes**: indicate if changes were made | a "Changes" statement and its content (the Ringularity / EUP 106, 305, 402 / the Endgame) are required; a "Changes" section in `README.md` with the date is recommended |

**Third-party resources (their original license notices must be preserved)**

| Resource | Location | License |
| --- | --- | --- |
| vis-network | `src/lib/vis-network.min.js` | MIT (copyright header kept in the file) |
| ExpantaNum | `src/lib/ExpantaNum.js` | MIT |
| BreakEternity | `src/lib/BreakEternity.js` | MIT |
| Dosis font | `styles/Dosis/` | SIL OFL (`styles/Dosis/OFL.txt` and `README.txt` must be kept) |
| Game art | `res/**` | project assets, distributed under the main license |

**About reusing this repository's history**: the designs referenced above come from **this repository's
own** commits (`21cbf58`, `990879a`, `42ff10e`, ...), which are under the same CC BY-NC-SA 4.0; citing
the source commits in the CHANGELOG / commit messages is recommended so the "indicate changes"
requirement is traceable.

**Deliverables (compliance)**

- `README.md`: attribution + license link + Changes statement.
- `CHANGELOG.md` (new; optional but strongly recommended): the new content and the source commits.
## 9. Acceptance criteria

**A. Ringularity**

- [x] A1 Once Total Density reaches 500 (Singularity Density H<sub>ω<sup>2</sup>5</sub>), `#singularity1` is displayed and its text no longer says "(Coming Soon!)".
- [x] A2 Without a Ringularity Milestone the Singularity cannot exceed 500; with Milestones it can pass 500 up to `singCap(0)`.
- [x] A3 Ringularity Density can grow to 2000, the slider `max` is correct, and the ordinal is displayed as H<sub>ω<sup>3</sup>2</sub>.
- [x] A4 Both Singularities share Charge: after growing/shrinking either one, `data.incrementy.charge` stays consistent (`Charge = totalCharge - level[0] - level[1]`).
- [x] A5 After a Collapse / Obliteration / Respec (Passive, Energy, Instability) the Charge, both Densities and `ringularityCapBonus` are reset/kept correctly (matching the existing rules).
- [x] A6 `singEffects[3..5]` all have a real `desc()` and `effect()` and are referenced by at least one game calculation.
- [x] A7 Milestones really strengthen `singEffects[0..2]` without changing their index meaning (`collapse.js:183`, `challenges.js:120`, `tick.js:14` keep working).

**B. Energy Upgrade 106 / 305 / 402**

- [x] B1 All three nodes can be bought (their cost is no longer `Infinity`) and the Energy Tree hover text is correct (no `Infinity`, no `???`).
- [x] B2 After 106, the Ringularity's 1st effect becomes usable; without it, the effect does nothing.
- [x] B3 After 305, the "Perfected" Pringle values rise as designed without overflowing.
- [x] B4 After 402, Imaginary Shifts are usable: the button appears, a shift can be performed, iFactors can be bought and are displayed, and `data.imaginary.shifts` increments and persists.
- [x] B5 The `isUnlock` semantics of all three are correct (a bought node shows either "Unlocked!" or its current effect).

**C. Endgame**

- [x] C1 Reaching Ringularity Density 2000 gives a one-time completion alert and a permanent marker.
- [x] C2 The new completion achievement unlocks and counts towards `data.achs`.
- [x] C3 No player-visible text in the repository still shows `(Coming Soon)` / `???`.

**D. Saves and version**

- [x] D1 Saves from every older version (the historical nodes from `0.0.6` on) still load, with no `NaN` and no console errors.
- [x] D2 The new version number is displayed correctly on the settings page (`versionText`, `src/update/update.js:34`).
- [x] D3 A save containing the new fields / array lengths round-trips ("save -> reload -> load") unchanged.

**E. License**

- [x] E1 `README.md` contains the attribution, the license link and the "changes were made" statement.
- [x] E2 The `license` text has not been replaced or deleted; the third-party license files (`styles/Dosis/OFL.txt`, ...) are still present.
- [x] E3 There is no commercial element (ads / paid content / donation-gated content).

---

## 10. Risks and dependencies

| # | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| R1 | A hardcoded `500` or `data.sing.level[0]` is missed | the second Singularity's ledger breaks / its cap stops working | every occurrence was located up front (§4.2, FR-1.4); search the whole repository for `sing.level[0]`, `>= 500`, `Math.min(500` while implementing |
| R2 | The index meaning of `singEffects[0..2]` changes | breaks `collapse.js:183`, `challenges.js:120`, `tick.js:14` | only add "stacked multipliers", never change signatures or indices; re-verify the Cardinal/Decrementy/AutoBuyer values afterwards |
| R3 | The settings array length changes | every `data.sToggles` index shifts in existing saves | avoid new settings; if one is unavoidable, append it at the end and pad in `fixOldSaves` |
| R4 | `singFunctions` grows | old saves have a too-short `hasEverHadFunction` | pad explicitly in `fixOldSaves` and bump the version |
| R5 | Balance runs away (Milestone bonuses too strong/weak) | the 500 -> 2000 range is too short or too long | keep every Milestone value in one constant so it stays tunable |
| R6 | Numeric overflow (`Infinity`/`NaN`) | corrupted saves | force `softcap` / `Number.MAX_VALUE` clamps; acceptance item D1 covers it |
| R7 | License non-compliance (missing attribution / change statement) | violates the CC terms | work through the E1-E3 checklist; confirm item by item during review |
| R8 | Depending on code from unmerged branches | conflicts with `main` | only reuse the design ideas from this repository's own history (§4.4), never merge the branches |

## 11. Open questions

### 11.1 Review record (Q1-Q8, conclusions kept for traceability)

> Q1 / Q2 / Q3 / Q4 / Q7 were never settled and have been handed over as long-term open questions
> (see §11.2) instead of being part of this work; Q5 / Q6 / Q8 were implemented as recorded below.

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| Q1 | Should the Ringularity reuse `incrementy.charge`? | shared (recommended) / separate resource | shared: the scaffolding already assumes it, smallest change |
| Q2 | The exact text and formulas of `singEffects[3..5]`? | slot 3 = Cardinal/Aleph flavoured; slot 4 = Fractal Energy / energy flavoured; slot 5 = a global Endgame multiplier | as suggested; the coefficients are set during balancing |
| Q3 | Are the Milestone values suitable (100/300/600/1000/1500, caps +50/+100/+200/+400/+800)? | scale them as a whole | implemented as suggested, tune later |
| Q4 | Add new `singFunctions` between 500 and 2000? | add (more content) / do not add (smaller change) | add 2-3 to fill the 500 -> 2000 range |
| Q5 | Should EUP 305's "Perfected Pringle" mean "both benefit" or "only Perfected Green"? | both / only one | both benefit |
| Q6 | EUP402: Imaginary Shifts or Destabilized Realm? | Imaginary (recommended) / Destabilized | Imaginary: plenty of content, half-built already |
| Q7 | Should there be a post-completion loop once 2000 is reached (score/replay)? | yes / no | no (make "finished" explicit, avoid endless growth) |
| Q8 | Which version number? | `0.5.0` / `0.4.4` | `0.5.0` (mechanic-level content) |

### 11.2 Open questions handed to later maintainers (Q9-Q16)

The questions below are out of scope for this work and were never settled. They are left to later
maintainers / the community; the options and the current state are recorded so anyone can pick them up.

| # | Question | Options | Current state / notes |
| --- | --- | --- | --- |
| Q9 | Should 2-3 new `singFunctions` be added for the Ringularity range (Density 500 -> 2000)? | add / keep as is | open (was Q4): today only the 5 Milestones provide goals |
| Q10 | Ringularity balance: Milestone thresholds 100/300/600/1000/1500, cap bonuses +50…+800, and the strength of `singEffects[3..5]` | rescale / adjust per stage / keep | open (was Q1/Q2/Q3): needs long-term play-testing; the values are already collected in `ringularityMilestones` |
| Q11 | Should there be a post-completion loop (New Game+, score board, stats page, hidden content)? | provide / keep it "finished" | open (was Q7): the current design keeps it explicit, and The End screen is a natural entry point |
| Q12 | EUP 305: the coefficient `EUP305_EXPONENT = 2` and its scope - should Perfected Blue (index 8, which feeds `getHBuyableCap`) be included? | change the coefficient / narrow the scope / keep | open: the coefficient is a single constant at the top of `src/obliterate/energyUpgrades.js` |
| Q13 | Imaginary Shifts: are the seven Ordinal Power thresholds (1e105…1e255) and the "only the Imaginary counts are reset" cost right? Should each Shift grant a permanent bonus? | retune the thresholds / add a bonus / keep | open: the thresholds live in `imaginaryShiftData` |
| Q14 | Should the historical CHANGELOG entries for v0.0.6-v0.4.3p3 be backfilled? | backfill / keep pointing at git history | open: backfilling means inferring each entry from the commits, with limited accuracy |
| Q15 | Should a minimal CI (GitHub Actions running the six `tests/*.smoke.js` suites) and a `.gitignore` (for stray files such as `jmeter.log`) be added? | add / do not add | current state: all six suites are pure Node with zero dependencies, so CI is a drop-in |
| Q16 | Mobile and accessibility: wrapping of the full-screen End screen / the Imaginary panel on narrow screens, ESC to close, focus management | polish / keep | current state: `.endgameContainer` has `overflow-y: auto`, there is no keyboard or focus handling |

---

## 12. Milestones and effort estimate

| Milestone | Content | Main files | Estimate |
| --- | --- | --- | --- |
| M1 Scaffolding fixes | cap parameterisation, de-hardcoding the Charge ledger, un-hiding `#singularity1`, `Infinity` display fix | `singularity.js`, `incrementy.js`, `collapse.js`, `tabs.js`, `energyTree.js` | 0.5-1 day |
| M2 Ringularity mechanic | Milestones, cap bonus, `singEffects[3..5]`, effect hook-up, UI text and buttons | `singularity.js`, `index.html`, `styles/main.css` | 1.5-2 days |
| M3 EUP 106/305/402 | content of the three nodes + finishing Imaginary Shifts + the Pringle multiplier | `energyUpgrades.js`, `factors.js`, `markup.js`, `pringles.js`, `index.html` | 1.5-2 days |
| M4 Endgame | the check, progress display, completion achievement and feedback, placeholder cleanup, (optional) new `singFunctions` | `singularity.js`, `achievements.js`, `worldStatus.js`, `saving.js` | 0.5-1 day |
| M5 Balancing and polish | number tuning, mobile layout, save round-trip tests, docs/README compliance | whole repository + `README.md` | 1-1.5 days |

> Rough total: **5-8 working days** (single developer familiar with the code base).
>
## Appendix A: relevant commits / branches

```
21cbf58  feat: Ringularity                    (main history; UI/data/unlock, effects never implemented)
3cb4f6c  chore: Hide Ringularity              (main history; hid #singularity1)
990879a  chore: WIP Mechanic, ...             (main history; Imaginary Shifts stub + the EUP402 idea)
42ff10e  feat: New 3xx Branch                 (3xx branch rework; 305 used to be "Cardinals boost all Perfected Pringles")
d22c73d  feat: Remove EUP401, impl EUP106     (origin/singularity-2; depends on the v0.5 systems, not applicable)
4f20fb3  feat: EUP305                         (origin/singularity-2; not applicable)
49b8e93  feat: Add EUP402                     (origin/v05-destabilization; an alternative)
8dc106f  feat: Remove Singularity!            (origin/singularity-2; not adopted here)
```

## Appendix B: affected files (reference for the implementation)

| File | Changed in this work? | Notes |
| --- | --- | --- |
| `src/collapse/singularity.js` | yes | the main FR-1 file (caps, Milestones, `singEffects[3..5]`, `singControl`/`changeSingLevel`) |
| `src/boosters/incrementy.js` | yes | the Charge ledger (`:167`) |
| `src/collapse/collapse.js` | yes | the Charge ledger (`:312`), the `singEffects[0]` reference (`:183`) |
| `src/helpers/tabs.js` | yes | un-hiding (`:79`) and the tutorial (`:74-77`) |
| `index.html` | yes | the Ringularity tab/buttons and the Imaginary Shifts UI |
| `src/obliterate/energyUpgrades.js` | yes | EUP 106 / 305 / 402 |
| `src/obliterate/energyTree.js` | as needed | already in place; only the hover text had to be checked |
| `src/obliterate/pringles.js` | yes | the EUP305 Pringle multiplier |
| `src/markup/factors.js` | as needed | the imaginary branch existed; its typos had to be fixed |
| `src/markup/markup.js` | yes | `imaginaryShift()` / `getImaginaryShiftReq` / the display |
| `src/minor/achievements.js` | yes | new achievements (appended at the end) |
| `src/data/saving.js` | yes | version number + migration |
| `src/data/player.js` | as needed | new fields (if any; `ringularityCapBonus` is derived and need not be stored) |
| `src/helpers/worldStatus.js` | as needed | Endgame status text |
| `src/minor/settings.js` | avoid if possible | high risk: array indices |
| `README.md` | yes | license attribution and the Changes statement |
| `CHANGELOG.md` | created | the changelog with the source commits (`[0.5.0] "The Ringularity Update"` entry + the commit table) |
| `src/helpers/modal.js` | yes | The End screen (`showEndgameScreen()` / `makeEndgameStatsHTML()` / `endgameResetConfirm()`) |
| `tests/*.smoke.js` | yes (new) | the six offline smoke tests: `ringularity` / `imaginaryShifts` / `endgame` / `nanGuards` / `ordinalRecursion` / `fuzz` |
| `license` | **no** | the text must not be modified |

---

## Appendix C: design decision record (confirmed)

| Decision | Conclusion | Source |
| --- | --- | --- |
| How the Ringularity upgrades the Singularity | **raise the Singularity's Density cap (past 500) + strengthen its three effects at Milestones** | confirmed by the requester |
| Definition of the Endgame | **Ringularity Density reaches 2000** | confirmed by the requester |
| Scope of reusing historical designs | only this repository's own commits (license prerequisite) | §4.4 / §8 of this document |

---

## Appendix D: implementation status

> Updated 2026-09-28. A checked item is implemented in the code and covered by a smoke test
> (`ringularity` 70/70, `imaginaryShifts` 89/89, `endgame` 71/71, `nanGuards` 106/106,
> `ordinalRecursion` 48/48, `fuzz` 0 violation; the commands are at the end of this appendix).

**Completed - M1 scaffolding fixes + M2 Ringularity mechanic + FR-5 Endgame + FR-2 (EUP 106)**

- [x] Per-Singularity caps: `singCap(0) = 500 + ringularityCapBonus()`, `singCap(1) = 2000` (`src/collapse/singularity.js`)
- [x] Ringularity Milestones (100/300/600/1000/1500 -> caps +50/+100/+200/+400/+800), driven by `highestLevel[1]` (cleared after an Obliteration)
- [x] Milestones strengthen the Singularity's three effects (`singEffectBoost(i)`; additive only, index meaning unchanged)
- [x] `singEffects[3..5]` implemented and hooked into the calculation chains: x Cardinal gain (unlocked by EUP106), x Incrementy gain, x all Aleph effects
- [x] Charge ledger de-hardcoded: both `incrementy.js:167` and `collapse.js:312` subtract both Densities
- [x] `changeSingLevel` / `singControl` / `maxSingLevel` support `n = 1`, with NaN guards and cap clamping
- [x] UI: `#singularity1` un-hidden, real texts, a new `#ringularityControls` button group and `#ringularityCapText` / `#ringularityEndgameText`
- [x] Endgame: the Ringularity Density 2000 (H<sub>ω<sup>3</sup>2</sub>) check + a one-time alert (`data.sing.endgame`) + the "The Endgame" achievement
- [x] EUP 106 = "Unlock the Ringularity's first Singularity Effect" (`isUnlock: true`, `cost: 3`); the Energy Tree `Infinity` display was fixed
- [x] New fields `data.sing.endgame` / `data.sing.ringularityTutorial`; old saves fall back to the defaults (no migration needed)
- [x] A one-time tutorial popup on first unlocking the Ringularity (`data.sing.ringularityTutorial`)

**Completed - FR-3 (EUP 305) and FR-4 (EUP 402 + Imaginary Shifts)**

- [x] EUP 305 = "Cardinals boost all Perfected Pringles" (`cost: 2`, numeric): the multiplier is `log10(Cardinals + 10)^2`, clamped to `Number.MAX_VALUE`, and exactly x1 with no Cardinals (`EUP305_EXPONENT` is the balance parameter, `src/obliterate/energyUpgrades.js`)
- [x] The 305 multiplier hooks into `getPringleEffectBaseline()` and applies to **every** Pringle named "Perfected" (2 = Green, 5 = Orange, 8 = Blue); the hover text and the real effect agree, and an unassigned Pringle still yields `baseValue` (`src/obliterate/pringles.js`)
- [x] EUP 402 = "Unlock Imaginary Shifts" (`isUnlock: true`, `cost: 2`); its prerequisite is still 401 (no change needed in `energyTree.js` / `canPurchaseTreeUpgrade`)
- [x] `imaginaryShiftData` defines the seven Imaginary Shifts and their Ordinal Power thresholds (`1e105` … `1e255`, balance parameters) together with `getImaginaryShiftReq()` / `canPerformImaginaryShift()` / `imaginaryShiftConfirm()` / `imaginaryShift()` (`src/markup/markup.js`, replacing the commented-out stub)
- [x] An Imaginary Shift unlocks the next Imaginary Factor, raises the tier (`[1,1,1,1,1.3,1.9,2.2,2.3]`) and resets the Imaginary Factor counts; `data.imaginary.shifts` is a **permanent layer** (no reset clears it; the smoke test asserts this at source level)
- [x] Existing defects fixed: `factorEffect()` read `data.imaginary[n]` (NaN), `buyMaxFactor()`'s imaginary branch used the normal Factor ledger for its cost, and the historical iFactor buttons were all hardcoded to `buyFactor(0)` (`src/markup/factors.js`)
- [x] UI: the Factor subtab gained `#imaginaryShiftButton` and `#iFactorContainer` (seven `iFactor{n}` buttons calling `buyFactor(n, true)`), shown/hidden by EUP 402 (`index.html` + the new "Special Markup Rules" in `tabs.js`)
- [x] Achievements: "Imagination" and "A Rift in the Factor Plane" appended at the end of the array (existing indices untouched, `src/minor/achievements.js`)
- [x] Saves: `data.imaginary` needs no migration; `fixOldSaves()` clamps `shifts` to 0-7 and repairs the 7-entry `factors` ledger (NaN/Infinity normalisation, `src/data/saving.js`)
- [x] Every Energy Tree placeholder is gone (the smoke test scans the whole table for `Coming Soon` / `???`)

**Completed - §8 license deliverables (v0.5.0)**

- [x] `README.md`: attribution (Patcail's *Ordinal Markup*, MIT, plus FlamemasterNXF and contributors), the license link (`https://creativecommons.org/licenses/by-nc-sa/4.0/`), a "Changes" statement (Ringularity / EUP 106, 305, 402 / Imaginary Shifts / Endgame / The End), a third-party resource and license table, and the non-commercial note
- [x] `CHANGELOG.md` (new): the `[0.5.0] "The Ringularity Update" - 2026-09-28` Added/Changed/Fixed entries, a source-commit table (`21cbf58`, `3cb4f6c`, `990879a`, `42ff10e`) and the alternatives that were not adopted
- [x] `license` **unmodified** (it does not appear in `git status`); `styles/Dosis/OFL.txt` and `styles/Dosis/README.txt` are still present; the third-party library headers are untouched
- [x] E3 check: no ads/paid/donation-gated content anywhere (a `patreon|paypal|donate|advert|sponsor` sweep only hits the README sentence that states the obligation)

**Completed - The End screen + v0.5.0**

- [x] The "The End" button has two entry points - the sidebar `#theEndButton` (below `#obliterateButton`) and the Singularity subtab's `#ringularityEndgameControls` / `#singEndgameButton` - both toggled by `updateEndgameButtonHTML()` (every tick and in `uHTML.load()`)
- [x] Completion is latched **permanently** in `data.sing.endgame` (an Obliteration clears both Densities, so Density cannot be used for this); the trigger was extended to `level[1] >= 2000 || highestLevel[1] >= 2000`, and the one-time `createAlert` text now mentions the The End button
- [x] The full-screen congratulations screen `#endgameContainer` / `#endgame` (`styles/modal.css`'s `.endgameContainer`, whose `pointer-events: all` overrides `#modalLayer`'s `pointer-events: none`) with a title, the congratulations text (H<sub>ω<sup>3</sup>2</sub>) and 8 career stats
- [x] Its three buttons: `Download your Save` (reuses `downloadSave()`), `Start from Scratch` (a `Cancel` / `OK` confirmation -> `fullReset()`: clipboard backup -> wipe -> reload) and `Keep Playing` (`closeModal('endgame')`)
- [x] Layering fix: `.modalContainer { z-index: 2 }` / `.endgameContainer { z-index: 1 }` (both used to be `z-index: auto` children of `#modalLayer`, so DOM order decided and a confirmation opened from the screen was hidden); `#notification` was raised to `z-index: 4` (above `#modalLayer`'s 3)
- [x] Version: `VERSION = "0.5.0"` / `VERSION_NAME = "The Ringularity Update"` / `VERSION_DATE = "September 28th, 2026"` (`IS_BETA` stays `false`, the save key is still `ordinalPRINGLESsave`); `fixOldSaves()` gained the non-structural `0.4.3 / 0.4.3p3 -> 0.5.0` marker branch
- [x] Smoke test `tests/endgame.smoke.js` (71 checks: version and migration, button visibility and the latch, the one-time alert, the screen and its stats, wipe/download, layering and Cancel/OK semantics, static wiring)

**Remaining work**

- [ ] The former "later milestones" are now **open questions** for later maintainers / the community and are no longer part of this work: `Q4` (new `singFunctions` in the 500-2000 range), `Q1/Q2/Q3` (Ringularity balance) and `Q7` (a post-completion loop). See **§11.2** (which also lists the newly added Q9-Q16).

**How to verify**: six offline smoke tests (pure Node, no browser, no build step), all run as
`node tests/<name>.smoke.js "<repository root>"`:

- `ringularity` (70 checks): cap parameterisation, Milestones, the Charge ledger, `singEffects[3..5]`, save round-trips, lock guards, UI show/hide, the Endgame alert.
- `imaginaryShifts` (89 checks): EUP 305/402 - costs and prerequisites, the Perfected multiplier, the Imaginary Shift thresholds/reset/cap, iFactor buying and display, save round-trips and broken-save repair, plus a full-table placeholder scan.
- `endgame` (71 checks): the version and the `0.4.3p3 -> 0.5.0` migration, button visibility and the latch, the one-time alert, the End screen and its stats, wipe/download, layering and `Cancel`/`OK` semantics, static wiring (including ".modalContainer must sit above .endgameContainer").
- `nanGuards` (106 checks): the NaN/Infinity guards for `format()`, `chargeReq()`, the BUP overflow, broken-save repair and more.
- `ordinalRecursion` (48 checks): the recursion-depth budgets of the Ordinal display and Hardy.
- `fuzz`: randomised runs plus save corruption, printing `0 violation(s), 0 load error(s)`.

---

*End of document. Acceptance is checked item by item against §9; the open questions are listed in §11.*











