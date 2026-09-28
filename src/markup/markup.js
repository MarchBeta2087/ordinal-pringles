let extraT1 = () => hasSluggishMilestone(0) ? 1 : 0
function updateMarkupHTML(){
    DOM("powersText").innerText = `You have ${formatWhole(data.markup.powers)} Ordinal Powers`

    DOM("markupButton").innerHTML =
        data.ord.isPsi && data.ord.ordinal.gte(BHO_VALUE) ? `Markup and increase your Ordinal` :
        data.ord.isPsi && data.ord.ordinal.eq(GRAHAMS_VALUE)&&data.boost.times===0&&!hasSluggishMilestone(0)?`Base 2 is required to go further...`:
        data.ord.isPsi?`Markup and gain ${ordinalDisplay('', data.ord.ordinal.plus(1), data.ord.over, data.ord.base, ((data.ord.displayType === "BMS") || (data.ord.displayType === "Y-Sequence")) ? Math.max(data.ord.trim, 4) : 4)} (I)`:
        data.ord.ordinal.gte(data.ord.base**2)?`Markup and gain ${formatWhole(totalOPGain())} Ordinal Powers (I)`:`${ordinalDisplay("H", data.ord.base**2, 0, data.ord.base, ordinalDisplayTrim(), false)}(${data.ord.base}) is required to Markup...`

    DOM(getAdaptiveButton("factorShiftButton")).innerHTML = data.ord.base===3?data.boost.times>0||hasSluggishMilestone(0)?`Perform a Factor Shift<br><span style="font-size: 0.7rem">Requires OFP</span>`
            :`Perform a Factor Shift<br><span style="font-size: 0.7rem">Requires Graham's Number (H<sub>ψ(Ω<sup>Ω</sup>ω)</sub>(3))</span>`:
        `Perform a Factor Shift (H)<br><span style="font-size: 0.7rem">Requires ${format(getFSReq())} Ordinal Powers</span>`
    DOM("autoclicker0").innerText = `Successor AutoClicker\nCosts ${format(autoCost(0))} Ordinal Powers`
    DOM("autoclicker1").innerText = `Maximize AutoClicker\nCosts ${format(autoCost(1))} Ordinal Powers`
    let succSpeed = !data.chal.active[4]
        ? D(data.autoLevels[0]).add(extraT1()).mul(t1Auto()).mul(data.dy.level).div(data.chal.decrementy)
        : D(data.autoLevels[0]).add(extraT1()).mul(t1Auto()).div(data.dy.level).div(data.chal.decrementy)
    let maxSpeed = !data.chal.active[4]
        ? D(data.autoLevels[1]).add(extraT1()).mul(t1Auto()).mul(data.dy.level).div(data.chal.decrementy)
        : D(data.autoLevels[1]).add(extraT1()).mul(t1Auto()).div(data.dy.level).div(data.chal.decrementy)
    DOM("autoText").innerText = `Your ${formatWhole(data.autoLevels[0]+extraT1())} Successor Autoclickers click the Successor button ${formatWhole(succSpeed)} times/second\nYour ${formatWhole(data.autoLevels[1]+extraT1())} Maximize Autoclickers click the Maximize button ${formatWhole(maxSpeed)} times/second`

    for (let i = 0; i < data.factors.length; i++) {
        DOM(`factor${i}`).innerText = hasFactor(i)?`Factor ${i+1} [${data.boost.hasBUP[11]?formatWhole(data.factors[i]+getBUPEffect(12)):formatWhole(data.factors[i])}] ${formatWhole(factorEffect(i))}x\nCost: ${formatWhole(factorCost(i))} Ordinal Powers`:`Factor ${i+1}\nLOCKED`
    }
    if(getEUPEffect(4, 1)) updateImaginaryShiftHTML()
    DOM("factorText").innerText = `Your Factors are multiplying AutoClicker speed by a total of ${formatWhole(totalFactorEffect())}x`

    //DOM("factorShiftButton").style.borderColor = data.ord.base===3&&data.boost.times===0&&!hasSluggishMilestone(0)?`#1e47d0`:`#785c13`
    DOM(getAdaptiveButton("factorShiftButton")).style.color = data.ord.base===3&&data.boost.times===0&&!hasSluggishMilestone(0)?`#8080FF`:`goldenrod`

    DOM("dynamicTab").innerText = data.markup.shifts===7||data.chal.active[4]||data.baseless.baseless?'Dynamic':'???'
    DOM("dynamicText").innerText = `Your Dynamic Factor is ${data.chal.active[4]?'dividing':'multiplying'} AutoClickers by ${format(data.dy.level, 3)}\nIt increases by ${format(dyGain())}/s, and caps at ${format(getDyCap())}`
    DOM("dynamicText2").innerText = `Your Dynamic Factor is ${format(data.dy.level, 3)} [+${format(dyGain())}/s]. It caps at ${format(getDyCap())}`

    DOM(getAdaptiveButton("factorBoostButton")).innerHTML = `Perform ${getBulkBoostAmt() < 2 ? `${inAnyPurification() ? `an` : `a`} ${boostName()} Boost` : getBulkBoostAmt()+` ${boostName()} Boosts`} [+${format(boosterGain())}] (B)${data.boost.times + getBulkBoostAmt() - 1 < 34 ? `<br>Requires ${displayBoostReq()}` : ''}`
    DOM(getAdaptiveButton("factorBoostButton")).style.color = data.ord.isPsi&&data.ord.ordinal.gte(boostReq())?'#85edff':'#8080FF'

    if(data.sToggles[6]) updateProgressBar()
}
function boostName(){
    if(!inAnyPurification()) return `Factor`
    return purificationData[data.omega.whichPurification].alt
}

let uncappedOPGain = () => D(data.ord.ordinal).pow(getInstabilityConstantEffect(1))
function markup(n=D(1)){
    if(data.boost.times===0 && data.ord.isPsi && data.ord.ordinal.eq(GRAHAMS_VALUE) && !hasSluggishMilestone(0)) return
    if(data.ord.ordinal.lt(data.ord.base**2) && !data.ord.isPsi) return
    if(data.ord.isPsi){
        data.ord.ordinal = data.ord.ordinal.plus(n);
        if (capOrdinalAtBO && data.ord.base===3 && data.ord.ordinal.gt(BO_VALUE)) data.ord.ordinal = D(BO_VALUE)
        return data.markup.powers = D(4e256).mul(getEUPEffect(4, 0) ? uncappedOPGain() : 1)
    }

    if(data.chal.active[7]){
        data.markup.powers = D(0)
        data.chal.decrementy = D(1)
    }
    data.ord.isPsi = false
    data.markup.powers = data.markup.powers.plus(totalOPGain())
    data.ord.ordinal = D(0)
    data.ord.over = D(0)
    data.successorClicks = 0
}
function opMult(){
    let mult = getBUPEffect(1)

    let baseReq = data.boost.isCharged[6] ? 4 : 5
    mult += data.ord.base >= baseReq ? getBUPEffect(7) : 0

    return D(mult).times(alephEffect(2))
}
const MAX_OP_GAIN_DEPTH = 1000
function opGain(ord = data.ord.ordinal, base = data.ord.base, over = data.ord.over, depth = 0) {
    if(D(ord).eq(data.ord.ordinal) && D(ord).gte(Number.MAX_VALUE)) return 4e256
    if(D(ord).eq(data.ord.ordinal)) ord = Number(ord)
    // Guard rails: NaN/degenerate inputs and a spent recursion budget return the same
    // cap the Number.MAX_VALUE check above uses, instead of recursing forever.
    if (Number.isNaN(ord) || !Number.isFinite(base) || base <= 1 || depth >= MAX_OP_GAIN_DEPTH) return 4e256
    if (ord < base) return Decimal.add(ord, over).toNumber()
    let pow = Math.floor(Math.log(ord + 0.1) / Math.log(base))
    let divisor = Math.pow(base, pow)
    let mult = Math.floor((ord + 0.1) / divisor)
    // Guard rail: a rounding error in Math.pow can make "mult" zero (or the term not shrink),
    // and the recursion below would then be handed the very same Ordinal forever.
    if (!Number.isFinite(divisor) || !Number.isFinite(mult) || mult < 1 || ord - divisor * mult >= ord) return Decimal.add(ord, over).toNumber()
    return Math.min(4e256, 10 ** Math.min(4e256, opGain(pow, base, 0, depth + 1)) * mult + Math.min(4e256, opGain(ord - divisor * mult, base, over, depth + 1)))
}
let totalOPGain = () => Decimal.min(4e256, D(opGain()).times(opMult()))
function calcOrdPoints(ord = data.ord.ordinal, base = data.ord.base, over = data.ord.over, trim=0) {
    let opBase = new Decimal(10)
    if (trim >= 10) return new Decimal(0)
    /*
        Guard rails. This recursion used to run forever on a broken (NaN) Ordinal: every comparison
        below is false for NaN, so the "slog" branch kept handing itself NaN again - and it passed
        "trim" unchanged, so the "trim >= 10" cap above never triggered either. The result was
        "RangeError: Maximum call stack size exceeded" inside calcOrdPoints itself.
    */
    let pointsOrd = D(ord), pointsOver = D(over)
    if (isNaN(pointsOrd.mag) || isNaN(pointsOrd.layer) || isNaN(pointsOrd.sign)
        || isNaN(pointsOver.mag) || isNaN(pointsOver.layer) || isNaN(pointsOver.sign)) return new Decimal(0)
    if (!(base >= 1) || !Number.isFinite(base)) return new Decimal(0)
    if (Decimal.lt(pointsOrd, base)) {
        return Decimal.add(pointsOrd, pointsOver)
    }
    let slogged = new Decimal(pointsOrd).slog(base)
    // Guard rail: never recurse on a slog that failed or made no progress.
    if (isNaN(slogged.mag) || isNaN(slogged.layer) || isNaN(slogged.sign) || slogged.eq(pointsOrd)) return new Decimal(0)
    if (slogged.lt(base)) {
        let powerOfOmega = Decimal.log(new Decimal(pointsOrd).add(0.1), base).floor()
        let highestPower = Decimal.pow(base,powerOfOmega)
        let powerMultiplier = Decimal.floor(Decimal.div(new Decimal(pointsOrd).add(0.1),highestPower))
        return Decimal.add(Decimal.mul(Decimal.pow(opBase, calcOrdPoints(powerOfOmega,base,0,trim + 1)), powerMultiplier), new Decimal(pointsOrd).lt(Decimal.tetrate(base, 3)) ? calcOrdPoints(new Decimal(pointsOrd).sub(Decimal.mul(highestPower,powerMultiplier)),base,pointsOver,trim+1) : 0)
    } else {
        return new Decimal(opBase).tetrate(calcOrdPoints(slogged,base,0,trim + 1))
    }
}
const fsReqs = [200, 1000, 1e4, 3.5e5, 1e12, 1e21, 5e100, Infinity, Infinity]
function getFSReq(){
    if (data.markup.shifts >= 7 && data.ord.base > 3) return Infinity // avoid phantom 1e256 on FS7
    if (data.ord.isPsi && data.ord.ordinal.gte(GRAHAMS_VALUE) && data.boost.times === 0 && !data.collapse.hasSluggish[0]) return D(0) // avoid being stuck on Graham's Number
    const reqScale = data.chal.active[6] ? (getTotalBUPs()/2)+1.5 : 1
    const req = fsReqs[data.markup.shifts]**reqScale

    return req > 1e256 ? 1e256 : req
}

function factorShiftConfirm(){
    if(data.baseless.baseless || data.markup.powers.lt(getFSReq()))  return

    createConfirmation('Are you sure?', 'Performing a Factor Shift will reduce your Base by 1 and unlock a new Factor, but it will reset your Ordinal, Ordinal Powers, Factors, and Automation!', 'No Way!', 'Yes, lets do this.', factorShift)
}

function factorShift(isAuto = false){
    if(data.baseless.baseless) return
    if(data.markup.shifts === 7 && !isAuto){
        if(data.ord.isPsi && data.ord.ordinal.gte(GRAHAMS_VALUE) && data.boost.times === 0) return boost(true)
        else return //createAlert("Failure", "Insufficient Ordinal", "Dang.")
    }

    const req = getFSReq()

    if(data.markup.powers.lt(req)) return //createAlert("Failure", "Insufficient Ordinal Powers", "Dang.")
    if(!data.chal.active[3] && !(data.boost.hasBUP[2] && checkAllIndexes(data.chal.active, true) && !data.darkness.darkened)) --data.ord.base
    if(data.markup.shifts < 7) ++data.markup.shifts

    if(data.markup.shifts === 7 && !data.chal.active[4]){
        data.dy.level = D(4)
        data.dy.gain = D(0.002)
    }

    if(data.chal.active[4]) data.dy.gain = D(0.002)

    fsReset()
}

function fsReset(){
    data.ord.ordinal = D(0)
    data.ord.over = D(0)
    data.markup.powers = D(0)
    for (let i = 0; i < data.autoLevels.length; i++) {
        data.autoLevels[i] = 0
    }
    for (let i = 0; i < data.factors.length; i++) {
        data.factors[i] = 0
    }
}

/*
    The Imaginary Factor layer (unlocked by Energy Upgrade 402) is a second, permanent set of
    Factor Shifts: every Imaginary Shift unlocks the next Imaginary Factor (up to 7, see
    factors.js) and raises its tier, but it resets the Imaginary Factor counts, so those have to
    be bought again with Ordinal Powers. The requirements below are balance parameters and the
    shift count itself is never reset by any other reset, which makes this a permanent layer.
*/
let imaginaryShiftData = [
    {req: 1e105},
    {req: 1e130},
    {req: 1e155},
    {req: 1e180},
    {req: 1e205},
    {req: 1e230},
    {req: 1e255},
]

let hasImaginaryShifts = () => !!getEUPEffect(4, 1)
let getImaginaryShiftReq = (shifts) => shifts >= imaginaryShiftData.length ? D(Infinity) : D(imaginaryShiftData[shifts].req)
let maxedImaginaryShifts = () => data.imaginary.shifts >= imaginaryShiftData.length
let canPerformImaginaryShift = () => hasImaginaryShifts() && !data.baseless.baseless && !maxedImaginaryShifts()
    && data.markup.powers.gte(getImaginaryShiftReq(data.imaginary.shifts))

function imaginaryShiftConfirm(){
    if(!canPerformImaginaryShift()) return
    if(!data.sToggles[3]) return imaginaryShift()
    createConfirmation('Are you sure?', 'Performing an Imaginary Shift will unlock the next Imaginary Factor in exchange for resetting your Imaginary Factors!', 'No way!', 'Yes, lets do this.', imaginaryShift)
}

function imaginaryShift(){
    if(!canPerformImaginaryShift()) return updateImaginaryShiftHTML()

    ++data.imaginary.shifts
    for (let i = 0; i < data.imaginary.factors.length; i++) {
        data.imaginary.factors[i] = 0
    }

    updateImaginaryShiftHTML()
    updateMarkupHTML()
}

function updateImaginaryShiftHTML(){
    DOM(`imaginaryShiftButton`).innerHTML = maxedImaginaryShifts()
        ? `Perform an Imaginary Shift [${data.imaginary.shifts}/${imaginaryShiftData.length}]<br><span style="font-size: 0.7rem">All Imaginary Factors are unlocked!</span>`
        : `Perform an Imaginary Shift [${data.imaginary.shifts}/${imaginaryShiftData.length}]<br><span style="font-size: 0.7rem">Requires ${format(getImaginaryShiftReq(data.imaginary.shifts))} Ordinal Powers</span>`

    for (let i = 0; i < data.imaginary.factors.length; i++) {
        DOM(`iFactor${i}`).innerText = hasFactor(i, true)
            ? `Factor ${i+1}i [${data.boost.hasBUP[11] ? formatWhole(data.imaginary.factors[i]+getBUPEffect(12)) : formatWhole(data.imaginary.factors[i])}] ${formatWhole(factorEffect(i, true))}x\nCost: ${formatWhole(factorCost(i, true))} Ordinal Powers`
            : `Factor ${i+1}i\nLOCKED`
    }
}
