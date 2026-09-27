# Ringularity 机制与 Endgame 需求分析文档

> **状态**：草案（Draft）— 供评审用，尚未进入开发阶段
> **基线版本**：Ordinal PRINGLES `v0.4.3p3` "The Pringle Update"（`VERSION_DATE = February 16th, 2025`）
> **文档日期**：2026-09-28
> **许可证**：本项目整体遵循 **CC BY-NC-SA 4.0**（见仓库根目录 `license`）
> **约束**：本文档只描述"要做什么/为什么/如何验收"，不含最终实现代码；开发开始前不修改 `/src`。

---

## 0. 文档信息与修订记录

| 版本 | 日期 | 作者 | 说明 |
| --- | --- | --- | --- |
| 0.1 | 2026-09-28 | — | 首版：现状审计 + FR-1~FR-6 + Endgame + 许可证合规 |

**评审结论栏**：待填写（接受 / 驳回 / 修改后接受）。

---

## 1. 背景与目标

`ordinal-pringles` 是 *Ordinal Markup*（原作者 Patcail，MIT）的精神续作与重制版（本仓库原作者 FlamemasterNXF），以 Ordinal（序数）增长为核心，逐层叠加 Markup → Boosters → Collapse → Obliteration → Pringle/Purity/Instability 等系统。

当前问题（用户反馈 + 代码审计确认）：

1. **Ringularity 是半成品**：UI、数据结构、成就与解锁文案都已存在，但机制从未实现，且被代码硬隐藏。
2. **能量树存在三个占位升级（106 / 305 / 402）**：代价为 `Infinity`，玩家永远无法购买，属于明显的"未完成"标记。
3. **没有明确的 Endgame**：不存在"通关/终点"判定或终点反馈，玩家在 1750 ℶ<sub>ω</sub> 之后缺乏目标。
4. 全仓库仍残留多处 `(Coming Soon)` / `???` 占位文案。

**本次目标**：

- G1：补完 **Ringularity** 机制（含 Singularity 与 Ringularity 的联动闭环）。
- G2：补完 **Energy Upgrade 106 / 305 / 402** 的内容与代价。
- G3：定义并实现一个**明确的 Endgame**（终点 = **Ringularity 密度 2000**）。
- G4：清除所有占位符，并完成配套的成就/教程/存档/版本升级。
- G5：全过程满足 **CC BY-NC-SA 4.0** 的署名（Attribution）、非商业（NonCommercial）、相同方式共享（ShareAlike）要求。

---

## 2. 范围界定（Scope）

**In Scope**

- Ringularity 的数值机制、数据契约、UI、效果计算链接入。
- EUP 106 / 305 / 402 的内容、代价、`isUnlock` 语义与能量树显示修复。
- Endgame 判定、进度展示、终点成就与通关反馈。
- 存档兼容（`getDefaultPlayer` / `fixOldSaves`）、版本号升级（`VERSION` 等）。
- 许可证合规配套改动（README 署名等，**不改动 `license` 正文**）。

**Out of Scope**

- 不采用未合并分支 `origin/singularity-2` / `origin/v05-destabilization` 的"删除 Singularity"式 v0.5 重写方向（见 §4.4）。
- 不引入构建系统、打包器、测试框架（仓库现状为纯静态站点）。
- 不重构无关系统（如 Ordinal 显示、BMS/Y-Sequence 等）。
- 不作为商业用途、不添加广告/付费内容（许可证要求）。

---

## 3. 术语表

| 术语 | 含义 | 代码位置 |
| --- | --- | --- |
| Singularity / Ringularity | 两座"奇点"；密度以序数显示（`H_x`），属高阶声望层 | `src/collapse/singularity.js:1` |
| Total Density | 两座密度之和，用于 `singFunctions` 阈值判定 | `src/collapse/singularity.js:172` |
| Density（密度） | 奇点的等级，0–500 / 0–2000，按 10 进制转序数显示 | `src/ordinal/ordinal.js:2` |
| Charge | 用于提升奇点密度的资源，源自 Incrementy 总量 | `src/boosters/incrementy.js:167` |
| singFunction | 按 Total Density 解锁的"奇点函数"（解锁功能或加成） | `src/collapse/singularity.js:155` |
| singEffect | 奇点密度带来的持续效果（每座 3 个） | `src/collapse/singularity.js:81` |
| EUP / Energy Upgrade | 能量树升级，用 Fractal Energy 购买 | `src/obliterate/energyUpgrades.js` |
| Fractal Energy | Obliteration 的高阶货币 | `src/obliterate/obliterate.js:5` |
| Ringularity Cap Bonus | Ringularity 里程碑为 Singularity 提升的密度上限 | 本文档 FR-1 新增 |
| Endgame | 终点状态：Ringularity 密度达到 2000（H<sub>ω<sup>3</sup>2</sub>） | 本文档 FR-5 |

---

## 4. 现状审计（Baseline Audit）

### 4.1 版本与工程

| 项 | 值 | 位置 |
| --- | --- | --- |
| 版本 | `0.4.3p3` / "The Pringle Update" | `src/data/saving.js:2-5` |
| 版本日期 | `February 16th, 2025` | `src/data/saving.js:4` |
| 最新提交 | `c9df18d`（2025-04-07，Merge PR #58） | `git log -1` |
| 许可证 | CC BY-NC-SA 4.0 | `license` |
| 加载方式 | `index.html` 以 `defer` 顺序加载全部脚本 | `index.html:13-71` |
| 构建/测试 | 无 `package.json`、无测试框架（纯静态） | 仓库根目录 |

### 4.2 Ringularity：脚手架已存在，机制未实现且被隐藏

| 事实 | 位置 |
| --- | --- |
| 双奇点命名数组已定义 | `src/collapse/singularity.js:1` |
| 密度上限写死 `500`，且两座共用同一 Charge 池 | `src/collapse/singularity.js:90` |
| `singEffects` 共 6 槽；`[0..2]` 为 Singularity，`[3..5]` 是 **Ringularity 占位**（`"Coming Soon!"` / `"???"` / `"???"`） | `src/collapse/singularity.js:81-89` |
| 解锁文案：`Unlock a Ringularity (Coming Soon!), but cap the Singularity's Density at H_ω²5`（`requiredLevel: 500`） | `src/collapse/singularity.js:165` |
| Ringularity 的 UI 已完整存在（`#singularity1` / `sing1Level` / `sing1Level2` / `sing1Effect0..2` / `singSlider1`） | `index.html:436-449` |
| 被硬隐藏（显示恒为 `none`） | `src/helpers/tabs.js:79` |
| 已知缺陷标记：`changeSingLevel` 仍读取 `data.sing.level[0]` | `src/collapse/singularity.js:94` |
| 同类缺陷：Charge 账目只扣除第 0 座密度 | `src/boosters/incrementy.js:167`、`src/collapse/collapse.js:312` |
| 成就已引用 Ringularity | `src/minor/achievements.js:380-383`（"The Blugularity"，`hasSingFunction(9)`） |
| 数据结构已按 2 座设计（长度 2 数组） | `src/data/player.js:30` |

**结论**：Ringularity 缺的是"机制与效果定义"，不是"基础设施"。

### 4.3 EUP 106 / 305 / 402：节点已存在，内容为占位

| 节点 | 数据位置 | 当前内容 | 备注 |
| --- | --- | --- | --- |
| 106 | `energyUpgradeData[1][5]` | `desc: '??? (Coming Soon)'`，`cost: Infinity`，`eff: D(1)` | 源码注释 `// Unlock a new Singularity Effect`（`src/obliterate/energyUpgrades.js:77-88`） |
| 305 | `energyUpgradeData[3][4]` | `desc: "??? (Coming Soon!)"`，`cost: Infinity` | 3xx 分支 = Pringle（`...:249-260`） |
| 402 | `energyUpgradeData[4][1]` | `desc: "??? (Coming Soon!)"`，`cost: Infinity` | 4xx 分支 = Instability/Realm（`...:275-286`） |

- 能量树节点与连线已就位：`src/obliterate/energyTree.js:9`（106）、`:25`（305）、`:28`（402）、`:38`（105→106）、`:56`（304→305）、`:60`（401→402）。
- 购买前置逻辑通用：`canPurchaseTreeUpgrade()` 用 `id-1` 判定，无需为三处新写逻辑（`src/obliterate/energyTree.js:130-135`）。
- **附带缺陷**：`updateEnergyTreeText()` 会把 `Infinity` 原样显示为 "Can be Activated for Infinity Fractal Energy"（`src/obliterate/energyTree.js:155`），本次必须一并修复。

### 4.4 历史设计索引（本仓库 git 历史，非外部素材）

> 以下内容均出自**本仓库自身**的提交，可在许可证合规前提下复用（见 §8）。

| 提交 | 所在分支 | 与本次相关的设计 |
| --- | --- | --- |
| `21cbf58 feat: Ringularity` | 已在 `main` 历史中 | Ringularity 的 UI + 数据结构 + 按 Total Density 解锁（当时门槛为 `300` = H_ω²3） |
| `3cb4f6c chore: Hide Ringularity` | `main` 历史 | 文案追加 "(Coming Soon!)"，注释掉 `#singularity1` 的显示 |
| `990879a chore: WIP Mechanic, decided to save for later` | `main` 历史 | **Imaginary Shifts**（第四套 Factor Shift）+ EUP402 = "Unlock Imaginary Shifts"（未完成） |
| `42ff10e feat: New 3xx Branch` | 分支历史 | 3xx 分支改版；其中 **305** 原为 `"Cardinals boost all Perfected Pringles"` |
| `d22c73d feat: ... impl EUP106` | `origin/singularity-2`（未合并） | EUP106 = "The Stable Hypercharge Effect applies to Cardinal Gain"（依赖 v0.5 系统，**不适用**） |
| `4f20fb3 feat: EUP305` | `origin/singularity-2` | EUP305 = "Factor Boosts no longer reset ANYTHING"（**不适用**） |
| `49b8e93 feat: Add EUP402` | `origin/v05-destabilization` | EUP402 = "Permanently convert the Forgotten Realm to the Destabilized Realm"（备选） |
| `8dc106f feat: Remove Singularity!` | `origin/singularity-2` | v0.5 重写整体删除了 Singularity（**本方案不采用**） |

**关键结论**：Ringularity 的"效果"与"资源模型"在历史中**从未被设计过**（`singEffects[3..5]` 始终是占位符）。因此本文档的核心价值即在于定义这套设计。

### 4.5 Imaginary Shifts（EUP402 的落点）现状

- 存储字段已存在：`imaginary: { shifts: 0, factors: Array(7).fill(0) }`（`src/data/player.js:35`）。
- 因子系统已支持 `imaginary` 参数：`factorCost(n, imaginary)` / `hasFactor(n, imaginary)` / `factorEffect(n, imaginary)` / `buyFactor(n, imaginary)`（`src/markup/factors.js:27-59`），且 `buyMaxFactor()` 已包含 imaginary 分支（`...:63-66`）。
- **未完成部分**：`hasFactor(n, true)` 依赖 `data.imaginary.shifts`，但无处递增；`imaginaryShiftData` 为空数组，`getImaginaryShiftReq` 未定义，`imaginaryShift()` 为空壳且整段被注释（`src/markup/markup.js:153-163`）。
- UI 侧无 `imaginaryShiftButton` / `iFactor*` 元素（历史上曾计划加入 `index.html` 与 `switchSubtab`）。

**结论**：EUP402 若选 "Unlock Imaginary Shifts"，属于"补完已有半成品"，改动集中且风险可控。

---

## 5. 功能需求（Functional Requirements）

### FR-1 Ringularity 机制

**FR-1.0 已确认的设计约束（来自需求方）**

1. Ringularity 反过来"升级"**Singularity**：通过**提高 Singularity 的密度上限**、并在里程碑处**强化 Singularity 的 3 个效果**。
2. Endgame 终点 = **Ringularity 密度达到 2000**。

**FR-1.1 数值规则**

| 规则 | 定义 |
| --- | --- |
| Singularity 基准上限 | 500（H<sub>0</sub> … H<sub>ω<sup>2</sup>5</sub>），保持现状 |
| Ringularity 上限 | **2000**（H<sub>0</sub> … **H<sub>ω<sup>3</sup>2</sub>**；`makeGenericOrd` 已验证可渲染，见 `src/ordinal/ordinal.js:2-16`） |
| 解锁条件 | `hasSingFunction(9)`，即 Total Density ≥ 500；解锁后 `#singularity1` 才显示 |
| Singularity 实际上限 | `singCap(0) = 500 + ringularityCapBonus()`，`ringularityCapBonus()` 由 Ringularity 里程碑累加 |
| Ringularity 实际上限 | `singCap(1) = 2000` |
| Total Density | `getTotalSingDensity() = level[0] + level[1]`，理论上限 ≈ `500 + bonus + 2000` |

**FR-1.2 Ringularity 里程碑（建议值，属可调平衡参数）**

| Ringularity 密度 | 效果 |
| --- | --- |
| 100 | Singularity 上限 +50；强化 Singularity 效果 1（`singEffects[0]`） |
| 300 | Singularity 上限 +100；强化 Singularity 效果 2（`singEffects[1]`） |
| 600 | Singularity 上限 +200；强化 Singularity 效果 3（`singEffects[2]`） |
| 1000 | Singularity 上限 +400；三项 Singularity 效果整体再强化 |
| 1500 | Singularity 上限 +800 |
| **2000** | **Endgame 达成**（见 FR-5） |

> 强化方式建议：为每个 `singEffects[i]` 增加"Ringularity 强化倍率"，即在原有公式上乘/加一个由 `getRingularityMilestoneCount(i)` 决定的项（系数待平衡）。**不得改变 `singEffects[0..2]` 在现有代码中的索引与语义**（`singEffects[0]` 被 `collapse.js:183` 依赖、`singEffects[1]` 被 `challenges.js:120` 依赖、`singEffects[2]` 被 `tick.js:14` 依赖）。

**FR-1.3 Ringularity 自身的 3 个效果（`singEffects[3..5]`）**

当前占位：`{desc: () => "Coming Soon!", effect: () => 1}` / `{desc: () => "???", effect: () => 1}` / `{desc: () => "???", effect: () => 1}`（`src/collapse/singularity.js:86-88`）。

需求：
- 必须补全为**功能性的 `desc()` + `effect()`**，并**真正接入计算链**（不允许"有描述但无人引用"）。
- 效果序号与现有 `(n*3)+i` 索引规则一致：Ringularity 槽位固定为 3/4/5（`src/collapse/singularity.js:32-35`）。
- 建议（待评审确认）：槽位 3 = 加速成长回路的乘区（如 Cardinal/Aleph 类）；槽位 4 = 强化能源线（如 Fractal Energy / 能量升级效果）；槽位 5 = Endgame 相关总倍率。具体文本与公式在"平衡阶段"确定。

**FR-1.4 资源与账目（推荐方案）**

- **推荐**：Ringularity 沿用 `incrementy.charge` 单一资源池（脚手架即按此设计：`maxSingLevel` 使用 `incrementy.charge`，`singCostText` 显示 Charge）。
- **必须修复的硬编码**（否则第二座无法正确参与账目）：
  - `src/collapse/singularity.js:90` `maxSingLevel(i)` 需按座返回上限（0→`singCap(0)`，1→`2000`）。
  - `src/collapse/singularity.js:130` / `:147` 中 `500`（`singControl` 的"顶满"判定）需替换为 `singCap(n)`。
  - `src/collapse/singularity.js:94` `changeSingLevel` 的 `data.sing.level[0]` 需改为 `data.sing.level[i]`（落实该行 `//TODO: Allow for multiple Singularities here.`）。
  - `src/boosters/incrementy.js:167` 与 `src/collapse/collapse.js:312`：`totalCharge - level[0]` → `totalCharge - level[0] - level[1]`。
- **备选**：Ringularity 使用独立资源（不推荐，需新增资源产出/显示/存档字段，收益有限）。

**FR-1.5 UI / 文案需求**

- 解除隐藏：`src/helpers/tabs.js:79` 恢复为 `hasSingFunction(9) ? 'flex' : 'none'`。
- `src/collapse/singularity.js:165` 文案去掉 "(Coming Soon!)"。
- `index.html:444` 的 `singSlider1` 标签由占位文本 `Important Text!!!!` 改为正式说明；`singSlider1.max` 由 `loadSingularityHTML`/`changeSingLevel` 动态设为 2000。
- `sing1Effect0..2` 与 `sing0Effect*` 颜色需区分（当前 0 号暖色、1 号蓝色系）。
- Ringularity 的 3 个控制按钮：现有 `singControl(i, n)` 已支持 `n` 参数，但 `index.html:451-457` 只传了 0；需为 Ringularity 增加一组按钮（或在同一组中通过当前选中座切换）。

**FR-1.6 边界与异常**

- 两座共用 Charge 时，任意时刻 `incrementy.charge ≥ 0`；缩回密度必须如数返还 Charge。
- `inPurification(3)` 下禁止操作奇点（`singControl`/`changeSingLevel` 已有该判定，需保持对两座一致）。
- `obliterateReset()` 会把两座 `level`/`highestLevel` 归零（`src/obliterate/obliterate.js:59-62`），需确保 `ringularityCapBonus` 随之归零且无残留。
- 不得出现 `NaN` / `Infinity`（Charge 与密度均为普通 Number/Decimal，注意 `Number.MAX_VALUE` 上限）。

### FR-2 Energy Upgrade 106（`energyUpgradeData[1][5]`）

| 项 | 需求 |
| --- | --- |
| 主题 | 1xx 分支 = Singularity / Charge / Baselessness |
| 内容 | **解锁 Ringularity 的第 1 个效果（`singEffects[3]`）** |
| 依据 | 源码注释 `// Unlock a new Singularity Effect`；`singEffects[3]` 在 `21cbf58` 中即归属 Ringularity（Ringularity 也是一座"Singularity"） |
| 类型 | `isUnlock: true`（一次性解锁，非数值型） |
| 代价 | `cost: 3`（沿用同分支曲线：101–104 = 1，105 = 2） |
| 前置 | 自动由 `canPurchaseTreeUpgrade` 保证需要 105 已激活 |
| 表现 | `desc: 'Unlock the Ringularity's first Singularity Effect'`；`eff` 返回 `D(1)`（unlock 型节点按现有惯例即可） |

**关联需求**
- 该解锁需与 `singFunctions[9]`（解锁 Ringularity 本体）互补：**有奇点但无 106 → 第 1 个效果不生效**；有 106 但未解锁奇点 → 效果暂不生效。
- 需在 UI 上正确显示"Unlocked!"（`energyTree.js:155` 已支持 `isUnlock` 分支）。

**备选方案（若评审否决）**
- B1：106 解锁 Singularity 的第 4 个效果（需扩展 UI 槽位，改动更大）。
- B2：106 降低 Ringularity 的解锁门槛（与 `singFunctions[9]` 的 500 节流冲突，不推荐）。

---

### FR-3 Energy Upgrade 305（`energyUpgradeData[3][4]`）

| 项 | 需求 |
| --- | --- |
| 主题 | 3xx 分支 = Pringle |
| 内容 | **"Cardinals boost all Perfected Pringles"**（Cardinals 乘算全部 "Perfected" Pringle） |
| 依据 | 本仓库历史提交 `42ff10e feat: New 3xx Branch` 中节点 305 的原文案 |
| 类型 | 数值型（`sign: 'x'`，`baseValue: 1`） |
| 代价 | `cost: 2`（同分支 301–304 = 1） |
| 接入点 | `getPringleEffect(i)`（`src/obliterate/pringles.js:238-240`）；对 `colorDesc/name === 'Perfected'` 的 Pringle（索引 2 与 5）追加 `×` 乘区 |

**需要确认的实现细节**
- "Perfected Pringle" 指 `pringleData[2]`（Perfected Green）与 `pringleData[5]`（Perfected Orange）。是否两者都受益，需评审确认（建议：两者都受益）。
- 乘区建议形如 `× log10(cardinals + 10)^k`，并加 `Number.MAX_VALUE` 上限保护。

**备选方案**
- B1：采用 `origin/singularity-2` 的 "Factor Boosts no longer reset ANYTHING"（属 QoL/自动化收尾，与 3xx 的 Pringle 主题不符，不推荐）。
- B2：其余 Pringle 主题数值（如"所有 Pringle 效果 +x%"）。

---

### FR-4 Energy Upgrade 402（`energyUpgradeData[4][1]`）

| 项 | 需求 |
| --- | --- |
| 主题 | 4xx 分支 = Instability / Realm |
| 内容 | **"Unlock Imaginary Shifts"** 并补完 Imaginary Shift 机制 |
| 依据 | 本仓库历史提交 `990879a`；`src/data/player.js:35` 已有存储；`src/markup/factors.js:27-59` 已支持 `imaginary` |
| 类型 | `isUnlock: true` |
| 代价 | `cost: 2` |
| 前置 | 需 401 已激活 |

**必须补完的子项（否则 EUP402 无实际内容）**
1. `imaginaryShiftData`：定义各次 Imaginary Shift 的门槛与效果（`src/markup/markup.js:153-155` 现为空数组）。
2. `getImaginaryShiftReq(shifts)`：定义下一次 Imaginary Shift 的要求。
3. `imaginaryShift()`：实现递增 `data.imaginary.shifts` 并执行相应重置（`src/markup/markup.js:156-162` 现为空壳）。
4. UI：`imaginaryShiftButton` 与 `iFactorContainer`/`iFactor{i}` 元素需加入 `index.html` 并在 `switchSubtab('factor','markup')` 时按 `getEUPEffect(4,1)` 显示/隐藏（参考 `990879a` 对 `switchSubtab` 的改动）。
5. 显示：`updateMarkupHTML()` 需输出 iFactor 的信息（`990879a` 中已有参考实现）。
6. `data.imaginary` 存档字段已存在，**无需迁移**；但 `hasFactor(n, true)` 依赖 `data.imaginary.shifts`，需保证旧存档读到默认 0。
7. 注意 `990879a` 中的历史实现存在笔误（`data.imaginary[n]` 应为 `data.imaginary.factors[n]`），移植时必须修正。

**备选方案**：`origin/v05-destabilization` 的 "Permanently convert the Forgotten Realm to the Destabilized Realm"（内容量小，仅改 Realm 名称/锁定值，不推荐作为终点前的主线内容）。

---

### FR-5 Endgame（终点）

**定义：Ringularity 密度达到 2000（H<sub>ω<sup>3</sup>2</sub>）即为 Endgame。**

| 子项 | 需求 |
| --- | --- |
| 判定 | `data.sing.level[1] >= 2000`（或 `hasReachedRingularityEndgame()`） |
| 进度展示 | 在 Singularity 页（或状态栏）显示 `Ringularity 进度 x / 2000` 与序数形式 |
| 终点反馈 | 达成时：一次性提示（`createAlert`/`showNotification`）+ 永久标记（如状态栏徽章 / 终点条目常亮） |
| 终点成就 | 新增成就（建议置于 `achievements` 末尾，避免破坏既有索引）；`data.achs` 由既有 `Array(achievements.length)` 默认值自动扩展 |
| 占位清理 | 全仓库不得再出现 `(Coming Soon)` / `???` 作为玩家可见文案 |
| 数值安全 | 新增倍率统一走 ExpantaNum 或 `softcap` / `Math.min(..., Number.MAX_VALUE)` |
| 可复现性 | 到达 2000 后内容进入"完成"状态；不强制新机制（是否提供通关后重玩回路见 §11 开放问题） |

**与其他系统的衔接要求**
- 让 `EUP 106 / 305 / 402` 成为通往 2000 的路标（分别对应奇点效果解锁、Pringle 强化、Factor Shift 扩展）。
- 允许在 500 以上新增 `singFunctions` 门槛（Total Density 已可超过 500），从而在 500→2000 区间填充目标；新增函数会自动生成 UI 元素（`initSingularityFunctions` 使用 `createElement`，`src/collapse/singularity.js:64-78`），但需同步 `data.sing.hasEverHadFunction` 长度与成就。

### FR-6 配套需求（UI / 成就 / 教程 / 状态栏 / 设置）

| 子项 | 需求 | 相关位置 |
| --- | --- | --- |
| 成就 | 补 Ringularity 里程碑成就、Imaginary Shift 成就、Endgame 成就；**新成就一律追加到末尾** | `src/minor/achievements.js:1`、`initAchs()` |
| 教程 | `sing` 子页教程需覆盖 Ringularity（当前教程只讲 Singularity） | `src/helpers/tabs.js:74-77` |
| 状态栏 | 若 Endgame 使用新的"模式/状态"，需同步状态文本 | `src/helpers/worldStatus.js:16` |
| 设置项 | **高风险**：新增开关须同时改 `SETTINGS_DESCS`、`settingsDefaults`、`index.html` 的 `settingsToggleN` 按钮；数组长度变化会影响 `data.sToggles` 的存档索引 | `src/minor/settings.js:3-15`、`index.html:611-653` |
| 能量树文案 | 修复 `Infinity` 显示；106/305/402 的 `desc` 不得含占位 | `src/obliterate/energyTree.js:155` |
| 加载顺序 | 若新增脚本文件，需同步 `index.html` 的 `defer` 顺序（依赖前置） | `index.html:13-71`、`src/update/update.js:1-56` |

---

## 6. 数据与存档需求

1. **默认值**：所有新增字段必须在 `getDefaultPlayer()`（`src/data/player.js`）声明。
2. **向后兼容**：`unpackSave()` 只遍历存档中已存在的键，因此旧存档缺少新键时会自动保留默认值（无需额外处理）。
3. **数组扩展**：`data.sing.level` / `highestLevel` 已是长度 2 数组（`src/data/player.js:30`），本次**无需迁移**；若 `singFunctions` 变长（FR-5 可选），`data.sing.hasEverHadFunction` 依赖 `Array(singFunctions.length)` 默认值，但旧存档里该数组较短，需在 `fixOldSaves()` 显式补齐并升版。
4. **版本升级**：修改 `VERSION` / `VERSION_NAME` / `VERSION_DATE`（`src/data/saving.js:2-4`），并按既有风格在 `fixOldSaves()` 追加迁移分支（当前最新为 `0.4.3p3`；建议 `0.5.0`）。
5. **迁移写法**：沿用现有 `if(data.loadedVersion === "旧版本") { ...; data.loadedVersion = "新版本" }` 链。
6. **禁止破坏性迁移**：不得重置玩家已有的 `sing.level` / `energyUpgrades`（`energyUpgrades` 为数组，新增节点不需要迁移）。
7. **云存档**：若启用 Cloud Saving，版本不兼容提示逻辑需保持一致（`src/data/cloud.js`）。

---

## 7. 非功能需求

| 类别 | 要求 |
| --- | --- |
| 数值安全 | 所有新倍率不得产生 `NaN` / `Infinity`；Decimal 场景用 ExpantaNum（`D()`），Number 场景用 `softcap` / `Math.min(..., Number.MAX_VALUE)` |
| 性能 | 不得在 `mainLoop`（50ms 间隔）内做 O(n) 以上的重计算；`singEffects` / 里程碑判定应为 O(1) 或极小常数 |
| 兼容性 | 桌面端与移动端（`isMobileMode()`）均需可用；`mobile.css` 中新 UI 不得溢出 |
| 可维护性 | 沿用现有代码风格（无框架、全局函数、`let` + 箭头函数）；新增逻辑放在对应模块文件内 |
| 可观测性 | 浏览器控制台零报错；新增逻辑不得吞掉既有 `try/catch`（`energyTree.js:94-97`）之外的异常 |
| 可测试性 | 无测试框架；验收以"手动清单 + 控制台 + 存档往返"为准（见 §9） |
| 国际化 | 文案沿用现有英文风格（与仓库一致），不做多语言 |

---

## 8. 许可证与署名合规（CC BY-NC-SA 4.0）

**适用许可证**：Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International（仓库根目录 `license`，含 tl;dr 摘要）。

| # | 义务（来自 `license:1-12` 摘要） | 本次交付要求 |
| --- | --- | --- |
| 1 | **署名**：Give appropriate credit, provide a link to the license | `README.md` 必须写明：原始 *Ordinal Markup*（Patcail，MIT）与重制版 `ordinal-pringles`（FlamemasterNXF 及贡献者），并给出许可证链接（`https://creativecommons.org/licenses/by-nc-sa/4.0/`） |
| 2 | **非商业**：Not use the material for commercial purposes | 不得添加广告、付费墙、捐赠解锁内容、赞助商植入；不得以本项目收费 |
| 3 | **相同方式共享**：Distribute contributions under the same license | 本仓库贡献继续以 CC BY-NC-SA 4.0 分发；**禁止将 `license` 替换为其他许可证** |
| 4 | **标明修改**：indicate if changes were made | 必须声明"已修改"及其内容（新增 Ringularity / EUP 106・305・402 / Endgame）；建议在 `README.md` 增加 "Changes" 小节，并记录日期 |

**第三方资源清单（须保留其原始许可声明）**

| 资源 | 位置 | 许可 |
| --- | --- | --- |
| vis-network | `src/lib/vis-network.min.js` | MIT（文件头保留版权声明） |
| ExpantaNum | `src/lib/ExpantaNum.js` | MIT |
| BreakEternity | `src/lib/BreakEternity.js` | MIT |
| Dosis 字体 | `styles/Dosis/` | SIL OFL（`styles/Dosis/OFL.txt`、`README.txt` 须保留） |
| 游戏素材 | `res/**` | 本项目素材，随主许可证分发 |

**关于复用本仓库历史提交**：本方案引用的设计出自**本仓库自身**的提交（`21cbf58`、`990879a`、`42ff10e` 等），仍受同一 CC BY-NC-SA 4.0 约束；建议在 CHANGELOG / commit message 中标注来源 commit，以满足"标明修改"的可追溯性。

**交付物（合规相关）**
- `README.md`：署名 + 许可证链接 + Changes 声明。
- `CHANGELOG.md`（新建，可选但强烈建议）：记录本次新增内容与来源 commit。
- `license`：**不得修改正文**（如需附注，只能在其它文件里引用，不得替换）。

---

## 9. 验收标准（Acceptance Criteria）

**A. Ringularity**

- [ ] A1 Total Density 达到 500（Singularity 密度 H<sub>ω<sup>2</sup>5</sub>）后 `#singularity1` 正常显示，文案无 "(Coming Soon!)"。
- [ ] A2 Singularity 在未获得 Ringularity 里程碑时无法超过 500；获得里程碑后可按 `singCap(0)` 突破 500。
- [ ] A3 Ringularity 密度可成长至 2000，且滑块 `max` 正确、序数显示为 H<sub>ω<sup>3</sup>2</sub>。
- [ ] A4 两座共用 Charge：提升/缩回任意一座后 `data.incrementy.charge` 账目自洽，`Charge = totalCharge - level[0] - level[1]`。
- [ ] A5 Collapse / Obliteration / Respec（Passive、Energy、Instability）后 Charge 与两座密度、`ringularityCapBonus` 均正确重置/保留（与既有规则一致）。
- [ ] A6 `singEffects[3..5]` 全部有实际 `desc()` 与 `effect()`，且被至少一处游戏计算引用。
- [ ] A7 里程碑确实强化 `singEffects[0..2]`，且未改变其索引语义（`collapse.js:183`、`challenges.js:120`、`tick.js:14` 行为正常）。

**B. Energy Upgrade 106 / 305 / 402**

- [ ] B1 三个节点均可被玩家购买（代价不再是 `Infinity`），能量树悬停文本显示正确（无 `Infinity`、无 `???`）。
- [ ] B2 106 生效后 Ringularity 的第 1 个效果才可用；未购买时该效果不生效。
- [ ] B3 305 生效后 "Perfected" Pringle 的效果数值按设计提升，且不溢出。
- [ ] B4 402 生效后 Imaginary Shift 可用：按钮出现、shift 可执行、iFactor 可购买与显示、`data.imaginary.shifts` 正确递增并持久化。
- [ ] B5 三者的 `isUnlock` 语义正确（购买后分别为 "Unlocked!" / 显示当前效果）。

**C. Endgame**

- [ ] C1 Ringularity 达到 2000 时给出一次性终点提示与永久标记。
- [ ] C2 新增终点成就可正常解锁并计入 `data.achs`。
- [ ] C3 全仓库玩家可见文案不再出现 `(Coming Soon)` / `???`。

**D. 存档与版本**

- [ ] D1 全量旧版本存档（`0.0.6` 起的历史节点）均可加载，无 `NaN`、无控制台报错。
- [ ] D2 新版本号在设置页正确显示（`versionText`，`src/update/update.js:34`）。
- [ ] D3 含新字段/新数组长度的存档可"保存 → 刷新 → 加载"往返一致。

**E. 许可证**

- [ ] E1 `README.md` 含署名、许可证链接与"已修改"声明。
- [ ] E2 `license` 正文未被替换或删除；第三方许可文件（`styles/Dosis/OFL.txt` 等）保留。
- [ ] E3 无任何商业化元素（广告 / 付费 / 捐赠换内容）。

---

## 10. 风险与依赖

| 编号 | 风险 | 影响 | 缓解措施 |
| --- | --- | --- | --- |
| R1 | `500` 与 `data.sing.level[0]` 硬编码遗漏 | 第二座账目错乱 / 上限失效 | 已逐处定位（§4.2、FR-1.4）；实现时全仓搜索 `sing.level[0]`、`>= 500`、`Math.min(500` |
| R2 | `singEffects[0..2]` 索引语义被改动 | 连带破坏 `collapse.js:183`、`challenges.js:120`、`tick.js:14` | 只做"叠加倍率"，不改签名与索引；改动后回归验证 Cardinal/Decrementy/AutoBuyer 数值 |
| R3 | 设置项数组长度变化 | `data.sToggles` 存档索引错位 | 非必要不新增设置项；若必须，放在末尾并在 `fixOldSaves` 补齐 |
| R4 | `singFunctions` 变长 | 旧存档 `hasEverHadFunction` 长度不足 | `fixOldSaves` 显式补齐并升版 |
| R5 | 平衡失控（里程碑增益过强/过弱） | 500→2000 区间过短或过长 | 全部里程碑数值集中为常量，便于调整为平衡参数 |
| R6 | 数值溢出（`Infinity`/`NaN`） | 存档损坏 | 强制走 `softcap` / `Number.MAX_VALUE` 上限；验收 D1 覆盖 |
| R7 | 许可证不合规（漏署名/改动声明） | 违反 CC 条款 | 交付 E1–E3 清单；评审时逐项确认 |
| R8 | 依赖未合并分支的代码 | 与 `main` 冲突 | 只复用本仓库历史提交（§4.4）中的设计思路，不直接 merge 分支 |

**外部依赖**：无（纯静态、零构建）。**内部依赖**：`singFunctions` / `singEffects` / Charge 账目 / 能量树 / 存档迁移。

---

## 11. 开放问题（Open Questions，待评审确认）

| # | 问题 | 备选 | 建议 |
| --- | --- | --- | --- |
| Q1 | Ringularity 是否沿用 `incrementy.charge`？ | 共用（推荐）/ 独立资源 | 共用：脚手架即如此，改动最小 |
| Q2 | `singEffects[3..5]` 的具体文本与公式？ | 槽 3 = Cardinal/Aleph 类；槽 4 = Fractal Energy/能量类；槽 5 = Endgame 总倍率 | 按建议，平衡阶段定系数 |
| Q3 | 里程碑数值（100/300/600/1000/1500，上限 +50/+100/+200/+400/+800）是否合适？ | 可整体缩放 | 先按建议实装，再调 |
| Q4 | 是否在 500–2000 之间新增 `singFunctions`？ | 新增（内容更饱满）/ 不新增（改动更小） | 新增 2–3 个，填充 500→2000 区间 |
| Q5 | 305 的 "Perfected Pringle" 是"两个都受益"还是"仅 Perfected Green"？ | 两者 / 单个 | 两者都受益 |
| Q6 | 402 选 Imaginary Shifts 还是 Destabilized Realm？ | Imaginary（推荐）/ Destabilized | Imaginary：内容量足、有半成品 |
| Q7 | 达到 2000 后是否提供"通关后回路"（如分数/重玩）？ | 提供 / 不提供 | 不提供（明确"完成"，避免无限膨胀） |
| Q8 | 版本号定为？ | `0.5.0` / `0.4.4` | `0.5.0`（新增机制级内容） |

---

## 12. 里程碑与工作量估算

| 里程碑 | 内容 | 主要涉及文件 | 预估 |
| --- | --- | --- | --- |
| M1 脚手架修复 | 上限参数化、Charge 账目去硬编码、解除 `#singularity1` 隐藏、`Infinity` 显示修复 | `singularity.js`、`incrementy.js`、`collapse.js`、`tabs.js`、`energyTree.js` | 0.5–1 天 |
| M2 Ringularity 机制 | 里程碑、上限加成、`singEffects[3..5]`、效果接入、UI 文案与按钮 | `singularity.js`、`index.html`、`styles/main.css` | 1.5–2 天 |
| M3 EUP 106/305/402 | 三节点内容 + Imaginary Shifts 补完 + Pringle 乘区 | `energyUpgrades.js`、`factors.js`、`markup.js`、`pringles.js`、`index.html` | 1.5–2 天 |
| M4 Endgame | 判定、进度展示、终点成就与反馈、占位清理、（可选）新增 `singFunctions` | `singularity.js`、`achievements.js`、`worldStatus.js`、`saving.js` | 0.5–1 天 |
| M5 平衡与打磨 | 数值调优、移动端适配、存档往返测试、文档/README 合规 | 全仓 + `README.md` | 1–1.5 天 |

> 合计粗估：**5–8 个工作日**（单人、熟悉代码的前提下）。

---

## 附录 A：相关提交 / 分支索引

```
21cbf58  feat: Ringularity                    （main 历史；UI/数据/解锁，效果未实现）
3cb4f6c  chore: Hide Ringularity              （main 历史；隐藏 #singularity1）
990879a  chore: WIP Mechanic, ...             （main 历史；Imaginary Shifts 存根 + EUP402 设想）
42ff10e  feat: New 3xx Branch                 （3xx 分支改版；305 原为 "Cardinals boost all Perfected Pringles"）
d22c73d  feat: Remove EUP401, impl EUP106     （origin/singularity-2；依赖 v0.5 系统，不适用）
4f20fb3  feat: EUP305                         （origin/singularity-2；不适用）
49b8e93  feat: Add EUP402                     （origin/v05-destabilization；备选）
8dc106f  feat: Remove Singularity!            （origin/singularity-2；本方案不采用）
```

## 附录 B：涉及文件清单（供实现阶段对照）

| 文件 | 本次是否需改动 | 说明 |
| --- | --- | --- |
| `src/collapse/singularity.js` | 是 | FR-1 主战场（上限、里程碑、`singEffects[3..5]`、`singControl`/`changeSingLevel`） |
| `src/boosters/incrementy.js` | 是 | Charge 账目（`:167`） |
| `src/collapse/collapse.js` | 是 | Charge 账目（`:312`）、`singEffects[0]` 引用（`:183`） |
| `src/helpers/tabs.js` | 是 | 解除隐藏（`:79`）、教程（`:74-77`） |
| `index.html` | 是 | Ringularity 标签/按钮、Imaginary Shifts UI |
| `src/obliterate/energyUpgrades.js` | 是 | EUP 106 / 305 / 402 |
| `src/obliterate/energyTree.js` | 视情况 | 已就位；仅需确认文案显示 |
| `src/obliterate/pringles.js` | 是 | EUP305 的 Pringle 乘区 |
| `src/markup/factors.js` | 视情况 | Imaginary 分支已有；按需修正笔误 |
| `src/markup/markup.js` | 是 | `imaginaryShift()` / `getImaginaryShiftReq` / 显示 |
| `src/minor/achievements.js` | 是 | 新增成就（追加末尾） |
| `src/data/saving.js` | 是 | 版本号 + 迁移 |
| `src/data/player.js` | 视情况 | 若新增字段（`ringularityCapBonus` 可派生，不必存储） |
| `src/helpers/worldStatus.js` | 视情况 | Endgame 状态文本 |
| `src/minor/settings.js` | 尽量避免 | 高风险：数组索引 |
| `README.md` | 是 | 许可证署名与 Changes 声明 |
| `CHANGELOG.md` | 建议新建 | 记录变更与来源 commit |
| `license` | **否** | 不得修改正文 |

---

## 附录 C：设计决策记录（已确认）

| 决策 | 结论 | 来源 |
| --- | --- | --- |
| Ringularity 如何升级 Singularity | **提高 Singularity 密度上限（突破 500）+ 里程碑强化其 3 个效果** | 需求方确认 |
| Endgame 定义 | **Ringularity 密度达到 2000** | 需求方确认 |
| 复用历史设计的范围 | 仅限本仓库自身提交（合规前提） | 本文档 §4.4 / §8 |

---

## 附录 D：实现状态（Implementation Status）

> 更新于 2026-09-28。勾选项表示已在代码中实现并通过冒烟测试（`tests/ringularity.smoke.js`，70/70 通过）。

**已完成 —— M1 脚手架修复 + M2 Ringularity 机制 + FR-5 Endgame + FR-2（EUP 106）**

- [x] 每座奇点的上限参数化：`singCap(0) = 500 + ringularityCapBonus()`、`singCap(1) = 2000`（`src/collapse/singularity.js`）
- [x] Ringularity 里程碑（100/300/600/1000/1500 → 上限 +50/+100/+200/+400/+800），基于 `highestLevel[1]`（Obliteration 后清空）
- [x] 里程碑强化 Singularity 的三个效果（`singEffectBoost(i)`，仅叠加、不改变索引语义）
- [x] `singEffects[3..5]` 补全并接入计算链：× Cardinal 收益（EUP106 解锁）、× Incrementy 收益、× 全部 ℵ 效果
- [x] Charge 账目去硬编码：`incrementy.js:167`、`collapse.js:312` 均扣除两座密度
- [x] `changeSingLevel` / `singControl` / `maxSingLevel` 支持 `n = 1`，含 NaN 防护与上限钳制
- [x] UI：解除 `#singularity1` 隐藏、标注正式文案、新增 `#ringularityControls` 按钮组与 `#ringularityCapText` / `#ringularityEndgameText`
- [x] Endgame：Ringularity 密度 2000（H<sub>ω<sup>3</sup>2</sub>）判定 + 一次性提示（`data.sing.endgame`）+ 成就 "The Endgame"
- [x] EUP 106 = "Unlock the Ringularity's first Singularity Effect"（`isUnlock: true`，`cost: 3`）；修复能量树 `Infinity` 显示
- [x] 新字段 `data.sing.endgame` / `data.sing.ringularityTutorial`；旧存档自动取默认值（无需迁移）
- [x] 首次解锁 Ringularity 的一次性教程弹窗（`data.sing.ringularityTutorial`）

**未完成（后续里程碑）**

- [ ] FR-3：EUP **305** 仍为占位（`energyUpgrades.js:250`）
- [ ] FR-4：EUP **402** + Imaginary Shifts 机制仍为占位（`energyUpgrades.js:276`）
- [ ] Q4：500–2000 区间的新增 `singFunctions`（当前 Ringularity 段仅有 5 个 Milestone 作为目标）
- [ ] Q1/Q2/Q3 的数值平衡确认；Q7 通关后回路；Q8 版本号升级（`VERSION` 尚未改动）
- [ ] §8 许可证交付物：`README.md` 署名 + "已修改" 声明、`CHANGELOG.md`

**验证方式**：`node tests/ringularity.smoke.js "<仓库根目录>"`（纯离线、无需浏览器；覆盖上限/里程碑/账目/存档往返/锁定守卫/UI 显隐/Endgame 提示）。


---

*文档结束。实现阶段请以本文档的验收标准（§9）逐项勾选，并在 §11 的开放问题上先取得结论。*

