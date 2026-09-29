const express = require("express");
const { evaluate, derivative } = require("mathjs");

const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));


// =====================================================
// NORMALIZAR TEXTO
// =====================================================

function normalizar(texto) {
    return String(texto)
        .trim()
        .replace(/−/g, "-")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/π/g, "pi")
        .replace(/²/g, "^2")
        .replace(/³/g, "^3")
        .replace(/⁴/g, "^4")
        .replace(/⁵/g, "^5")
        .replace(/\bsen\b/gi, "sin")
        .replace(/\btg\b/gi, "tan");
}


// =====================================================
// PREPARAR EXPRESSÃO
// =====================================================

function preparar(expr) {

    let s = normalizar(expr);

    // 2x -> 2*x
    s = s.replace(
        /(\d|\))(?=x)/g,
        "$1*"
    );

    // x(...) -> x*(...)
    s = s.replace(
        /x(?=\()/g,
        "x*"
    );

    // 2(...) -> 2*(...)
    s = s.replace(
        /(\d)(?=\()/g,
        "$1*"
    );

    return s;
}


// =====================================================
// AVALIAR FUNÇÃO
// =====================================================

function f(expr, x) {

    try {

        const resultado = evaluate(
            expr,
            { x }
        );

        if (
            typeof resultado !== "number" ||
            !Number.isFinite(resultado)
        ) {
            return null;
        }

        return resultado;

    } catch {

        return null;
    }
}


// =====================================================
// DETECTAR POLINÔMIO ATÉ 4.º GRAU
// =====================================================

function obterPolinomio(expr) {

    const valores = [];

    // Calculamos P(0), P(1), ..., P(4)
    for (let x = 0; x <= 4; x++) {

        const valor = f(expr, x);

        if (valor === null) {
            return null;
        }

        valores.push(valor);
    }

    const diferencas = [];

    let atual = valores.slice();

    diferencas.push(atual);

    for (let grau = 1; grau <= 4; grau++) {

        const proxima = [];

        for (
            let i = 0;
            i < atual.length - 1;
            i++
        ) {

            proxima.push(
                atual[i + 1] - atual[i]
            );
        }

        diferencas.push(proxima);

        atual = proxima;
    }

    /*
       Para:

       ax + b

       a diferença de 1.º grau é constante.

       Para:

       ax² + bx + c

       a diferença de 2.º grau é constante.

       etc.
    */

    let grau = -1;

    for (let i = 1; i <= 4; i++) {

        const linha =
            diferencas[i];

        const primeiro =
            linha[0];

        const constante =
            linha.every(
                valor =>
                    Math.abs(
                        valor - primeiro
                    ) < 0.000001
            );

        if (constante) {

            grau = i;
            break;
        }
    }

    if (grau === -1) {
        return null;
    }

    /*
       Converter diferenças finitas
       para coeficientes.

       Usamos Newton Forward:

       P(x) =
       Δ⁰P(0)
       + Δ¹P(0)x
       + Δ²P(0)x(x-1)/2!
       + ...
    */

    const d = [];

    for (let i = 0; i <= grau; i++) {
        d.push(diferencas[i][0]);
    }

    // Polinômio inicialmente zero
    let coef = Array(grau + 1).fill(0);

    // Polinômio base x(x-1)...(x-k+1)
    let base = [1];

    for (let k = 0; k <= grau; k++) {

        const fator =
            d[k] / factorial(k);

        // adicionar fator * base
        for (
            let i = 0;
            i < base.length;
            i++
        ) {

            coef[i] +=
                fator * base[i];
        }

        // próxima base
        if (k < grau) {

            const nova =
                Array(base.length + 1)
                    .fill(0);

            for (
                let i = 0;
                i < base.length;
                i++
            ) {

                nova[i] -=
                    base[i] * k;

                nova[i + 1] +=
                    base[i];
            }

            base = nova;
        }
    }

    // Remover zeros superiores
    while (
        coef.length > 1 &&
        Math.abs(
            coef[coef.length - 1]
        ) < 0.000001
    ) {
        coef.pop();
    }

    return {
        grau: coef.length - 1,
        coef
    };
}


// =====================================================
// FATORIAL
// =====================================================

function factorial(n) {

    let r = 1;

    for (let i = 2; i <= n; i++) {
        r *= i;
    }

    return r;
}


// =====================================================
// POLINÔMIO
// =====================================================

function polinomioTexto(coef) {

    const partes = [];

    for (
        let i = coef.length - 1;
        i >= 0;
        i--
    ) {

        const c = coef[i];

        if (
            Math.abs(c) < 0.000001
        ) {
            continue;
        }

        let termo;

        if (i === 0) {

            termo =
                formatarNumero(
                    Math.abs(c)
                );

        } else if (i === 1) {

            if (
                Math.abs(c - 1) <
                0.000001
            ) {

                termo = "x";

            } else {

                termo =
                    formatarNumero(
                        Math.abs(c)
                    ) + "x";
            }

        } else {

            if (
                Math.abs(c - 1) <
                0.000001
            ) {

                termo =
                    `x^${i}`;

            } else {

                termo =
                    `${formatarNumero(
                        Math.abs(c)
                    )}x^${i}`;
            }
        }

        if (partes.length === 0) {

            partes.push(
                c < 0
                    ? "-" + termo
                    : termo
            );

        } else {

            partes.push(
                c < 0
                    ? "- " + termo
                    : "+ " + termo
            );
        }
    }

    return partes.join(" ");
}


// =====================================================
// AVALIAR POLINÔMIO
// =====================================================

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


// =====================================================
// NEWTON
// =====================================================

function newton(coef, inicio) {

    let x = inicio;

    for (let i = 0; i < 100; i++) {

        const y =
            avaliarPolinomio(
                coef,
                x
            );

        let derivada = 0;

        for (
            let j = 1;
            j < coef.length;
            j++
        ) {

            derivada +=
                j *
                coef[j] *
                Math.pow(
                    x,
                    j - 1
                );
        }

        if (
            Math.abs(derivada) <
            0.000000001
        ) {
            return null;
        }

        const novo =
            x - y / derivada;

        if (
            Math.abs(
                novo - x
            ) < 0.000000001
        ) {

            return novo;
        }

        x = novo;
    }

    return null;
}


// =====================================================
// ENCONTRAR RAÍZES REAIS
// =====================================================

function encontrarRaizesReais(coef) {

    const raizes = [];

    // Newton com vários pontos iniciais
    for (
        let inicio = -100;
        inicio <= 100;
        inicio += 0.5
    ) {

        const raiz =
            newton(
                coef,
                inicio
            );

        if (
            raiz !== null &&
            Number.isFinite(raiz) &&
            Math.abs(
                avaliarPolinomio(
                    coef,
                    raiz
                )
            ) < 0.00001
        ) {

            if (
                !raizes.some(
                    r =>
                        Math.abs(
                            r - raiz
                        ) < 0.0001
                )
            ) {

                raizes.push(raiz);
            }
        }
    }

    return raizes.sort(
        (a, b) => a - b
    );
}


// =====================================================
// RESOLVER 1.º, 2.º, 3.º E 4.º GRAU
// =====================================================

function resolverPolinomio(coef) {

    const grau =
        coef.length - 1;

    const raizes =
        encontrarRaizesReais(
            coef
        );

    let resposta =
        `EQUAÇÃO DO ${grau}º GRAU\n\n`;

    resposta +=
        "Equação reduzida:\n";

    resposta +=
        polinomioTexto(coef);

    resposta +=
        " = 0\n\n";


    if (grau === 1) {

        const a = coef[1];
        const b = coef[0];

        const x =
            -b / a;

        resposta +=
            "Resolução:\n\n";

        resposta +=
            `${formatarNumero(a)}x + ` +
            `${formatarNumero(b)} = 0\n\n`;

        resposta +=
            `x = ${formatarNumero(x)}\n`;

    } else {

        if (raizes.length === 0) {

            resposta +=
                "Não foram encontradas " +
                "raízes reais.\n";

        } else {

            resposta +=
                "Soluções reais:\n\n";

            raizes.forEach(
                (r, i) => {

                    resposta +=
                        `x${i + 1} = ` +
                        `${formatarNumero(r)}\n`;
                }
            );
        }
    }


    resposta +=
        "\nVerificação:\n";

    raizes.forEach(
        (r, i) => {

            const valor =
                avaliarPolinomio(
                    coef,
                    r
                );

            resposta +=
                `x${i + 1}: ` +
                `${formatarNumero(valor)}\n`;
        }
    );

    return resposta;
}


// =====================================================
// RESOLVER EQUAÇÃO NÃO POLINOMIAL
// =====================================================

function resolverNumerica(expr) {

    const raizes = [];

    let anteriorX = -100;

    let anteriorY =
        f(
            expr,
            anteriorX
        );

    for (
        let x = -99.9;
        x <= 100;
        x += 0.1
    ) {

        const y =
            f(expr, x);

        if (
            anteriorY !== null &&
            y !== null
        ) {

            if (
                Math.abs(y) <
                0.000001
            ) {

                adicionarRaiz(
                    raizes,
                    x
                );

            } else if (
                anteriorY * y < 0
            ) {

                let a =
                    anteriorX;

                let b = x;

                for (
                    let i = 0;
                    i < 100;
                    i++
                ) {

                    const meio =
                        (a + b) / 2;

                    const fm =
                        f(
                            expr,
                            meio
                        );

                    if (
                        Math.abs(fm) <
                        0.000000001
                    ) {

                        a = meio;
                        b = meio;
                        break;
                    }

                    const fa =
                        f(expr, a);

                    if (
                        fa * fm <= 0
                    ) {

                        b = meio;

                    } else {

                        a = meio;
                    }
                }

                adicionarRaiz(
                    raizes,
                    (a + b) / 2
                );
            }
        }

        anteriorX = x;
        anteriorY = y;
    }

    return raizes;
}


function adicionarRaiz(
    lista,
    raiz
) {

    if (
        !lista.some(
            r =>
                Math.abs(
                    r - raiz
                ) < 0.0001
        )
    ) {

        lista.push(raiz);
    }
}


// =====================================================
// RESOLVER EQUAÇÃO
// =====================================================

function resolverEquacao(pergunta) {

    let texto =
        normalizar(pergunta);

    const partes =
        texto.split("=");

    if (partes.length !== 2) {

        return `
Não encontrei uma equação válida.

Exemplo:

x^2 - 5x + 6 = 0
`;
    }

    const esquerda =
        preparar(
            partes[0]
        );

    const direita =
        preparar(
            partes[1]
        );

    const expr =
        `(${esquerda})-(${direita})`;


    // Tentar polinômio
    const polinomio =
        obterPolinomio(expr);

    if (
        polinomio &&
        polinomio.grau >= 1 &&
        polinomio.grau <= 4
    ) {

        return resolverPolinomio(
            polinomio.coef
        );
    }


    // Tentar solução numérica
    const raizes =
        resolverNumerica(expr);

    if (raizes.length > 0) {

        let resposta =
            "EQUAÇÃO\n\n";

        resposta +=
            `Equação:\n${pergunta}\n\n`;

        resposta +=
            "Soluções aproximadas:\n\n";

        raizes.forEach(
            (r, i) => {

                resposta +=
                    `x${i + 1} ≈ ` +
                    `${formatarNumero(r)}\n`;
            }
        );

        return resposta;
    }


    return `
A Dream conseguiu identificar a equação,
mas não encontrou uma solução real.

Equação:

${pergunta}
`;
}


// =====================================================
// EXPRESSÃO MATEMÁTICA
// =====================================================

function resolverCalculo(texto) {

    try {

        const expressao =
            preparar(texto);

        const resultado =
            evaluate(expressao);

        return `
CÁLCULO

Expressão:

${texto}

Resultado:

${formatarNumero(
    resultado
)}
`;

    } catch {

        return null;
    }
}


// =====================================================
// DERIVADA
// =====================================================

function resolverDerivada(texto) {

    try {

        let expr =
            texto
                .replace(
                    /^derivada\s*/i,
                    ""
                )
                .trim();

        expr =
            preparar(expr);

        const resultado =
            derivative(
                expr,
                "x"
            );

        return `
DERIVADA

f(x) = ${expr}

f'(x) = ${resultado.toString()}
`;

    } catch {

        return null;
    }
}


// =====================================================
// FORMATAR NÚMEROS
// =====================================================

function formatarNumero(valor) {

    if (
        typeof valor !== "number"
    ) {
        return String(valor);
    }

    if (
        Math.abs(valor) <
        0.000000001
    ) {
        return "0";
    }

    if (
        Math.abs(
            valor -
            Math.round(valor)
        ) < 0.000000001
    ) {

        return String(
            Math.round(valor)
        );
    }

    return Number(
        valor.toFixed(10)
    ).toString();
}


// =====================================================
// MOTOR DA DREAM
// =====================================================

function resolver(pergunta) {

    const texto =
        String(pergunta)
            .trim();

    if (!texto) {

        return "Digite uma questão matemática.";
    }


    // Derivada
    if (
        /^derivada/i.test(texto)
    ) {

        const resposta =
            resolverDerivada(
                texto
            );

        if (resposta) {
            return resposta;
        }
    }


    // Equação
    if (
        texto.includes("=")
    ) {

        return resolverEquacao(
            texto
        );
    }


    // Cálculo normal
    const calculo =
        resolverCalculo(
            texto
        );

    if (calculo) {
        return calculo;
    }


    return `
Não consegui interpretar:

${texto}

Experimente:

2x + 5 = 15

x^2 - 5x + 6 = 0

x^3 - 6x^2 + 11x - 6 = 0

x^4 - 5x^3 + 5x^2 + 5x - 6 = 0
`;
}


// =====================================================
// API
// =====================================================

app.post(
    "/api/solve",
    (req, res) => {

        try {

            const pergunta =
                req.body.question ||
                req.body.text ||
                req.body.problem;

            if (!pergunta) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Nenhuma pergunta recebida."
                });
            }

            console.log(
                "Pergunta recebida:",
                pergunta
            );

            const resposta =
                resolver(
                    pergunta
                );

            res.json({
                success: true,
                answer: resposta
            });

        } catch (erro) {

            console.error(
                "Erro:",
                erro
            );

            res.status(500).json({
                success: false,
                error:
                    "Erro ao resolver a questão."
            });
        }
    }
);


// =====================================================
// TESTE
// =====================================================

app.get(
    "/health",
    (req, res) => {

        res.json({
            status: "online",
            dream: true,
            engine: "mathematical"
        });
    }
);


// =====================================================
// INICIAR
// =====================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Dream online na porta ${PORT}`
        );
    }
);
