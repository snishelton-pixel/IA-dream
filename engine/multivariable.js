function partialX(f, x, y, h = 1e-6) {
    return (
        f(x + h, y) -
        f(x - h, y)
    ) / (2 * h);
}

function partialY(f, x, y, h = 1e-6) {
    return (
        f(x, y + h) -
        f(x, y - h)
    ) / (2 * h);
}

function gradient(f, x, y) {

    return {
        dx: partialX(f, x, y),
        dy: partialY(f, x, y)
    };
}

function laplacian(f, x, y, h = 1e-4) {

    const dxx =
        (
            f(x + h, y) -
            2 * f(x, y) +
            f(x - h, y)
        ) / (h * h);

    const dyy =
        (
            f(x, y + h) -
            2 * f(x, y) +
            f(x, y - h)
        ) / (h * h);

    return dxx + dyy;
}

module.exports = {
    partialX,
    partialY,
    gradient,
    laplacian
};
