function factorial(n) {

    if (n < 0 || !Number.isInteger(n)) {
        throw new Error("Fatorial inválido.");
    }

    let result = 1;

    for (let i = 2; i <= n; i++) {
        result *= i;
    }

    return result;
}

function taylor(coefficients, x, a = 0) {

    let result = 0;

    for (let n = 0; n < coefficients.length; n++) {

        result +=
            coefficients[n] *
            Math.pow(x - a, n) /
            factorial(n);
    }

    return result;
}

function geometricSeries(a, r, n) {

    if (r === 1) {
        return a * n;
    }

    return a * (
        1 - Math.pow(r, n)
    ) / (1 - r);
}

function infiniteGeometric(a, r) {

    if (Math.abs(r) >= 1) {
        return null;
    }

    return a / (1 - r);
}

module.exports = {
    factorial,
    taylor,
    geometricSeries,
    infiniteGeometric
};
