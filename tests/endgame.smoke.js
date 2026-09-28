/*
    Offline smoke test for "The End" (see docs/REQUIREMENTS-RINGULARITY-ENDGAME.md): the Endgame unlock
    latch, the The End button, the full-screen congratulations screen with its Download / Start from
    Scratch / Keep Playing buttons, and the v0.5.0 version bump.

    Usage (from the repository root):   node tests/endgame.smoke.js "<path to repository root>"

    It loads the real game scripts in index.html order under DOM stubs (no browser, no build step),
    then exercises: version flags + the save migration, button show/hide (including after an
    Obliteration-like reset), the one-time alert, the screen's DOM/text/stats, closing it, wiping the
    save through Start from Scratch, downloading the save, and static wiring checks on index.html and
    the stylesheet (e.g. the full-screen layer must opt back into pointer events).
    Exits with code 0 when every check passes.
*/
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = process.argv[2]
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
const css = fs.readFileSync(path.join(ROOT, 'styles', 'modal.css'), 'utf8')
const mainCss = fs.readFileSync(path.join(ROOT, 'styles', 'main.css'), 'utf8')
const modalJs = fs.readFileSync(path.join(ROOT, 'src', 'helpers', 'modal.js'), 'utf8')
const updateJs = fs.readFileSync(path.join(ROOT, 'src', 'update', 'update.js'), 'utf8')
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
        checked: false, selectedIndex: 0, disabled: false, type: '', className: '', src: '', href: '', download: '',
        appendChild(c) { return c }, append() {}, insertBefore(c) { return c }, removeChild() {}, remove() {},
        addEventListener: noop, removeEventListener: noop, setAttribute: noop, getAttribute: () => null,
        querySelector: () => makeEl(), querySelectorAll: () => [], getElementsByTagName: () => [],
        getContext: () => ctxStub, focus: noop, click: noop, select: noop, setSelectionRange: noop,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }), contains: () => false,
        // createConfirmation() re-creates its buttons with cloneNode()/replaceChild(), so the stubs have to
        // support that (otherwise the real confirmation can never be exercised in this test).
        cloneNode() { return makeEl(this.tagName) }, replaceChild(c) { return c }, removeChild() {},
        parentNode: fakeParent, firstChild: null, lastChild: null, scrollIntoView: noop,
    }
}
const fakeParent = { replaceChild(c) { return c }, removeChild() {}, appendChild(c) { return c } }
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
globalThis.URL = { createObjectURL: () => '', revokeObjectURL: noop }
const store = new Map()
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k), clear: () => store.clear()
}
globalThis.__savedKeys = store
globalThis.__reloads = { count: 0 }
globalThis.location = { reload: () => { globalThis.__reloads.count++ } }
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
globalThis.vis = {
    DataSet: class { constructor(a) { this.a = a } get() { return [{ id: 0 }] } update() {} },
    Network: class { on() { return this } },
}
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
globalThis.__indexHtml = html
globalThis.__modalCss = css
globalThis.__mainCss = mainCss
globalThis.__modalJs = modalJs
globalThis.__updateJs = updateJs

const testBody = function () {
    const check = globalThis.__check
    const E = globalThis.__els
    const html = globalThis.__indexHtml
    const css = globalThis.__modalCss
    const mainCss = globalThis.__mainCss
    const modalJs = globalThis.__modalJs
    const alerts = []
    const confirmations = []
    const notifications = []
    const realCreateConfirmation = createConfirmation
    createAlert = (n, d, c) => { alerts.push({ n: n, d: d, c: c }) }
    createConfirmation = (title, desc, no, yes, fn) => confirmations.push({ title, desc, no, yes, fn })
    showNotification = t => notifications.push(t)

    check('createAlert is defined', typeof createAlert === 'function')
    check('showEndgameScreen is defined', typeof showEndgameScreen === 'function')
    check('makeEndgameStatsHTML is defined', typeof makeEndgameStatsHTML === 'function')
    check('endgameResetConfirm is defined', typeof endgameResetConfirm === 'function')
    check('updateEndgameButtonHTML is defined', typeof updateEndgameButtonHTML === 'function')

    // ---------------------------------------------------------------------------------------
    // v0.5.0 version flags
    // ---------------------------------------------------------------------------------------
    check('VERSION is 0.5.0', VERSION === '0.5.0', VERSION)
    check('VERSION_NAME is The Ringularity Update', VERSION_NAME === 'The Ringularity Update', VERSION_NAME)
    check('VERSION_DATE is set', typeof VERSION_DATE === 'string' && VERSION_DATE.length > 0, VERSION_DATE)
    check('the game is not flagged as beta', IS_BETA === false, IS_BETA)
    check('the save key is still the release one', SAVE_PATH() === 'ordinalPRINGLESsave', SAVE_PATH())

    // ---------------------------------------------------------------------------------------
    // Static wiring (index.html / modal.css / update.js)
    // ---------------------------------------------------------------------------------------
    check('index.html declares the full-screen End layer', /class="endgameContainer"\s+id="endgameContainer"/.test(html))
    check('index.html wires the sidebar The End button', /id="theEndButton"[^>]*onclick="showEndgameScreen\(\)"/.test(html))
    check('index.html wires the Singularity The End button', /id="singEndgameButton"[^>]*onclick="showEndgameScreen\(\)"/.test(html))
    check('index.html wires the three End screen buttons', /onclick="downloadSave\(\)"/.test(html) && /onclick="endgameResetConfirm\(\)"/.test(html) && /onclick="closeModal\('endgame'\)"/.test(html))
    check('the full-screen layer opts back into pointer events', /\.endgameContainer\s*\{[^}]*pointer-events:\s*all/.test(css), css.slice(0, 120))
    check('uHTML.load() syncs the The End button', /updateEndgameButtonHTML\(\)/.test(globalThis.__updateJs))

    /*
        Layering regression: the confirmation used to be painted behind the full-screen End layer
        (both are z-index: auto children of #modalLayer, so DOM order decided), which is why
        "Start from Scratch" appeared to do nothing until "Keep Playing" was clicked.
    */
    const zIndexOf = (sheet, selector) => {
        let block = sheet.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}'))
        let rule = block ? block[1].match(/z-index:\s*(-?\d+)/) : null
        return rule ? Number(rule[1]) : null
    }
    const modalZ = zIndexOf(css, '.modalContainer')
    const endgameZ = zIndexOf(css, '.endgameContainer')
    const notificationZ = zIndexOf(mainCss, '#notification')
    check('.modalContainer sits above .endgameContainer', modalZ !== null && endgameZ !== null && modalZ > endgameZ, [modalZ, endgameZ])
    check('.endgameContainer still sits above the game content', endgameZ !== null && endgameZ >= 1, endgameZ)
    check('#notification sits above #modalLayer', notificationZ !== null && notificationZ > 3, notificationZ)
    check('Cancel only closes the confirmation', /getElementById\('noConfirm'\)\.addEventListener\('click', \(\) => \{closeModal\('confirm'\)\}\)/.test(modalJs))
    check('OK runs the callback the confirmation was given', /getElementById\('yesConfirm'\)\.addEventListener\('click', \(\) => \{func\(\);closeModal\('confirm'\)\}\)/.test(modalJs))

    // ---------------------------------------------------------------------------------------
    // The button is hidden before the Endgame
    // ---------------------------------------------------------------------------------------
    data.sing.endgame = false
    data.sing.level = [0, 0]
    data.sing.highestLevel = [0, 0]
    updateEndgameButtonHTML()
    check('the sidebar The End button is hidden before the Endgame', E.get('theEndButton').style.display === 'none', E.get('theEndButton').style.display)
    check('the Singularity The End row is hidden before the Endgame', E.get('ringularityEndgameControls').style.display === 'none', E.get('ringularityEndgameControls').style.display)
    check('the Singularity The End button is hidden before the Endgame', E.get('singEndgameButton').style.display === 'none', E.get('singEndgameButton').style.display)
    checkRingularityEndgame()
    check('checkRingularityEndgame() does nothing before the Endgame', E.get('theEndButton').style.display === 'none' && alerts.length === 0 && data.sing.endgame === false)

    // ---------------------------------------------------------------------------------------
    // Reaching the Endgame: latch + one-time alert + buttons
    // ---------------------------------------------------------------------------------------
    data.boost.unlocks[4] = true
    data.sing.tutorial = true
    data.sing.ringularityTutorial = true
    data.incrementy.totalCharge = 5000
    data.sing.level = [500, 2000]
    data.sing.highestLevel = [500, 2000]
    checkRingularityEndgame()
    check('reaching the Endgame latches data.sing.endgame', data.sing.endgame === true, data.sing.endgame)
    check('the Endgame alert fires exactly once', alerts.length === 1, alerts.length)
    check('the Endgame alert mentions The End', /The End/.test(alerts[0].d), alerts[0].d)
    check('the sidebar The End button appears', E.get('theEndButton').style.display === 'block', E.get('theEndButton').style.display)
    check('the Singularity The End row appears', E.get('ringularityEndgameControls').style.display === 'flex', E.get('ringularityEndgameControls').style.display)
    check('the Singularity The End button appears', E.get('singEndgameButton').style.display === 'block', E.get('singEndgameButton').style.display)

    checkRingularityEndgame()
    check('the Endgame alert does not repeat', alerts.length === 1, alerts.length)
    let updateThrew = null
    try { updateAllSingularityHTML() } catch (e) { updateThrew = e.message }
    check('updateAllSingularityHTML() neither throws nor re-alerts', updateThrew === null && alerts.length === 1, [updateThrew, alerts.length])

    // ---------------------------------------------------------------------------------------
    // The latch survives resets, and old saves that only have a high Density latch too
    // ---------------------------------------------------------------------------------------
    data.sing.level = [0, 0]
    data.sing.highestLevel = [0, 0]
    checkRingularityEndgame()
    check('the The End button stays after both Densities are reset', E.get('theEndButton').style.display === 'block', E.get('theEndButton').style.display)
    check('resetting the Densities does not clear the latch', data.sing.endgame === true && alerts.length === 1, [data.sing.endgame, alerts.length])

    data.sing.endgame = false
    data.sing.level = [0, 0]
    data.sing.highestLevel = [500, 2000]
    checkRingularityEndgame()
    check('a save whose highest Ringularity Density is 2000 latches too', data.sing.endgame === true && alerts.length === 2, [data.sing.endgame, alerts.length])
    check('hasUnlockedTheEnd() mirrors the latch', hasUnlockedTheEnd() === true)

    // ---------------------------------------------------------------------------------------
    // The full-screen congratulations screen
    // ---------------------------------------------------------------------------------------
    data.sing.endgame = true
    data.obliterate.times = 7
    data.obliterate.energyUpgrades = [301, 302, 303]
    data.collapse.times = 12
    data.imaginary.shifts = 3
    data.imaginary.factors = [1, 1, 1, 0, 0, 0, 0]
    data.sing.highestLevel = [500, 1500]
    showEndgameScreen()
    check('the End screen layer is shown', E.get('endgameContainer').style.display === 'flex', E.get('endgameContainer').style.display)
    check('the End screen box is shown', E.get('endgame').style.display === 'block', E.get('endgame').style.display)

    const endText = E.get('endgameText').innerHTML
    check('the End screen text is finite', !/NaN|undefined|Infinity/.test(endText), endText)
    check('the End screen text names the Endgame goal', /H<sub>&omega;<sup>3<\/sup>2<\/sub>/.test(endText), endText)

    const endStats = E.get('endgameStats').innerHTML
    check('the End screen stats are finite', !/NaN|undefined|Infinity/.test(endStats), endStats)
    check('the stats list the main progress fields', /Obliterations/.test(endStats) && /Collapses/.test(endStats) && /Imaginary Shifts/.test(endStats) && /Achievements/.test(endStats), endStats)
    check('the stats use the live Obliteration count', /Obliterations:<\/span> 7<br>/.test(endStats), endStats)
    check('the stats use the live Imaginary Shift count', /Imaginary Shifts:<\/span> 3 \/ 7<br>/.test(endStats), endStats)
    check('the stats show an achievement fraction', /Achievements:<\/span> \d+ \/ \d+<br>/.test(endStats), endStats)

    // ---------------------------------------------------------------------------------------
    // Keep Playing closes it again
    // ---------------------------------------------------------------------------------------
    closeModal('endgame')
    check('closing the End screen hides the layer', E.get('endgameContainer').style.display === 'none', E.get('endgameContainer').style.display)
    check('closing the End screen hides the box', E.get('endgame').style.display === 'none', E.get('endgame').style.display)
    check('the The End button is still there after closing', E.get('theEndButton').style.display === 'block', E.get('theEndButton').style.display)

    // ---------------------------------------------------------------------------------------
    // Start from Scratch: confirmation, then wipe + reload
    // ---------------------------------------------------------------------------------------
    save()
    check('a save exists in localStorage before wiping', globalThis.__savedKeys.has('ordinalPRINGLESsave'), [...globalThis.__savedKeys.keys()])
    confirmations.length = 0
    endgameResetConfirm()
    check('Start from Scratch asks for confirmation', confirmations.length === 1, confirmations.length)
    check('the confirmation warns about wiping the save', /wipe/i.test(confirmations[0].desc), confirmations[0].desc)
    check('the confirmation callback is fullReset', confirmations[0].fn === fullReset)
    check('the confirmation offers Cancel and OK', confirmations[0].no === 'Cancel' && confirmations[0].yes === 'OK', [confirmations[0].no, confirmations[0].yes])
    notifications.length = 0
    confirmations[0].fn()
    check('Start from Scratch removes the save', !globalThis.__savedKeys.has('ordinalPRINGLESsave'), [...globalThis.__savedKeys.keys()])
    check('Start from Scratch reloads the game', globalThis.__reloads.count === 1, globalThis.__reloads.count)

    // ---------------------------------------------------------------------------------------
    // With the real createConfirmation(): the box has to be on screen while The End is open
    // ---------------------------------------------------------------------------------------
    createConfirmation = realCreateConfirmation
    showEndgameScreen()
    endgameResetConfirm()
    check('the confirmation opens while the End screen is still open', E.get('confirmContainer').style.display === 'block' && E.get('endgameContainer').style.display === 'flex', [E.get('confirmContainer').style.display, E.get('endgameContainer').style.display])
    check('the confirmation is titled Start from scratch?', E.get('confirmTitle').innerText === 'Start from scratch?', E.get('confirmTitle').innerText)
    check('the confirmation buttons read Cancel and OK', E.get('noConfirm').innerText === 'Cancel' && E.get('yesConfirm').innerText === 'OK', [E.get('noConfirm').innerText, E.get('yesConfirm').innerText])
    check('the confirmation repeats the warning', /wipe/i.test(E.get('confirmContent').innerText), E.get('confirmContent').innerText)
    check('Cancel leaves the End screen untouched', (closeModal('confirm'), E.get('confirmContainer').style.display === 'none' && E.get('endgameContainer').style.display === 'flex'), [E.get('confirmContainer').style.display, E.get('endgameContainer').style.display])

    // ---------------------------------------------------------------------------------------
    // Download your Save
    // ---------------------------------------------------------------------------------------
    notifications.length = 0
    let downloadThrew = null
    try { downloadSave() } catch (e) { downloadThrew = e.message }
    check('downloadSave() does not throw', downloadThrew === null, downloadThrew)
    check('downloadSave() reports success', notifications.some(t => /downloaded/i.test(t)), notifications)

    // ---------------------------------------------------------------------------------------
    // v0.4.3p3 => v0.5.0 migration
    // ---------------------------------------------------------------------------------------
    data.sing.level = [500, 2000]
    data.sing.endgame = true
    data.obliterate.energyUpgrades = [301, 302]
    data.imaginary.shifts = 2
    data.loadedVersion = "0.4.3p3"
    let fixThrew = null
    try { fixOldSaves() } catch (e) { fixThrew = e.message }
    check('fixOldSaves() does not throw on a 0.4.3p3 save', fixThrew === null, fixThrew)
    check('a 0.4.3p3 save is marked as 0.5.0', data.loadedVersion === '0.5.0', data.loadedVersion)
    check('the migration keeps the Ringularity Density', data.sing.level[1] === 2000, data.sing.level)
    check('the migration keeps the Endgame latch', data.sing.endgame === true, data.sing.endgame)
    check('the migration keeps the Energy Upgrades', data.obliterate.energyUpgrades.length === 2, data.obliterate.energyUpgrades)
    check('the migration keeps the Imaginary Shifts', data.imaginary.shifts === 2, data.imaginary.shifts)

    data.loadedVersion = "0.4.3"
    fixOldSaves()
    check('a 0.4.3 save is marked as 0.5.0 as well', data.loadedVersion === '0.5.0', data.loadedVersion)
    check('a fresh save records the new version', JSON.parse(getSaveData()).loadedVersion === '0.5.0', JSON.parse(getSaveData()).loadedVersion)
}

try { vm.runInThisContext('(' + testBody.toString() + ')()', { filename: 'endgame-tests' }) }
catch (e) { globalThis.__results.push('FAIL  <test script threw>   -> ' + e.message + '\n' + e.stack) }

console.log('')
globalThis.__results.forEach(r => console.log(r))
const failed = globalThis.__results.filter(r => r.startsWith('FAIL')).length
console.log('')
console.log('SUMMARY: ' + (globalThis.__results.length - failed) + ' passed, ' + failed + ' failed, ' + globalThis.__results.length + ' total')
process.exit(failed || loadErrors.length ? 1 : 0)




