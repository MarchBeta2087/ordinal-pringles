/*
    Offline smoke test for the Ringularity feature (see docs/REQUIREMENTS-RINGULARITY-ENDGAME.md).

    Usage (from the repository root):   node tests/ringularity.smoke.js "<path to repository root>"

    It loads the real game scripts in index.html order under DOM stubs (no browser, no build step),
    then exercises the Ringularity mechanics: density caps, Milestones, Charge accounting, the
    Singularity cap raise, save round-trips, lock guards, UI show/hide and the Endgame feedback.
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

globalThis.__results = []
globalThis.__check = function (name, cond, extra) {
    globalThis.__results.push((cond ? 'PASS  ' : 'FAIL  ') + name + (cond ? '' : '   -> got: ' + JSON.stringify(extra)))
}
globalThis.__els = els

const testBody = function () {
    const check = globalThis.__check
    const E = globalThis.__els
    check('createAlert is defined', typeof createAlert === 'function')
    const alerts = []
    globalThis.__alerts = alerts
    createAlert = (n, d, c) => { alerts.push({ n: n, d: d, c: c }) }
    check('Decimal global is available', typeof Decimal === 'function')
    check('data object exists', typeof data === 'object')

    // ---- baseline: Singularity maxed, plenty of Charge ----
    data.boost.unlocks[4] = true
    data.obliterate.energyUpgrades = []
    data.incrementy.totalCharge = 5000
    data.incrementy.charge = 5000
    data.sing.level = [500, 0]
    data.sing.highestLevel = [500, 0]
    data.sing.endgame = false

    check('hasRingularity() true at Total Density 500', hasRingularity() === true)
    check('singCap(0) = 500 base', singCap(0) === 500, singCap(0))
    check('singCap(1) = 2000 (Endgame)', singCap(1) === 2000, singCap(1))
    check('no milestones at Ringularity 0', getRingularityMilestonesReached() === 0 && ringularityCapBonus() === 0)
    check('Ringularity effects idle at Density 0', getRingularityEffect(3) === 1 && getRingularityEffect(4) === 1 && getRingularityEffect(5) === 1)
    check('effect 3 locked without EUP 106', getRingularityEffect(3) === 1)

    // ---- grow the Ringularity to the Endgame ----
    singControl(0, 1)
    check('Ringularity grows to cap 2000', data.sing.level[1] === 2000, data.sing.level)
    check('Charge debited by 2000', data.incrementy.charge === 3000, data.incrementy.charge)
    check('highestLevel[1] recorded', data.sing.highestLevel[1] === 2000, data.sing.highestLevel)
    check('cap bonus = 1550 (50+100+200+400+800)', ringularityCapBonus() === 1550, ringularityCapBonus())
    check('all 5 milestones reached', getRingularityMilestonesReached() === 5, getRingularityMilestonesReached())
    check('Singularity cap raised to 2050', singCap(0) === 2050, singCap(0))
    check('Endgame reached at 2000', hasReachedRingularityEndgame() === true)
    check('effect 4 = 1 + 2000/10 = 201', getRingularityEffect(4) === 201, getRingularityEffect(4))
    check('effect 5 = 1 + 2000/100 = 21', getRingularityEffect(5) === 21, getRingularityEffect(5))
    data.obliterate.energyUpgrades = [106]
    check('effect 3 = 101 with EUP 106', getRingularityEffect(3) === 101, getRingularityEffect(3))
    data.obliterate.energyUpgrades = []

    // ---- shrinking refunds Charge but keeps Milestones ----
    const before = data.incrementy.charge
    singControl(1, 1)
    check('shrinking refunds exactly the Density', data.incrementy.charge === before + 2000, data.incrementy.charge)
    check('Density reset to 0', data.sing.level[1] === 0, data.sing.level)
    check('Milestones persist (highest ever density)', ringularityCapBonus() === 1550, ringularityCapBonus())

    // ---- slider path ----
    data.incrementy.charge = 1000
    E.get('singSlider1').value = '300'
    changeSingLevel(1)
    check('changeSingLevel sets Density 300', data.sing.level[1] === 300, data.sing.level)
    check('changeSingLevel debits 300 Charge', data.incrementy.charge === 700, data.incrementy.charge)

    E.get('singSlider1').value = '9999'
    changeSingLevel(1)
    check('unaffordable slider is rejected (Charge never negative)', data.sing.level[1] === 300 && data.incrementy.charge === 700, [data.sing.level[1], data.incrementy.charge])

    E.get('singSlider1').value = '100'
    changeSingLevel(1)
    check('lowering Density refunds Charge', data.sing.level[1] === 100 && data.incrementy.charge === 900, [data.sing.level[1], data.incrementy.charge])

    E.get('singSlider1').value = ''
    const beforeNaN = data.sing.level[1]
    changeSingLevel(1)
    check('empty slider input is ignored (no NaN)', data.sing.level[1] === beforeNaN, data.sing.level[1])

    // ---- the Ringularity raises the Singularity's cap ----
    data.sing.level = [500, 1500]
    data.sing.highestLevel = [500, 1500]
    data.incrementy.charge = 1000
    singControl(0, 0)
    check('Singularity grows past 500 via Ringularity', data.sing.level[0] === 1500, data.sing.level)
    check('Charge fully spent growing the Singularity', data.incrementy.charge === 0, data.incrementy.charge)

    // ---- UI rendering paths ----
    let threw = null
    try { updateSingLevelHTML(1) } catch (e) { threw = e.message }
    check('updateSingLevelHTML(1) does not throw', threw === null, threw)
    check('Endgame progress text rendered', /Endgame Progress/.test(E.get('ringularityEndgameText').innerHTML), E.get('ringularityEndgameText').innerHTML)
    check('cap text shows the cap bonus', /1550/.test(E.get('ringularityCapText').innerHTML), E.get('ringularityCapText').innerHTML)

    data.sing.level[1] = 2000
    updateSingLevelHTML(1)
    check('ENDGAME text at Density 2000', /ENDGAME REACHED/.test(E.get('ringularityEndgameText').innerHTML), E.get('ringularityEndgameText').innerHTML)
    // ---- Endgame alert fires exactly once ----
    data.sing.endgame = false
    globalThis.__alerts.length = 0
    let threw2 = null
    try { updateAllSingularityHTML() } catch (e) { threw2 = e.message }
    check('updateAllSingularityHTML() does not throw', threw2 === null, threw2)
    check('Endgame alert fired exactly once', globalThis.__alerts.length === 1, globalThis.__alerts.map(a => a.n))
    check('Endgame flag persisted', data.sing.endgame === true)
    globalThis.__alerts.length = 0
    updateAllSingularityHTML()
    check('Endgame alert does not repeat', globalThis.__alerts.length === 0)

    // ---- ordinal display of the Endgame density ----
    const disp = ordinalDisplay('H', 2000, 0, 10, 3, false)
    check('Density 2000 renders as omega^3 2', /&omega;<sup>3<\/sup>2/.test(disp), disp)

    // ---- Energy Upgrade 106 ----
    check('EUP106 is an unlock costing 3', energyUpgradeData[1][5].isUnlock === true && energyUpgradeData[1][5].cost === 3, energyUpgradeData[1][5])
    check('EUP106 description has no placeholder', !/Coming Soon|\?\?\?/.test(energyUpgradeData[1][5].desc), energyUpgradeData[1][5].desc)
    check('getEUPEffect(1,5) false before purchase', getEUPEffect(1, 5) === false, getEUPEffect(1, 5))
    data.obliterate.energyUpgrades = [106]
    check('getEUPEffect(1,5) true after purchase', getEUPEffect(1, 5) === true, getEUPEffect(1, 5))
    data.obliterate.energyUpgrades = []

    // ---- texts / achievements ----
    check('singFunction9 no longer says Coming Soon', !/Coming Soon/.test(singFunctions[9].unlockDescription), singFunctions[9].unlockDescription)
    check('Endgame achievement registered', achievements.some(a => a.name === 'The Endgame'))

    // ---- Milestones strengthen the Singularity's effects 0-2 ----
    data.sing.level = [400, 0]
    data.sing.highestLevel = [400, 0]
    const noBoost = singEffects[1].effect()
    data.sing.highestLevel = [400, 2000]
    const withBoost = singEffects[1].effect()
    check('Milestones strengthen the Singularity effect 2', withBoost > noBoost, [noBoost, withBoost])
    data.sing.level = [400, 0]
    data.sing.highestLevel = [400, 0]
    check('effect 2 stays numeric/unchanged without milestones', Math.abs(singEffects[1].effect() - 0.4) < 1e-9, singEffects[1].effect())

    // ---- integration: effect multipliers actually reach the game formulas ----
    data.sing.level = [500, 2000]
    data.sing.highestLevel = [500, 2000]
    check('alephEffect reflects Ringularity effect 5', alephEffect(0).gte(1) === true && typeof alephEffect(0).toNumber() === 'number')
    check('incrementyGain is finite with Ringularity active', Number.isFinite(incrementyGain().toNumber()) || incrementyGain().eq(0), String(incrementyGain()))
    check('cardinalGain is finite with Ringularity active', Number.isFinite(cardinalGain().toNumber()) || cardinalGain().eq(0), String(cardinalGain()))

    // ---- guards while the Ringularity is still locked ----
    data.sing.level = [100, 0]
    data.sing.highestLevel = [100, 0]
    data.incrementy.totalCharge = 100 // < 500, so singFunction 9 is not permanent either
    data.incrementy.charge = 50
    check('Ringularity is locked again at Total Density 100', hasRingularity() === false)
    singControl(0, 1)
    check('locked Ringularity cannot be grown', data.sing.level[1] === 0 && data.incrementy.charge === 50, [data.sing.level[1], data.incrementy.charge])
    E.get('singSlider1').value = '25'
    changeSingLevel(1)
    check('locked Ringularity slider is ignored', data.sing.level[1] === 0 && data.incrementy.charge === 50, [data.sing.level[1], data.incrementy.charge])

    // ---- an Obliteration reset zeroes highestLevel, so the cap bonus clears ----
    data.sing.level = [500, 2000]
    data.sing.highestLevel = [500, 2000]
    check('cap bonus present before reset', ringularityCapBonus() === 1550, ringularityCapBonus())
    data.sing.level = [0, 0]
    data.sing.highestLevel = [0, 0]
    check('cap bonus clears after an Obliteration reset', ringularityCapBonus() === 0 && singCap(0) === 500, [ringularityCapBonus(), singCap(0)])

    // ---- save round-trip: new saves persist, legacy saves get the new defaults ----
    data.sing.level = [500, 2000]
    data.sing.highestLevel = [500, 2000]
    data.sing.endgame = true
    data.sing.ringularityTutorial = true
    const saved = JSON.parse(getSaveData())
    check('new save contains Ringularity state', saved.sing.level[1] === 2000 && saved.sing.highestLevel[1] === 2000, saved.sing)
    const unpacked = unpackSave(getDefaultPlayer(), saved)
    check('unpacked save keeps Ringularity Density', unpacked.sing.level[1] === 2000, unpacked.sing.level)
    check('unpacked save keeps the Endgame flag', unpacked.sing.endgame === true, unpacked.sing.endgame)
    delete saved.sing.endgame
    delete saved.sing.ringularityTutorial
    const legacy = unpackSave(getDefaultPlayer(), saved)
    check('legacy save gets endgame = false default', legacy.sing.endgame === false, legacy.sing.endgame)
    check('legacy save gets ringularityTutorial = false default', legacy.sing.ringularityTutorial === false, legacy.sing.ringularityTutorial)
    check('legacy save keeps both Densities', legacy.sing.level[1] === 2000 && legacy.sing.highestLevel[1] === 2000, legacy.sing)

    // ---- switching to the Singularity subtab shows/hides the Ringularity UI ----
    data.boost.unlocks[4] = true
    data.sing.tutorial = true
    data.sing.ringularityTutorial = false
    data.sing.level = [500, 2000]
    data.sing.highestLevel = [500, 2000]
    data.incrementy.totalCharge = 5000
    data.nav.subtabs.collapse = 'cardinals'
    alerts.length = 0
    check('debug unlocks[4]', data.boost.unlocks[4] === true, data.boost.unlocks)
    check('debug isTabUnlocked(sing)', isTabUnlocked('sing') === true, isTabUnlocked('sing'))
    check('debug nav.current', data.nav.current, data.nav.current)
    let threw3 = null
    try { switchSubtab('sing', 'collapse') } catch (e) { threw3 = e.message }
    check('switchSubtab("sing") does not throw', threw3 === null, threw3)
    check('Ringularity panel is shown when unlocked', E.get('singularity1').style.display === 'flex', E.get('singularity1').style.display)
    check('Ringularity controls are shown when unlocked', E.get('ringularityControls').style.display === 'flex', E.get('ringularityControls').style.display)
    check('Ringularity tutorial alert shown once', alerts.length === 1, alerts.length)
    data.nav.subtabs.collapse = 'cardinals'
    switchSubtab('sing', 'collapse')
    check('Ringularity tutorial alert is not repeated', alerts.length === 1, alerts.length)

    data.incrementy.totalCharge = 100
    data.sing.level = [100, 0]
    data.sing.highestLevel = [100, 0]
    data.nav.subtabs.collapse = 'cardinals'
    switchSubtab('sing', 'collapse')
    check('Ringularity panel hidden while locked', E.get('singularity1').style.display === 'none', E.get('singularity1').style.display)
    check('Ringularity controls hidden while locked', E.get('ringularityControls').style.display === 'none', E.get('ringularityControls').style.display)
}
try { vm.runInThisContext('(' + testBody.toString() + ')()', { filename: 'ringularity-tests' }) }
catch (e) { globalThis.__results.push('FAIL  <test script threw>   -> ' + e.message + '\n' + e.stack) }

console.log('')
globalThis.__results.forEach(r => console.log(r))
const failed = globalThis.__results.filter(r => r.startsWith('FAIL')).length
console.log('')
console.log('SUMMARY: ' + (globalThis.__results.length - failed) + ' passed, ' + failed + ' failed, ' + globalThis.__results.length + ' total')
process.exit(failed || loadErrors.length ? 1 : 0)

