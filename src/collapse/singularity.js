let singularityNames = ["Singularity", "Ringularity"]

// The Ringularity is the Endgame of the game: its Density reaches up to 2000 (H_omega^3 2).
const SINGULARITY_BASE_CAP = 500
const RINGULARITY_CAP = 2000
let ringularityMilestones = [
    {density: 100, capBonus: 50, boosts: [0]},
    {density: 300, capBonus: 100, boosts: [1]},
    {density: 600, capBonus: 200, boosts: [2]},
    {density: 1000, capBonus: 400, boosts: [0, 1, 2]},
    {density: 1500, capBonus: 800, boosts: []},
]
let hasRingularity = () => hasSingFunction(9)
let hasReachedRingularityEndgame = () => data.sing.level[1] >= RINGULARITY_CAP
let getRingularityMilestonesReached = () => ringularityMilestones.filter(m => data.sing.highestLevel[1] >= m.density).length
function ringularityCapBonus(){
    let total = 0
    for (let i = 0; i < ringularityMilestones.length; i++) {
        if(data.sing.highestLevel[1] >= ringularityMilestones[i].density) total += ringularityMilestones[i].capBonus
    }
    return total
}
function singEffectBoost(i){
    let total = 0
    for (let m = 0; m < ringularityMilestones.length; m++) {
        if(data.sing.highestLevel[1] >= ringularityMilestones[m].density && ringularityMilestones[m].boosts.includes(i)) ++total
    }
    return total
}
// The Singularity's cap is raised by the Ringularity; the Ringularity's own cap is the Endgame goal.
let singCap = (i) => i === 0 ? SINGULARITY_BASE_CAP + ringularityCapBonus() : RINGULARITY_CAP

function updateAllSingularityHTML(){
    checkRingularityEndgame()
    for (let i = 0; i < data.sing.level.length; i++) {
        updateSingularityHTML(i)
    }
}
function checkRingularityEndgame(){
    if(!hasReachedRingularityEndgame() || data.sing.endgame) return
    data.sing.endgame = true
    createAlert('ENDGAME!', 'Your Ringularity has reached a Density of H<sub>&omega;<sup>3</sup>2</sub>, and with it the Endgame! Thank you for playing Ordinal Pringles :)', 'Wow!')
}
function updateSingularityHTML(n){
    DOM(`singCostText`).innerHTML = `You have <span style="color: goldenrod">${data.incrementy.charge} Charge</span>`
    for (let i = 0; i < data.sing.hasEverHadFunction.length; i++) {
        if(hasSingFunction(i) && !hasPermanentFunction(i)) DOM(`singFunction${i}`).style.color = '#00ce0a'
        if(hasPermanentFunction(i)) DOM(`singFunction${i}`).style.color = '#00ceb6'
        if(!hasSingFunction(i)) DOM(`singFunction${i}`).style.color = 'darkgray'
        if(data.sing.hasEverHadFunction[i] && singFunctions[i].hasEffect){
            hasPermanentFunction(i) ? DOM(`singFunction${i}`).innerHTML = `<span style="color: #0bce8a">Total Singularity Density ${ordinalDisplay('H', singFunctions[i].requiredLevel, 0, 10, 3, false)}:</span> ${singFunctions[i].hasUnlock ? `${singFunctions[i].unlockDescription} ${singFunctions[i].hasEffect ? 'and' : ''}` : ''} ${singFunctions[i].hasEffect ? `${singFunctions[i].effectDescription} ${format(singFunctions[i].effect())}` : ``}`
                : DOM(`singFunction${i}`).innerHTML = `<span style="color: #80ce0b">Total Singularity Density ${ordinalDisplay('H', singFunctions[i].requiredLevel, 0, 10, ordinalDisplayTrim(3), false)}:</span> ${singFunctions[i].hasUnlock ? `${singFunctions[i].unlockDescription} ${singFunctions[i].hasEffect ? 'and' : ''}` : ''} ${singFunctions[i].hasEffect ? `${singFunctions[i].effectDescription} ${format(singFunctions[i].effect())}` : ``}`
        }
    }
    checkPermanentFunction(6)
    updateSingFunctionHTML(7)
    updateSingFunctionHTML(8)
    updateAllSingLevelHTML()
}
function updateAllSingLevelHTML(){
    for (let i = 0; i < data.sing.level.length; i++) {
        updateSingLevelHTML(i)
    }
}
function updateSingLevelHTML(n){
    DOM(`sing${n}Level`).innerHTML = `Your ${singularityNames[n]} has a density of <b>${data.sing.level[n] >= 0 ? ordinalDisplay('H', data.sing.level[n], 0, 10, ordinalDisplayTrim(3), false) : `H<sub>0</sub>`}</b> (10)`
    DOM(`sing${n}Level2`).innerHTML = `Your ${singularityNames[n]}'s highest ever density was <b>${data.sing.highestLevel[n] > 0 ? ordinalDisplay('H', data.sing.highestLevel[n], 0, 10, ordinalDisplayTrim(3), false) : `H<sub>0</sub>`}</b> (10)`

    for (let i = 0; i < 3; i++) {
        let index = (n*3)+i
        DOM(`sing${n}Effect${i}`).innerHTML = `Your ${singularityNames[n]} is ${singEffects[index].desc()} <b>${format(singEffects[index].effect(), 3)}</b>`
    }

    if(n === 1){
        DOM(`ringularityCapText`).innerHTML = `Your Ringularity has raised the Singularity's Density cap to <b>H<sub>&omega;<sup>2</sup>5</sub> + ${ringularityCapBonus()}</b> (${getRingularityMilestonesReached()}/${ringularityMilestones.length} Milestones reached)`
        DOM(`ringularityEndgameText`).innerHTML = hasReachedRingularityEndgame()
            ? `<b style="color: gold">ENDGAME REACHED! Your Ringularity is as dense as it will ever get!</b>`
            : `Endgame Progress: <b>${formatWhole(data.sing.level[1])} / ${RINGULARITY_CAP}</b>`
    }
}
function updateSingFunctionHTML(i){
    if(i >= data.sing.hasEverHadFunction.length) return
    if(data.sing.hasEverHadFunction[i]){
        DOM(`singFunction${i}`).innerHTML =
            `<span style="color: #80ce0b">Total Singularity Density ${ordinalDisplay('H', singFunctions[i].requiredLevel, 0, 10, ordinalDisplayTrim(3), false)}:</span> ${singFunctions[i].hasUnlock ? `${singFunctions[i].unlockDescription} ${singFunctions[i].hasEffect ? 'and' : ''}` : ''} ${singFunctions[i].hasEffect ? `${singFunctions[i].effectDescription} ${format(singFunctions[i].effect())}` : ``}`
        if((i+1 < data.sing.hasEverHadFunction.length) && !data.sing.hasEverHadFunction[i+1] && !i+1 >= getTotalSingDensity())
            DOM(`singFunction${i+1}`).innerHTML = `<span style="color: #80ce0b">Total Singularity Density ${ordinalDisplay('H', singFunctions[i+1].requiredLevel, 0, 10, ordinalDisplayTrim(3), false)}:</span> ?????????????????????????`
    }
}
function checkPermanentFunction(i){
    if(hasPermanentFunction(i))
        DOM(`singFunction${i}`).innerHTML = `<span style="color: #0bce8a">Total Singularity Density ${ordinalDisplay('H', singFunctions[i].requiredLevel, 0, 10, ordinalDisplayTrim(3), false)}:</span> ${singFunctions[i].hasUnlock ? `${singFunctions[i].unlockDescription} ${singFunctions[i].hasEffect ? 'and' : ''}` : ''} ${singFunctions[i].hasEffect ? `${singFunctions[i].effectDescription} ${format(singFunctions[i].effect())}` : ``}`
}
function checkPermanentFunctions(){
    for (let i = 0; i < singFunctions.length; i++) {
        if(singFunctions[i].canBePerm) checkPermanentFunction(i)
    }
}

function loadSingularityHTML(){
    updateAllSingLevelHTML()
    for (let i = 0; i < data.sing.level.length; i++) {
        DOM(`singSlider${i}`).max = Math.max(1, singCap(i))
        DOM(`singSlider${i}`).value = data.sing.level[i]
    }
}

function initSingularityFunctions(){
    for (let i = 0; i < singFunctions.length; i++) {
        if(!data.sing.hasEverHadFunction[i+1] && data.sing.hasEverHadFunction[i]) lastSingFunctionUnlockedIndex = i
        let el = document.createElement('t')
        el.className = `singFunction`
        el.id = `singFunction${i}`

        el.innerHTML = hasPermanentFunction(i) ?
            `<span style="color: #0bce9a">Total Singularity Density ${ordinalDisplay('H', singFunctions[i].requiredLevel, 0, 10, ordinalDisplayTrim(3), false)}:</span> ${singFunctions[i].hasUnlock ? `${singFunctions[i].unlockDescription} ${singFunctions[i].hasEffect ? 'and' : ''}` : ''} ${singFunctions[i].hasEffect ? `${singFunctions[i].effectDescription} ${format(singFunctions[i].effect())}` : ``}`
            : data.sing.hasEverHadFunction[i]
            ? `<span style="color: #80ce0b">Total Singularity Density ${ordinalDisplay('H', singFunctions[i].requiredLevel, 0, 10, ordinalDisplayTrim(3), false)}:</span> ${singFunctions[i].hasUnlock ? `${singFunctions[i].unlockDescription} ${singFunctions[i].hasEffect ? 'and' : ''}` : ''} ${singFunctions[i].hasEffect ? `${singFunctions[i].effectDescription} ${format(singFunctions[i].effect())}` : ``}`
            : data.sing.hasEverHadFunction[i-1] || i===0 ? `<span style="color: #80ce0b">Total Singularity Density ${ordinalDisplay('H', singFunctions[i].requiredLevel, 0, 10, ordinalDisplayTrim(3), false)}:</span> ?????????????????????????` : `?????????????????????????`
        DOM(`singFunctionContainer`).append(el)
    }
}

let lastSingFunctionUnlockedIndex = 0
let singEffects = [
    {desc: () => "raising Cardinal gain to the", effect: () => (1 + (Math.sqrt(data.sing.level[0])/100) + 0.1*singEffectBoost(0))*(alephEffect(8).toNumber())},
    {desc: () => `${hasTreeUpgrade(104) ? 'Increasing' : 'Decreasing'} the Decrementy gain exponent by`, effect: () => Math.sqrt(data.sing.level[0])/50 + 0.1*singEffectBoost(1)},
    {desc: () => "raising AutoBuyer speed to the", effect: () => (1-Math.pow(data.sing.level[0], 1/2)/100)+(getEUPEffect(1, 4, true)) + 0.1*singEffectBoost(2)},

    {desc: () => `multiplying Cardinal gain by${hasTreeUpgrade(106) ? '' : ' (Locked: requires Energy Upgrade 106)'}`, effect: () => getRingularityEffect(3)},
    {desc: () => "multiplying Incrementy gain by", effect: () => getRingularityEffect(4)},
    {desc: () => "multiplying all Aleph Effects by", effect: () => getRingularityEffect(5)},
]
/*
    The Ringularity's Effects are powered by its Density and only apply once the Ringularity is unlocked.
    The first one is additionally locked behind Energy Upgrade 106.
*/
let getRingularityEffect = (i) => {
    if(!hasRingularity()) return 1
    if(i === 3) return hasTreeUpgrade(106) ? 1 + data.sing.level[1]/20 : 1
    if(i === 4) return 1 + data.sing.level[1]/10
    if(i === 5) return 1 + data.sing.level[1]/100
    return 1
}
let maxSingLevel = (i) => Math.max(0, Math.min(singCap(i) - data.sing.level[i], data.incrementy.charge))

function changeSingLevel(i, single = false){
    if(inPurification(3)) return
    if(i === 1 && !hasRingularity()) return
    DOM(`singSlider${i}`).max = Math.max(1, singCap(i))

    let change = single ? data.sing.level[i] + 1 : parseInt(DOM(`singSlider${i}`).value)
    if(isNaN(change)) return
    change = Math.min(Math.max(change, 0), singCap(i))
    let cost = change-data.sing.level[i]
    if(single && data.incrementy.charge < 1) return showNotification('Insufficient Charge!')
    if(!single && data.incrementy.charge - cost < 0) return showNotification('Insufficient Charge!')

    if(single) --data.incrementy.charge
    if(!single && data.sing.level[i] > change) data.incrementy.charge += data.sing.level[i]-change
    if(!single && data.sing.level[i] < change) data.incrementy.charge -= cost
    data.sing.level[i] = change

    updateSingFunctionUnlocks()

    if(data.sing.level[i] > data.sing.highestLevel[i]) data.sing.highestLevel[i] = data.sing.level[i]

    updateSingLevelHTML(i)
    DOM(`singSlider${i}`).value = data.sing.level[i]
}

function updateSingFunctionUnlocks(){
    if(getTotalSingDensity() > singFunctions[lastSingFunctionUnlockedIndex].requiredLevel || lastSingFunctionUnlockedIndex === 0){
        for (let i = lastSingFunctionUnlockedIndex; i < singFunctions.length; i++) {
            if(getTotalSingDensity() >= singFunctions[i].requiredLevel){
                data.sing.hasEverHadFunction[i] = true
                updateSingFunctionHTML(i)
            }
        }
    }
}

/*
    i is the option, n is the Singularity
*/
function singControl(i, n){
    if(inPurification(3)) return
    if(n === 1 && !hasRingularity()) return
    if(i === 0){
        let cap = singCap(n)
        if(data.incrementy.charge+data.sing.level[n] >= cap){
            if(data.sing.level[n] !== cap) data.incrementy.charge -= cap-data.sing.level[n]
            data.sing.level[n] = cap
            if(data.sing.level[n] > data.sing.highestLevel[n]) data.sing.highestLevel[n] = data.sing.level[n]
            updateSingLevelHTML(n)
            updateSingFunctionUnlocks()
            return DOM(`singSlider${n}`).value = data.sing.level[n]
        }
        let gain = maxSingLevel(n)
        data.sing.level[n] = data.sing.level[n]+gain
        data.incrementy.charge -= gain
        if(data.sing.level[n] > data.sing.highestLevel[n]) data.sing.highestLevel[n] = data.sing.level[n]
        updateSingFunctionUnlocks()
    }
    if(i === 1){
        data.incrementy.charge += data.sing.level[n]
        data.sing.level[n] = 0
    }
    if(i === 2){
        if(data.sing.level[n] === singCap(n)) return
        changeSingLevel(n, true)
    }
    updateSingLevelHTML(n)
    updateStatusHTML()
    DOM(`singSlider${n}`).value = data.sing.level[n]
}

let singFunctions = [
    {requiredLevel: 1, hasUnlock: true, unlockDescription: 'Gain two free Boosters on Collapse and unlock a Booster Upgrade AutoBuyer', canBePerm: true, permReq: () => hasAOMilestone(0)},
    {requiredLevel: 10, hasUnlock: true, unlockDescription: 'The 7th Cardinal Upgrade now affects the Total ℵ Effect and Drains are now kept on Collapse.', canBePerm: true, permReq: () => hasAOMilestone(0)},
    {requiredLevel: 20, hasUnlock: true, unlockDescription: 'Hierarchy Buyable costs are now requirements and they are automatically maxed', hasEffect: true, effectDescription: 'Negative Charge multiplies ℵ<sub>5</sub> by', effect: () => Math.max(1, Math.log10(data.darkness.negativeCharge)), canBePerm: true, permReq: () => hasAOMilestone(0)},
    {requiredLevel: 35, hasUnlock: true, unlockDescription: 'Unlock an AutoBuyer for Supercharge', hasEffect: true, effectDescription: 'Total Boosters over 12246 multiply the second Overcharge Effect by', effect: () => Math.max(1, Math.log10(Math.max(1, data.boost.total-12246))/2), canBePerm: false, permReq: () => false},
    {requiredLevel: 50, hasUnlock: true, unlockDescription: 'Double the effect of IUP4', hasEffect: true, effectDescription: 'RUP2 multiplies Dynamic Cap (at an extremely reduced rate) by', effect: () => Math.min(Math.max(1, Decimal.log10(iup2Effect()).toNumber()), Number.MAX_VALUE), canBePerm: false, permReq: () => false},
    {requiredLevel: 65, hasUnlock: false, unlockDescription: null, hasEffect: true, effectDescription: 'Negative Charge multiplies the Total ℵ effect by', effect: () => Math.max(1, Math.log2(data.darkness.negativeCharge)), canBePerm: false, permReq: () => false},
    {requiredLevel: 72, hasUnlock: true, unlockDescription: 'Unlock Purification', canBePerm: true, permReq: () => data.incrementy.totalCharge > 71},
    {requiredLevel: 80, hasUnlock: true, unlockDescription: 'The second Darkness Buyable now Quadruples the Dynamic Cap', canBePerm: false, permReq: () => false},
    {requiredLevel: 100, hasUnlock: true, unlockDescription: 'Reduce the Base in the Forgotten Realm by 15 for every ℶ<sub>&omega;</sub> Milestone obtained', effect: () => 15*checkAllIndexes(aomArray(), true), canBePerm: false, permReq: () => false},
    {requiredLevel: 500, hasUnlock: true, unlockDescription: 'Unlock a Ringularity, which has its own Density and Effects and can raise the Singularity\'s Density cap, but cap the Singularity\'s Density at H<sub>&omega;<sup>2</sup>5</sub>', canBePerm: true, permReq: () => data.incrementy.totalCharge > 499},
]

let hasPermanentFunction = (i) => singFunctions[i].permReq()
let hasSingFunction = (i) => getTotalSingDensity() >= singFunctions[i].requiredLevel || hasPermanentFunction(i)
let getSingFunctionEffect = (i) => hasSingFunction(i) ? singFunctions[i].effect() : 1

function getTotalSingDensity(){
    let total = 0
    for (let i = 0; i < data.sing.level.length; i++) {
        total += data.sing.level[i]
    }
    return total
}
