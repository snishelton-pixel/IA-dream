const http = require("http");
const fs = require("fs");
const path = require("path");

const {
    derivative,
    secondDerivative,
    newton,
    bisection,
    simpson,
    trapezoidal,
    rk4
} = require("./engine/numerical");

const {
    factorial,
    taylor,
    geometricSeries,
    infiniteGeometric
} = require("./engine/series");

const { fourierCoefficients } = require("./engine/fourier");
const { gradient, laplacian } = require("./engine/multivariable");
const { solveFirstOrder } = require("./engine/ode");

const PORT = process.env.PORT || 3000;


// ===============================
// NORMALIZAÇÃO
// ===============================

function normalizar(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/²/g, "^2")
        .replace(/³/g, "^3")
        .replace(/⁴/g, "^4")
        .replace(/√/g, "sqrt")
        .replace(/π/g, "pi")
        .trim();
}


// ===============================
// EXPRESSÕES MATEMÁTICAS
// ===============================

function avaliarExpressao(expr, x = 0) {

    let e = expr
        .replace(/\s+/g, "")
        .replace(/,/g, ".")
        .replace(/π/g, "Math.PI")
        .replace(/\bpi\b/g, "Math.PI")
        .replace(/sqrt\(/g, "Math.sqrt(")
        .replace(/\^/g, "**")
        .replace(/(\d)(x)/g, "$1*x")
        .replace(/(x)(\d)/g, "x*$2");

    if (!/^[0-9x+\-*/().,%* a-zA-Z_]+$/.test(e)) {
        throw new Error("Expressão inválida");
    }

    if (
        e.includes("require") ||
        e.includes("process") ||
        e.includes("global") ||
        e.includes("constructor") ||
        e.includes("eval")
    ) {
        throw new Error("Expressão não permitida");
    }

    return Function("x", `"use strict"; return (${e});`)(x);
}


// ===============================
// CONVERSÃO DE PALAVRAS
// ===============================

function converterMatematica(texto) {

    return texto
        .replace(/vezes/g, "*")
        .replace(/multiplicado por/g, "*")
        .replace(/dividido por/g, "/")
        .replace(/mais/g, "+")
        .replace(/menos/g, "-")
        .replace(/ao quadrado/g, "^2")
        .replace(/ao cubo/g, "^3")
        .replace(/elevado a/g, "^")
        .replace(/raiz quadrada de/g, "sqrt(")
        .replace(/zero/g, "0")
        .replace(/um/g, "1")
        .replace(/dois/g, "2")
        .replace(/tres/g, "3")
        .replace(/quatro/g, "4")
        .replace(/cinco/g, "5")
        .replace(/seis/g, "6")
        .replace(/sete/g, "7")
        .replace(/oito/g, "8")
        .replace(/nove/g, "9");
}


// ===============================
// EQUAÇÃO DO 1º GRAU
// ===============================

function resolverLinear(expr) {

    const partes = expr.split("=");

    if (partes.length !== 2) {
        throw new Error("Equação inválida");
    }

    const esquerda = partes[0];
    const direita = partes[1];

    const a =
        avaliarExpressao(
            esquerda.replace(/x/g, "x"),
            1
        ) -
        avaliarExpressao(
            esquerda.replace(/x/g, "x"),
            0
        );

    const b =
        avaliarExpressao(
            esquerda.replace(/x/g, "x"),
            0
        );

    const c =
        avaliarExpressao(
            direita.replace(/x/g, "x"),
            0
        );

    if (a === 0) {
        throw new Error("Não é uma equação linear");
    }

    const x = (c - b) / a;

    return {
        tipo: "Equação do 1º grau",
        passos: [
            `${a}x + ${b} = ${c}`,
            `${a}x = ${c - b}`,
            `x = (${c - b}) / ${a}`
        ],
        resultado: `x = ${x}`
    };
}


// ===============================
// EQUAÇÃO DO 2º GRAU
// ===============================

function resolverQuadratica(expr) {

    const partes = expr.split("=");

    if (partes.length !== 2) {
        throw new Error("Equação inválida");
    }

    const esquerda = partes[0]
        .replace(/\s/g, "")
        .replace(/-/g, "+-");

    const direita = partes[1];

    const tudo = `${esquerda}-(${direita})`;

    const match = tudo.match(
        /^([+-]?\d*\.?\d*)x\^2(?:\+([+-]?\d*\.?\d*)x)?(?:\+([+-]?\d*\.?\d*))?$/
    );

    if (!match) {
        throw new Error("Formato quadrático não reconhecido");
    }

    let a = match[1];
    let b = match[2];
    let c = match[3];

    a = a === "" || a === "+" ? 1 : a === "-" ? -1 : Number(a);
    b = b === undefined || b === "" || b === "+" ? 0 : b === "-" ? -1 : Number(b);
    c = c === undefined || c === "" ? 0 : Number(c);

    const delta = b * b - 4 * a * c;

    if (delta < 0) {
        return {
            tipo: "Equação do 2º grau",
            passos: [
                `Δ = b² - 4ac`,
                `Δ = ${delta}`,
                "Como Δ < 0, não existem raízes reais."
            ],
            resultado: "Sem raízes reais"
        };
    }

    const x1 = (-b + Math.sqrt(delta)) / (2 * a);
    const x2 = (-b - Math.sqrt(delta)) / (2 * a);

    return {
        tipo: "Equação do 2º grau",
        passos: [
            `a = ${a}, b = ${b}, c = ${c}`,
            `Δ = b² - 4ac`,
            `Δ = ${delta}`,
            `x₁ = (-b + √Δ) / 2a`,
            `x₂ = (-b - √Δ) / 2a`
        ],
        resultado: `x₁ = ${x1} ; x₂ = ${x2}`
    };
        }
