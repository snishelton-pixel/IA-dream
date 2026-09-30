const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

// ===============================
// FUNÇÕES AUXILIARES
// ===============================

function limpar(texto) {
    return texto
        .trim()
        .replace(/\s+/g, "")
        .replace(/²/g, "^2")
        .replace(/³/g, "^3")
        .replace(/⁴/g, "^4")
        .replace(/−/g, "-")
        .replace(/×/g, "*")
        .replace(/÷/g, "/");
}

function numeroBonito(n) {
    if (Number.isInteger(n)) return String(n);

    return Number(n.toFixed(10)).toString();
}

function coeficiente(valor) {
    if (valor === "" || valor === "+") return 1;
    if (valor === "-") return -1;
    return Number(valor);
}

// ===============================
// EQUAÇÃO DO 1.º GRAU
// ===============================

function resolverPrimeiroGrau(equacao) {

    const partes = equacao.split("=");

    if (partes.length !== 2) return null;

    const esquerda = partes[0];
    const direita = partes[1];

    // Procura ax + b nos dois lados
    function extrair(expressao) {

        let a = 0;
        let b = 0;

        const termos = expressao.match(/[+-]?[^+-]+/g);

        if (!termos) return null;

        for (let termo of termos) {

            if (termo.includes("x")) {

                const c = termo.replace("x", "");

                a += coeficiente(c);

            } else {

                b += Number(termo);
            }
        }

        return { a, b };
    }

    const L = extrair(esquerda);
    const R = extrair(direita);

    if (!L || !R) return null;

    // Se não existe x, não é equação do 1.º grau
    if (L.a === 0 && R.a === 0) return null;

    const A = L.a - R.a;
    const B = R.b - L.b;

    if (A === 0) return null;

    const x = B / A;

    return {
        tipo: "Equação do 1.º grau",
        resultado: `x = ${numeroBonito(x)}`,
        passos: [
            `Equação inicial: ${equacao}`,
            `Passamos os termos que contêm x para o primeiro membro.`,
            `Passamos os termos independentes para o segundo membro.`,
            `${numeroBonito(A)}x = ${numeroBonito(B)}`,
            `Dividimos ambos os membros por ${numeroBonito(A)}.`,
            `x = ${numeroBonito(B)} ÷ ${numeroBonito(A)}`,
            `x = ${numeroBonito(x)}`
        ]
    };
}

// ===============================
// EQUAÇÃO DO 2.º GRAU
// ===============================

function resolverSegundoGrau(equacao) {

    if (!equacao.endsWith("=0")) return null;

    const expressao = equacao.substring(0, equacao.length - 2);

    // Procura termos x², x e número
    const termos = expressao.match(/[+-]?[^+-]+/g);

    if (!termos) return null;

    let a = 0;
    let b = 0;
    let c = 0;

    for (let termo of termos) {

        if (termo.includes("x^2")) {

            const valor = termo.replace("x^2", "");
            a += coeficiente(valor);

        } else if (termo.includes("x")) {

            const valor = termo.replace("x", "");
            b += coeficiente(valor);

        } else {

            c += Number(termo);
        }
    }

    if (a === 0) return null;

    const delta = b * b - 4 * a * c;

    if (delta < 0) {

        return {
            tipo: "Equação do 2.º grau",
            resultado: "Não existem soluções reais.",
            passos: [
                `Equação inicial: ${equacao}`,
                `Identificamos uma equação do 2.º grau.`,
                `a = ${a}, b = ${b}, c = ${c}`,
                `Calculamos o discriminante: Δ = b² - 4ac`,
                `Δ = (${b})² - 4(${a})(${c})`,
                `Δ = ${delta}`,
                `Como Δ < 0, não existem soluções reais.`
            ]
        };
    }

    const raizDelta = Math.sqrt(delta);

    const x1 = (-b + raizDelta) / (2 * a);
    const x2 = (-b - raizDelta) / (2 * a);

    return {
        tipo: "Equação do 2.º grau",
        resultado: `x₁ = ${numeroBonito(x1)}, x₂ = ${numeroBonito(x2)}`,
        passos: [
            `Equação inicial: ${equacao}`,
            `Identificamos uma equação do 2.º grau.`,
            `a = ${a}, b = ${b}, c = ${c}`,
            `Calculamos o discriminante: Δ = b² - 4ac`,
            `Δ = (${b})² - 4(${a})(${c})`,
            `Δ = ${delta}`,
            `Calculamos √Δ = ${numeroBonito(raizDelta)}`,
            `Aplicamos a fórmula de Bhaskara: x = (-b ± √Δ) / 2a`,
            `x₁ = (-${b} + √${delta}) / ${2 * a}`,
            `x₂ = (-${b} - √${delta}) / ${2 * a}`,
            `x₁ = ${numeroBonito(x1)}`,
            `x₂ = ${numeroBonito(x2)}`
        ]
    };
}

// ===============================
// EQUAÇÕES COM FRAÇÕES
// ===============================

function resolverFracao(equacao) {

    if (!equacao.includes("/") || !equacao.includes("=")) {
        return null;
    }

    const partes = equacao.split("=");

    if (partes.length !== 2) return null;

    const esquerda = partes[0];
    const direita = Number(partes[1]);

    if (isNaN(direita)) return null;

    /*
      Suporta expressões como:

      (2x-3)/5+(x+4)/3=7
      (2x+3)/5-(x-1)/2=4
    */

    const regex =
        /\(([+-]?\d*x[+-]?\d+)\)\/(\d+)/g;

    const fracoes = [...esquerda.matchAll(regex)];

    if (fracoes.length < 2) return null;

    let A = 0;
    let B = 0;
    let denominadores = [];

    for (let i = 0; i < fracoes.length; i++) {

        const expressao = fracoes[i][1];
        const denominador = Number(fracoes[i][2]);

        denominadores.push(denominador);

        const sinalAnterior =
            i === 0
                ? 1
                : esquerda.substring(
                    fracoes[i - 1].index + fracoes[i - 1][0].length,
                    fracoes[i].index
                ).includes("-")
                    ? -1
                    : 1;

        const termos = expressao.match(
            /^([+-]?\d*)x([+-]\d+)$/
        );

        if (!termos) continue;

        const a = coeficiente(termos[1]);
        const b = Number(termos[2]);

        A += sinalAnterior * a / denominador;
        B += sinalAnterior * b / denominador;
    }

    if (A === 0) return null;

    const x = (direita - B) / A;

    const mmc = denominadores.reduce(
        (a, b) => Math.abs(a * b) / gcd(a, b)
    );

    return {
        tipo: "Equação do 1.º grau com frações",
        resultado: `x = ${numeroBonito(x)}`,
        passos: [
            `Equação inicial: ${equacao}`,
            `Identificamos uma equação do 1.º grau com frações.`,
            `Denominadores: ${denominadores.join(", ")}`,
            `MMC = ${mmc}`,
            `Multiplicamos toda a equação pelo MMC.`,
            `Eliminamos os denominadores.`,
            `Agrupamos os termos que contêm x.`,
            `Isolamos x.`,
            `x = ${numeroBonito(x)}`
        ]
    };
}

function gcd(a, b) {
    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }

    return Math.abs(a);
}

// ===============================
// OPERAÇÕES SIMPLES
// ===============================

function resolverOperacao(equacao) {

    if (!/^[0-9+\-*/().\s]+$/.test(equacao)) {
        return null;
    }

    try {

        const resultado = Function(
            `"use strict"; return (${equacao})`
        )();

        return {
            tipo: "Expressão matemática",
            resultado: String(resultado),
            passos: [
                `Expressão inicial: ${equacao}`,
                "Aplicamos a ordem das operações.",
                `Resultado = ${resultado}`
            ]
        };

    } catch {
        return null;
    }
}

// ===============================
// MOTOR PRINCIPAL
// ===============================

function resolver(input) {

    const equacao = limpar(input);

    // Primeiro verifica frações
    let resposta = resolverFracao(equacao);
    if (resposta) return resposta;

    // Depois segundo grau
    resposta = resolverSegundoGrau(equacao);
    if (resposta) return resposta;

    // Depois primeiro grau
    resposta = resolverPrimeiroGrau(equacao);
    if (resposta) return resposta;

    // Por último operações
    resposta = resolverOperacao(equacao);
    if (resposta) return resposta;

    return {
        tipo: "Formato não reconhecido",
        resultado: "Ainda não consigo resolver este formato.",
        passos: [
            `Recebi: ${input}`,
            "Analisei a estrutura matemática.",
            "O formato ainda não está implementado no motor."
        ]
    };
}

// ===============================
// SERVIDOR
// ===============================

const server = http.createServer((req, res) => {

    if (req.method === "POST" && req.url === "/api/solve") {

        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", () => {

            try {

                const data = JSON.parse(body);

                const question =
                    data.question ||
                    data.input ||
                    "";

                const resposta = resolver(question);

                res.writeHead(200, {
                    "Content-Type": "application/json; charset=utf-8",
                    "Access-Control-Allow-Origin": "*"
                });

                res.end(JSON.stringify(resposta));

            } catch (error) {

                res.writeHead(400, {
                    "Content-Type": "application/json; charset=utf-8"
                });

                res.end(JSON.stringify({
                    tipo: "Erro",
                    resultado: "Não foi possível processar a questão.",
                    passos: [
                        error.message
                    ]
                }));
            }
        });

        return;
    }

    let filePath;

    if (req.url === "/") {
        filePath = path.join(__dirname, "public", "index.html");
    } else {
        filePath = path.join(
            __dirname,
            "public",
            decodeURIComponent(req.url)
        );
    }

    const publicPath = path.join(__dirname, "public");

    if (!filePath.startsWith(publicPath)) {
        res.writeHead(403);
        return res.end("Acesso negado");
    }

    fs.readFile(filePath, (error, data) => {

        if (error) {
            res.writeHead(404);
            return res.end("Página não encontrada");
        }

        const ext = path.extname(filePath);

        const types = {
            ".html": "text/html; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8"
        };

        res.writeHead(200, {
            "Content-Type":
                types[ext] || "text/plain; charset=utf-8"
        });

        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`Dream AI funcionando na porta ${PORT}`);
});
