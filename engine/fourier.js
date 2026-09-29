const {
    trapezoidal
} = require("./numerical");

function coefficientA(f, n, L) {

    const factor = 1 / L;

    return factor * trapezoidal(
        x =>
            f(x) *
            Math.cos(n * Math.PI * x / L),
        -L,
        L
    );
}

function coefficientB(f, n, L) {

    const factor = 1 / L;

    return factor * trapezoidal(
        x =>
            f(x) *
            Math.sin(n * Math.PI * x / L),
        -L,
        L
    );
}

function fourierCoefficients(f, L, N = 10) {

    const a = [];
    const b = [];

    a.push(
        coefficientA(f, 0, L)
    );

    for (let n = 1; n <= N; n++) {

        a.push(
            coefficientA(f, n, L)
        );

        b.push(
            coefficientB(f, n, L)
        );
    }

    return { a, b };
}

module.exports = {
    coefficientA,
    coefficientB,
    fourierCoefficients
};
