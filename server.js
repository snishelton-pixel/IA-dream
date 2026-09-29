const express = require("express");
const { create, all } = require("mathjs");

const numerical = require("./engine/numerical");
const multivariable = require("./engine/multivariable");
const series = require("./engine/series");

const app = express();

const math = create(all);

app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;


// ============================================
// EXPRESSÃO MATEMÁTICA
// ============================================

function calcular(expressao) {

    const resultado = math.evaluate(
        expressao
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/√/g, "sqrt")
            .replace(/π/g, "pi")
    );

    return resultado;
}


// ============================================
// DERIVADA
// ============================================

function derivar(expressao) {

    const resultado =
        math.derivative(
            expressao,
            "x"
        );

    return resultado.toString();
}


// ============================================
// EQUAÇÕES POLINOMIAIS
// ============================================

function equacaoPolynomial(expressao) {

    const partes = expressao.split("=");

    if (partes.length !== 2) {
        return null;
    }

    const esquerda =
        partes[0];

    const direita =
        partes[1];

    const expr =
        math.simplify(
            `${esquerda}-(${direita})`
        );

    return expr.toString();
}


// ============================================
// INTERPRETADOR DREAM
// ============================================

function resolver(question) {

    const q = question
        .toLowerCase()
        .trim();


    // DERIVADA
    if (q.startsWith("derivada")) {

        const expressao =
            q.replace(
                "derivada",
                ""
            ).trim();

        return `
DERIVADA

f(x) = ${expressao}

f'(x) = ${derivar(expressao)}
`;
    }


    // INTEGRAL NUMÉRICA
    if (q.startsWith("integral")) {

        return `
Para integrais definidas, a Dream
pode utilizar integração numérica.

Formato:

integral de f(x) de a até b

Exemplo:

integral de x^2 de 0 até 3
`;
    }


    // EQUAÇÃO
    if (q.includes("=")) {

        const polinomio =
            equacaoPolynomial(q);

        if (polinomio) {

            return `
EQUAÇÃO

Equação:
${question}

Forma reduzida:
${polinomio}

A Dream identificou uma equação
e pode encaminhá-la para o
solucionador correspondente.
`;
        }
    }


    // EXPRESSÃO
    try {

        const resultado =
            calcular(question);

        return `
CÁLCULO

${question}

Resultado:

${resultado}
`;

    } catch {

        return `
A Dream não conseguiu interpretar
este exercício automaticamente.

Tente escrever a expressão usando:

+
-
*
/
^
sqrt()
sin()
cos()
tan()
log()
`;
    }
}


// ============================================
// API
// ============================================

app.post(
    "/api/solve",
    (req, res) => {

        try {

            const {
                question,
                subject
            } = req.body;

            if (!question) {

                return res.status(400).json({
                    error:
                        "Digite um problema."
                });
            }

            const answer =
                resolver(question);

            res.json({
                answer,
                subject
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error:
                    error.message
            });
        }
    }
);


// ============================================
// STATUS
// ============================================

app.get(
    "/health",
    (req, res) => {

        res.json({
            status: "online",
            name: "Dream IA",
            engine:
                "Dream Mathematical Engine"
        });
    }
);


app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Dream IA online na porta ${PORT}`
        );
    }
);
