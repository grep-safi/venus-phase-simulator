/*
 * Force a value into a number.
 */
const forceNumber = function(n) {
    n = Number(n);
    if (isNaN(n) || typeof n === 'undefined') {
        n = 0;
    }
    return n;
};

const radToDeg = function(radians) {
    return radians * 180 / Math.PI;
};

export {
    forceNumber, radToDeg
};
