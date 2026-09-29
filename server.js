const express = require("express");
const { create, all } = require("mathjs");

const app = express();
const math = create(all);

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;


// ======================================================
// CONFIGURAÇÕES
// ======================================================

const EPS = 1e-8;
const MAX_DEGREE = 4;


// ======================================================
// NORMALIZAÇÃO DA ENTRADA
// ======================================================

function normalizar(texto) {

    let s = String(texto)
        .trim()
        .toLowerCase();

    // Símbolos matemáticos
    s = s
        .replace(/−/g, "-")
        .replace(/–/g, "-")
        .replace(/—/g, "-")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/π/g, "pi")
        .replace(/∞/g, "Infinity");

    // Potências Unicode
    s = s
        .replace(/⁰/g, "^0")
        .replace(/¹/g, "^1")
        .replace(/²/g, "^2")
        .replace(/³/g, "^3")
        .replace(/⁴/g, "^4")
        .replace(/⁵/g, "^5")
        .replace(/⁶/g, "^6")
        .replace(/⁷/g, "^7")
        .replace(/⁸/g, "^8")
        .replace(/⁹/g, "^9");

    // Raiz
    s = s.replace(/√/g, "sqrt");

    // Funções em português
    s = s
        .replace(/\bsen\b/g, "sin")
        .replace(/\bseno\b/g, "sin")
        .replace(/\bcoseno\b/g, "cos")
        .replace(/\btg\b/g, "tan")
        .replace(/\btangente\b/g, "tan");

    // Logaritmos
    s = s.replace(/\blogaritmo natural\b/g, "ln");
    s = s.replace(/\blogaritmo\b/g, "log");

    // Remove palavras comuns
    s = s
        .replace(/\bem relação a x\b/g, "")
        .replace(/\bem relacao a x\b/g, "")
        .replace(/\s+/g, "");

    return s;
}


// ======================================================
// CONVERTER TEXTO MATEMÁTICO
// ======================================================

function prepararExpressao(texto) {

    let s = normalizar(texto);

    /*
       Converte casos como:

       2x      -> 2*x
       3(x+1)  -> 3*(x+1)
       x(x+1)  -> x*(x+1)
       2sin(x) -> 2*sin(x)
    */

    s = s.replace(
        /(\d|\)|x|y|z)(?=(x|y|z|))/g,
        "$1*"
    );

    s = s.replace(
        /()(?![+\-*/^=,)])/g,
        "$1"
    );

    // Corrige x² caso tenha virado x^2
    s = s.replace(/([a-zA-Z0-9_)])\^/g, "$1^");

    return s;
}


// ======================================================
// DIVIDIR EQUAÇÃO
// ======================================================

function dividirEquacao(texto) {

    const s = prepararExpressao(texto);

    const partes = s.split("=");

    if (partes.length !== 2) {
        return null;
    }

    return {
        esquerda: partes[0],
        direita: partes[1],
        expressao: `(${partes[0]})-(${partes[1]})`
    };
}


// ======================================================
// AVALIAÇÃO SEGURA
// ======================================================

function avaliar(expr, valores = {}) {

    try {

        const resultado = math.evaluate(
            expr,
            valores
        );

        if (
            typeof resultado === "number" &&
            Number.isFinite(resultado)
        ) {
            return resultado;
        }

        return resultado;

    } catch {

        return null;
    }
}


// ======================================================
// FORMATAR NÚMERO
// ======================================================

function numero(valor) {

    if (typeof valor !== "number") {
        return String(valor);
    }

    if (Math.abs(valor) < EPS) {
        return "0";
    }

    if (
        Math.abs(valor - Math.round(valor)) < EPS
    ) {
        return String(Math.round(valor));
    }

    return Number(
        valor.toFixed(10)
    ).toString();
}


// ======================================================
// FORMATAR COMPLEXO
// ======================================================

function complexo(z) {

    const re = Math.abs(z.re) < EPS
        ? 0
        : Number(z.re.toFixed(8));

    const im = Math.abs(z.im) < EPS
        ? 0
        : Number(z.im.toFixed(8));

    if (im === 0) {
        return String(re);
    }

    if (re === 0) {
        return `${im}i`;
    }

    return `${re} ${im >= 0 ? "+" : "-"} ${Math.abs(im)}i`;
}


// ======================================================
// FATORIAL
// ======================================================

function fatorial(n) {

    let resultado = 1;

    for (let i = 2; i <= n; i++) {
        resultado *= i;
    }

    return resultado;
}


// ======================================================
// DETECTAR GRAU DO POLINÔMIO
// ======================================================

function obterCoeficientesPolinomio(expr) {

    const node = math.parse(expr);

    const coeficientes = [];

    /*
       Para um polinômio:

       P(x)

       temos:

       P(0) = c0
       P'(0) = c1
       P''(0)/2! = c2
       ...
    */

    let atual = node;

    for (let grau = 0; grau <= MAX_DEGREE; grau++) {

        let valor;

        try {

            valor =
                math.evaluate(
                    atual.toString(),
                    { x: 0 }
                );

        } catch {

            return null;
        }

        if (
            typeof valor !== "number" ||
            !Number.isFinite(valor)
        ) {
            return null;
        }

        coeficientes.push(
            valor / fatorial(grau)
        );

        try {

            atual =
                math.derivative(
                    atual.toString(),
                    "x"
                );

        } catch {

            break;
        }
    }

    // Verificar se realmente é polinômio.
    // Testamos vários pontos.
    for (let x = -3; x <= 3; x++) {

        const original =
            avaliar(expr, { x });

        let reconstruido = 0;

        for (
            let i = coeficientes.length - 1;
            i >= 0;
            i--
        ) {
            reconstruido =
                reconstruido * x +
                coeficientes[i];
        }

        if (
            original === null ||
            Math.abs(
                original - reconstruido
            ) > 1e-5
        ) {
            return null;
        }
    }

    while (
        coeficientes.length > 1 &&
        Math.abs(
            coeficientes[
                coeficientes.length - 1
            ]
        ) < EPS
    ) {
        coeficientes.pop();
    }

    return coeficientes;
}


// ======================================================
// AVALIAR POLINÔMIO
// ======================================================

function avaliarPolinomio(coef, x) {

    let resultado = 0;

    for (
        let i = coef.length - 1;
        i >= 0;
        i--
    ) {

        resultado =
            resultado * x +
            coef[i];
    }

    return resultado;
}


// ======================================================
// DERIVADA DO POLINÔMIO
// ======================================================

function derivadaCoef(coef) {

    const resultado = [];

    for (
        let i = 1;
        i < coef.length;
        i++
    ) {
        resultado.push(
            coef[i] * i
        );
    }

    return resultado;
}


// ======================================================
// DIVISÃO COMPLEXA
// ======================================================

function dividirComplexos(a, b) {

    const denominador =
        b.re * b.re +
        b.im * b.im;

    return {
        re:
            (a.re * b.re +
                a.im * b.im) /
            denominador,

        im:
            (a.im * b.re -
                a.re * b.im) /
            denominador
    };
}


// ======================================================
// MULTIPLICAÇÃO COMPLEXA
// ======================================================

function multiplicarComplexos(a, b) {

    return {
        re:
            a.re * b.re -
            a.im * b.im,

        im:
            a.re * b.im +
            a.im * b.re
    };
}


// ======================================================
// SUBTRAÇÃO COMPLEXA
// ======================================================

function subComplexos(a, b) {

    return {
        re: a.re - b.re,
        im: a.im - b.im
    };
}


// ======================================================
// DURAND-KERNER
// ======================================================

function raizesPolinomio(coef) {

    const grau = coef.length - 1;

    if (grau < 1) {
        return [];
    }

    if (grau > 4) {
        throw new Error(
            "O solucionador algébrico suporta até ao 4.º grau."
        );
    }

    const principal = coef[grau];

    const c = coef.map(
        v => v / principal
    );

    // Estimativa inicial
    let raio =
        1 +
        Math.max(
            ...c
                .slice(0, grau)
                .map(v => Math.abs(v))
        );

    if (!Number.isFinite(raio)) {
        raio = 2;
    }

    let roots = [];

    for (let i = 0; i < grau; i++) {

        const angulo =
            2 * Math.PI * i / grau;

        roots.push({
            re:
                raio * Math.cos(angulo),

            im:
                raio * Math.sin(angulo)
        });
    }

    for (let iter = 0; iter < 1000; iter++) {

        let convergiu = true;

        const novos = [];

        for (let i = 0; i < grau; i++) {

            const z = roots[i];

            // P(z)
            let p = {
                re: c[grau],
                im: 0
            };

            for (
                let k = grau - 1;
                k >= 0;
                k--
            ) {

                p =
                    multiplicarComplexos(
                        p,
                        z
                    );

                p.re += c[k];
            }

            // Produto (z-zj)
            let produto = {
                re: 1,
                im: 0
            };

            for (let j = 0; j < grau; j++) {

                if (i === j) continue;

                produto =
                    multiplicarComplexos(
                        produto,
                        subComplexos(
                            z,
                            roots[j]
                        )
                    );
            }

            const correcao =
                dividirComplexos(
                    p,
                    produto
                );

            const novo = {
                re:
                    z.re - correcao.re,

                im:
                    z.im - correcao.im
            };

            if (
                Math.hypot(
                    novo.re - z.re,
                    novo.im - z.im
                ) > 1e-10
            ) {
                convergiu = false;
            }

            novos.push(novo);
        }

        roots = novos;

        if (convergiu) {
            break;
        }
    }

    return roots;
}


// ======================================================
// RESOLVER POLINÔMIO
// ======================================================

function resolverPolinomio(coef) {

    const grau =
        coef.length - 1;

    const roots =
        raizesPolinomio(coef);

    let resposta =
        `EQUAÇÃO DO ${grau}º GRAU\n\n`;

    resposta +=
        "Coeficientes:\n";

    for (
        let i = grau;
        i >= 0;
        i--
    ) {

        resposta +=
            `a${i} = ${numero(coef[i])}\n`;
    }

    resposta +=
        "\nRAÍZES:\n";

    roots.forEach(
        (root, i) => {

            resposta +=
                `x${i + 1} = ${complexo(root)}\n`;
        }
    );

    // Fatorização para raízes reais
    const reais =
        roots
            .filter(
                r =>
                    Math.abs(r.im) < 1e-6
            )
            .map(
                r =>
                    Number(
                        r.re.toFixed(8)
                    )
            );

    if (reais.length === grau) {

        resposta +=
            "\nFATORAÇÃO:\n";

        resposta +=
            reais
                .map(
                    r =>
                        r >= 0
                            ? `(x - ${numero(r)})`
                            : `(x + ${numero(Math.abs(r))})`
                )
                .join("") +
            " = 0\n";
    }

    resposta +=
        "\nVERIFICAÇÃO:\n";

    roots.forEach(
        (root, i) => {

            if (
                Math.abs(root.im) < 1e-6
            ) {

                const valor =
                    avaliarPolinomio(
                        coef,
                        root.re
                    );

                resposta +=
                    `x${i + 1}: ${numero(valor)}\n`;
            }
        }
    );

    return resposta;
}


// ======================================================
// NEWTON-RAPHSON
// ======================================================

function newton(expr, x0) {

    let x = x0;

    let derivada;

    try {

        derivada =
            math.derivative(
                expr,
                "x"
            ).toString();

    } catch {

        return null;
    }

    for (let i = 0; i < 100; i++) {

        const fx =
            avaliar(
                expr,
                { x }
            );

        const dfx =
            avaliar(
                derivada,
                { x }
            );

        if (
            fx === null ||
            dfx === null ||
            Math.abs(dfx) < 1e-12
        ) {
            return null;
        }

        const novo =
            x - fx / dfx;

        if (
            Math.abs(novo - x) <
            1e-10
        ) {
            return novo;
        }

        x = novo;
    }

    return x;
}


// ======================================================
// BISEÇÃO
// ======================================================

function bissecao(expr, a, b) {

    let fa =
        avaliar(expr, { x: a });

    let fb =
        avaliar(expr, { x: b });

    if (
        fa === null ||
        fb === null
    ) {
        return null;
    }

    if (
        Math.abs(fa) < EPS
    ) {
        return a;
    }

    if (
        Math.abs(fb) < EPS
    ) {
        return b;
    }

    if (fa * fb > 0) {
        return null;
    }

    for (let i = 0; i < 200; i++) {

        const m =
            (a + b) / 2;

        const fm =
            avaliar(
                expr,
                { x: m }
            );

        if (fm === null) {
            return null;
        }

        if (
            Math.abs(fm) < EPS ||
            Math.abs(b - a) < EPS
        ) {
            return m;
        }

        if (fa * fm < 0) {

            b = m;
            fb = fm;

        } else {

            a = m;
            fa = fm;
        }
    }

    return (a + b) / 2;
}


// ======================================================
// ENCONTRAR RAÍZES NUMÉRICAS
// ======================================================

function encontrarRaizesNumericas(expr) {

    const roots = [];

    const MIN = -100;
    const MAX = 100;
    const PASSO = 0.25;

    let anteriorX = MIN;
    let anteriorY =
        avaliar(
            expr,
            { x: anteriorX }
        );

    for (
        let x = MIN + PASSO;
        x <= MAX;
        x += PASSO
    ) {

        const y =
            avaliar(
                expr,
                { x }
            );

        if (
            anteriorY !== null &&
            y !== null
        ) {

            // Raiz exata
            if (
                Math.abs(y) < 1e-7
            ) {

                roots.push(x);
            }

            // Mudança de sinal
            else if (
                anteriorY * y < 0
            ) {

                const raiz =
                    bissecao(
                        expr,
                        anteriorX,
                        x
                    );

                if (raiz !== null) {
                    roots.push(raiz);
                }
            }
        }

        anteriorX = x;
        anteriorY = y;
    }

    // Newton em vários pontos
    for (
        let x = -20;
        x <= 20;
        x += 1
    ) {

        const raiz =
            newton(
                expr,
                x
            );

        if (
            raiz !== null &&
            Number.isFinite(raiz) &&
            raiz >= MIN &&
            raiz <= MAX
        ) {

            const valor =
                avaliar(
                    expr,
                    { x: raiz }
                );

            if (
                valor !== null &&
                Math.abs(valor) < 1e-5
            ) {

                roots.push(raiz);
            }
        }
    }

    // Remover duplicados
    const unicas = [];

    for (const r of roots) {

        if (
            !unicas.some(
                u =>
                    Math.abs(u - r) <
                    1e-5
            )
        ) {
            unicas.push(r);
        }
    }

    return unicas.sort(
        (a, b) => a - b
    );
}


// ======================================================
// EQUAÇÃO GERAL
// ======================================================

function resolverEquacao(texto) {

    const partes =
        dividirEquacao(texto);

    if (!partes) {
        return null;
    }

    const expr =
        partes.expressao;

    // ----------------------------------------------
    // Tentar polinômio
    // ----------------------------------------------

    const coef =
        obterCoeficientesPolinomio(
            expr
        );

    if (coef) {

        const grau =
            coef.length - 1;

        if (
            grau >= 1 &&
            grau <= 4
        ) {

            let resposta =
                resolverPolinomio(
                    coef
                );

            return `
${resposta}

EQUAÇÃO ORIGINAL:

${texto}
`;
        }
    }

    // ----------------------------------------------
    // Equação transcendental
    // ----------------------------------------------

    const raizes =
        encontrarRaizesNumericas(
            expr
        );

    if (raizes.length > 0) {

        let resposta =
            `EQUAÇÃO TRANSCENDENTAL\n\n`;

        resposta +=
            `Equação:\n${texto}\n\n`;

        resposta +=
            "Soluções numéricas encontradas:\n";

        raizes.forEach(
            (r, i) => {

                resposta +=
                    `x${i + 1} ≈ ${numero(r)}\n`;
            }
        );

        resposta +=
            "\nIntervalo pesquisado: [-100, 100]\n";

        resposta +=
            "\nAs soluções são aproximações numéricas.";

        return resposta;
    }

    return `
A Dream identificou uma equação, mas
não conseguiu encontrar uma solução
no intervalo numérico pesquisado.

Equação:

${texto}

Experimente escrever usando:

x
x^2
x^3
x^4
sqrt(x)
sin(x)
cos(x)
tan(x)
log(x)
ln(x)
e^x
`;
}


// ======================================================
// DERIVADA
// ======================================================

function resolverDerivada(texto) {

    let q =
        normalizar(texto);

    q =
        q.replace(
            /^derivada\s+(de\s+)?/,
            ""
        );

    try {

        const node =
            math.derivative(
                q,
                "x"
            );

        return `
DERIVADA

Função:

f(x) = ${q}

Derivada:

f'(x) = ${node.toString()}
`;

    } catch (error) {

        return null;
    }
}


// ======================================================
// INTEGRAL DEFINIDA
// ======================================================

function integralNumerica(
    expr,
    a,
    b,
    n = 10000
) {

    if (n % 2 !== 0) {
        n++;
    }

    const h =
        (b - a) / n;

    let soma =
        avaliar(expr, { x: a }) +
        avaliar(expr, { x: b });

    for (
        let i = 1;
        i < n;
        i
