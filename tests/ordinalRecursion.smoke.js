/*
    Offline smoke test for the Ordinal recursion guards (the "Uncaught RangeError:
    Maximum call stack size exceeded" crash).

    Usage (from the repository root):   node tests/ordinalRecursion.smoke.js "<path to repository root>"

    It loads the real game scripts in index.html order under DOM stubs (no browser, no build step),
    then replays every state that used to overflow the JS call stack:
      - a layered Ordinal (BreakEternity layer > 5, i.e. the "(e^n)" notation ExpantaNum cannot
        parse) with the "Hardy Value Display for Ordinals >= 1.8e308" setting enabled, which made
        hardy() recurse forever,
      - layered Hierarchy Ordinals, which made displayInfiniteOrd() recurse once per Ordinal layer,
      - changeTrim() / preConvertHex() / HSL() / opGain() edge cases,
      - the reported in-game state: Cardinals at 1.31e528.
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

globalThis.__results = []
globalThis.__check = function (name, cond, extra) {
    globalThis.__results.push((cond ? 'PASS  ' : 'FAIL  ') + name + (cond ? '' : '   -> got: ' + JSON.stringify(extra)))
}
globalThis.__els = els
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

    // ---- shared guard constants (read defensively so the test also runs on un-patched code) ----
    const MAX_DEPTH = typeof MAX_ORD_DISPLAY_DEPTH === 'number' ? MAX_ORD_DISPLAY_DEPTH : NaN
    const MAX_TRIM = typeof MAX_ORD_TRIM === 'number' ? MAX_ORD_TRIM : NaN
    const MIN_TRIM = typeof MIN_ORD_TRIM === 'number' ? MIN_ORD_TRIM : NaN
    // Runs a probe and turns a thrown error into a FAIL instead of aborting the whole suite, so
    // the un-patched "Maximum call stack size exceeded" crashes show up individually.
    const run = function (fn) { try { return { ok: true, value: fn() } } catch (e) { return { ok: false, error: e.message } } }
    check('MAX_ORD_DISPLAY_DEPTH is a sane budget', MAX_DEPTH > 0 && Number.isFinite(MAX_DEPTH), MAX_DEPTH)
    check('the Ordinal Length is bounded', MIN_TRIM >= 0 && MAX_TRIM > MIN_TRIM, [MIN_TRIM, MAX_TRIM])

    // ---- changeTrim() clamps the Ordinal Length (it feeds every display recursion) ----
    data.ord.trim = 10
    changeTrim(1e9)
    check('changeTrim() caps a huge Ordinal Length', data.ord.trim === MAX_TRIM, data.ord.trim)
    changeTrim(-5)
    check('changeTrim() floors a negative Ordinal Length', data.ord.trim === MIN_TRIM, data.ord.trim)
    changeTrim(12)
    check('changeTrim() keeps a sane Ordinal Length', data.ord.trim === 12, data.ord.trim)
    changeTrim('abc')
    check('changeTrim() ignores NaN input', data.ord.trim === 12, data.ord.trim)

    // ---- preConvertHex()/HSL() never recurse forever ----
    let r = run(() => preConvertHex(NaN))
    check('preConvertHex(NaN) is empty', r.ok && r.value === "", r.error || r.value)
    r = run(() => preConvertHex(Infinity))
    check('preConvertHex(Infinity) is empty', r.ok && r.value === "", r.error || r.value)
    r = run(() => preConvertHex(-1))
    check('preConvertHex(-1) is empty', r.ok && r.value === "", r.error || r.value)
    r = run(() => preConvertHex(0))
    check('preConvertHex(0) is empty', r.ok && r.value === "", r.error || r.value)
    r = run(() => preConvertHex(255))
    check('preConvertHex(255) is FF', r.ok && r.value === "FF", r.error || r.value)
    r = run(() => preConvertHex(65535))
    check('preConvertHex(65535) is FFFF', r.ok && r.value === "FFFF", r.error || r.value)
    r = run(() => HSL(0))
    check('HSL(0) is still red', r.ok && r.value === "#FF0000", r.error || r.value)
    r = run(() => HSL(NaN))
    check('HSL(NaN) does not throw', r.ok, r.error)
    check('HSL(NaN) yields a hex colour', r.ok && /^#[0-9A-F]{6}$/i.test(String(r.value)), r.error || r.value)

    // ---- opGain() guards ----
    r = run(() => opGain(2, 3, 0))
    check('opGain() is unchanged for a plain Ordinal', r.ok && r.value === 2, r.error || r.value)
    r = run(() => opGain(100, 3, 0))
    check('opGain() is unchanged for a 3-digit Ordinal', r.ok && r.value === 100000000201, r.error || r.value)
    r = run(() => opGain(NaN, 3, 0))
    check('opGain(NaN) does not recurse forever', r.ok && r.value === 4e256, r.error || r.value)
    data.ord.ordinal = D(0)
    r = run(() => opGain(Infinity, 3, 0))
    check('opGain(Infinity) does not recurse forever', r.ok && !Number.isNaN(r.value), r.error || r.value)

    // ---- the reported crash: layered Ordinal + "Hardy Value Display for Ordinals >= 1.8e308" ----
    data.sToggles[13] = true    // Hardy Value Display for Ordinals >= 1.8e308
    data.sToggles[14] = true    // Use ExpantaNum in Extended Hardy Displays
    data.ord.base = 3
    data.ord.trim = 10
    data.ord.over = D(0)
    data.ord.isPsi = false
    data.ord.displayType = "Buchholz"
    const layered = new Decimal(1).layeradd10(10)
    check('the test Ordinal is beyond Number.MAX_VALUE', layered.gt(Number.MAX_VALUE), format(layered))
    check('the test Ordinal uses BreakEternity\'s "(e^n)" notation', layered.toString().includes("(e^"), layered.toString())
    r = run(() => EN(layered.toString()).isNaN())
    check('ExpantaNum cannot parse that notation (it logs one Malformed input warning)', r.ok && r.value === true, r.error || r.value)

    r = run(() => hardy(layered, 3, 0))
    check('hardy() bails out instead of recursing forever', r.ok, r.error)
    check('hardy() reports Infinity for an unparseable Ordinal', r.ok && String(r.value) === "Infinity", r.error || String(r.value))

    data.ord.ordinal = layered
    r = run(() => getHardy())
    check('getHardy() does not recurse forever', r.ok, r.error)
    check('getHardy() falls back to bigHardy()', r.ok && r.value === bigHardy(layered, 3, 0), r.error || r.value)

    r = run(() => updateOrdHTML())
    check('updateOrdHTML() survives a layered Ordinal', r.ok, r.error)
    check('the Ordinal element was written', String(E.get('ordinal').innerHTML).length > 0, E.get('ordinal').innerHTML)

    // ---- every display type, psi and non-psi ----
    for (let t = 0; t < 4; t++) {
        const type = ["Buchholz", "Veblen", "BMS", "Y-Sequence"][t]
        for (let p = 0; p < 2; p++) {
            data.ord.displayType = type
            data.ord.isPsi = p === 1
            data.ord.trim = 10
            data.ord.ordinal = new Decimal(1).layeradd10(10)
            let probe = run(() => updateOrdHTML())
            check('updateOrdHTML() survives a layered ' + (p ? 'psi ' : '') + 'Ordinal (' + type + ')', probe.ok, probe.error)
        }
    }
    data.ord.displayType = "Buchholz"
    data.ord.isPsi = false

    // ---- a plain Ordinal still renders exactly as before ----
    data.ord.ordinal = D(5)
    r = run(() => displayOrd(5, 0, 3, 10, false))
    check('a plain Ordinal still renders the same way', r.ok && r.value === "&omega;+2", r.error || r.value)

    // ---- deep Hierarchy Ordinals (d=false display path) ----
    for (let t = 0; t < 4; t++) {
        const type = ["Buchholz", "Veblen", "BMS", "Y-Sequence"][t]
        data.ord.displayType = type
        data.hierarchies.ords[0].ord = new Decimal(1).layeradd10(50000)
        data.hierarchies.ords[0].over = D(0)
        let probe = run(() => updateHierarchiesHTML())
        check('updateHierarchiesHTML() survives a layered Hierarchy Ordinal (' + type + ')', probe.ok, probe.error)
    }
    r = run(() => displayInfiniteOrd(new Decimal(1).layeradd10(50000), D(0), 3, 3))
    check('displayInfiniteOrd() stops at the shared depth budget', r.ok && typeof r.value === 'string', r.error || r.value)
    check('displayInfiniteOrd() output is truncated with "..."', r.ok && String(r.value).includes("..."), r.error || String(r.value).slice(0, 60))

    // ---- the reported in-game state: Cardinals at 1.31e528 ----
    const savePath = globalThis.__path.join(globalThis.__root, 'docs', 'example.decoded.txt')
    if (globalThis.__fs.existsSync(savePath)) {
        unpackSave(data, JSON.parse(globalThis.__fs.readFileSync(savePath, 'utf8')))
        data.collapse.cardinals = D("1.31e528")
        data.collapse.bestCardinalsGained = D("1.31e528")
        data.ms = 20
        data.lastTick = Date.now() - 20
        let loopThrew = null
        for (let i = 0; i < 25; i++) {
            try { mainLoop() } catch (e) { loopThrew = e.message + ' @ iteration ' + i; break }
        }
        check('mainLoop() survives Cardinals at 1.31e528', loopThrew === null, loopThrew)
        check('Cardinals still format normally', /^1\.\d+e\+?528$/.test(format(data.collapse.cardinals)), format(data.collapse.cardinals))
    } else {
        check('example save available for the mainLoop regression', false, savePath)
    }
}

try { vm.runInThisContext('(' + testBody.toString() + ')()', { filename: 'ordinal-recursion-tests' }) }
catch (e) { globalThis.__results.push('FAIL  <test script threw>   -> ' + e.message + '\n' + e.stack) }

console.log('')
globalThis.__results.forEach(r => console.log(r))
const failed = globalThis.__results.filter(r => r.startsWith('FAIL')).length
console.log('')
console.log('SUMMARY: ' + (globalThis.__results.length - failed) + ' passed, ' + failed + ' failed, ' + globalThis.__results.length + ' total')
process.exit(failed || loadErrors.length ? 1 : 0)

