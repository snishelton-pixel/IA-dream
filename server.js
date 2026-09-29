const express = require("express");
const { create, all } = require("mathjs");

const app = express();

const math = create(all);

app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;


// ===============================
// CONVERTER TEXTO PARA MATEMÁTICA
// ===============================

function prepararExpressao(texto) {

    let q = texto
        .toLowerCase()
        .trim();

    q = q.replace(/,/g, ".");
    q = q.replace(/×/g, "*");
    q = q.replace(/÷/g, "/");
    q = q.replace(/√/g, "sqrt");

    q = q.replace(/sen/g, "sin");
    q = q.replace(/tg/g, "tan");

    q = q.replace(/π/g, "pi");

    return q;
}


// ===============================
// EQUAÇÃO
// ===============================

function resolverEquacao(texto) {

    let q = prepararExpressao(texto);

    if (!q.includes("=")) {
        return null;
    }

    const partes = q.split("=");

    if (partes.length !== 2) {
        return null;
    }

    const esquerda = partes[0].trim();
    const direita = partes[1].trim();

    // Detecta equações lineares
    const regex = /^([+-]?\d*\.?\d*)x([+-]\d+\.?\d*)?$/;

    const match = esquerda.match(regex);

    if (match) {

        let a = match[1];

        if (a === "" || a === "+") a = 1;
        if (a === "-") a = -1;

        a = Number(a);

        let b = match[2] ? Number(match[2]) : 0;

        const c = Number(direita);

        if (a === 0) {
            return "Essa não é uma equação válida.";
        }

        const x = (c - b) / a;

        return `
Resolução da equação:

${texto}

1. Passamos o termo independente para o outro membro:

${a}x = ${c - b}

2. Dividimos pelo coeficiente de x:

x = ${c - b} / ${a}

3. Resultado:

x = ${x}
`;
    }

    return null;
}


// ===============================
// CALCULAR EXPRESSÕES
// ===============================

function calcularExpressao(texto) {

    const expressao = prepararExpressao(texto);

    try {

        const resultado = math.evaluate(expressao);

        return `
Expressão:

${texto}

Cálculo:

${expressao}

Resultado:

${resultado}
`;

    } catch (error) {

        return null;
    }
}


// ===============================
// DERIVADA
// ===============================

function calcularDerivada(texto) {

    const q = prepararExpressao(texto);

    const match = q.match(
        /derivada\s+(?:de\s+)?(.+?)(?:\s+em\s+relação\s+a\s+x)?$/
    );

    if (!match) {
        return null;
    }

    try {

        const expressao = match[1];

        const derivada = math.derivative(
            expressao,
            "x"
        );

        return `
Derivada:

f(x) = ${expressao}

Aplicando a derivação:

f'(x) = ${derivada.toString()}
`;

    } catch (error) {

        return null;
    }
}


// ===============================
// RESOLVER
// ===============================

function resolver(question, subject) {

    // Matemática
    if (subject === "Matemática") {

        // Derivadas
        const derivada = calcularDerivada(question);

        if (derivada) {
            return derivada;
        }

        // Equações
        const equacao = resolverEquacao(question);

        if (equacao) {
            return equacao;
        }

        // Expressões complexas
        const calculo = calcularExpressao(question);

        if (calculo) {
            return calculo;
        }
    }

    return `
A Dream ainda não reconhece esse tipo de problema.

Experimente:

2^5 + sqrt(144)

sin(pi / 2)

cos(pi)

(5^2 + 3^2) / 2

2*x + 5 = 15

derivada x^2 + 3*x
`;
}


// ===============================
// API
// ===============================

app.post("/api/solve", (req, res) => {

    try {

        const { question, subject } = req.body;

        if (!question) {

            return res.status(400).json({
                error: "Digite um problema."
            });

        }

        const answer = resolver(
            question,
            subject || "Matemática"
        );

        res.json({
            answer
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Erro ao resolver o problema."
        });
    }
});


// ===============================
// STATUS
// ===============================

app.get("/health", (req, res) => {

    res.json({
        status: "online",
        name: "Dream IA",
        engine: "Dream Math Engine"
    });

});


app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Dream IA funcionando na porta ${PORT}`
    );

});
