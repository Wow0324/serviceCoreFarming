const TICK_ARRAY_SIZE = 60;

exports.getTickArrayStartIndexByTick = function (tickIndex, tickSpacing) { 
    var startIndex = tickIndex / (TICK_ARRAY_SIZE * tickSpacing)
    if (tickIndex < 0 && tickIndex % (TICK_ARRAY_SIZE * tickSpacing) != 0) {
      startIndex = Math.ceil(startIndex) - 1
    } else {
      startIndex = Math.floor(startIndex)
    }
    return startIndex * (tickSpacing * TICK_ARRAY_SIZE)
}