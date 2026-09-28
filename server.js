const express = require("express");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;

function solveMath(question) {
    let q = question
        .toLowerCase()
        .replace(/,/g, ".")
        .trim();

    // Adição
    let match = q.match(/^(-?\d+(?:\.\d+)?)\s*\+\s*(-?\d+(?:\.\d+)?)$/);

    if (match) {
        const a = Number(match[1]);
        const b = Number(match[2]);

        return `Resolução:

${a} + ${b}

= ${a + b}

Resposta final: ${a + b}`;
    }

    // Subtração
    match = q.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);

    if (match) {
        const a = Number(match[1]);
        const b = Number(match[2]);

        return `Resolução:

${a} - ${b}

= ${a - b}

Resposta final: ${a - b}`;
    }

    // Multiplicação
    match = q.match(/^(-?\d+(?:\.\d+)?)\s*(?:\*|x|×)\s*(-?\d+(?:\.\d+)?)$/);

    if (match) {
        const a = Number(match[1]);
        const b = Number(match[2]);

        return `Resolução:

${a} × ${b}

= ${a * b}

Resposta final: ${a * b}`;
    }

    // Divisão
    match = q.match(/^(-?\d+(?:\.\d+)?)\s*(?:\/|÷)\s*(-?\d+(?:\.\d+)?)$/);

    if (match) {
        const a = Number(match[1]);
        const b = Number(match[2]);

        if (b === 0) {
            return "Não é possível dividir por zero.";
        }

        return `Resolução:

${a} ÷ ${b}

= ${a / b}

Resposta final: ${a / b}`;
    }

    // Raiz quadrada
    match = q.match(/(?:raiz quadrada de|√)\s*(\d+(?:\.\d+)?)/);

    if (match) {
        const n = Number(match[1]);
        const result = Math.sqrt(n);

        return `Resolução:

√${n}

= ${result}

Resposta final: ${result}`;
    }

    // Equação simples: 2x + 5 = 15
    match = q.match(
        /^(-?\d+(?:\.\d+)?)x\s*([+-])\s*(\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)$/
    );

    if (match) {
        const a = Number(match[1]);
        const sinal = match[2];
        const b = Number(match[3]);
        const c = Number(match[4]);

        const valorB = sinal === "+" ? b : -b;

        const x = (c - valorB) / a;

        return `Resolução da equação:

${a}x ${sinal} ${b} = ${c}

${a}x = ${c} ${valorB >= 0 ? "-" : "+"} ${Math.abs(valorB)}

${a}x = ${c - valorB}

x = (${c - valorB}) / ${a}

x = ${x}

Resposta final: x = ${x}`;
    }

    return `Ainda não consigo resolver esse tipo de problema no meu motor atual.

Experimente escrever, por exemplo:

2 + 5
20 - 8
6 × 7
40 ÷ 5
√144
2x + 5 = 15`;
}


// API da Dream
app.post("/api/solve", (req, res) => {

    const { question, subject } = req.body;

    if (!question) {
        return res.status(400).json({
            error: "Digite um problema."
        });
    }

    let answer;

    if (subject === "Matemática") {
        answer = solveMath(question);
    } else {
        answer =
            `A Dream recebeu o problema de ${subject}.\n\n` +
            `O motor local atualmente está focado em Matemática.`;
    }

    res.json({
        answer
    });
});


// Teste
app.get("/health", (req, res) => {
    res.json({
        status: "online",
        dream: "Dream IA"
    });
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dream IA funcionando na porta ${PORT}`);
});
