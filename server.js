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
// ===============================
// DERIVADA
// ===============================

function resolverDerivada(texto) {

    const match = texto.match(
        /derivada\s+de\s+(.+?)\s+(?:em|no ponto|quando)\s*x\s*=?\s*(-?\d+(?:\.\d+)?)/i
    );

    if (!match) {
        throw new Error("Indique o ponto da derivada. Exemplo: derivada de x^2 em x=3");
    }

    const expressao = match[1].trim();
    const x = Number(match[2]);

    const f = (valor) => avaliarExpressao(expressao, valor);

    const resultado = derivative(f, x);

    return {
        tipo: "Derivada numérica",
        passos: [
            `Função: f(x) = ${expressao}`,
            `Ponto: x = ${x}`,
            "Aplicando a derivada numérica",
            `f'(x) ≈ ${resultado}`
        ],
        resultado: `f'(${x}) ≈ ${resultado}`
    };
}


// ===============================
// SEGUNDA DERIVADA
// ===============================

function resolverSegundaDerivada(texto) {

    const match = texto.match(
        /segunda\s+derivada\s+de\s+(.+?)\s+(?:em|no ponto)\s*x\s*=?\s*(-?\d+(?:\.\d+)?)/i
    );

    if (!match) {
        throw new Error("Indique a função e o ponto.");
    }

    const expressao = match[1].trim();
    const x = Number(match[2]);

    const f = (valor) => avaliarExpressao(expressao, valor);

    const resultado = secondDerivative(f, x);

    return {
        tipo: "Segunda derivada",
        passos: [
            `Função: f(x) = ${expressao}`,
            `Ponto: x = ${x}`,
            `f''(${x}) ≈ ${resultado}`
        ],
        resultado: `f''(${x}) ≈ ${resultado}`
    };
}


// ===============================
// INTEGRAL DEFINIDA
// ===============================

function resolverIntegral(texto) {

    const match = texto.match(
        /integral\s+(?:de\s+)?(.+?)\s+(?:de|entre)\s+(-?\d+(?:\.\d+)?)\s+(?:a|ate|até)\s+(-?\d+(?:\.\d+)?)/i
    );

    if (!match) {
        throw new Error(
            "Use: integral de x^2 de 0 a 2"
        );
    }

    const expressao = match[1].trim();
    const a = Number(match[2]);
    const b = Number(match[3]);

    const f = (x) => avaliarExpressao(expressao, x);

    const resultado = simpson(f, a, b, 1000);

    return {
        tipo: "Integral definida",
        passos: [
            `Função: f(x) = ${expressao}`,
            `Limite inferior: ${a}`,
            `Limite superior: ${b}`,
            "Aplicando a regra de Simpson",
            `∫ f(x) dx ≈ ${resultado}`
        ],
        resultado: `${resultado}`
    };
}


// ===============================
// RAIZ QUADRADA
// ===============================

function resolverRaiz(texto) {

    const match = texto.match(
        /(?:raiz quadrada de|sqrt)\s*(?:\()?(-?\d+(?:\.\d+)?)\)?/i
    );

    if (!match) {
        throw new Error("Número inválido para raiz quadrada.");
    }

    const numero = Number(match[1]);

    if (numero < 0) {
        return {
            tipo: "Raiz quadrada",
            passos: [
                `√${numero}`,
                "Não existe raiz quadrada real de um número negativo."
            ],
            resultado: "Não existe nos números reais"
        };
    }

    const resultado = Math.sqrt(numero);

    return {
        tipo: "Raiz quadrada",
        passos: [
            `Número: ${numero}`,
            `√${numero} = ${resultado}`
        ],
        resultado: `${resultado}`
    };
}


// ===============================
// FATORIAL
// ===============================

function resolverFatorial(texto) {

    const match = texto.match(
        /(?:fatorial\s+de|factorial\s+de)\s*(\d+)/i
    );

    if (!match) {
        throw new Error("Indique um número para calcular o fatorial.");
    }

    const numero = Number(match[1]);
    const resultado = factorial(numero);

    return {
        tipo: "Fatorial",
        passos: [
            `${numero}!`,
            `Resultado do fatorial de ${numero}`
        ],
        resultado: `${resultado}`
    };
}


// ===============================
// SÉRIE GEOMÉTRICA
// ===============================

function resolverSerieGeometrica(texto) {

    const match = texto.match(
        /serie\s+geometrica\s+(?:com\s+)?a\s*=?\s*(-?\d+(?:\.\d+)?)\s*(?:e|,)\s*r\s*=?\s*(-?\d+(?:\.\d+)?)(?:\s*(?:e\s+)?n\s*=?\s*(\d+))?/i
    );

    if (!match) {
        throw new Error(
            "Use: serie geometrica a=2 r=0.5 n=10"
        );
    }

    const a = Number(match[1]);
    const r = Number(match[2]);
    const n = match[3] ? Number(match[3]) : null;

    if (n !== null) {

        const resultado = geometricSeries(a, r, n);

        return {
            tipo: "Série geométrica finita",
            passos: [
                `Primeiro termo: a = ${a}`,
                `Razão: r = ${r}`,
                `Número de termos: n = ${n}`,
                `Sₙ = ${resultado}`
            ],
            resultado: `${resultado}`
        };
    }

    const resultado = infiniteGeometric(a, r);

    return {
        tipo: "Série geométrica infinita",
        passos: [
            `Primeiro termo: a = ${a}`,
            `Razão: r = ${r}`,
            `S = a / (1-r)`
        ],
        resultado: `${resultado}`
    };
}


// ===============================
// GRADIENTE
// ===============================

function resolverGradiente(texto) {

    const match = texto.match(
        /gradiente\s+de\s+(.+?)\s+em\s*x\s*=?\s*(-?\d+(?:\.\d+)?)\s*,?\s*y\s*=?\s*(-?\d+(?:\.\d+)?)/i
    );

    if (!match) {
        throw new Error(
            "Use: gradiente de x^2+y^2 em x=2,y=3"
        );
    }

    const expressao = match[1].trim();
    const x = Number(match[2]);
    const y = Number(match[3]);

    const f = (a, b) => {

        let e = expressao
            .replace(/\by\b/g, `(${b})`);

        return avaliarExpressao(e, a);
    };

    const resultado = gradient(f, x, y);

    return {
        tipo: "Gradiente",
        passos: [
            `f(x,y) = ${expressao}`,
            `x = ${x}`,
            `y = ${y}`,
            `∂f/∂x ≈ ${resultado.dx}`,
            `∂f/∂y ≈ ${resultado.dy}`
        ],
        resultado: `∇f = (${resultado.dx}, ${resultado.dy})`
    };
}


// ===============================
// ARITMÉTICA BÁSICA
// ===============================

function resolverExpressao(texto) {

    let expressao = converterMatematica(texto);

    const resultado = avaliarExpressao(expressao);

    return {
        tipo: "Cálculo matemático",
        passos: [
            `Expressão: ${expressao}`,
            "Calculando a expressão"
        ],
        resultado: `${resultado}`
    };
}


// ===============================
// IDENTIFICAR O PROBLEMA
// ===============================

function resolverProblema(pergunta) {

    let texto = normalizar(pergunta);

    // Remove palavras usadas para pedir a resolução
    texto = texto
        .replace(/^resolva\s+/i, "")
        .replace(/^resolver\s+/i, "")
        .replace(/^calcule\s+/i, "")
        .replace(/^calcular\s+/i, "")
        .replace(/^encontre\s+/i, "")
        .replace(/^determine\s+/i, "")
        .replace(/^qual\s+e\s+/i, "")
        .trim();

    // Segunda derivada
    if (texto.includes("segunda derivada")) {
        return resolverSegundaDerivada(texto);
    }

    // Derivada
    if (texto.includes("derivada")) {
        return resolverDerivada(texto);
    }

    // Integral
    if (texto.includes("integral")) {
        return resolverIntegral(texto);
    }

    // Raiz quadrada
    if (
        texto.includes("raiz quadrada") ||
        texto.startsWith("sqrt")
    ) {
        return resolverRaiz(texto);
    }

    // Fatorial
    if (
        texto.includes("fatorial") ||
        texto.includes("factorial")
    ) {
        return resolverFatorial(texto);
    }

    // Série geométrica
    if (texto.includes("serie geometrica")) {
        return resolverSerieGeometrica(texto);
    }

    // Gradiente
    if (texto.includes("gradiente")) {
        return resolverGradiente(texto);
    }

    // Equação do 2º grau
    if (
        texto.includes("=") &&
        texto.includes("x^2")
    ) {
        return resolverQuadratica(texto);
    }

    // Equação do 1º grau
    if (
        texto.includes("=") &&
        texto.includes("x")
    ) {
        return resolverLinear(texto);
    }

    // Cálculo simples
    return resolverExpressao(texto);
}
// ===============================
// SERVIDOR HTTP
// ===============================

const server = http.createServer((req, res) => {

    // ===========================
    // API
    // ===========================

    if (req.url === "/api/solve" && req.method === "POST") {

        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", () => {

            try {

                const data = JSON.parse(body);

                if (!data.question) {
                    throw new Error("Nenhuma pergunta enviada.");
                }

                const resposta = resolverProblema(data.question);

                res.writeHead(200, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(JSON.stringify(resposta));

            } catch (error) {

                res.writeHead(400, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(JSON.stringify({
                    tipo: "Erro",
                    passos: [
                        error.message
                    ],
                    resultado: "Não foi possível resolver o problema."
                }));
            }
        });

        return;
    }


    // ===========================
    // HEALTH CHECK
    // ===========================

    if (req.url === "/health") {

        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            status: "ok",
            app: "Dream AI"
        }));

        return;
    }


    // ===========================
    // ARQUIVOS DO SITE
    // ===========================

    let filePath;

    if (req.url === "/" || req.url === "/index.html") {
        filePath = path.join(__dirname, "public", "index.html");
    } else {
        filePath = path.join(
            __dirname,
            "public",
            req.url.replace(/^\/+/, "")
        );
    }

    const ext = path.extname(filePath);

    const contentTypes = {
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8"
    };

    fs.readFile(filePath, (error, content) => {

        if (error) {

            res.writeHead(404, {
                "Content-Type": "text/plain; charset=utf-8"
            });

            res.end("Página não encontrada.");
            return;
        }

        res.writeHead(200, {
            "Content-Type":
                contentTypes[ext] ||
                "application/octet-stream"
        });

        res.end(content);
    });
});


// ===============================
// INICIAR DREAM AI
// ===============================

server.listen(PORT, () => {

    console.log(
        `Dream AI rodando na porta ${PORT}`
    );

});
