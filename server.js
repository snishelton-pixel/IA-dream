const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

// ======================================================
// UTILIDADES
// ======================================================

function normalizar(texto) {
    return texto
        .trim()
        .replace(/\s+/g, "")
        .replace(/²/g, "^2")
        .replace(/³/g, "^3")
        .replace(/⁴/g, "^4")
        .replace(/√/g, "sqrt")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/,/g, ".");
}

function bonito(n) {
    if (!Number.isFinite(n)) return "indefinido";

    if (Math.abs(n) < 1e-10) n = 0;

    if (Math.abs(n - Math.round(n)) < 1e-8) {
        return String(Math.round(n));
    }

    return Number(n.toFixed(8)).toString();
}

function quaseZero(n) {
    return Math.abs(n) < 1e-8;
}

function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);

    while (b > 1e-12) {
        const t = b;
        b = a % b;
        a = t;
    }

    return a;
}

// ======================================================
// PARSER DE EXPRESSÕES MATEMÁTICAS
// + - * / ^ sqrt()
// ======================================================

function calcularExpressao(texto) {

    let s = normalizar(texto);
    let pos = 0;

    function peek() {
        return s[pos];
    }

    function consumir(c) {
        if (s.startsWith(c, pos)) {
            pos += c.length;
            return true;
        }
        return false;
    }

    function numero() {

        const inicio = pos;

        while (
            pos < s.length &&
            /[0-9.]/.test(s[pos])
        ) {
            pos++;
        }

        if (inicio === pos) {
            throw new Error("Número esperado.");
        }

        const n = Number(s.substring(inicio, pos));

        if (!Number.isFinite(n)) {
            throw new Error("Número inválido.");
        }

        return n;
    }

    function fator() {

        if (consumir("+")) {
            return fator();
        }

        if (consumir("-")) {
            return -fator();
        }

        if (s.startsWith("sqrt", pos)) {

            pos += 4;

            if (!consumir("(")) {
                throw new Error("Use sqrt( número ).");
            }

            const valor = soma();

            if (!consumir(")")) {
                throw new Error("Parêntese não fechado.");
            }

            if (valor < 0) {
                throw new Error("Não existe raiz quadrada real de número negativo.");
            }

            return Math.sqrt(valor);
        }

        if (consumir("(")) {

            const valor = soma();

            if (!consumir(")")) {
                throw new Error("Parêntese não fechado.");
            }

            return valor;
        }

        return numero();
    }

    function potencia() {

        let esquerda = fator();

        if (consumir("^")) {
            const direita = potencia();
            esquerda = Math.pow(esquerda, direita);
        }

        return esquerda;
    }

    function multiplicacao() {

        let valor = potencia();

        while (true) {

            if (consumir("*")) {
                valor *= potencia();
            }

            else if (consumir("/")) {

                const divisor = potencia();

                if (quaseZero(divisor)) {
                    throw new Error("Divisão por zero.");
                }

                valor /= divisor;
            }

            else {
                break;
            }
        }

        return valor;
    }

    function soma() {

        let valor = multiplicacao();

        while (true) {

            if (consumir("+")) {
                valor += multiplicacao();
            }

            else if (consumir("-")) {
                valor -= multiplicacao();
            }

            else {
                break;
            }
        }

        return valor;
    }

    const resultado = soma();

    if (pos !== s.length) {
        throw new Error(
            `Símbolo inválido: ${s.substring(pos)}`
        );
    }

    return resultado;
}

// ======================================================
// POLINÓMIOS
// ======================================================

function polinomio(expressao) {

    let s = normalizar(expressao)
        .replace(/\*/g, "");

    // transforma "-" em "+-"
    if (s.startsWith("-")) {
        s = "0" + s;
    }

    s = s.replace(/-/g, "+-");

    const termos = s.split("+").filter(Boolean);

    const coef = [0, 0, 0, 0, 0];

    for (let termo of termos) {

        let grau = 0;
        let valor = termo;

        const posX = termo.indexOf("x");

        if (posX >= 0) {

            let antes = termo.substring(0, posX);

            if (antes === "" || antes === "+") {
                antes = "1";
            }

            if (antes === "-") {
                antes = "-1";
            }

            const numero = Number(antes);

            if (!Number.isFinite(numero)) {
                return null;
            }

            valor = numero;

            const depois = termo.substring(posX + 1);

            if (depois.startsWith("^")) {
                grau = Number(depois.substring(1));
            } else {
                grau = 1;
            }

        } else {

            valor = Number(termo);

            if (!Number.isFinite(valor)) {
                return null;
            }
        }

        if (grau < 0 || grau > 4 || !Number.isInteger(grau)) {
            return null;
        }

        coef[grau] += Number(valor);
    }

    return coef;
}

function grauPolinomio(coef) {

    for (let i = 4; i >= 0; i--) {
        if (!quaseZero(coef[i])) {
            return i;
        }
    }

    return -1;
}

// ======================================================
// RAÍZES NUMÉRICAS PARA GRAUS 3 E 4
// MÉTODO DE DURAND-KERNER
// ======================================================

function multiplicarComplexo(a, b) {

    return {
        re: a.re * b.re - a.im * b.im,
        im: a.re * b.im + a.im * b.re
    };
}

function dividirComplexo(a, b) {

    const d = b.re * b.re + b.im * b.im;

    return {
        re: (a.re * b.re + a.im * b.im) / d,
        im: (a.im * b.re - a.re * b.im) / d
    };
}

function subComplexo(a, b) {

    return {
        re: a.re - b.re,
        im: a.im - b.im
    };
}

function valorPolinomioComplexo(coef, z) {

    let resultado = {
        re: 0,
        im: 0
    };

    for (let i = coef.length - 1; i >= 0; i--) {

        resultado = multiplicarComplexo(resultado, z);

        resultado.re += coef[i];
    }

    return resultado;
}

function raizesNumericas(coef) {

    const grau = grauPolinomio(coef);

    if (grau < 1) return [];

    const a = coef[grau];

    const raio =
        1 +
        Math.max(
            ...coef.slice(0, grau).map(v =>
                Math.abs(v / a)
            )
        );

    let raizes = [];

    for (let k = 0; k < grau; k++) {

        const angulo =
            (2 * Math.PI * k) / grau;

        raizes.push({
            re: raio * Math.cos(angulo),
            im: raio * Math.sin(angulo)
        });
    }

    for (let iter = 0; iter < 300; iter++) {

        let terminou = true;

        for (let i = 0; i < grau; i++) {

            let produto = {
                re: 1,
                im: 0
            };

            for (let j = 0; j < grau; j++) {

                if (i === j) continue;

                produto = multiplicarComplexo(
                    produto,
                    subComplexo(
                        raizes[i],
                        raizes[j]
                    )
                );
            }

            const p =
                valorPolinomioComplexo(
                    coef,
                    raizes[i]
                );

            const delta =
                dividirComplexo(p, produto);

            raizes[i] =
                subComplexo(
                    raizes[i],
                    delta
                );

            if (
                Math.abs(delta.re) > 1e-10 ||
                Math.abs(delta.im) > 1e-10
            ) {
                terminou = false;
            }
        }

        if (terminou) break;
    }

    return raizes;
}

// ======================================================
// EQUAÇÕES
// ======================================================

function resolverEquacao(texto) {

    const partes = texto.split("=");

    if (partes.length !== 2) return null;

    const esquerda = partes[0];
    const direita = partes[1];

    const p1 = polinomio(esquerda);
    const p2 = polinomio(direita);

    if (!p1 || !p2) return null;

    // esquerda - direita
    const coef = [];

    for (let i = 0; i <= 4; i++) {
        coef[i] = p1[i] - p2[i];
    }

    const grau = grauPolinomio(coef);

    if (grau < 1) {

        if (grau === 0 && quaseZero(coef[0])) {

            return {
                tipo: "Identidade matemática",
                resultado: "Todos os números reais são soluções.",
                passos: [
                    `Equação: ${texto}`,
                    "Simplificamos os dois membros.",
                    "Os dois lados são equivalentes.",
                    "Portanto, qualquer número real satisfaz a equação."
                ]
            };
        }

        return {
            tipo: "Equação impossível",
            resultado: "Não existe solução.",
            passos: [
                `Equação: ${texto}`,
                "Simplificamos os dois membros.",
                "Obtivemos uma igualdade impossível.",
                "Portanto, não existe solução."
            ]
        };
    }

    // ---------------------------
    // 1.º GRAU
    // ---------------------------

    if (grau === 1) {

        const b = coef[1];
        const c = coef[0];

        const x = -c / b;

        return {
            tipo: "Equação do 1.º grau",
            resultado: `x = ${bonito(x)}`,
            passos: [
                `Equação inicial: ${texto}`,
                `Forma reduzida: ${bonito(b)}x ${c >= 0 ? "+" : "-"} ${Math.abs(c)} = 0`,
               
