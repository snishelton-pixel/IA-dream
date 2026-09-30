const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const PUBLIC_DIR = path.join(__dirname, "public");

// ============================================================
// UTILIDADES
// ============================================================

function normalizar(texto) {
    return String(texto || "")
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

function quaseZero(n) {
    return Math.abs(n) < 1e-9;
}

function bonito(n) {
    if (!Number.isFinite(n)) return "indefinido";

    if (Math.abs(n) < 1e-10) {
        n = 0;
    }

    if (Math.abs(n - Math.round(n)) < 1e-8) {
        return String(Math.round(n));
    }

    return Number(n.toFixed(8)).toString();
}

function formatarCoeficiente(n, mostrarUm = true) {
    if (quaseZero(n)) return "";

    if (n === 1 && mostrarUm) return "";
    if (n === -1 && mostrarUm) return "-";

    return bonito(n);
}

function polinomioParaTexto(c) {
    let partes = [];

    for (let grau = c.length - 1; grau >= 0; grau--) {
        const valor = c[grau];

        if (quaseZero(valor)) continue;

        const abs = Math.abs(valor);
        let termo = "";

        if (grau === 0) {
            termo = bonito(abs);
        } else if (grau === 1) {
            termo = `${formatarCoeficiente(abs)}x`;
        } else {
            termo = `${formatarCoeficiente(abs)}x^${grau}`;
        }

        if (partes.length === 0) {
            partes.push(valor < 0 ? `-${termo}` : termo);
        } else {
            partes.push(valor < 0 ? `- ${termo}` : `+ ${termo}`);
        }
    }

    return partes.length ? partes.join(" ") : "0";
}

// ============================================================
// PARSER DE EXPRESSÕES
// ============================================================

function calcularExpressao(texto) {
    let s = normalizar(texto);
    let pos = 0;

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

        const valor = Number(s.substring(inicio, pos));

        if (!Number.isFinite(valor)) {
            throw new Error("Número inválido.");
        }

        return valor;
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
                throw new Error("Use sqrt(número).");
            }

            const valor = soma();

            if (!consumir(")")) {
                throw new Error("Parêntese não fechado.");
            }

            if (valor < 0) {
                throw new Error(
                    "Não existe raiz quadrada real de número negativo."
                );
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
            } else if (consumir("/")) {
                const divisor = potencia();

                if (quaseZero(divisor)) {
                    throw new Error("Divisão por zero.");
                }

                valor /= divisor;
            } else {
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
            } else if (consumir("-")) {
                valor -= multiplicacao();
            } else {
                break;
            }
        }

        return valor;
    }

    const resultado = soma();

    if (pos !== s.length) {
        throw new Error(
            "Símbolo inválido: " + s.substring(pos)
        );
    }

    return resultado;
}

// ============================================================
// PARSER DE POLINÔMIOS
// Suporta graus de 0 até 4
// Exemplos:
// 2x^2-7x+3
// x^3-2x+1
// 5
// ============================================================

function polinomio(expressao) {
    let s = normalizar(expressao);

    s = s.replace(/\*/g, "");

    if (!s) return null;

    if (s[0] !== "+" && s[0] !== "-") {
        s = "+" + s;
    }

    const termos = s.match(/[+-][^+-]+/g);

    if (!termos) {
        return null;
    }

    const coef = [0, 0, 0, 0, 0];

    for (const termo of termos) {
        let t = termo;

        const sinal = t[0] === "-" ? -1 : 1;
        t = t.substring(1);

        if (!t) return null;

        const posX = t.indexOf("x");

        if (posX === -1) {
            const numero = Number(t);

            if (!Number.isFinite(numero)) {
                return null;
            }

            coef[0] += sinal * numero;
            continue;
        }

        let antes = t.substring(0, posX);

        if (antes === "") {
            antes = "1";
        }

        const numero = Number(antes);

        if (!Number.isFinite(numero)) {
            return null;
        }

        let grau = 1;

        const depois = t.substring(posX + 1);

        if (depois) {
            if (!depois.startsWith("^")) {
                return null;
            }

            grau = Number(depois.substring(1));

            if (!Number.isInteger(grau)) {
                return null;
            }
        }

        if (grau < 0 || grau > 4) {
            return null;
        }

        coef[grau] += sinal * numero;
    }

    return coef;
}

function grauPolinomio(coef) {
    for (let i = coef.length - 1; i >= 0; i--) {
        if (!quaseZero(coef[i])) {
            return i;
        }
    }

    return -1;
}

// ============================================================
// COMPLEXOS
// ============================================================

function complexo(re, im) {
    return { re, im };
}

function multiplicarComplexo(a, b) {
    return complexo(
        a.re * b.re - a.im * b.im,
        a.re * b.im + a.im * b.re
    );
}

function dividirComplexo(a, b) {
    const d = b.re * b.re + b.im * b.im;

    if (quaseZero(d)) {
        return complexo(0, 0);
    }

    return complexo(
        (a.re * b.re + a.im * b.im) / d,
        (a.im * b.re - a.re * b.im) / d
    );
}

function subComplexo(a, b) {
    return complexo(
        a.re - b.re,
        a.im - b.im
    );
}

function valorPolinomioComplexo(coef, z) {
    let resultado = complexo(0, 0);

    for (let i = coef.length - 1; i >= 0; i--) {
        resultado = multiplicarComplexo(resultado, z);
        resultado.re += coef[i];
    }

    return resultado;
}

// ============================================================
// RAÍZES NUMÉRICAS
// Durand-Kerner
// ============================================================

function raizesNumericas(coef) {
    const grau = grauPolinomio(coef);

    if (grau < 1) return [];

    const a = coef[grau];

    let maior = 0;

    for (let i = 0; i < grau; i++) {
        maior = Math.max(
            maior,
            Math.abs(coef[i] / a)
        );
    }

    const raio = 1 + maior;

    let raizes = [];

    for (let k = 0; k < grau; k++) {
        const angulo =
            (2 * Math.PI * k) / grau;

        raizes.push(
            complexo(
                raio * Math.cos(angulo),
                raio * Math.sin(angulo)
            )
        );
    }

    for (let iter = 0; iter < 500; iter++) {
        let terminou = true;

        const novas = [];

        for (let i = 0; i < grau; i++) {
            let produto = complexo(1, 0);

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
                dividirComplexo(
                    p,
                    produto
                );

            const nova =
                subComplexo(
                    raizes[i],
                    delta
                );

            novas.push(nova);

            if (
                Math.abs(delta.re) > 1e-10 ||
                Math.abs(delta.im) > 1e-10
            ) {
                terminou = false;
            }
        }

        raizes = novas;

        if (terminou) break;
    }

    return raizes;
}

function formatarRaiz(z) {
    if (Math.abs(z.im) < 1e-7) {
        return bonito(z.re);
    }

    const parteReal = bonito(z.re);
    const parteIm = bonito(Math.abs(z.im));

    if (Math.abs(z.re) < 1e-7) {
        return `${z.im >= 0 ? "" : "-"}${parteIm}i`;
    }

    return `${parteReal} ${z.im >= 0 ? "+" : "-"} ${parteIm}i`;
}

// ============================================================
// EQUAÇÃO DE 1.º GRAU
// ============================================================

function resolverPrimeiroGrau(coef, texto) {
    const b = coef[1];
    const c = coef[0];

    const x = -c / b;

    return {
        tipo: "Equação do 1.º grau",
        resultado: `x = ${bonito(x)}`,
        passos: [
            `Equação inicial: ${texto}`,
            `Forma reduzida: ${polinomioParaTexto(coef)} = 0`,
            `Isolando x: ${bonito(b)}x = ${bonito(-c)}`,
            `Dividindo por ${bonito(b)}:`,
            `x = ${bonito(x)}`
        ]
    };
}

// ============================================================
// EQUAÇÃO DE 2.º GRAU
// ============================================================

function resolverSegundoGrau(coef, texto) {
    const a = coef[2];
    const b = coef[1];
    const c = coef[0];

    const delta = b * b - 4 * a * c;

    const passos = [
        `Equação inicial: ${texto}`,
        `Forma reduzida: ${polinomioParaTexto(coef)} = 0`,
        `a = ${bonito(a)}, b = ${bonito(b)}, c = ${bonito(c)}`,
        `Δ = b² - 4ac`,
        `Δ = (${bonito(b)})² - 4(${bonito(a)})(${bonito(c)})`,
        `Δ = ${bonito(delta)}`
    ];

    if (delta < -1e-9) {
        passos.push(
            "Como Δ < 0, não existem raízes reais."
        );

        return {
            tipo: "Equação do 2.º grau",
            resultado: "Não existem soluções reais.",
            passos
        };
    }

    if (quaseZero(delta)) {
        const x = -b / (2 * a);

        passos.push(
            "Como Δ = 0, existe uma raiz real dupla.",
            `x = -b / 2a`,
            `x = ${bonito(x)}`
        );

        return {
            tipo: "Equação do 2.º grau",
            resultado: `x = ${bonito(x)}`,
            passos
        };
    }

    const raizDelta = Math.sqrt(delta);

    const x1 =
        (-b + raizDelta) / (2 * a);

    const x2 =
        (-b - raizDelta) / (2 * a);

    passos.push(
        "Como Δ > 0, existem duas raízes reais.",
        `x₁ = (-b + √Δ) / 2a`,
        `x₁ = ${bonito(x1)}`,
        `x₂ = (-b - √Δ) / 2a`,
        `x₂ = ${bonito(x2)}`
    );

    return {
        tipo: "Equação do 2.º grau",
        resultado:
            `x₁ = ${bonito(x1)}; x₂ = ${bonito(x2)}`,
        passos
    };
}

// ============================================================
// EQUAÇÃO DE 3.º E 4.º GRAU
// ============================================================

function resolverGrauSuperior(coef, texto, grau) {
    const raizes = raizesNumericas(coef);

    const reais = [];
    const complexas = [];

    for (const r of raizes) {
        if (Math.abs(r.im) < 1e-7) {
            reais.push(r.re);
        } else {
            complexas.push(r);
        }
    }

    reais.sort((a, b) => a - b);

    const passos = [
        `Equação inicial: ${texto}`,
        `Forma reduzida: ${polinomioParaTexto(coef)} = 0`,
        `Grau da equação: ${grau}º grau`,
        "As raízes foram calculadas numericamente."
    ];

    if (reais.length > 0) {
        passos.push(
            "Raízes reais encontradas:",
            reais
                .map((x, i) => `x${i + 1} = ${bonito(x)}`)
                .join("; ")
        );
    }

    if (complexas.length > 0) {
        passos.push(
            "Também foram encontradas raízes complexas:",
            complexas
                .map(formatarRaiz)
                .join("; ")
        );
    }

    const todas = raizes
        .map(formatarRaiz)
        .join("; ");

    return {
        tipo: `Equação do ${grau}.º grau`,
        resultado: `Raízes: ${todas}`,
        passos
    };
}

// ============================================================
// RESOLVER EQUAÇÃO
// ============================================================

function resolverEquacao(texto) {
    const partes = texto.split("=");

    if (partes.length !== 2) {
        return null;
    }

    const esquerda = partes[0];
    const direita = partes[1];

    const p1 = polinomio(esquerda);
    const p2 = polinomio(direita);

    if (!p1 || !p2) {
        return null;
    }

    const coef = [];

    for (let i = 0; i <= 4; i++) {
        coef[i] = p1[i] - p2[i];
    }

    const grau = grauPolinomio(coef);

    // Identidade
    if (grau === -1) {
        return {
            tipo: "Identidade matemática",
            resultado:
                "Todos os números reais são soluções.",
            passos: [
                `Equação: ${texto}`,
                "Colocando todos os termos no mesmo membro:",
                "0 = 0",
                "A igualdade é sempre verdadeira.",
                "Logo, todos os números reais são soluções."
            ]
        };
    }

    // Equação impossível
    if (grau === 0) {
        return {
            tipo: "Equação impossível",
            resultado: "Não existe solução.",
            passos: [
                `Equação: ${texto}`,
                `Forma reduzida: ${bonito(coef[0])} = 0`,
                "Essa igualdade é impossível.",
                "Logo, não existe solução."
            ]
        };
    }

    if (grau === 1) {
        return resolverPrimeiroGrau(
            coef,
            texto
        );
    }

    if (grau === 2) {
        return resolverSegundoGrau(
            coef,
            texto
        );
    }

    if (grau === 3 || grau === 4) {
        return resolverGrauSuperior(
            coef,
            texto,
            grau
        );
    }

    return null;
}

// ============================================================
// INEQUAÇÕES
// ============================================================

function resolverInequacao(texto) {
    const operadores = [">=", "<=", ">", "<"];

    let operador = null;
    let indice = -1;

    for (const op of operadores) {
        const i = texto.indexOf(op);

        if (i !== -1) {
            operador = op;
            indice = i;
            break;
        }
    }

    if (!operador) {
        return null;
    }

    const esquerda =
        texto.substring(0, indice);

    const direita =
        texto.substring(
            indice + operador.length
        );

    const p1 = polinomio(esquerda);
    const p2 = polinomio(direita);

    if (!p1 || !p2) {
        return null;
    }

    const coef = [];

    for (let i = 0; i <= 4; i++) {
        coef[i] = p1[i] - p2[i];
    }

    const grau = grauPolinomio(coef);

    // Apenas inequações lineares são tratadas exatamente aqui.
    if (grau !== 1) {
        return {
            tipo: "Inequação",
            resultado:
                "Esta versão do Dream resolve inequações lineares de forma exata.",
            passos: [
                `Inequação: ${texto}`,
                `Forma reduzida: ${polinomioParaTexto(coef)} ${operador} 0`,
                "Para inequações de grau superior, é necessário analisar os intervalos determinados pelas raízes."
            ]
        };
    }

    const a = coef[1];
    const b = coef[0];

    const limite = -b / a;

    let novoOperador = operador;

    if (a < 0) {
        const troca = {
            ">": "<",
            "<": ">",
            ">=": "<=",
            "<=": ">="
        };

        novoOperador = troca[operador];
    }

    return {
        tipo: "Inequação do 1.º grau",
        resultado:
            `x ${novoOperador} ${bonito(limite)}`,
        passos: [
            `Inequação inicial: ${texto}`,
            `Forma reduzida: ${bonito(a)}x ${b >= 0 ? "+" : "-"} ${bonito(Math.abs(b))} ${operador} 0`,
            `Passando o termo independente: ${bonito(a)}x ${operador} ${bonito(-b)}`,
            `Dividindo por ${bonito(a)}:`,
            a < 0
                ? "Como dividimos por um número negativo, o sinal da inequação é invertido."
                : "Como o coeficiente de x é positivo, o sinal mantém-se.",
            `x ${novoOperador} ${bonito(limite)}`
        ]
    };
}

// ============================================================
// CONTAS BÁSICAS
// ============================================================

function resolverCalculo(texto) {
    try {
        const resultado =
            calcularExpressao(texto);

        return {
            tipo: "Cálculo matemático",
            resultado: bonito(resultado),
            passos: [
                `Expressão: ${texto}`,
                "Aplicando a ordem das operações:",
                `Resultado = ${bonito(resultado)}`
            ]
        };
    } catch (erro) {
        return null;
    }
}

// ============================================================
// IDENTIFICADOR PRINCIPAL
// ============================================================

function resolver(texto) {
    if (!texto || !String(texto).trim()) {
        return {
            tipo: "Entrada vazia",
            resultado:
                "Digite um problema matemático.",
            passos: [
                "Nenhum problema foi fornecido."
            ]
        };
    }

    const original = String(texto).trim();
    const s = normalizar(original);

    // Inequações primeiro
    if (/[<>]=?/.test(s)) {
        const resultado =
            resolverInequacao(s);

        if (resultado) {
            return resultado;
        }
    }

    // Equações
    if (s.includes("=")) {
        const resultado =
            resolverEquacao(s);

        if (resultado) {
            return resultado;
        }
    }

    // Cálculos
    const calculo =
        resolverCalculo(s);

    if (calculo) {
        return calculo;
    }

    return {
        tipo: "Problema não reconhecido",
        resultado:
            "Não consegui interpretar este problema.",
        passos: [
            "Verifique a expressão.",
            "Exemplos:",
            "2 + 5",
            "√25",
            "2x + 5 = 15",
            "2x^2 - 7x + 3 = 0",
            "3x - 4 > 8"
        ]
    };
        }
