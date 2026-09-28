function createAlert(name,desc,close) {
    DOM('alertTitle').innerHTML = name
    DOM('alertContent').innerHTML = desc
    DOM('closeAlert').innerHTML = close
    DOM('alert').style.display = 'block'
    DOM('alertContainer').style.display = 'block'
}

function createPrompt(name,func,useInput,desc='') {
    DOM('promptInput').value = ''
    DOM('promptTitle').innerText = name
    DOM('promptDesc').innerText = desc
    DOM('prompt').style.display = 'block'
    DOM('promptContainer').style.display = 'block'
    useInput?DOM('promptButton').addEventListener('click', ()=> func(DOM('promptInput').value)):DOM('promptButton').addEventListener('click', ()=> func())
}
function createConfirmation(name,desc,no,yes,func,arg) {
    let old_element = document.getElementById("yesConfirm");
    let new_element = old_element.cloneNode(true);
    old_element.parentNode.replaceChild(new_element, old_element);
    old_element = document.getElementById("noConfirm");
    new_element = old_element.cloneNode(true);
    old_element.parentNode.replaceChild(new_element, old_element);
    document.getElementById('confirmTitle').innerText = name
    document.getElementById('confirmContent').innerText = desc
    document.getElementById('noConfirm').innerText = no
    document.getElementById('yesConfirm').innerText = yes
    document.getElementById('confirm').style.display = 'block'
    document.getElementById('confirmContainer').style.display = 'block'
    document.getElementById('noConfirm').addEventListener('click', () => {closeModal('confirm')})
    arg !== undefined?document.getElementById('yesConfirm').addEventListener('click', () => {func(arg);closeModal('confirm')})
        :document.getElementById('yesConfirm').addEventListener('click', () => {func();closeModal('confirm')})
}
/*
    "The End" screen: a full-screen congratulations screen that is opened from the The End button, which
    appears in the sidebar (and in the Singularity subtab) once the Ringularity reaches the Endgame.
*/
function showEndgameScreen(){
    DOM('endgameText').innerHTML = `Your Ringularity has reached its maximum Density of <b style="color: gold">H<sub>&omega;<sup>3</sup>2</sub></b>.<br>Thank you for playing Ordinal Pringles! You can keep playing, download your save, or start over from the very beginning.<br><span style="font-size: 0.85rem; color: #9a9a9a">Take your time: this screen never times out, and the button stays available on your save.</span>`
    DOM('endgameStats').innerHTML = makeEndgameStatsHTML()
    DOM('endgame').style.display = 'block'
    DOM('endgameContainer').style.display = 'flex'
}

function makeEndgameStatsHTML(){
    let stats = [
        {label: 'Obliterations', value: formatWhole(data.obliterate.times)},
        {label: 'Factor Boosts', value: formatWhole(data.boost.times)},
        {label: 'Collapses', value: formatWhole(data.collapse.times)},
        {label: 'Total Charge', value: formatWhole(data.incrementy.totalCharge)},
        {label: 'Ringularity Milestones', value: `${getRingularityMilestonesReached()} / ${ringularityMilestones.length}`},
        {label: 'Imaginary Shifts', value: `${data.imaginary.shifts} / ${imaginaryShiftData.length}`},
        {label: 'Energy Upgrades', value: formatWhole(data.obliterate.energyUpgrades.length)},
        {label: 'Achievements', value: `${achievements.filter((a, i) => hasAchievement(i)).length} / ${achievements.length}`},
    ]

    let left = '', right = ''
    for (let i = 0; i < stats.length; i++) {
        let line = `<span style="color: #d5a60b">${stats[i].label}:</span> ${stats[i].value}<br>`
        if(i % 2 === 0) left += line
        else right += line
    }

    return `<div class="flexBox" style="flex-direction: row; gap: 2rem"><span>${left}</span><span>${right}</span></div>`
}

function endgameResetConfirm(){
    createConfirmation('Start from scratch?', 'This will permanently wipe your save and start over from the very beginning. Download your save first if you want to keep it!', 'Cancel', 'OK', fullReset)
}

function closeModal(i) {
    document.getElementById(`${i}Container`).style.display = 'none'
    document.getElementById(`${i}`).style.display = 'none'
}

function showNotification(text){
    const notification = DOM(`notification`)
    notification.innerHTML = text

    notification.classList.add('show')
    setTimeout(()=>{
        notification.classList.remove('show')
    }, 3000)
}