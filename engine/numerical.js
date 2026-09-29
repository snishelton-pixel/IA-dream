function derivative(f, x, h = 1e-6) {
    return (f(x + h) - f(x - h)) / (2 * h);
}

function secondDerivative(f, x, h = 1e-4) {
    return (
        f(x + h) -
        2 * f(x) +
        f(x - h)
    ) / (h * h);
}

function newton(f, df, x0, tolerance = 1e-10, max = 100) {
    let x = x0;

    for (let i = 0; i < max; i++) {
        const y = f(x);
        const dy = df(x);

        if (Math.abs(dy) < 1e-14) {
            throw new Error("Derivada demasiado próxima de zero.");
        }

        const next = x - y / dy;

        if (Math.abs(next - x) < tolerance) {
            return next;
        }

        x = next;
    }

    return x;
}

function bisection(f, a, b, tolerance = 1e-10, max = 200) {

    let fa = f(a);
    let fb = f(b);

    if (fa * fb > 0) {
        throw new Error(
            "Os extremos precisam ter sinais diferentes."
        );
    }

    for (let i = 0; i < max; i++) {

        const c = (a + b) / 2;
        const fc = f(c);

        if (
            Math.abs(fc) < tolerance ||
            Math.abs(b - a) < tolerance
        ) {
            return c;
        }

        if (fa * fc < 0) {
            b = c;
            fb = fc;
        } else {
            a = c;
            fa = fc;
        }
    }

    return (a + b) / 2;
}

function simpson(f, a, b, n = 1000) {

    if (n % 2 !== 0) n++;

    const h = (b - a) / n;

    let sum = f(a) + f(b);

    for (let i = 1; i < n; i++) {

        const x = a + i * h;

        sum += i % 2 === 0
            ? 2 * f(x)
            : 4 * f(x);
    }

    return sum * h / 3;
}

function trapezoidal(f, a, b, n = 1000) {

    const h = (b - a) / n;

    let sum = (f(a) + f(b)) / 2;

    for (let i = 1; i < n; i++) {
        sum += f(a + i * h);
    }

    return sum * h;
}

function rk4(f, x0, y0, h, steps) {

    const result = [];

    let x = x0;
    let y = y0;

    result.push({ x, y });

    for (let i = 0; i < steps; i++) {

        const k1 = f(x, y);
        const k2 = f(x + h / 2, y + h * k1 / 2);
        const k3 = f(x + h / 2, y + h * k2 / 2);
        const k4 = f(x + h, y + h * k3);

        y += h * (
            k1 +
            2 * k2 +
            2 * k3 +
            k4
        ) / 6;

        x += h;

        result.push({ x, y });
    }

    return result;
}

function interpolateLinear(x1, y1, x2, y2, x) {

    return y1 +
        ((y2 - y1) / (x2 - x1)) *
        (x - x1);
}

module.exports = {
    derivative,
    secondDerivative,
    newton,
    bisection,
    simpson,
    trapezoidal,
    rk4,
    interpolateLinear
};
