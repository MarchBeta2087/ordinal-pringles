/*
    Offline smoke test for Energy Upgrade 305 (Cardinals boost all Perfected Pringles) and Energy
    Upgrade 402 (Unlock Imaginary Shifts), see docs/REQUIREMENTS-RINGULARITY-ENDGAME.md (FR-3/FR-4).

    Usage (from the repository root):   node tests/imaginaryShifts.smoke.js "<path to repository root>"

    It loads the real game scripts in index.html order under DOM stubs (no browser, no build step),
    then exercises: the two Energy Tree nodes (costs, prerequisites, hover text, no placeholders),
    the 305 Cardinal multiplier on the three "Perfected" Pringles, the Imaginary Shift layer
    (lock guard, Ordinal Power requirements, the reset of the Imaginary ledger, the 7-shift cap,
    iFactor buying/display, the Factor max-buy path), save round-trips plus the broken-save repairs.
    Exits with code 0 when every check passes.
*/
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = process.argv[2]
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)]
    .map(m => m[1])
    .filter(s => !s.includes('vis-network'))

const noop = () => {}
const ctxStub = new Proxy({}, { get: (t, p) => (p in t ? t[p] : noop), set: (t, p, v) => (t[p] = v, true) })
function makeChildren() {
    const arr = []
    return new Proxy(arr, {
        get(t, p) {
            if (p === 'length') return t.length
            if (typeof p === 'string' && /^\d+$/.test(p)) { const i = +p; if (!t[i]) t[i] = makeEl(); return t[i] }
            const v = t[p]
            return typeof v === 'function' ? v.bind(t) : v
        },
        set(t, p, v) { t[p] = v; return true }
    })
}
function makeEl(tag) {
    return {
        tagName: (tag || 'div').toUpperCase(), id: '', style: {}, dataset: {}, children: makeChildren(),
        classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
        innerHTML: '', innerText: '', textContent: '', value: '0', max: '1', min: '0',
        checked: false, selectedIndex: 0, disabled: false, type: '', className: '', src: '',
        appendChild(c) { return c }, append() {}, insertBefore(c) { return c }, removeChild() {}, remove() {},
        addEventListener: noop, removeEventListener: noop, setAttribute: noop, getAttribute: () => null,
        querySelector: () => makeEl(), querySelectorAll: () => [], getElementsByTagName: () => [],
        getContext: () => ctxStub, focus: noop, click: noop, select: noop, setSelectionRange: noop,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }), contains: () => false,
        parentNode: null, firstChild: null, lastChild: null, scrollIntoView: noop,
    }
}
const els = new Map()
globalThis.document = {
    getElementById(id) { if (!els.has(id)) { const e = makeEl(); e.id = id; els.set(id, e) } return els.get(id) },
    createElement(tag) { return makeEl(tag) },
    querySelector: () => makeEl(), querySelectorAll: () => [], getElementsByTagName: () => [], getElementsByClassName: () => [],
    addEventListener: noop, removeEventListener: noop,
    body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
    execCommand: noop, cookie: '',
}
globalThis.window = globalThis
globalThis.self = globalThis
const store = new Map()
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k), clear: () => store.clear()
}
globalThis.setInterval = () => 0
globalThis.clearInterval = noop
globalThis.setTimeout = () => 0
globalThis.clearTimeout = noop
globalThis.requestAnimationFrame = () => 0
globalThis.addEventListener = noop
globalThis.removeEventListener = noop
globalThis.alert = noop
globalThis.matchMedia = () => ({ matches: false, media: '', addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop })
globalThis.innerWidth = 1280
globalThis.innerHeight = 800
globalThis.confirm = () => false
globalThis.prompt = () => null
globalThis.URL = { createObjectURL: () => '', revokeObjectURL: noop }
globalThis.vis = {
    DataSet: class { constructor(a) { this.a = a } get() { return [{ id: 0 }] } update() {} },
    Network: class { on() { return this } },
}
globalThis.__alerts = []
// NOTE: intentionally no `module`/`exports` so the UMD libs take their browser branch (global.Decimal).
const loadErrors = []
for (const s of scripts) {
    try { vm.runInThisContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), { filename: s }) }
    catch (e) { loadErrors.push(s + ' :: ' + e.message) }
}
if (loadErrors.length) { console.log('LOAD ERRORS:'); loadErrors.forEach(e => console.log('  ' + e)) }

/*
    The Imaginary Shift count is a permanent layer, so it must only ever be written by
    imaginaryShift() itself (src/markup/markup.js) - no Collapse/Obliteration reset may clear it.
    This is checked straight against the sources instead of running the heavy reset chains.
*/
const walkSrc = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walkSrc(path.join(dir, e.name)) : [path.join(dir, e.name)])
const srcFiles = walkSrc(path.join(ROOT, 'src'))
    .filter(f => /\.js$/.test(f) && !/\.min\.js$/.test(f))
    .map(f => ({ file: path.relative(ROOT, f).replace(/\\/g, '/'), text: fs.readFileSync(f, 'utf8') }))
const imaginaryShiftWriters = srcFiles.filter(f => /\+\+\s*data\.imaginary\.shifts|data\.imaginary\.shifts\s*=(?!=)/.test(f.text)).map(f => f.file)
const imaginaryShiftResets = srcFiles.filter(f => /data\.imaginary\.shifts\s*=\s*0\b/.test(f.text)).map(f => f.file)

globalThis.__results = []
globalThis.__check = function (name, cond, extra) {
    globalThis.__results.push((cond ? 'PASS  ' : 'FAIL  ') + name + (cond ? '' : '   -> got: ' + JSON.stringify(extra)))
}
globalThis.__els = els
globalThis.__root = ROOT
globalThis.__fs = fs
globalThis.__path = path
globalThis.__imaginaryShiftWriters = imaginaryShiftWriters
globalThis.__imaginaryShiftResets = imaginaryShiftResets

const testBody = function () {
    const check = globalThis.__check
    const E = globalThis.__els
    const confirmations = []
    createConfirmation = (title, desc, no, yes, fn) => confirmations.push({ title, desc, no, yes, fn })

    check('Decimal global is available', typeof Decimal === 'function')
    check('data object exists', typeof data === 'object')

    // ---------------------------------------------------------------------------------------
    // Energy Upgrade 305 / 402: static shape
    // ---------------------------------------------------------------------------------------
    const node305 = energyUpgradeData[3][4]
    const node402 = energyUpgradeData[4][1]
    check('EUP 305 lives at energyUpgradeData[3][4]', node305.node === 305, node305.node)
    check('EUP 402 lives at energyUpgradeData[4][1]', node402.node === 402, node402.node)
    check('EUP 305 costs 2 Fractal Energy (no longer Infinity)', node305.cost === 2, node305.cost)
    check('EUP 402 costs 2 Fractal Energy (no longer Infinity)', node402.cost === 2, node402.cost)
    check('EUP 305 is a numeric upgrade', node305.isUnlock === false)
    check('EUP 402 is an unlock', node402.isUnlock === true)

    const placeholders = []
    for (let i = 0; i < energyUpgradeData.length; i++) {
        for (let j = 0; j < energyUpgradeData[i].length; j++) {
            if (/Coming Soon|\?\?\?/.test(energyUpgradeData[i][j].desc)) placeholders.push(energyUpgradeData[i][j].node)
        }
    }
    check('no Energy Upgrade description is still a placeholder', placeholders.length === 0, placeholders)

    // ---------------------------------------------------------------------------------------
    // Prerequisites (the tree itself is unchanged: id-1 chains, 401 -> 402)
    // ---------------------------------------------------------------------------------------
    data.obliterate.energyUpgrades = []
    check('305 cannot be bought from nothing', canPurchaseTreeUpgrade(305, node305) === false)
    check('402 cannot be bought from nothing', canPurchaseTreeUpgrade(402, node402) === false)
    data.obliterate.energyUpgrades = [301, 302, 303]
    check('305 still needs 304', canPurchaseTreeUpgrade(305, node305) === false)
    data.obliterate.energyUpgrades = [301, 302, 303, 304]
    check('305 is available once 304 is owned', canPurchaseTreeUpgrade(305, node305) === true)
    data.obliterate.energyUpgrades = [401]
    check('402 is available once 401 is owned', canPurchaseTreeUpgrade(402, node402) === true)

    // ---------------------------------------------------------------------------------------
    // EUP 305: buying it and the Cardinal multiplier
    // ---------------------------------------------------------------------------------------
    data.obliterate.energyUpgrades = [301, 302, 303, 304]
    data.obliterate.energy = 10
    purchaseTreeUpgrade(305, node305)
    check('purchasing 305 spends 2 Fractal Energy', data.obliterate.energy === 8, data.obliterate.energy)
    check('305 is recorded in energyUpgrades', hasTreeUpgrade(305) === true)

    data.collapse.cardinals = D(1e100)
    check('305 boost is log10(Cardinals + 10)^2', Math.abs(getEUPEffect(3, 4).toNumber() - 10000) < 1, getEUPEffect(3, 4).toNumber())
    check('305 boost is finite', Number.isFinite(getEUPEffect(3, 4).toNumber()), getEUPEffect(3, 4).toNumber())

    data.collapse.cardinals = D(0)
    check('305 boost is exactly 1x with 0 Cardinals', getEUPEffect(3, 4).toNumber() === 1, getEUPEffect(3, 4).toNumber())

    data.collapse.cardinals = D(1e100)
    check('Perfected Green is boosted by 305', getEUPEffect305Boost(2).toNumber() === 10000, getEUPEffect305Boost(2).toNumber())
    check('Perfected Orange is boosted by 305', getEUPEffect305Boost(5).toNumber() === 10000, getEUPEffect305Boost(5).toNumber())
    check('Perfected Blue is boosted by 305', getEUPEffect305Boost(8).toNumber() === 10000, getEUPEffect305Boost(8).toNumber())
    check('non-Perfected Pringles are untouched by 305', getEUPEffect305Boost(0).toNumber() === 1 && getEUPEffect305Boost(6).toNumber() === 1)

    data.collapse.cardinals = D('1e1000000')
    const hugeBoost = getEUPEffect(3, 4).toNumber()
    check('305 boost stays finite on absurd Cardinals', Number.isFinite(hugeBoost) && hugeBoost > 0, hugeBoost)
    data.collapse.cardinals = D(1e100)

    data.obliterate.pringleAmount[2] = 10
    data.purity.isAssigned[5] = false
    data.purity.assignment[5] = false
    check('an unassigned Perfected Pringle keeps its base value', getPringleEffect(2, true) === 1, getPringleEffect(2, true))

    data.purity.isAssigned[5] = true
    data.purity.assignment[5] = 2
    data.obliterate.energyUpgrades = [301, 302, 303, 304]
    check('Perfected Green is 50x without 305', getPringleEffect(2, true) === 50, getPringleEffect(2, true))
    data.obliterate.energyUpgrades = [301, 302, 303, 304, 305]
    check('Perfected Green is 500000x with 305 at 1e100 Cardinals', Math.abs(getPringleEffect(2, true) - 500000) < 1, getPringleEffect(2, true))
    check('the Pringle hover text stays finite', !/NaN|Infinity/.test(getPringleEffectText(getPringleData(2), 2)), getPringleEffectText(getPringleData(2), 2))

    // ---------------------------------------------------------------------------------------
    // Energy Tree hover text (no Infinity / ??? for either node)
    // ---------------------------------------------------------------------------------------
    data.obliterate.energyUpgrades = [301, 302, 303, 304]
    updateEnergyTreeText(305)
    check('305 hover text quotes a finite price', /2 Fractal Energy/.test(E.get('energyTreeText').innerHTML) && !/Infinity|\?\?\?/.test(E.get('energyTreeText').innerHTML), E.get('energyTreeText').innerHTML)
    data.obliterate.energyUpgrades = [301, 302, 303, 304, 305]
    updateEnergyTreeText(305)
    check('305 hover text shows its effect once owned', /Currently/.test(E.get('energyTreeText').innerHTML) && !/NaN|Infinity/.test(E.get('energyTreeText').innerHTML), E.get('energyTreeText').innerHTML)
    data.obliterate.energyUpgrades = [401]
    updateEnergyTreeText(402)
    check('402 hover text quotes a finite price', /2 Fractal Energy/.test(E.get('energyTreeText').innerHTML) && !/Infinity|\?\?\?/.test(E.get('energyTreeText').innerHTML), E.get('energyTreeText').innerHTML)

    // ---------------------------------------------------------------------------------------
    // EUP 402: buying it unlocks the Imaginary Shift layer
    // ---------------------------------------------------------------------------------------
    data.obliterate.energy = 5
    purchaseTreeUpgrade(402, node402)
    check('purchasing 402 spends 2 Fractal Energy', data.obliterate.energy === 3, data.obliterate.energy)
    check('402 is recorded in energyUpgrades', hasTreeUpgrade(402) === true)
    check('hasImaginaryShifts() is true once 402 is owned', hasImaginaryShifts() === true)
    updateEnergyTreeText(402)
    check('402 hover text says Unlocked!', /Unlocked!/.test(E.get('energyTreeText').innerHTML), E.get('energyTreeText').innerHTML)

    // ---------------------------------------------------------------------------------------
    // Imaginary Shifts: requirements and the lock guard
    // ---------------------------------------------------------------------------------------
    check('7 Imaginary Shifts are defined', imaginaryShiftData.length === 7, imaginaryShiftData.length)
    check('the Imaginary tier table matches the shift count', MAX_IMAGINARY_SHIFTS === imaginaryShiftData.length, [MAX_IMAGINARY_SHIFTS, imaginaryShiftData.length])
    check('the first Imaginary Shift requires 1e105 Ordinal Powers', getImaginaryShiftReq(0).toNumber() === 1e105, getImaginaryShiftReq(0).toNumber())
    check('there is no Imaginary Shift past the last one', !Number.isFinite(getImaginaryShiftReq(imaginaryShiftData.length).toNumber()))

    data.imaginary.shifts = 0
    data.imaginary.factors = Array(7).fill(0)
    data.markup.powers = D(0)
    imaginaryShift()
    check('an Imaginary Shift without enough Ordinal Powers does nothing', data.imaginary.shifts === 0, data.imaginary.shifts)
    check('canPerformImaginaryShift() is false when too poor', canPerformImaginaryShift() === false)
    data.markup.powers = D(1e104)
    check('canPerformImaginaryShift() is false one order of magnitude short', canPerformImaginaryShift() === false)
    data.markup.powers = D(1e105)
    check('canPerformImaginaryShift() is true at the requirement', canPerformImaginaryShift() === true)

    data.markup.powers = D(1e200)
    imaginaryShift()
    check('an Imaginary Shift raises the shift count', data.imaginary.shifts === 1, data.imaginary.shifts)
    check('an Imaginary Shift costs no Ordinal Powers', data.markup.powers.toNumber() === 1e200, data.markup.powers.toNumber())
    check('the first Imaginary Factor is unlocked', hasFactor(0, true) === true)
    check('the second Imaginary Factor is still locked', hasFactor(1, true) === false)

    // ---------------------------------------------------------------------------------------
    // Imaginary Factors: buying them with Ordinal Powers
    // ---------------------------------------------------------------------------------------
    data.markup.powers = D(1000)
    const powersBefore = data.markup.powers.toNumber()
    buyFactor(0, true)
    check('buying iFactor 1 raises the Imaginary ledger', data.imaginary.factors[0] === 1, data.imaginary.factors)
    check('buying iFactor 1 leaves the normal Factor ledger alone', data.factors[0] === 0, data.factors)
    check('buying iFactor 1 spends Ordinal Powers', data.markup.powers.toNumber() < powersBefore, data.markup.powers.toNumber())
    check('the iFactor effect is finite (regression: data.imaginary[n] was NaN)', Number.isFinite(factorEffect(0, true)), factorEffect(0, true))
    check('the iFactor effect is above 1x', factorEffect(0, true) > 1, factorEffect(0, true))
    check('the total Factor effect stays finite', Number.isFinite(totalFactorEffect()), totalFactorEffect())

    data.imaginary.factors = Array(7).fill(0)
    data.factors = Array(7).fill(0)
    data.markup.shifts = 0
    data.markup.powers = D(1e200)
    buyMaxFactor()
    check('buyMaxFactor() fills the unlocked Imaginary Factors', data.imaginary.factors[0] > 0, data.imaginary.factors)
    check('buyMaxFactor() never touches the normal Factors', data.factors.every(f => f === 0), data.factors)

    data.imaginary.factors = [4, 3, 2, 1, 0, 0, 0]
    data.markup.powers = D(1e200)
    imaginaryShift()
    check('a second Imaginary Shift raises the count', data.imaginary.shifts === 2, data.imaginary.shifts)
    check('an Imaginary Shift resets the Imaginary Factor counts', data.imaginary.factors.every(f => f === 0), data.imaginary.factors)
    check('the second Imaginary Factor is unlocked', hasFactor(1, true) === true)
    check('the third Imaginary Factor is still locked', hasFactor(2, true) === false)

    data.markup.powers = D('1e400')
    for (let i = 0; i < 20; i++) imaginaryShift()
    check('Imaginary Shifts cap at 7', data.imaginary.shifts === 7, data.imaginary.shifts)
    check('all 7 Imaginary Factors end up unlocked', data.imaginary.factors.every((f, i) => hasFactor(i, true)))
    check('canPerformImaginaryShift() is false once maxed', canPerformImaginaryShift() === false)
    check('the top Imaginary tier is 2.3', getImaginaryShiftTier() === 2.3, getImaginaryShiftTier())

    data.imaginary.shifts = 100
    check('a broken shift count clamps the tier', getImaginaryShiftTier() === 2.3, getImaginaryShiftTier())
    check('a broken shift count cannot produce NaN effects', Number.isFinite(factorEffect(0, true)), factorEffect(0, true))
    data.imaginary.shifts = NaN
    check('a NaN shift count cannot produce NaN effects', Number.isFinite(factorEffect(0, true)), factorEffect(0, true))
    data.imaginary.shifts = 3

    // ---------------------------------------------------------------------------------------
    // Confirmation toggle and the Forgotten Realm guard
    // ---------------------------------------------------------------------------------------
    data.imaginary.shifts = 0
    data.imaginary.factors = Array(7).fill(0)
    data.markup.powers = D(1e200)
    data.sToggles[3] = true
    confirmations.length = 0
    imaginaryShiftConfirm()
    check('the confirmation is raised instead of shifting', confirmations.length === 1 && data.imaginary.shifts === 0, [confirmations.length, data.imaginary.shifts])
    confirmations[0].fn()
    check('accepting the confirmation performs the shift', data.imaginary.shifts === 1, data.imaginary.shifts)
    data.sToggles[3] = false
    confirmations.length = 0
    imaginaryShiftConfirm()
    check('with the confirmation off the shift happens immediately', confirmations.length === 0 && data.imaginary.shifts === 2, [confirmations.length, data.imaginary.shifts])
    data.sToggles[3] = true

    data.baseless.baseless = true
    data.markup.powers = D(1e200)
    const shiftsBeforeBaseless = data.imaginary.shifts
    imaginaryShift()
    check('no Imaginary Shift inside the Forgotten Realm', data.imaginary.shifts === shiftsBeforeBaseless, data.imaginary.shifts)
    data.baseless.baseless = false

    // ---------------------------------------------------------------------------------------
    // UI: the button and the iFactor panel follow EUP 402
    // ---------------------------------------------------------------------------------------
    data.obliterate.energyUpgrades = [401]
    data.nav.subtabs.markup = 'auto'
    switchSubtab('factor', 'markup')
    check('the Imaginary Shift button is hidden while 402 is locked', E.get('imaginaryShiftButton').style.display === 'none', E.get('imaginaryShiftButton').style.display)
    check('the iFactor panel is hidden while 402 is locked', E.get('iFactorContainer').style.display === 'none', E.get('iFactorContainer').style.display)

    data.obliterate.energyUpgrades = [401, 402]
    data.nav.subtabs.markup = 'auto'
    switchSubtab('factor', 'markup')
    check('the Imaginary Shift button is shown once 402 is owned', E.get('imaginaryShiftButton').style.display === 'block', E.get('imaginaryShiftButton').style.display)
    check('the iFactor panel is shown once 402 is owned', E.get('iFactorContainer').style.display === 'flex', E.get('iFactorContainer').style.display)

    updateImaginaryShiftHTML()
    const buttonText = E.get('imaginaryShiftButton').innerHTML
    check('the Imaginary Shift button shows progress and price', /2\/7/.test(buttonText) && /Ordinal Powers/.test(buttonText) && !/NaN|Infinity|\?\?\?/.test(buttonText), buttonText)
    check('unlocked iFactors show their count and cost', /Cost:/.test(E.get('iFactor0').innerText) && /Cost:/.test(E.get('iFactor1').innerText), E.get('iFactor0').innerText)
    check('still locked iFactors say LOCKED', /LOCKED/.test(E.get('iFactor2').innerText), E.get('iFactor2').innerText)

    data.imaginary.shifts = 7
    updateImaginaryShiftHTML()
    check('the Imaginary Shift button reports completion when maxed', /All Imaginary Factors are unlocked/.test(E.get('imaginaryShiftButton').innerHTML), E.get('imaginaryShiftButton').innerHTML)
    check('the maxed button text never shows Infinity', !/Infinity/.test(E.get('imaginaryShiftButton').innerHTML), E.get('imaginaryShiftButton').innerHTML)

    data.sToggles[6] = false
    let markupThrew = null
    try { updateMarkupHTML() } catch (e) { markupThrew = e.message }
    check('updateMarkupHTML() does not throw with Imaginary Shifts unlocked', markupThrew === null, markupThrew)

    // ---------------------------------------------------------------------------------------
    // Saving: the Imaginary layer round-trips, legacy saves get the defaults
    // ---------------------------------------------------------------------------------------
    data.imaginary.shifts = 3
    data.imaginary.factors = [1, 2, 3, 0, 0, 0, 0]
    const saved = JSON.parse(getSaveData())
    check('the save contains the Imaginary shift count', saved.imaginary.shifts === 3, saved.imaginary)
    const unpacked = unpackSave(getDefaultPlayer(), saved)
    check('unpacking keeps the Imaginary ledger', unpacked.imaginary.shifts === 3 && unpacked.imaginary.factors[2] === 3, unpacked.imaginary)
    delete saved.imaginary
    const legacy = unpackSave(getDefaultPlayer(), saved)
    check('a legacy save gets the Imaginary defaults', legacy.imaginary.shifts === 0 && legacy.imaginary.factors.length === 7, legacy.imaginary)

    // ---------------------------------------------------------------------------------------
    // Broken saves are repaired on load
    // ---------------------------------------------------------------------------------------
    data.imaginary.shifts = 42
    data.imaginary.factors = [NaN, 1, 1, 1, 1, 1, 1]
    let fixThrew = null
    try { fixOldSaves() } catch (e) { fixThrew = e.message }
    check('fixOldSaves() does not throw on a broken Imaginary ledger', fixThrew === null, fixThrew)
    check('fixOldSaves() clamps a broken Imaginary shift count', data.imaginary.shifts === 7, data.imaginary.shifts)
    check('fixOldSaves() repairs the Imaginary Factor ledger', data.imaginary.factors[0] === 0, data.imaginary.factors)
    data.imaginary.factors = [1, 2]
    fixOldSaves()
    check('fixOldSaves() restores the 7-long Imaginary ledger', data.imaginary.factors.length === 7, data.imaginary.factors.length)

    // ---------------------------------------------------------------------------------------
    // The Imaginary shift count is a permanent layer: only imaginaryShift() may write it
    // ---------------------------------------------------------------------------------------
    const writers = globalThis.__imaginaryShiftWriters
    const allowedWriters = ['src/data/saving.js', 'src/markup/markup.js']
    check('only markup.js writes and only saving.js clamps the Imaginary shift count', writers.length === allowedWriters.length && writers.every(w => allowedWriters.includes(w)), writers)
    check('no reset ever clears the Imaginary shift count', globalThis.__imaginaryShiftResets.length === 0, globalThis.__imaginaryShiftResets)
}

try { vm.runInThisContext('(' + testBody.toString() + ')()', { filename: 'imaginary-shift-tests' }) }
catch (e) { globalThis.__results.push('FAIL  <test script threw>   -> ' + e.message + '\n' + e.stack) }

console.log('')
globalThis.__results.forEach(r => console.log(r))
const failed = globalThis.__results.filter(r => r.startsWith('FAIL')).length
console.log('')
console.log('SUMMARY: ' + (globalThis.__results.length - failed) + ' passed, ' + failed + ' failed, ' + globalThis.__results.length + ' total')
process.exit(failed || loadErrors.length ? 1 : 0)





