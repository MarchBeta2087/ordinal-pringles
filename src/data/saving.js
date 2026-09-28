//Version Flags
const VERSION = "0.5.0"
const VERSION_NAME = "The Ringularity Update"
const VERSION_DATE = "September 28th, 2026"
const IS_BETA = false
const SAVE_PATH = () => IS_BETA ? "ordinalPRINGLESBETAsave" : "ordinalPRINGLESsave"

// Saving the game
let getSaveData = () => JSON.stringify(data)
function save(saveData = getSaveData()){
    try {
        window.localStorage.setItem(SAVE_PATH(), saveData)
    }
    catch (e) {
        showNotification(`Save failed.\n${e}`);
        console.error(e);
    }
}

function saveAndReload(saveData = getSaveData()){
    save(saveData)
    location.reload()
}

// Loading
function load(first = false) {
    let savedata = JSON.parse(window.localStorage.getItem(SAVE_PATH()))
    if (savedata !== undefined) unpackSave(data, savedata)
    let extra = fixOldSaves()
    if(first) showNotification(`You're playing Ordinal PRINGLES v${VERSION}: ${VERSION_NAME}, Enjoy!`)

    return extra
}

// Converting the strings back into their proper types
function unpackSave(main=getDefaultPlayer(), data) {
    /*
        Guard rail: a NaN number field is serialized as null, and "typeof null === 'object'" used to
        make Object.keys(null) throw - which aborted the whole load and silently made the game fall
        back to a fresh save. Null/undefined entries are skipped instead (the default is kept).
    */
    if (data === null || data === undefined) return main
    if (typeof data === "object") {
        Object.keys(data).forEach(i => {
            if (data[i] === null || data[i] === undefined) return
            if (main[i] instanceof Decimal) {
                main[i] = D(data[i]!==null?data[i]:main[i])
            } else if (typeof main[i]  == "object" && main[i] !== null) {
                unpackSave(main[i], data[i])
            } else {
                main[i] = data[i]
            }
        })
        return main
    }
    else return getDefaultPlayer()
}

// Apply necessary fixes to old saves
function fixOldSaves(){
    let extra = false

    //Settings fix
    if(typeof data.sToggles === "number") data.sToggles = settingsDefaults
    if(typeof data.gword === 'boolean') data.gword = {unl: data.gword, enabled: data.gword}
    if(data.sToggles[14] === false) data.sToggles[14] = true

    //Decimal Fix
    /*
        NaN and "Decimal Infinity" (mag === Infinity, i.e. the value overflowed BreakEternity itself)
        are both broken states that used to crash format() as soon as they were rendered, so they are
        repaired on load. Do NOT test Number.isFinite here: a legit Incrementy or Ordinal can be far
        beyond Number.MAX_VALUE (e.g. 5.487e744), and toNumber() is Infinity for those as well.
    */
    if(Number.isNaN(data.incrementy.amt.toNumber()) || data.incrementy.amt.mag === Number.POSITIVE_INFINITY) data.incrementy.amt = D(0)
    if(Number.isNaN(data.ord.ordinal.toNumber()) || data.ord.ordinal.mag === Number.POSITIVE_INFINITY) data.ord.ordinal = D(0)
    if(Number.isNaN(data.markup.powers.toNumber()) || data.markup.powers.mag === Number.POSITIVE_INFINITY) data.markup.powers = D(0)
    // Booster Power/Overcharge: a NaN or Infinity here makes every getOverflowEffect() NaN/Infinity
    // (and with it the OP and AutoBuyer speed chains), so it is repaired on load too.
    if(!Number.isFinite(data.overflow.bp)) data.overflow.bp = 1
    if(!Number.isFinite(data.overflow.oc)) data.overflow.oc = 1
    // Darkness: a broken Negative Charge / Drain ledger used to stay broken (and a NaN number is
    // saved as null, which then broke unpackSave() itself).
    if(!Number.isFinite(data.darkness.negativeCharge)) data.darkness.negativeCharge = 0
    if(!Number.isFinite(data.darkness.chargeSpent)) data.darkness.chargeSpent = 0
    if(!Number.isFinite(data.darkness.totalDrains)) data.darkness.totalDrains = 0
    if(!Number.isFinite(data.darkness.sacrificedCharge)) data.darkness.sacrificedCharge = 0
    if(!Array.isArray(data.darkness.drains) || data.darkness.drains.length !== drainData.length) data.darkness.drains = Array(drainData.length).fill(0)
    for (let i = 0; i < data.darkness.drains.length; i++) {
        if(!Number.isFinite(data.darkness.drains[i])) data.darkness.drains[i] = 0
    }
    if(!Array.isArray(data.darkness.levels) || data.darkness.levels.length !== 3) data.darkness.levels = Array(3).fill(0)
    for (let i = 0; i < data.darkness.levels.length; i++) {
        if(!Number.isFinite(data.darkness.levels[i])) data.darkness.levels[i] = 0
    }
    // Alephs/Cardinals: a NaN or Infinity here feeds every Aleph effect, the AutoClicker speed and the
    // display, so those are repaired too.
    if(!Array.isArray(data.collapse.alephs) || data.collapse.alephs.length !== alephData.length) data.collapse.alephs = Array(alephData.length).fill(D(0))
    for (let i = 0; i < data.collapse.alephs.length; i++) {
        data.collapse.alephs[i] = D(data.collapse.alephs[i])
        if(Number.isNaN(data.collapse.alephs[i].toNumber()) || data.collapse.alephs[i].mag === Number.POSITIVE_INFINITY) data.collapse.alephs[i] = D(0)
    }
    data.collapse.cardinals = D(data.collapse.cardinals)
    data.collapse.bestCardinalsGained = D(data.collapse.bestCardinalsGained)
    if(Number.isNaN(data.collapse.cardinals.toNumber()) || data.collapse.cardinals.mag === Number.POSITIVE_INFINITY) data.collapse.cardinals = D(0)
    if(Number.isNaN(data.collapse.bestCardinalsGained.toNumber()) || data.collapse.bestCardinalsGained.mag === Number.POSITIVE_INFINITY) data.collapse.bestCardinalsGained = D(0)
    data.ord.over = D(data.ord.over)
    if(Number.isNaN(data.ord.over.toNumber()) || data.ord.over.mag === Number.POSITIVE_INFINITY) data.ord.over = D(0)
    data.chal.decrementy = D(data.chal.decrementy)
    if(Number.isNaN(data.chal.decrementy.toNumber()) || data.chal.decrementy.mag === Number.POSITIVE_INFINITY || data.chal.decrementy.lt(1)) data.chal.decrementy = D(1)
    // The Ordinal Length drives the display recursion depth, so it is clamped on load as well.
    if(!Number.isFinite(data.ord.trim)) data.ord.trim = 10
    data.ord.trim = Math.min(Math.max(data.ord.trim, MIN_ORD_TRIM), MAX_ORD_TRIM)
    // Singularities: densities above their cap would grant free Density (and break the Charge ledger).
    for (let i = 0; i < data.sing.level.length; i++) {
        if(!Number.isFinite(data.sing.level[i])) data.sing.level[i] = 0
        data.sing.level[i] = Math.min(Math.max(data.sing.level[i], 0), singCap(i))
        if(!Number.isFinite(data.sing.highestLevel[i]) || data.sing.highestLevel[i] < data.sing.level[i]) data.sing.highestLevel[i] = data.sing.level[i]
    }
    /*
        Generic numeric hygiene: any plain-number field or array entry that became NaN/Infinity is
        reset, so a corrupted save cannot keep feeding NaN into the effect chains.
    */
    const numericSections = {
        boost: ['amt', 'total', 'times', 'bottomRowCharges'],
        incrementy: ['charge', 'totalCharge', 'rebuyableAmt'],
        collapse: ['times'],
        darkness: ['totalDrains', 'negativeCharge', 'chargeSpent', 'sacrificedCharge'],
        chal: ['completions'],
        hierarchies: ['rebuyableAmt'],
        baseless: ['anRebuyables', 'bestOrdinalInMode', 'alephNull', 'mode', 'shifts'],
        omega: ['aoRebuyables', 'bestFBInPurification', 'bestRemnants', 'alephOmega', 'whichPurification'],
        obliterate: ['unstableFactors', 'pringleAmount', 'energy', 'passiveEnergy', 'instability', 'times'],
        markup: ['shifts'],
        imaginary: ['shifts', 'factors'],
        ord: ['trim'],
    }
    for (const section of Object.keys(numericSections)) {
        const block = data[section]
        if (!block) continue
        for (const key of numericSections[section]) {
            const v = block[key]
            if (Array.isArray(v)) {
                for (let i = 0; i < v.length; i++) if(!Number.isFinite(v[i])) v[i] = 0
            } else if (typeof v === 'number' && !Number.isFinite(v)) {
                block[key] = 0
            }
        }
    }
    data.incrementy.amt = D(data.incrementy.amt)
    data.ord.ordinal = D(data.ord.ordinal)
    data.ord.over = D(data.ord.over)
    data.markup.powers = D(data.markup.powers)
    data.dy.level = D(data.dy.level)
    data.dy.gain = D(data.dy.gain)
    for (let i = 0; i < data.hierarchies.ords.length; i++) {
        data.hierarchies.ords[i].ord = D(data.hierarchies.ords[i].ord)
        data.hierarchies.ords[i].over = D(data.hierarchies.ords[i].over)
        // A broken (NaN or Decimal-Infinity) Hierarchy Ordinal used to crash calcOrdPoints() on every
        // tick, so it gets repaired on load as well - see increaseHierarchies().
        if(Number.isNaN(data.hierarchies.ords[i].ord.toNumber()) || data.hierarchies.ords[i].ord.mag === Number.POSITIVE_INFINITY) data.hierarchies.ords[i].ord = D(0)
        if(Number.isNaN(data.hierarchies.ords[i].over.toNumber()) || data.hierarchies.ords[i].over.mag === Number.POSITIVE_INFINITY) data.hierarchies.ords[i].over = D(0)
    }
    // The HUP AutoBuyer can store a non-finite level while a resource is broken, and the hierarchy
    // buyables would keep rendering it - clamp those so a repaired save is fully usable again.
    for (let i = 0; i < data.hierarchies.rebuyableAmt.length; i++) {
        if(!Number.isFinite(data.hierarchies.rebuyableAmt[i])) data.hierarchies.rebuyableAmt[i] = 0
    }

    //AutoShift Fix
    if(data.markup.shifts > 7) data.markup.shifts = 7
    // The Imaginary Factor layer (EUP 402) is capped the same way, and its ledger has to stay 7 long.
    if(!Array.isArray(data.imaginary.factors) || data.imaginary.factors.length !== 7) data.imaginary.factors = Array(7).fill(0)
    data.imaginary.shifts = clampImaginaryShifts(data.imaginary.shifts)

    if(data.loadedVersion === "0.4.3λ" || data.loadedVersion === "0.4.3γ") data.loadedVersion = "0.4.3"

    //v0.4.3 / v0.4.3p3 => v0.5.0
    /*
        Nothing structural has to be migrated: data.sing.endgame, data.sing.ringularityTutorial and
        data.imaginary.shifts / data.imaginary.factors all have defaults in getDefaultPlayer(), and
        unpackSave() only overwrites the keys a save actually contains.
    */
    if(data.loadedVersion === "0.4.3p3" || data.loadedVersion === "0.4.3") data.loadedVersion = "0.5.0"

    if(data.loadedVersion === "0.4b7"){
        data.obliterate.instability = data.obliterate.times
        data.loadedVersion = "0.4b7p2"
    }

    if(data.loadedVersion === "0.4b5"){
        data.obliterate.pringleAmount = Array(10).fill(0)
        data.purity.isAssigned = Array(10).fill(0)
        data.purity.assignment = Array(10).fill(false)

        delete data.instability
        delete data.boost.isDestab

        data.obliterate.instability = data.obliterate.times
        data.loadedVersion = "0.4b7p2"
    }

    if(data.loadedVersion === "0.3"){
        for (let i = 0; i < data.obliterate.pringleAmount.length; i++) {
            data.obliterate.pringleAmount[i] = 0
        }
        data.loadedVersion = "0.4b5"
    }

    //v0.2.3 and v0.3b2 => v0.3
    if(data.loadedVersion === "0.2.3" || data.loadedVersion === "0.3b2"){
        for (let i = 0; i < data.hierarchies.rebuyableAmt.length; i++) {
            if(data.hierarchies.rebuyableAmt[i] > 3333) data.hierarchies.rebuyableAmt[i] = 3333
        }
        data.loadedVersion = "0.3"
    }

    //v0.2.3 => v0.3b2 (b1 was skipped)
    if(data.loadedVersion === "0.2.3"){
        if(data.omega.completions !== Array(5).fill(0)) data.omega.completions = Array(5).fill(0)
        data.loadedVersion = "0.3b2"
    }

    //v0.2.2 => v0.2.3
    if(data.loadedVersion === "0.2.2") extra = true

    //0.2.1 => v0.2.2
    if(data.loadedVersion === "0.2.1") data.loadedVersion = "0.2.2"

    //Any => v0.2.1
    if(data.loadedVersion < "0.2.1"){
        data.achs = Array(achievements.length).fill(false)
        data.loadedVersion = "0.2.1"
    }

    //v0.1.1 => v0.1.2
    if(data.loadedVersion < "0.1.2" || data.loadedVersion === "null") {
        data.hierarchies = data.hierachies;
        for (let i = 7; i >= 5; i--) data.hierarchies.hasUpgrade[i] = data.hierarchies.hasUpgrade[i-2];
        for (let i = 3; i < 5; i++) data.hierarchies.hasUpgrade[i] = false;
        for (let i = 13; i >= 10; i--) { data.boost.hasBUP[i] = data.boost.hasBUP[i-2]; data.boost.isCharged[i] = data.boost.isCharged[i-2]; }
        data.boost.hasBUP[9] = false; data.boost.isCharged[9] = false;
        for (let i = 8; i >= 5; i--) { data.boost.hasBUP[i] = data.boost.hasBUP[i-1]; data.boost.isCharged[i] = data.boost.isCharged[i-1]; }
        data.boost.hasBUP[4] = false; data.boost.isCharged[4] = false;
        if(data.collapse.hasSluggish.length === 6) data.collapse.hasSluggish.pop();
        if(data.collapse.hasSluggish[3]){
            data.collapse.hasSluggish[3] = false
            data.collapse.hasSluggish[4] = false
        }
        extra = true
    }
    //v0.1 => v0.1.1
    if(data.loadedVersion === "0.0.6") data.loadedVersion = "0.1" //Forgot to do this, thankfully I caught it in time
    if(data.loadedVersion === "0.1" && data.collapse.hasSluggish[1]) extra = true
    //v0.0.6 => v0.1+
    if(data.collapse.times === 0 && data.obliterate.times === 0 && data.ord.ordinal.gt(BHO_VALUE)) data.ord.ordinal = D(BHO_VALUE)
    //v0.0.5 => v0.0.6+
    if (data.loadedVersion === "null"){
        if (data.chal.completions[6] > 0) data.chal.completions[6] = 0
        if (data.chal.completions[7] > 0) data.chal.completions[7] = 0
        extra = true
    }
    if (data.offline !== true && data.offline !== false) data.offline = true
    // v0.0.4 => v0.0.5+
    if (data.chal.completions[0] > 0 && data.chal.totalCompletions === 0){
        for (let i = 0; i < data.chal.completions.length; i++) {
            data.chal.totalCompletions += data.chal.completions[i]
        }
    }
    //Old
    if(data.markup.shifts === 7 && data.dy.level.eq(1)){
        data.dy.level = D(4)
        data.dy.gain = D(0.002)
    }
    if(data.dy.level.gt(getDyCap())) data.dy.level = getDyCap()
    if(data.ord.isPsi && data.ord.ordinal.gt(GRAHAMS_VALUE) && data.boost.times === 0 && !data.collapse.hasSluggish[0]) data.ord.ordinal = D(GRAHAMS_VALUE)

    return extra
}

// Apply more fixes to old saves, specifically those that need the game to be fully loaded first
function fixOldSavesAfterLoad(){
    // Exploit Fix
    if(data.obliterate.passiveEnergy > getTotalEnergyInvested() || getTotalPassiveEnergyInvested() > getTotalEnergyInvested() || getTotalPassiveEnergyInvested() + data.obliterate.passiveEnergy > getTotalEnergyInvested()){
        respecPassiveUpgrades()
        data.obliterate.passiveEnergy = getTotalEnergyInvested()
    }

    //v0.2.2 => v0.2.3
    if(data.loadedVersion === "0.2.2"){
        data.loadedVersion = "0.2.3"
        if(!data.boost.unlocks[4]) return
        data.baseless.baseless ? baselessControl() : collapse(false, true)
        data.baseless.alephNull = 0
    }
    //v0.1 => v0.1.1
    if(data.loadedVersion < "0.1.1" || data.loadedVersion === "null"){
        data.incrementy.charge += data.darkness.sacrificedCharge
        data.incrementy.totalCharge += data.darkness.sacrificedCharge
        resetDarkness(true)
        data.loadedVersion = "0.1.2"
    }

    //v0.0.5 => v0.0.6
    // Not very elegant, my first attempt at doing something like this
    if (data.loadedVersion === "null") {
        data.loadedVersion = "0.0.6"

        if (data.boost.times > 30) {
            boosterRefund()
            data.boost.times = 30
            data.boost.total = 465
            data.boost.amt = 465
        }
    }
}

// Export the current save to the clipboard
function copySaveToClipboard(){
    try {
        save()
        let exportedData = btoa(JSON.stringify(data))
        const exportedDataText = document.createElement("textarea");
        exportedDataText.value = exportedData;
        document.body.appendChild(exportedDataText);
        exportedDataText.select();
        exportedDataText.setSelectionRange(0, 99999);
        document.execCommand("copy");
        document.body.removeChild(exportedDataText);
        showNotification('Your save has been copied to the clipboard!')
    }
    catch (e){
        showNotification(`Save export failed.\n${e}`)
        console.error(e);
    }
}

// Export the current save into an actual file
async function downloadSave() {
    try {
        const file = new Blob([btoa(JSON.stringify(data))], {type: "text/plain"});
        window.URL = window.URL || window.webkitURL;
        const a = document.createElement("a")
        let date = new Date()
        date = ((date.getMonth() > 8) ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' + ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' + date.getFullYear()
        a.href = window.URL.createObjectURL(file)
        a.download = `Ordinal-Pringles-save-${VERSION}-${date}.txt`
        a.click()
        showNotification('Your save has been successfully downloaded!')
    } catch (e) {
        showNotification(`Save download failed.\n${e}`)
        console.error(e);
        closeModal('prompt')
    }
}

// Import a save into the game
function importSave(x) {
    // Easter Egg
    if(x === "gwa"){
        if(!data.gword.unl) showNotification('You have unlocked the secret <img src=\'https://cdn.discordapp.com/emojis/853002327362895882.webp?size=24\'> Ordinal Display! You can now enable or disable it in Settings :)')
        data.gword.unl = true
        data.gword.enabled = true
        return closeModal('prompt')
    }

    try {
        if(x.length <= 0) {
            DOM('promptContainer').style.display = 'none'
            showNotification('No data found.')
            return
        }
        data = Object.assign(getDefaultPlayer(), JSON.parse(atob(x)))
        if(data.isBeta && !IS_BETA) return showNotification('You tried to load a Beta Save into the main version. This is not allowed, sorry :(')
        saveAndReload()
    }
    catch (e){
        closeModal('prompt')
        showNotification(`Save import failed.\n${e}`);
        console.error(e);
    }
}

// Save every ten seconds
window.setInterval(function(){
    save()
}, 10000);


// Completely delete the save from LocalStorage
function deleteSave(){
    window.localStorage.removeItem(SAVE_PATH())
    location.reload()
}

// The actual user-facing save "reset" functionality
function fullReset(){
    copySaveToClipboard()
    deleteSave()
}