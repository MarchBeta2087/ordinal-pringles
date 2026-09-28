/*
    Randomized fuzz harness for the Ordinal Pringles game logic (the "keep finding bugs" tool).

    Usage (from the repository root):   node tests/fuzz.smoke.js "<path to repository root>" [trials] [seed]

    It loads the real game scripts in index.html order under DOM/localStorage stubs, then drives
    randomized action sequences (Collapse, Collapse-all-Cardinals, Factor Shifts, Boosts, Markup,
    every buy / respec action, Darkness, Purification, Baseless, Singularity, Obliteration, ticks and
    every panel refresh) across a ladder of magnitudes. After every action it
      - evaluates ~90 effect probes plus a deep scan of the whole player object for
        NaN / Infinity / "(e^NaN)NaN" / broken display strings,
      - catches any thrown exception,
      - and remembers the shortest action sequence that produced each distinct violation.
    It also fuzzes the save path (randomized broken saves are written and loaded again).
    Any violation exits with code 1 and prints a ready-made repro sequence.
*/
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = process.argv[2]
const TRIALS = Math.max(1, parseInt(process.argv[3] || '40', 10) || 40)
const SEED = parseInt(process.argv[4] || '20240928', 10) || 20240928

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

globalThis.__els = els
globalThis.__exampleSave = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'example.decoded.txt'), 'utf8'))
globalThis.__trials = TRIALS
globalThis.__seed = SEED
globalThis.__findings = []

const fuzzBody = function () {
    const exampleSave = globalThis.__exampleSave
    const TRIALS = globalThis.__trials
    const SEED = globalThis.__seed
    const findings = globalThis.__findings

    // ---------- deterministic PRNG ----------
    let seed = SEED >>> 0
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
    const pick = arr => arr[Math.floor(rnd() * arr.length)]
    const clone = () => JSON.parse(JSON.stringify(exampleSave))

    // ---------- non-finite detector ----------
    const bad = v => {
        if (v === null || v === undefined) return null
        if (typeof v === 'number') return Number.isFinite(v) ? null : (isNaN(v) ? 'NaN' : 'Infinity')
        if (v instanceof Decimal) return (isNaN(v.mag) || isNaN(v.layer) || isNaN(v.sign)) ? 'NaN' : (v.mag === Number.POSITIVE_INFINITY ? 'Infinity' : null)
        if (typeof EN === 'function' && v instanceof EN) return v.isNaN() ? 'NaN' : (v.isFinite() ? null : 'Infinity')
        if (typeof v === 'string') return /NaN|undefined|Infinity/.test(v) ? 'bad-string' : null
        return null
    }

    // ---------- effect probes ----------
    const probes = () => {
        const P = []
        const add = (n, f) => P.push([n, f])
        for (let i = 0; i < 9; i++) add('alephEffect' + i, () => alephEffect(i))
        for (let i = 0; i < 8; i++) add('getCUPEffect' + i, () => getCUPEffect(i))
        for (let i = 0; i < bupData.length; i++) add('getBUPEffect' + i, () => getBUPEffect(i))
        for (let i = 0; i < iupEffects.length; i++) add('iupEffect' + i, () => iupEffects[i]())
        for (let i = 0; i < 8; i++) add('getOverflowEffect' + i, () => getOverflowEffect(i))
        for (let i = 0; i < 10; i++) add('getPringleEffect' + i, () => getPringleEffect(i))
        for (let i = 0; i < 4; i++) add('purificationEffect' + i, () => purificationEffect(i))
        for (let i = 0; i < 8; i++) add('getAOREffect' + i, () => getAOREffect(i))
        for (let i = 0; i < 6; i++) add('singEffect' + i, () => singEffects[i].effect())
        add('ringularity3', () => getRingularityEffect(3))
        add('ringularity4', () => getRingularityEffect(4))
        add('ringularity5', () => getRingularityEffect(5))
        add('cardinalGain', () => cardinalGain())
        add('incrementyGain', () => incrementyGain())
        add('incrementyMult', () => incrementyMult())
        add('t1Auto', () => t1Auto())
        add('t2Auto', () => t2Auto())
        add('t2AutoPure', () => t2AutoPure())
        add('opGain', () => D(opGain()))
        add('totalOPGain', () => totalOPGain())
        add('opMult', () => opMult())
        add('chargeReq', () => chargeReq())
        add('chargeBoostToBaseless', () => chargeBoostToBaseless())
        add('effectiveFGH', () => effectiveFGH())
        add('effectiveSGH', () => effectiveSGH())
        add('getHierarchyEffect0', () => getHierarchyEffect(0))
        add('getHierarchyEffect1', () => getHierarchyEffect(1))
        add('hierarchyGain0', () => hierarchyData[0].gain())
        add('hierarchyGain1', () => hierarchyData[1].gain())
        add('getOverflowGain0', () => getOverflowGain(0))
        add('getOverflowGain1', () => getOverflowGain(1))
        add('alephTotalEffect', () => alephTotalEffect())
        add('alephOmegaCap', () => alephOmegaCap())
        add('aoGain', () => aoGain())
        add('alephNullGain', () => alephNullGain())
        add('alephNullEff0', () => alephNullEffects[0]())
        add('alephNullEff1', () => alephNullEffects[1]())
        add('decrementyGain', () => decrementyGain())
        add('getDecrementyExponent', () => getDecrementyExponent())
        add('negativeChargeGain', () => negativeChargeGain())
        add('negativeChargeEffect', () => negativeChargeEffect(false))
        add('dyGain', () => dyGain())
        add('getDyCap', () => getDyCap())
        add('totalFactorEffect', () => totalFactorEffect())
        add('getObliterateReq', () => getObliterateReq())
        add('getTargetOrdinal', () => getTargetOrdinal())
        add('getBarPercent', () => getBarPercent())
        add('display cardinals', () => format(data.collapse.cardinals))
        add('display bestCardinals', () => format(data.collapse.bestCardinalsGained))
        add('display alephs[0]', () => format(data.collapse.alephs[0]))
        add('display incrementy', () => format(data.incrementy.amt))
        add('display powers', () => format(data.markup.powers))
        add('display ordinal', () => format(data.ord.ordinal))
        add('display H', () => String(ordinalDisplay('H')))
        add('display hardy', () => { const old = data.sToggles[13]; data.sToggles[13] = true; const r = String(getHardy()); data.sToggles[13] = old; return r })
        add('display sing0', () => String(ordinalDisplay('H', data.sing.level[0], 0, 10, ordinalDisplayTrim(3), false)))
        add('display sing1', () => String(ordinalDisplay('H', data.sing.level[1], 0, 10, ordinalDisplayTrim(3), false)))
        return P
    }

    // ---------- deep scan of the player object ----------
    const scanData = out => {
        const walk = (o, p, d) => {
            if (d > 4) return
            for (const k of Object.keys(o)) {
                let v
                try { v = o[k] } catch (e) { continue }
                if (v === null || v === undefined || typeof v === 'function') continue
                const b = bad(v)
                if (b) out.push(p + '.' + k + '=' + b + ' (' + String(v).slice(0, 18) + ')')
                else if (typeof v === 'object' && !(v instanceof Decimal) && !(typeof EN === 'function' && v instanceof EN)) walk(v, p + '.' + k, d + 1)
            }
        }
        walk(data, 'data', 0)
    }

    const record = (key, seq, tag) => {
        if (findings.some(f => f.key === key)) return
        findings.push({ key: key, tag: tag, seq: seq.slice() })
    }

    // ---------- action library ----------
    const actions = [
        ['collapse', () => collapse(false, false)],
        ['collapseCardinals', () => collapseCardinals()],
        ['factorShift', () => factorShift(true)],
        ['boost', () => boost(false, true)],
        ['markup', () => markup()],
        ['buyCUP', () => { for (let i = 0; i < 8; i++) buyCardinalUpgrade(i) }],
        ['buyCUP+drains', () => { for (let i = 0; i < 8; i++) { buyCardinalUpgrade(i); for (let k = 0; k < 5; k++) buyDrain(i) } }],
        ['buyPringles', () => { for (let i = 0; i < pringleData.length; i++) { let n = 0; while (canBuyPringle(pringleData[i]) && n++ < 25) buyPringle(pringleData[i], i) } }],
        ['buyRUP', () => { for (let i = 0; i < 12; i++) { for (let k = 0; k < 20; k++) buyRUP(i) } }],
        ['buyHB', () => { for (let i = 0; i < 6; i++) { for (let k = 0; k < 30; k++) buyHBuyable(i) } }],
        ['buyDUP', () => { for (let i = 0; i < 3; i++) { for (let k = 0; k < 20; k++) buyDUP(i, true) } }],
        ['buyBUP', () => { for (let i = 0; i < 15; i++) buyBUP(i, i >= 10, false) }],
        ['supercharge', () => { for (let i = 0; i < 15; i++) chargeBUP(i, i >= 10) }],
        ['darken', () => darken(true)],
        ['darknessControl', () => { for (let i = 0; i < 6; i++) darknessControl(i) }],
        ['purify', () => { for (let i = 0; i < 4; i++) { enterPurification(i); for (let k = 0; k < 5; k++) buyAOR(k); exitPurification(i) } }],
        ['baseless', () => { baselessControl(); dynamicShift(); baselessControl() }],
        ['buyANR', () => { for (let i = 0; i < 5; i++) { for (let k = 0; k < 20; k++) buyANR(i) } }],
        ['singControl', () => { data.incrementy.charge += 500; singControl(0, 0); singControl(0, 1); singControl(1, 0); singControl(1, 1) }],
        ['sellCharge', () => { for (let k = 0; k < 60; k++) sacrificeIncrementy() }],
        ['unstable', () => { data.obliterate.instability += 40; for (let i = 0; i < 3; i++) { for (let k = 0; k < 20; k++) buyUnstableFactor(i) } }],
        ['obliterate', () => { data.incrementy.amt = D('1e900'); obliterate() }],
        ['respecs', () => { respecUnstableFactors(); respecDrains(); respecCharge(true); boosterRefund(true) }],
        ['ticks', () => { for (let i = 0; i < 3; i++) mainLoop() }],
        ['slowTicks', () => { const ms = data.ms; data.ms = 1000; for (let i = 0; i < 2; i++) { data.lastTick = Date.now() - 1000; mainLoop() } data.ms = ms }],
        ['panels', () => { updateCollapseHTML(); updateOverflowHTML(); updateBoostersHTML(); updateMarkupHTML(); updateHierarchiesHTML(); updateIncrementyHTML(); updateDarknessHTML(); updateAllSingularityHTML(); updateOrdHTML(); updateProgressBar(); updateInstabilityText(); updateAlephNullHTML(); updateAllPurificationHTML(); updateObliterateHTML(); updateAllANRHTML() }],
        ['flipDisplay', () => { const t0 = data.ord.displayType; for (const t of ['Buchholz', 'Veblen', 'BMS', 'Y-Sequence']) { data.ord.displayType = t; updateOrdHTML() } data.ord.displayType = t0 }],
        ['saveLoad', () => { save(); load() }],
        ['changeTrim', () => { const t = data.ord.trim; changeTrim(pick([0, 3, 10, 100, 1e9, -5, 'abc'])); data.ord.trim = t }],
    ]

    // ---------- trial setup ----------
    const magnitudes = ['7.52e210', '1e300', '1e400', '1e539', '4.70e653', '1e750', '1e900']
    const setupTrial = () => {
        unpackSave(data, clone())
        const mag = pick(magnitudes)
        data.collapse.cardinals = D(mag)
        data.collapse.bestCardinalsGained = D(mag)
        for (let i = 0; i < data.collapse.alephs.length; i++) data.collapse.alephs[i] = D(mag).div(8)
        if (rnd() < 0.6) data.incrementy.amt = D(mag).times(10)
        if (rnd() < 0.6) { data.boost.total = 229505; data.boost.amt = 218525; data.boost.times = 674 }
        if (rnd() < 0.6) { data.sing.level = [500, Math.floor(rnd() * 2001)]; data.sing.highestLevel = [500, data.sing.level[1]] }
        data.boost.unlocks = [true, true, true, true, true]
        if (rnd() < 0.3) data.obliterate.energyUpgrades = [106]
        if (rnd() < 0.3) data.obliterate.instability += Math.floor(rnd() * 100)
        if (rnd() < 0.3) data.darkness.negativeCharge = rnd() * 1e12
        if (rnd() < 0.3) data.ms = 1000
        data.lastTick = Date.now() - data.ms
        return mag
    }

    // ---------- fuzz loop ----------
    for (let trial = 0; trial < TRIALS; trial++) {
        const mag = setupTrial()
        const seq = []
        const steps = 4 + Math.floor(rnd() * 10)
        for (let step = 0; step < steps; step++) {
            const [name, fn] = pick(actions)
            seq.push(name)
            let err = null
            try { fn() } catch (e) {
                if (e instanceof ReferenceError) { seq.pop(); continue }   // this build has no such action: harness issue
                err = e.constructor.name + ': ' + e.message
            }
            if (err) record('THREW [' + mag + '] ' + name + ' -> ' + err, seq, mag)
            for (const [pn, pf] of probes()) {
                let v
                try { v = pf() } catch (e) { record('PROBE-THREW [' + mag + '] ' + name + ' -> ' + pn + ': ' + e.message, seq, mag); continue }
                const b = bad(v)
                if (b) record('BAD [' + mag + '] ' + name + ' -> ' + pn + ' = ' + b + ' (' + String(v).slice(0, 20) + ')', seq, mag)
            }
            const dump = []
            scanData(dump)
            for (const entry of dump) record('BAD-DATA [' + mag + '] ' + name + ' -> ' + entry, seq, mag)
        }
    }

    // ---------- save fuzz ----------
    const corruptions = [
        ['incrementy.amt = NaN', () => { data.incrementy.amt = D(Infinity).sub(D(0).div(0)) }],
        ['incrementy.amt = Infinity', () => { data.incrementy.amt = D(Infinity) }],
        ['ord.ordinal = NaN', () => { data.ord.ordinal = D(Infinity).sub(D(0).div(0)) }],
        ['markup.powers = NaN', () => { data.markup.powers = D(Infinity).sub(D(0).div(0)) }],
        ['overflow.bp = NaN', () => { data.overflow.bp = NaN }],
        ['overflow.oc = Infinity', () => { data.overflow.oc = Infinity }],
        ['overflow.bp = 1e400', () => { data.overflow.bp = 1e400 }],
        ['hierarchy ord = NaN', () => { data.hierarchies.ords[0].ord = D(Infinity).sub(D(0).div(0)) }],
        ['hierarchy over = NaN', () => { data.hierarchies.ords[0].over = D(Infinity).sub(D(0).div(0)) }],
        ['hier rebuyable = NaN', () => { data.hierarchies.rebuyableAmt[2] = NaN }],
        ['incrementy rebuyable = Infinity', () => { data.incrementy.rebuyableAmt[0] = Infinity }],
        ['dy.level = NaN', () => { data.dy.level = D(Infinity).sub(D(0).div(0)) }],
        ['sing.level = [500, 5000]', () => { data.sing.level = [500, 5000]; data.sing.highestLevel = [500, 5000] }],
        ['ord.base = 0', () => { data.ord.base = 0 }],
        ['ord.base = -3', () => { data.ord.base = -3 }],
        ['ord.trim = 1e9', () => { data.ord.trim = 1e9 }],
        ['chal.decrementy = NaN', () => { data.chal.decrementy = D(Infinity).sub(D(0).div(0)) }],
        ['negativeCharge = NaN', () => { data.darkness.negativeCharge = NaN }],
        ['obliterate.energy = NaN', () => { data.obliterate.energy = NaN }],
        ['alephs[0] = NaN', () => { data.collapse.alephs[0] = D(Infinity).sub(D(0).div(0)) }],
        ['cardinals = NaN', () => { data.collapse.cardinals = D(Infinity).sub(D(0).div(0)) }],
        ['cardinals = Infinity', () => { data.collapse.cardinals = D(Infinity) }],
    ]
    for (const [cname, corrupt] of corruptions) {
        const seq = ['corrupt: ' + cname]
        unpackSave(data, clone())
        data.boost.unlocks = [true, true, true, true, true]
        try { corrupt() } catch (e) { }
        try { save() } catch (e) { record('SAVE-THREW [' + cname + '] ' + e.message, seq, cname) }
        unpackSave(data, clone())
        let loadErr = null
        try { load() } catch (e) { loadErr = e.constructor.name + ': ' + e.message }
        if (loadErr) record('LOAD-THREW [' + cname + '] ' + loadErr, seq, cname)
        let tickErr = null
        try { for (let i = 0; i < 5; i++) mainLoop() } catch (e) { tickErr = e.constructor.name + ': ' + e.message }
        if (tickErr) record('TICK-AFTER-LOAD-THREW [' + cname + '] ' + tickErr, seq, cname)
        for (const [pn, pf] of probes()) {
            let v
            try { v = pf() } catch (e) { record('PROBE-THREW-AFTER-LOAD [' + cname + '] ' + pn + ': ' + e.message, seq, cname); continue }
            const b = bad(v)
            if (b) record('BAD-AFTER-LOAD [' + cname + '] ' + pn + ' = ' + b + ' (' + String(v).slice(0, 20) + ')', seq, cname)
        }
        const dump = []
        scanData(dump)
        for (const entry of dump) record('BAD-DATA-AFTER-LOAD [' + cname + '] ' + entry, seq, cname)
    }
}

try { vm.runInThisContext('(' + fuzzBody.toString() + ')()', { filename: 'fuzz' }) }
catch (e) { console.log('FUZZ HARNESS ERROR: ' + e.message + '\n' + e.stack) }

const findings = globalThis.__findings
console.log('')
if (!findings.length) {
    console.log('FUZZ: ' + TRIALS + ' randomized trials (seed ' + SEED + ') + 22 save corruptions -> no violations')
} else {
    console.log('FUZZ: found ' + findings.length + ' distinct violation(s) with seed ' + SEED + ':')
    findings.slice(0, 40).forEach(f => console.log('  - ' + f.key + '\n      repro: ' + f.seq.join(' -> ')))
}
console.log('')
console.log('SUMMARY: ' + findings.length + ' violation(s), ' + loadErrors.length + ' load error(s)')
process.exit(findings.length || loadErrors.length ? 1 : 0)

