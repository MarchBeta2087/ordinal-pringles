/*
    This code ALSO needs a refactor!
    I hate this
    -Flame, 11/24/23
*/

function updateOverflowHTML(){
    DOM(`boosterText2`).innerText =  `You have ${getExtraBoosters()} Excess Boosters, producing`
    DOM(`boosterPower`).innerText = ` ${format(getOverflowGain(0))} Booster Power/s`
    DOM(`bpTotal`).innerText = `Your ${format(data.overflow.bp)} Booster Power is`

    DOM(`chargeText2`).innerText =  `You have ${getExtraCharge()} Excess Charge, producing`
    DOM(`overCharge`).innerText = ` ${format(getOverflowGain(1))} Overcharge/s`
    DOM(`ocTotal`).innerText = `Your ${format(data.overflow.oc)} Overcharge is`

    for (let i = 0; i < 8; i++) {
        DOM(`bp${i}Effect`).innerText = (i===2 && data.overflow.thirdEffect) || i===5 ? `/${format(getOverflowEffect(i))}` : `${format(getOverflowEffect(i))}x`
    }
}

let maxNonOverflowBoosters = boostersAtGivenFB(29)
let getExtraBoosters = () => Math.max(0, data.boost.total-maxNonOverflowBoosters)
let getExtraCharge = () => Math.max(0, data.incrementy.totalCharge-12)

function getOverflowGain(i){
    /*
        Guard rails: this used to be a plain-number product. With no excess Boosters it reads
        "0 * alephEffect(6).toNumber() * purificationEffect(2)", and once the Ringularity pushes the
        Aleph effects past Number.MAX_VALUE, toNumber() is Infinity - so the gain became NaN
        ("0 * Infinity"). That turned data.overflow.bp into NaN, made every getOverflowEffect()
        NaN/Infinity (which then fed the OP and AutoBuyer speed chains, so the Ordinal could not
        recover after a Collapse) and previously even crashed format()/calcOrdPoints().
        Multiplying in Decimal space keeps "0 * anything" at 0, and the result is clamped to a
        finite number so the accumulation in mainLoop() can never overflow to Infinity either.
    */
    let gain = i === 0
        ? D(alephEffect(6)).times(Math.sqrt(getExtraBoosters())/10).times(purificationEffect(2))
        : D(Math.sqrt(getExtraCharge())/10).times(purificationEffect(2))
    if (isNaN(gain.mag) || isNaN(gain.layer) || isNaN(gain.sign)) return 0
    let amount = gain.toNumber()
    return Number.isFinite(amount) ? amount : Number.MAX_VALUE
}

function getOverflowEffect(i, depth=0){
    if(data.overflow.bp === 1 && i < 3 && data.overflow.oc === 1) return 1
    switch (i) {
        case 0:
            return Math.max(1, (Math.pow(data.overflow.bp, 1/8))*getOverflowEffect(4))
        case 1:
            return Math.max(1, (Math.sqrt(data.overflow.bp)*(opMult().toNumber()))*getOverflowEffect(4))
        case 2:
            return Math.max(1, (Math.sqrt(data.overflow.bp+1))*getOverflowEffect(4))
        case 3:
            return data.overflow.oc > 1 ? Math.max(1, Math.sqrt(data.overflow.oc)*getCUPEffect(5)*getAOMEffect(2)) : 1
        case 4:
            return data.overflow.oc > 1 ? Math.max(1, Math.log10(data.overflow.oc+1))*getSingFunctionEffect(3) : 1
        case 5:
            return data.overflow.oc > 1 && hasCUP(5) ? Math.max(1, Math.pow(data.overflow.oc, 1/16)) : 1

        case 6:
            return data.overflow.oc > 1 && data.omega.bestRemnants >= 750 ? Math.max(1, 1+(Math.log2(2+data.overflow.oc)/100)) : 1
        case 7:
            return data.overflow.oc > 1 && hasAOMilestone(2) ? Math.max(1, Math.pow(data.overflow.oc, 1/4)) : 1
        default: return NaN
    }
}