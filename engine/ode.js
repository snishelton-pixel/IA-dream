const {
    rk4
} = require("./numerical");

function solveFirstOrder(
    f,
    x0,
    y0,
    h,
    steps
) {

    return rk4(
        f,
        x0,
        y0,
        h,
        steps
    );
}

module.exports = {
    solveFirstOrder
};
