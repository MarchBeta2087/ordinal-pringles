/*
    Offline smoke test for the NaN/Infinity guard rails (the "Uncaught RangeError: Maximum call
    stack size exceeded" crash that appeared while playing with 3.73e539 Cardinals).

    Usage (from the repository root):   node tests/nanGuards.smoke.js "<path to repository root>"

    It loads the real game scripts in index.html order under DOM stubs (no browser, no build step),
    then covers the whole failure chain that used to end in a stack overflow:
      - format() must handle a NaN Decimal instead of recursing forever (the crash itself),
      - format() must not change its output for normal / huge / tiny numbers (regression baseline),
      - getBUPEffect(13/14) and incrementyGain() must stay finite when the Alephs are huge
        (the JS-number overflow that poisoned the Incrementy amount),
      - chargeReq() / sacrificeIncrementy() must never turn the amount into NaN,
      - a save whose amount is already broken is repaired on load, while a legit layered
        Incrementy/Ordinal is left alone,
      - and the reported in-game sequence (3.73e539 Cardinals -> Collapse -> ticks -> panels)
        must not throw any more.
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

// NOTE: intentionally no `module`/`exports` here so the UMD libs take their browser branch (global.Decimal).
const loadErrors = []
for (const s of scripts) {
    try { vm.runInThisContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), { filename: s }) }
    catch (e) { loadErrors.push(s + ' :: ' + e.message) }
}
if (loadErrors.length) { console.log('LOAD ERRORS:'); loadErrors.forEach(e => console.log('  ' + e)) }

const exampleSave = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'example.decoded.txt'), 'utf8'))

globalThis.__results = []
globalThis.__check = function (name, cond, extra) {
    globalThis.__results.push((cond ? 'PASS  ' : 'FAIL  ') + name + (cond ? '' : '   -> got: ' + JSON.stringify(extra)))
}
globalThis.__els = els
globalThis.__exampleSave = exampleSave
// testBody is stringified into vm.runInThisContext, so everything it uses has to be a global.
globalThis.__root = ROOT
globalThis.__fs = fs
globalThis.__path = path

const testBody = function () {
    const check = globalThis.__check
    const E = globalThis.__els
    check('createAlert is defined', typeof createAlert === 'function')
    globalThis.createAlert = () => {}
    globalThis.showNotification = () => {}
    check('Decimal global is available', typeof Decimal === 'function')
    check('ExpantaNum global is available', typeof EN === 'function')

    // ---- helpers ----
    const run = function (fn) { try { return { ok: true, value: fn() } } catch (e) { return { ok: false, error: e.message } } }
    const isNaNDecimal = v => (v instanceof Decimal) && (isNaN(v.sign) || isNaN(v.layer) || isNaN(v.mag) || isNaN(v.e))
    const decimalIsFinite = v => (v instanceof Decimal) && !isNaNDecimal(v) && Number.isFinite(v.mag)
    const brokenDecimal = () => D(Infinity).sub(D(0).div(0))   // the "(e^NaN)NaN" state
    const finiteInItsType = v => (v instanceof Decimal) ? decimalIsFinite(v) : (typeof v === 'number' && Number.isFinite(v))
    check('a NaN Decimal can be built for the test', isNaNDecimal(brokenDecimal()), String(brokenDecimal()))

    // ---- the crash itself: format() must not recurse forever on NaN ----
    let r = run(() => format(brokenDecimal()))
    check('format(NaN) does not overflow the stack', r.ok, r.error)
    check('format(NaN) returns "NaN"', r.ok && r.value === "NaN", r.error || r.value)
    r = run(() => formatWhole(brokenDecimal()))
    check('formatWhole(NaN) returns "NaN"', r.ok && r.value === "NaN", r.error || r.value)
    r = run(() => formatTime(brokenDecimal()))
    check('formatTime(NaN) returns "0s"', r.ok && r.value === "0s", r.error || r.value)
    r = run(() => format(D(Infinity)))
    check('format(Infinity) is unchanged', r.ok && r.value === "Infinity", r.error || r.value)
    r = run(() => format(D(-Infinity)))
    check('format(-Infinity) is unchanged', r.ok && r.value === "-Infinity", r.error || r.value)

    // ---- format() regression baseline (captured before the guard was added) ----
    const formatBaseline = [
        [() => D(0), "0.00"],
        [() => D(999), "999.00"],
        [() => D(1e6), "1.00e6"],
        [() => D(1e21), "1.00e21"],
        [() => D("1e300"), "1.00e300"],
        [() => D("ee10"), "e1.000e10"],
        [() => D("eeee1000"), "3.000F5"],
        [() => D("1e-5"), "1.00e-5"],
        [() => D("1e-5000"), "1.00e5000⁻¹"],
        [() => D("-1e500"), "-1.00e500"],
        [() => Decimal.tetrate(10, 1000), "1.000F1,000"],
        [() => Decimal.tetrate(10, 100000), "1.000F100,000"],
        [() => new Decimal(1).layeradd10(10), "1.000F10"],
    ]
    for (let i = 0; i < formatBaseline.length; i++) {
        const probe = run(() => format(formatBaseline[i][0]()))
        check('format() baseline #' + i + ' -> ' + JSON.stringify(formatBaseline[i][1]), probe.ok && probe.value === formatBaseline[i][1], probe.error || probe.value)
    }

    // ---- calcOrdPoints(): the recursion that used to overflow on a NaN Hierarchy Ordinal ----
    // Baseline: identical to the pre-fix implementation, verified value-by-value.
    const calcOrdPointsBaseline = [
        [() => D("5"), "11"],
        [() => D("1e6"), "3.300000010019996e21"],
        [() => D("1e21"), "3.12000000000008e202"],
        [() => D("1e324"), "1.0000175674844227e20000000122"],
        [() => D("ee10"), "ee100.47712125471966"],
        [() => D("eeee1000"), "(e^11)23.53961645897879"],
        [() => Decimal.tetrate(10, 10), "(e^21)1884.5154058805963"],
        [() => Decimal.tetrate(10, 1000), "(e^30000003219)1884.4537671455876"],
        [() => Decimal.tetrate(10, 100000), "(e^100000020120000000000)10000000000"],
        [() => new Decimal(1).layeradd10(10), "(e^21)1884.5154058805963"],
        [() => new Decimal(1).layeradd10(50), "(e^301)1884.5154058804787"],
        [() => D("0"), "0"],
        [() => D("0.5"), "0.5"],
        [() => D("3"), "3"],
    ]
    for (let i = 0; i < calcOrdPointsBaseline.length; i++) {
        const probe = run(() => String(calcOrdPoints(calcOrdPointsBaseline[i][0](), 4, D(0), 0)))
        check('calcOrdPoints() baseline #' + i + ' -> ' + JSON.stringify(calcOrdPointsBaseline[i][1]), probe.ok && probe.value === calcOrdPointsBaseline[i][1], probe.error || probe.value)
    }
    // Broken inputs must return instead of recursing until the stack overflows.
    r = run(() => calcOrdPoints(brokenDecimal(), 4, D(0)))
    check('calcOrdPoints(NaN) returns a value instead of overflowing', r.ok && (r.value instanceof Decimal) && decimalIsFinite(r.value), r.error || String(r.value))
    r = run(() => calcOrdPoints(D(Infinity), 4, D(0)))
    check('calcOrdPoints(Infinity) stays finite', r.ok && decimalIsFinite(r.value), r.error || String(r.value))
    r = run(() => calcOrdPoints(D(5), NaN, D(0)))
    check('calcOrdPoints() with a NaN base stays finite', r.ok && decimalIsFinite(r.value), r.error || String(r.value))
    r = run(() => calcOrdPoints(D(5), 0, D(0)))
    check('calcOrdPoints() with a base below 1 stays finite', r.ok && decimalIsFinite(r.value), r.error || String(r.value))
    r = run(() => calcOrdPoints(Decimal.tetrate(10, 1000000), 4, D(0)))
    check('calcOrdPoints() survives a 10^^1,000,000 tower', r.ok && decimalIsFinite(r.value), r.error || String(r.value))

    // ---- a NaN Hierarchy Ordinal must not crash the tick or the Hierarchies panel ----
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.hierarchies.ords[0].ord = brokenDecimal()
    data.hierarchies.ords[0].over = brokenDecimal()
    r = run(() => effectiveFGH())
    check('effectiveFGH() survives a NaN Hierarchy Ordinal', r.ok && decimalIsFinite(r.value), r.error || String(r.value))
    r = run(() => effectiveSGH())
    check('effectiveSGH() survives a NaN Hierarchy Ordinal', r.ok && decimalIsFinite(r.value), r.error || String(r.value))
    r = run(() => updateHierarchiesHTML())
    check('updateHierarchiesHTML() survives a NaN Hierarchy Ordinal', r.ok, r.error)
    r = run(() => { for (let i = 0; i < 20; i++) mainLoop() })
    check('20 ticks survive a NaN Hierarchy Ordinal', r.ok, r.error)

    // ---- increaseHierarchies() must not write a NaN gain into the Ordinal ----
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.incrementy.amt = brokenDecimal()          // makes hierarchyData[0].gain() NaN
    r = run(() => increaseHierarchies(20))
    check('increaseHierarchies() does not throw on a NaN gain', r.ok, r.error)
    check('a NaN gain does not poison the Hierarchy Ordinal', !isNaNDecimal(data.hierarchies.ords[0].ord) && decimalIsFinite(data.hierarchies.ords[0].ord), String(data.hierarchies.ords[0].ord))

    // ---- save repair: a persisted NaN Hierarchy Ordinal heals on load ----
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.hierarchies.ords[0].ord = brokenDecimal()
    data.hierarchies.ords[0].over = brokenDecimal()
    save()
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    const loadHier = run(() => load())
    check('loading a save with a NaN Hierarchy Ordinal does not throw', loadHier.ok, loadHier.error)
    check('a NaN Hierarchy Ordinal is repaired on load', String(data.hierarchies.ords[0].ord) === "0" && String(data.hierarchies.ords[0].over) === "0", [String(data.hierarchies.ords[0].ord), String(data.hierarchies.ords[0].over)])
    r = run(() => { for (let i = 0; i < 20; i++) mainLoop(); updateHierarchiesHTML() })
    check('the repaired Hierarchy save keeps ticking', r.ok, r.error)

    // ---- the root cause: BUP13/BUP14 must keep Decimal precision with huge Alephs ----
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    const bigAleph = D("4.1444444444448925e538")
    for (let i = 0; i < data.collapse.alephs.length; i++) data.collapse.alephs[i] = bigAleph
    r = run(() => getBUPEffect(14))
    check('getBUPEffect(14) does not overflow to a JS Infinity', r.ok && finiteInItsType(r.value), r.error || String(r.value))
    r = run(() => getBUPEffect(13))
    check('getBUPEffect(13) stays finite too', r.ok && finiteInItsType(r.value), r.error || String(r.value))
    // No BUP effect may become a JS Infinity: that is exactly what poisoned Incrementy gain.
    let infiniteBUP = null
    for (let i = 0; i < bupData.length; i++) {
        const probe = run(() => getBUPEffect(i))
        if (!probe.ok || !finiteInItsType(probe.value)) infiniteBUP = i + ' -> ' + (probe.error || String(probe.value))
    }
    check('no BUP effect is Infinity/NaN with huge Alephs', infiniteBUP === null, infiniteBUP)
    r = run(() => incrementyGain())
    check('incrementyGain() is finite with huge Alephs', r.ok && decimalIsFinite(r.value), r.error || String(r.value))
    r = run(() => chargeReq())
    check('chargeReq() is finite with huge Alephs', r.ok && decimalIsFinite(r.value), r.error || String(r.value))

    // ---- chargeReq() with a non-finite Hierarchy effect must not produce NaN ----
    const realGetHierarchyEffect = getHierarchyEffect
    getHierarchyEffect = () => D(Infinity)
    r = run(() => chargeReq())
    check('chargeReq() survives a non-finite Hierarchy effect', r.ok && decimalIsFinite(r.value), r.error || String(r.value))
    const fmtReq = run(() => format(chargeReq()))
    check('format(chargeReq()) does not throw', fmtReq.ok, fmtReq.error)
    getHierarchyEffect = realGetHierarchyEffect

    // ---- sacrificeIncrementy() must skip a non-finite requirement instead of writing NaN ----
    const realChargeReq = chargeReq
    chargeReq = () => D(Infinity)
    data.incrementy.amt = D("1e900")
    const sac = run(() => sacrificeIncrementy())
    check('sacrificeIncrementy() does not throw on a non-finite requirement', sac.ok, sac.error)
    check('sacrificeIncrementy() leaves a finite amount untouched', data.incrementy.amt.eq(D("1e900")), String(data.incrementy.amt))
    chargeReq = realChargeReq
    data.incrementy.amt = D(Infinity)
    const sac2 = run(() => sacrificeIncrementy())
    check('sacrificeIncrementy() never turns an amount into NaN', sac2.ok && !isNaNDecimal(data.incrementy.amt), sac2.error || String(data.incrementy.amt))

    // ---- the reported sequence: 3.73e539 Cardinals -> Collapse -> ticks -> panels ----
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.collapse.cardinals = D("3.73e539")
    data.collapse.bestCardinalsGained = D("3.73e539")
    data.ms = 20
    data.lastTick = Date.now() - 20
    let crash = null
    try {
        collapseCardinals()
        for (let i = 0; i < 20; i++) mainLoop()
        updateHierarchiesHTML(); updateCollapseHTML(); updateOrdHTML(); updateMarkupHTML(); updateIncrementyHTML()
    } catch (e) { crash = e.constructor.name + ': ' + e.message }
    check('the reported sequence no longer throws', crash === null, crash)
    check('the Incrementy amount stays finite', decimalIsFinite(data.incrementy.amt), String(data.incrementy.amt))
    check('the Hierarchy gain stays finite', decimalIsFinite(hierarchyData[0].gain()), String(hierarchyData[0].gain()))
    check('no hierarchy buyable level became non-finite', data.hierarchies.rebuyableAmt.every(Number.isFinite), data.hierarchies.rebuyableAmt)
    let crash2 = null
    try { for (let i = 0; i < 100; i++) mainLoop(); updateHierarchiesHTML(); updateCollapseHTML() } catch (e) { crash2 = e.constructor.name + ': ' + e.message }
    check('another 100 ticks stay healthy', crash2 === null, crash2)
    check('Cardinals still format normally', /e\+?53\d$/.test(format(data.collapse.cardinals)), format(data.collapse.cardinals))

    // ---- save repair on load ----
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.incrementy.amt = D(Infinity).sub(D(0).div(0))       // "(e^NaN)NaN"
    data.hierarchies.rebuyableAmt[2] = Infinity
    data.hierarchies.rebuyableAmt[5] = NaN
    save()
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    let loadThrew = null
    try { load() } catch (e) { loadThrew = e.message }
    check('loading a corrupted save does not throw', loadThrew === null, loadThrew)
    check('a NaN Incrementy amount is repaired', String(data.incrementy.amt) === "0", String(data.incrementy.amt))
    check('non-finite hierarchy buyable levels are clamped', data.hierarchies.rebuyableAmt.every(Number.isFinite), data.hierarchies.rebuyableAmt)
    check('format() renders the repaired amount', format(data.incrementy.amt) === "0.00", format(data.incrementy.amt))

    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.incrementy.amt = D(Infinity)
    save()
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    const loadInf = run(() => load())
    check('loading a Decimal-Infinity save does not throw', loadInf.ok, loadInf.error)
    check('a Decimal-Infinity amount is repaired too', String(data.incrementy.amt) === "0", String(data.incrementy.amt))

    // ---- a legit layered save must NEVER be wiped by the repair ----
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.incrementy.amt = D("5.4871299080765095e744")
    data.ord.ordinal = D("1.424495955853025e324")
    save()
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    const loadLegit = run(() => load())
    check('loading a legit layered save does not throw', loadLegit.ok, loadLegit.error)
    check('a legit layered Incrementy amount survives loading', String(data.incrementy.amt) === "5.4871299080765095e744", String(data.incrementy.amt))
    check('a legit layered Ordinal survives loading', String(data.ord.ordinal) === "1.424495955853025e324", String(data.ord.ordinal))

    // ---- Overflow gain: "0 * Infinity" used to turn Booster Power into NaN ----
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.sing.level = [500, 2000]
    data.sing.highestLevel = [500, 2000]
    data.obliterate.energyUpgrades = [106]
    data.boost.total = 0                       // no excess Boosters: the state right after a Collapse
    for (let i = 0; i < data.collapse.alephs.length; i++) data.collapse.alephs[i] = D("1e600")
    check('the test state really has no excess Boosters', getExtraBoosters() === 0, getExtraBoosters())
    check('and really has an Aleph effect beyond Number.MAX_VALUE', alephEffect(6).gt(Number.MAX_VALUE), String(alephEffect(6)))
    r = run(() => getOverflowGain(0))
    check('getOverflowGain(0) is a finite number', r.ok && typeof r.value === 'number' && Number.isFinite(r.value), r.error || String(r.value))
    check('getOverflowGain(0) is not NaN ("0 * Infinity")', r.ok && !isNaN(r.value), r.error || String(r.value))
    r = run(() => getOverflowGain(1))
    check('getOverflowGain(1) is finite as well', r.ok && Number.isFinite(r.value), r.error || String(r.value))

    // ---- the reported loop: high Ringularity -> Collapse -> Collapse all Cardinals -> ticks ----
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.sing.level = [500, 2000]
    data.sing.highestLevel = [500, 2000]
    data.obliterate.energyUpgrades = [106]
    data.incrementy.totalCharge = 5000
    data.incrementy.charge = 5000
    data.boost.unlocks = [true, true, true, true, true]
    data.ms = 20
    data.lastTick = Date.now() - 20
    let loopErr = null
    try {
        collapse(false, false)
        collapseCardinals()
        data.boost.times = 674; data.boost.amt = 218525; data.boost.total = 229505
        for (let i = 0; i < 60; i++) mainLoop()
    } catch (e) { loopErr = e.constructor.name + ': ' + e.message }
    check('Collapse + Collapse-all-Cardinals + 60 ticks does not throw', loopErr === null, loopErr)
    check('Booster Power stays finite (no NaN/Infinity)', Number.isFinite(data.overflow.bp), String(data.overflow.bp))
    check('Overcharge stays finite', Number.isFinite(data.overflow.oc), String(data.overflow.oc))
    let badEffect = null
    for (let i = 0; i < 8; i++) {
        const probe = run(() => getOverflowEffect(i))
        if (!probe.ok || !Number.isFinite(probe.value)) badEffect = i + ' -> ' + (probe.error || String(probe.value))
    }
    check('every Overflow effect stays finite', badEffect === null, badEffect)
    let badBUPAfterLoop = null
    for (let i = 0; i < bupData.length; i++) {
        const probe = run(() => getBUPEffect(i))
        if (!probe.ok || !finiteInItsType(probe.value)) badBUPAfterLoop = i + ' -> ' + (probe.error || String(probe.value))
    }
    check('every BUP effect stays finite after the loop', badBUPAfterLoop === null, badBUPAfterLoop)
    for (const chain of [["t1Auto()", () => t1Auto()], ["t2Auto()", () => t2Auto()], ["totalOPGain()", () => totalOPGain()]]) {
        const probe = run(chain[1])
        check(chain[0] + ' is finite after the loop', probe.ok && decimalIsFinite(probe.value), probe.error || String(probe.value))
    }
    const autoClick = run(() => t1Auto())
    check('the AutoClicker speed chain is still usable (not 0)', autoClick.ok && decimalIsFinite(autoClick.value) && autoClick.value.gt(0), autoClick.error || String(autoClick.value))

    // ---- save repair for a broken Booster Power / Overcharge ----
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.overflow.bp = NaN
    data.overflow.oc = NaN
    save()
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    const loadOverflow = run(() => load())
    check('loading a save with a broken Booster Power does not throw', loadOverflow.ok, loadOverflow.error)
    // A NaN number is serialized as null, so unpackSave() now keeps the previous (finite) value.
    check('a NaN Booster Power never survives loading', Number.isFinite(data.overflow.bp), String(data.overflow.bp))
    check('a NaN Overcharge never survives loading', Number.isFinite(data.overflow.oc), String(data.overflow.oc))
    // A hand-written 1e999 parses as Infinity, which fixOldSaves() has to repair.
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.overflow.bp = Infinity
    data.overflow.oc = Infinity
    const rawSave = getSaveData().replace(/"bp":null/, '"bp":1e999').replace(/"oc":null/, '"oc":1e999')
    save(rawSave)
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    const loadInfBP = run(() => load())
    check('loading a hand-written Infinity Booster Power does not throw', loadInfBP.ok, loadInfBP.error)
    check('a hand-written Infinity Booster Power is repaired on load', data.overflow.bp === 1, String(data.overflow.bp))
    check('a hand-written Infinity Overcharge is repaired on load', data.overflow.oc === 1, String(data.overflow.oc))
    let brokenEffectsAfterRepair = 0
    for (let i = 0; i < 8; i++) if (!Number.isFinite(getOverflowEffect(i))) brokenEffectsAfterRepair++
    check('all Overflow effects are finite after the repair', brokenEffectsAfterRepair === 0, brokenEffectsAfterRepair)

    // ---- Booster Power saturation: 4.70e653 Cardinals with 1000ms ticks ----
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.collapse.cardinals = D("4.70e653")
    data.collapse.bestCardinalsGained = D("4.70e653")
    for (let i = 0; i < data.collapse.alephs.length; i++) data.collapse.alephs[i] = D("4.70e653").div(8)
    data.boost.total = 229505; data.boost.amt = 218525; data.boost.times = 674
    data.boost.unlocks = [true, true, true, true, true]
    data.sing.level = [500, 2000]; data.sing.highestLevel = [500, 2000]
    data.obliterate.energyUpgrades = [106]
    data.incrementy.totalCharge = 5000; data.incrementy.charge = 5000
    data.ms = 1000
    let satErr = null
    try { for (let i = 0; i < 8; i++) { data.lastTick = Date.now() - 1000; mainLoop() } } catch (e) { satErr = e.constructor.name + ': ' + e.message }
    check('8 ticks at 4.70e653 Cardinals (1000ms ticks) do not throw', satErr === null, satErr)
    check('Booster Power saturates instead of overflowing', Number.isFinite(data.overflow.bp), String(data.overflow.bp))
    check('Overcharge saturates instead of overflowing', Number.isFinite(data.overflow.oc), String(data.overflow.oc))
    let satBad = null
    for (let i = 0; i < 8; i++) { const probe = run(() => getOverflowEffect(i)); if (!probe.ok || !Number.isFinite(probe.value)) satBad = 'Overflow effect ' + i }
    for (let i = 0; i < bupData.length; i++) { const probe = run(() => getBUPEffect(i)); if (!probe.ok || !finiteInItsType(probe.value)) satBad = 'BUP ' + i }
    check('no Overflow effect or BUP broke during the saturated run', satBad === null, satBad)
    const decGain = run(() => decrementyGain())
    check('decrementyGain() stays finite during the saturated run', decGain.ok && decimalIsFinite(decGain.value), decGain.error || String(decGain.value))
    const clickSpeed = run(() => t1Auto())
    check('the AutoClicker speed chain stays finite during the saturated run', clickSpeed.ok && decimalIsFinite(clickSpeed.value) && clickSpeed.value.gt(0), clickSpeed.error || String(clickSpeed.value))
    data.ms = 20

    // ---- buyRUP() must never throw on an unmapped index ----
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.incrementy.amt = D("1e900")
    const rupBad = []
    for (let i = 0; i < 12; i++) {
        const probe = run(() => buyRUP(i))
        if (!probe.ok) rupBad.push(i + ': ' + probe.error)
    }
    check('buyRUP(0..11) never throws', rupBad.length === 0, rupBad.join(' | '))
    unpackSave(data, JSON.parse(JSON.stringify(globalThis.__exampleSave)))
    data.incrementy.amt = D("1e900")
    const beforeRUP0 = data.incrementy.rebuyableAmt[0]
    run(() => buyRUP(0))
    check('buyRUP(0) still buys the first repeatable upgrade', data.incrementy.rebuyableAmt[0] > beforeRUP0, data.incrementy.rebuyableAmt[0])
    const beforeRUP9 = data.incrementy.rebuyableAmt[3]
    run(() => buyRUP(9))
    check('buyRUP(9) still maps to the fourth repeatable upgrade', data.incrementy.rebuyableAmt[3] > beforeRUP9, data.incrementy.rebuyableAmt[3])
}

try { vm.runInThisContext('(' + testBody.toString() + ')()', { filename: 'nan-guard-tests' }) }
catch (e) { globalThis.__results.push('FAIL  <test script threw>   -> ' + e.message + '\n' + e.stack) }

console.log('')
globalThis.__results.forEach(r => console.log(r))
const failed = globalThis.__results.filter(r => r.startsWith('FAIL')).length
console.log('')
console.log('SUMMARY: ' + (globalThis.__results.length - failed) + ' passed, ' + failed + ' failed, ' + globalThis.__results.length + ' total')
process.exit(failed || loadErrors.length ? 1 : 0)

