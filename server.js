const express = require("express");
const { create, all } = require("mathjs");

const app = express();
const math = create(all);

app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;


// =====================================================
// PREPARAR EXPRESSÃO
// =====================================================

function preparar(texto) {
    return texto
        .toLowerCase()
        .replace(/,/g, ".")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/√/g, "sqrt")
        .replace(/π/g, "pi")
        .replace(/\^/g, "^")
        .trim();
}


// =====================================================
// CONVERTER EQUAÇÃO EM POLINÔMIO
// =====================================================

function obterPolinomio(equacao) {

    const partes = equacao.split("=");

    if (partes.length !== 2) {
        return null;
    }

    const esquerda = partes[0];
    const direita = partes[1];

    try {

        const exprEsquerda = math.parse(esquerda);
        const exprDireita = math.parse(direita);

        const expr = math.simplify(
            math.subtract(exprEsquerda, exprDireita)
        );

        return expr;

    } catch (error) {

        return null;
    }
}


// =====================================================
// ENCONTRAR COEFICIENTES
// =====================================================

function encontrarCoeficientes(expr) {

    try {

        // Descobrir grau através da expressão
        let grau = 0;

        for (let i = 0; i <= 4; i++) {

            try {

                const derivada = math.derivative(
                    expr.toString(),
                    "x"
                );

                let atual = expr;

                for (let j = 0; j < i; j++) {
                    atual = math.derivative(
                        atual.toString(),
                        "x"
                    );
                }

                const valor = math.evaluate(
                    atual.toString(),
                    { x: 0 }
                );

                if (valor !== 0 || i === 0) {
                    grau = Math.max(grau, i);
                }

            } catch {
                break;
            }
        }

        // Avaliar em vários pontos
        const pontos = [];

        for (let x = 0; x <= 4; x++) {

            const y = math.evaluate(
                expr.toString(),
                { x }
            );

            pontos.push(y);
        }

        // Interpolação para obter os coeficientes
        const matriz = [];
        const vetor = [];

        for (let i = 0; i <= 4; i++) {

            const linha = [];

            for (let j = 0; j <= 4; j++) {
                linha.push(Math.pow(i, j));
            }

            matriz.push(linha);
            vetor.push(pontos[i]);
        }

        const resultado = math.lusolve(
            matriz,
            vetor
        );

        return resultado.map(v => Number(v[0]));

    } catch (error) {

        return null;
    }
}


// =====================================================
// REMOVER ZEROS
// =====================================================

function limparCoeficientes(coeficientes) {

    let ultimo = coeficientes.length - 1;

    while (
        ultimo > 0 &&
        Math.abs(coeficientes[ultimo]) < 0.0000001
    ) {
        ultimo--;
    }

    return coeficientes.slice(0, ultimo + 1);
}


// =====================================================
// RESOLVER POLINÔMIO
// =====================================================

function resolverPolinomio(coeficientes) {

    coeficientes = limparCoeficientes(coeficientes);

    const grau = coeficientes.length - 1;

    if (grau < 1 || grau > 4) {
        return null;
    }

    try {

        const raizes = math.polynomialRoot(
            coeficientes.reverse()
        );

        return {
            grau,
            raizes
        };

    } catch (error) {

        return null;
    }
}


// =====================================================
// FORMATAR EQUAÇÃO
// =====================================================

function nomeGrau(grau) {

    const nomes = {
        1: "1.º grau",
        2: "2.º grau",
        3: "3.º grau",
        4: "4.º grau"
    };

    return nomes[grau] || `${grau}.º grau`;
}


// =====================================================
// RESOLVER EQUAÇÃO
// =====================================================

function resolverEquacao(texto) {

    const equacao = preparar(texto);

    if (!equacao.includes("=")) {
        return null;
    }

    const expr = obterPolinomio(equacao);

    if (!expr) {
        return null;
    }

    const coeficientes = encontrarCoeficientes(expr);

    if (!coeficientes) {
        return null;
    }

    const resultado = resolverPolinomio(coeficientes);

    if (!resultado) {
        return null;
    }

    const { grau, raizes } = resultado;

    let resposta = "";

    resposta += `EQUAÇÃO DO ${nomeGrau(grau)}\n\n`;

    resposta += `Equação:\n${texto}\n\n`;

    resposta += `Forma polinomial:\n`;

    const termos = [];

    for (
        let i = grau;
        i >= 0;
        i--
    ) {

        const coef = coeficientes[i];

        if (Math.abs(coef) < 0.0000001) {
            continue;
        }

        if (i === 0) {
            termos.push(`${coef}`);
        } else if (i === 1) {
            termos.push(`${coef}x`);
        } else {
            termos.push(`${coef}x^${i}`);
        }
    }

    resposta += termos.join(" + ");

    resposta += "\n\nRaízes encontradas:\n";

    raizes.forEach((raiz, index) => {

        resposta += `x${index + 1} = ${formatarNumero(raiz)}\n`;

    });

    return resposta;
}


// =====================================================
// FORMATAR NÚMEROS
// =====================================================

function formatarNumero(valor) {

    if (typeof valor === "number") {

        if (Math.abs(valor) < 0.0000001) {
            return "0";
        }

        return Number(valor.toFixed(8));
    }

    if (
        valor &&
        typeof valor === "object" &&
        "re" in valor
    ) {

        const re = Number(valor.re.toFixed(6));
        const im = Number(valor.im.toFixed(6));

        if (im === 0) {
            return re;
        }

        return `${re} ${im >= 0 ? "+" : "-"} ${Math.abs(im)}i`;
    }

    return String(valor);
}


// =====================================================
// EXPRESSÕES NORMAIS
// =====================================================

function calcularExpressao(texto) {

    const expressao = preparar(texto);

    try {

        const resultado = math.evaluate(expressao);

        return `
EXPRESSÃO MATEMÁTICA

Expressão:
${texto}

Resultado:
${formatarNumero(resultado)}
`;

    } catch {

        return null;
    }
}


// =====================================================
// DERIVADA
// =====================================================

function calcularDerivada(texto) {

    const q = preparar(texto);

    const match = q.match(
        /derivada\s+(?:de\s+)?(.+)/
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
DERIVADA

Função:
f(x) = ${expressao}

Derivada:
f'(x) = ${derivada.toString()}
`;

    } catch {

        return null;
    }
}


// =====================================================
// MOTOR DA DREAM
// =====================================================

function resolver(question, subject) {

    if (subject === "Matemática") {

        // Primeiro: equações
        const equacao = resolverEquacao(question);

        if (equacao) {
            return equacao;
        }

        // Segundo: derivadas
        const derivada = calcularDerivada(question);

        if (derivada) {
            return derivada;
        }

        // Terceiro: expressões
        const expressao = calcularExpressao(question);

        if (expressao) {
            return expressao;
        }
    }

    return `
A Dream ainda não conseguiu interpretar esse problema.

Exemplos:

2x + 5 = 15

x^2 - 5x + 6 = 0

x^3 - 6x^2 + 11x - 6 = 0

x^4 - 10x^2 + 9 = 0

2^10 + sqrt(144)

sin(pi / 2)

derivada x^2 + 3x
`;
}


// =====================================================
// API
// =====================================================

app.post("/api/solve", (req, res) => {

    try {

        const {
            question,
            subject
        } = req.body;

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

        console.error(
            "Erro Dream:",
            error
        );

        res.status(500).json({
            error: "Erro ao resolver o problema."
        });
    }
});


// =====================================================
// STATUS
// =====================================================

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
