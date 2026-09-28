// Displays Ordinals when the value of ord is less than NUMBER.MAX_VALUE
function displayOrd(ord, over, base, trim = data.ord.trim, forcePsi = false, depth = 0) {
    if(data.ord.isPsi || forcePsi) return displayPsiOrd(ord, trim, data.ord.base, depth)
    if(D(ord).eq(data.ord.ordinal) && D(ord).gt(Number.MAX_VALUE)) return displayInfiniteOrd(ord, over, base, trim, depth)
    if(D(ord).eq(data.ord.ordinal)) ord = Number(ord)

    ord = Math.floor(ord)
    over = Math.floor(over)
    if(trim <= 0 || depth >= MAX_ORD_DISPLAY_DEPTH) return `...`
    if(ord < base) return ord+over
    const magnitude = Math.floor(Math.log(ord)/Math.log(base)+1e-14)
    const magnitudeAmount = base**magnitude
    const amount = Math.floor((ord/magnitudeAmount)+1e-14)
    let finalOutput = "&omega;"
    if (magnitude > 1) finalOutput += "<sup>"+displayOrd(magnitude, 0, base, data.ord.trim, false, depth + 1)+"</sup>"
    if (amount > 1) finalOutput += amount
    const firstAmount = amount*magnitudeAmount
    if(ord-firstAmount > 0.1) finalOutput += "+" + displayOrd(ord-firstAmount, over, base, trim - 1, forcePsi, depth + 1)
    return finalOutput
}

// Displays Ordinals when the value of ord is greater than NUMBER.MAX_VALUE
function displayInfiniteOrd(ord, over, base, trim = data.ord.trim, depth = 0){
    ord = Decimal.floor(ord)
    over = Decimal.floor(over)
    if(trim <= 0 || depth >= MAX_ORD_DISPLAY_DEPTH) return `...`
    if(ord.lt(base)) return ord.plus(over)
    const magnitude = Decimal.floor(Decimal.ln(ord).div(Decimal.ln(base)).plus(D(1e-14)))
    const magnitudeAmount = D(base).pow(magnitude)
    const amount = Decimal.floor(ord.div(magnitudeAmount).plus(D(1e-14)))
    let finalOutput = "&omega;"
    if (magnitude.gt(1)) finalOutput += "<sup>"+displayInfiniteOrd(magnitude, 0, base, data.ord.trim, depth + 1)+"</sup>"
    if (amount.gt(1)) finalOutput += amount
    const firstAmount = amount.times(magnitudeAmount)
    if(ord.sub(firstAmount).gt(0.1)) finalOutput += "+" + displayInfiniteOrd(ord.sub(firstAmount), over, base, trim - 1, depth + 1)
    return finalOutput
}
