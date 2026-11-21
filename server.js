const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// Normalizar símbolos matemáticos
function normalizar(texto) {
    return String(texto)
        .replace(/[²]/g, "^2")
        .replace(/[³]/g, "^3")
        .replace(/[⁴]/g, "^4")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/[−–]/g, "-")
        .replace(/,/g, ".")
        .replace(/\s+/g, "")
        .replace(/(\d)x/gi, "$1*x")
        .replace(/(\d)\(/g, "$1*(")
        .replace(/\)(\d|x)/gi, ")*$1")
        .replace(/x\(/gi, "x*(");
}

// Avaliar apenas expressões numéricas simples
function calcular(expressao) {
    let e = expressao.replace(/\^/g, "**");

    if (!/^[0-9+\-*/().*]+$/.test(e)) {
        throw new Error("Expressão inválida.");
    }

    const resultado = Function('"use strict"; return (' + e + ')')();

    if (!Number.isFinite(resultado)) {
        throw new Error("Não foi possível calcular.");
    }

    return resultado;
}

function formatar(numero) {
    if (Math.abs(numero) < 1e-10) numero = 0;
    return Number(numero.toFixed(8)).toString();
}

// Resolver equações com x
function resolverEquacao(expressao) {
    const partes = expressao.split("=");

    if (partes.length > 2) {
        throw new Error("Equação inválida.");
    }

    const esquerda = partes[0];
    const direita = partes.length === 2 ? partes[1] : "0";

    if (!/[x]/i.test(esquerda + direita)) {
        throw new Error("Não foi encontrada a variável x.");
    }

    function funcao(x) {
        const l = calcular(esquerda.replace(/x/gi, `(${x})`));
        const r = calcular(direita.replace(/x/gi, `(${x})`));
        return l - r;
    }

    const c = funcao(0);
    const f1 = funcao(1);
    const fm1 = funcao(-1);

    const a = (f1 + fm1 - 2 * c) / 2;
    const b = (f1 - fm1) / 2;

    const passos = [
        `Equação original: ${expressao}`,
        "Colocamos todos os termos no primeiro membro.",
        "Identificamos os coeficientes da equação."
    ];

    if (Math.abs(a) < 1e-8) {
        if (Math.abs(b) < 1e-8) {
            if (Math.abs(c) < 1e-8) {
                return {
                    tipo: "Identidade",
                    passos: [...passos, "A igualdade é verdadeira para qualquer valor de x."],
                    resultado: "Infinitas soluções"
                };
            }
            return {
                tipo: "Equação impossível",
                passos: [...passos, `${formatar(c)} = 0 é falso.`],
                resultado: "Sem solução"
            };
        }

        const x = -c / b;
        passos.push(`Equação reduzida: ${formatar(b)}x + (${formatar(c)}) = 0`);
        passos.push(`${formatar(b)}x = ${formatar(-c)}`);
        passos.push(`Dividimos os dois membros por ${formatar(b)}.`);
        passos.push(`x = ${formatar(-c)} / ${formatar(b)}`);

        return {
            tipo: "Equação do 1.º grau",
            passos,
            resultado: `x = ${formatar(x)}`
        };
    }

    const delta = b * b - 4 * a * c;

    passos.push(`Forma geral: ax² + bx + c = 0`);
    passos.push(`a = ${formatar(a)}, b = ${formatar(b)}, c = ${formatar(c)}`);
    passos.push("Calculamos o discriminante: Δ = b² - 4ac.");
    passos.push(`Δ = (${formatar(b)})² - 4 × ${formatar(a)} × (${formatar(c)})`);
    passos.push(`Δ = ${formatar(delta)}`);

    if (delta < -1e-8) {
        passos.push("Como Δ é negativo, não existem raízes reais.");
        return {
            tipo: "Equação do 2.º grau",
            passos,
            resultado: "Não existem soluções reais"
        };
    }

    if (Math.abs(delta) <= 1e-8) {
        const x = -b / (2 * a);
        passos.push("Como Δ = 0, existe uma única solução real.");
        passos.push(`x = -b / 2a = ${formatar(x)}`);

        return {
            tipo: "Equação do 2.º grau",
            passos,
            resultado: `x = ${formatar(x)}`
        };
    }

    const x1 = (-b + Math.sqrt(delta)) / (2 * a);
    const x2 = (-b - Math.sqrt(delta)) / (2 * a);

    passos.push("Aplicamos a fórmula resolvente:");
    passos.push("x = (-b ± √Δ) / 2a");
    passos.push(`x₁ = ${formatar(x1)}`);
    passos.push(`x₂ = ${formatar(x2)}`);

    return {
        tipo: "Equação do 2.º grau",
        passos,
        resultado: `x₁ = ${formatar(x1)} e x₂ = ${formatar(x2)}`
    };
}

function resolverProblema(pergunta) {
    let expressao = normalizar(pergunta);

    expressao = expressao.replace(
        /^(resolva|resolver|calcule|calcular|determine|encontre|quantoé|qualé)/i,
        ""
    );

    if (expressao.includes("x")) {
        return resolverEquacao(expressao);
    }

    const resultado = calcular(expressao);

    return {
        tipo: "Expressão aritmética",
        passos: [
            `Expressão original: ${pergunta}`,
            `Aplicamos a ordem das operações: primeiro parênteses, depois potências, multiplicações e divisões, e por fim adições e subtrações.`,
            `Calculamos a expressão: ${expressao}`,
            `Resultado do cálculo: ${formatar(resultado)}`
        ],
        resultado: formatar(resultado)
    };
}

// Servidor
const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }

    if (req.method === "POST" && req.url === "/api/solve") {
        let body = "";

        req.on("data", chunk => {
            body += chunk;
            if (body.length > 100000) req.destroy();
        });

        req.on("end", () => {
            try {
                const dados = JSON.parse(body);
                if (!dados.question || !String(dados.question).trim()) {
                    throw new Error("Escreve um exercício primeiro.");
                }

                const resposta = resolverProblema(dados.question);

                res.writeHead(200, {
                    "Content-Type": "application/json; charset=utf-8"
                });
                res.end(JSON.stringify(resposta));
            } catch (erro) {
                res.writeHead(400, {
                    "Content-Type": "application/json; charset=utf-8"
                });
                res.end(JSON.stringify({
                    erro: erro.message,
                    tipo: "Não identificado",
                    passos: [],
                    resultado: "Não foi possível resolver o exercício."
                }));
            }
        });

        return;
    }

    const solicitado = req.url === "/" ? "index.html" : req.url.split("?")[0].replace(/^\/+/, "");
    const arquivo = path.resolve(PUBLIC_DIR, solicitado);

    if (!arquivo.startsWith(PUBLIC_DIR + path.sep)) {
        res.writeHead(403);
        return res.end("Acesso negado.");
    }

    fs.readFile(arquivo, (erro, conteudo) => {
        if (erro) {
            res.writeHead(404);
            return res.end("Ficheiro não encontrado.");
        }

        const extensao = path.extname(arquivo);
        const tipos = {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "application/javascript"
        };

        res.writeHead(200, {
            "Content-Type": (tipos[extensao] || "text/plain") + "; charset=utf-8"
        });
        res.end(conteudo);
    });
});

server.listen(PORT, () => {
    console.log(`Dream IA online na porta ${PORT}`);
});

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

    let e = String(expr)
        .trim()
        .replace(/\s+/g, "")
        .replace(/,/g, ".")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/·/g, "*")
        .replace(/−/g, "-")
        .replace(/²/g, "^2")
        .replace(/³/g, "^3")
        .replace(/⁴/g, "^4");

    // Potências
    e = e.replace(/\^/g, "**");

    // Raiz quadrada e pi
    e = e.replace(/\bpi\b/gi, "Math.PI");
    e = e.replace(/sqrt\(/gi, "Math.sqrt(");

    // Multiplicação implícita
    e = e.replace(/(\d)(x)/g, "$1*$2");
    e = e.replace(/(\d)\(/g, "$1*(");
    e = e.replace(/\)(\d|x)/g, ")*$1");
    e = e.replace(/x\(/g, "x*(");

    // Verificar caracteres permitidos
    if (!/^[0-9x+\-*/().,%A-Za-z_]+$/.test(e)) {
        throw new Error("Expressão inválida");
    }

    // Bloquear identificadores não permitidos
    const identificadores = e.match(/[A-Za-z_]+/g) || [];

    for (const nome of identificadores) {
        if (!["x", "Math", "PI", "sqrt"].includes(nome)) {
            throw new Error("Operação não permitida: " + nome);
        }
    }

    const resultado = Function(
        "x",
        '"use strict"; return (' + e + ');'
    )(x);

    if (typeof resultado !== "number" || !Number.isFinite(resultado)) {
        throw new Error("Não foi possível calcular esta expressão.");
    }

    return resultado;
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

    const esquerda = partes[0].trim();
    const direita = partes[1].trim();

    // Coloca toda a equação no primeiro membro:
    // esquerda - direita = 0
    const funcao = (x) => {
        return avaliarExpressao(esquerda, x) -
               avaliarExpressao(direita, x);
    };

    // Obtém os coeficientes:
    // ax² + bx + c = 0

    const c = funcao(0);

    const valor1 = funcao(1);
    const valorMenos1 = funcao(-1);

    const a = (valor1 + valorMenos1 - 2 * c) / 2;
    const b = (valor1 - valorMenos1) / 2;

    // Verifica se realmente é uma equação do 2º grau
    if (Math.abs(a) < 1e-10) {
        throw new Error("Esta não é uma equação do 2º grau.");
    }

    const delta = b * b - 4 * a * c;

    // Sem raízes reais
    if (delta < 0) {

        return {
            tipo: "Equação do 2º grau",
            passos: [
                `a = ${a}`,
                `b = ${b}`,
                `c = ${c}`,
                `Δ = b² - 4ac`,
                `Δ = ${delta}`,
                "Como Δ < 0, não existem raízes reais."
            ],
            resultado: "Sem raízes reais"
        };
    }

    const x1 = (-b + Math.sqrt(delta)) / (2 * a);
    const x2 = (-b - Math.sqrt(delta)) / (2 * a);

    // Equação com uma única raiz
    if (Math.abs(x1 - x2) < 1e-10) {

        return {
            tipo: "Equação do 2º grau incompleta",
            passos: [
                `a = ${a}`,
                `b = ${b}`,
                `c = ${c}`,
                `Δ = b² - 4ac`,
                `Δ = ${delta}`,
                `x = -b / 2a`,
                `x = ${x1}`
            ],
            resultado: `x = ${x1}`
        };
    }

    return {
        tipo: "Equação do 2º grau",
        passos: [
            `a = ${a}`,
            `b = ${b}`,
            `c = ${c}`,
            `Δ = b² - 4ac`,
            `Δ = ${delta}`,
            `x₁ = (-b + √Δ) / 2a`,
            `x₂ = (-b - √Δ) / 2a`
        ],
        resultado: `x₁ = ${x1} ; x₂ = ${x2}`
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
