const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

function solveEquation(input) {
    let equation = input.trim().replace(/\s+/g, "");

    // Equações lineares simples
    const match = equation.match(
        /^([+-]?\d*\.?\d*)x([+-]\d*\.?\d*)=([+-]?\d*\.?\d*)$/
    );

    if (match) {
        let a = match[1];
        let b = match[2];
        let c = match[3];

        if (a === "" || a === "+") a = 1;
        else if (a === "-") a = -1;
        else a = Number(a);

        b = b === "" ? 0 : Number(b);
        c = Number(c);

        const x = (c - b) / a;

        return {
            tipo: "Equação do 1.º grau",
            resultado: `x = ${x}`,
            passos: [
                `Equação inicial: ${equation}`,
                `Identificamos a forma ax + b = c`,
                `a = ${a}, b = ${b}, c = ${c}`,
                `Passamos ${b} para o outro membro: ${a}x = ${c - b}`,
                `Dividimos ambos os membros por ${a}`,
                `x = (${c - b}) / ${a}`,
                `x = ${x}`
            ]
        };
    }

    // Equações com frações do formato:
    // (ax+b)/m - (cx+d)/n = k
    const frac = equation.match(
        /^\(([-+]?\d*)x([+-]\d+)\)\/(\d+)-\(([-+]?\d*)x([+-]\d+)\)\/(\d+)=(\d+)$/
    );

    if (frac) {
        let a1 = frac[1] === "" ? 1 : Number(frac[1]);
        let b1 = Number(frac[2]);
        let d1 = Number(frac[3]);

        let a2 = frac[4] === "" ? 1 : Number(frac[4]);
        let b2 = Number(frac[5]);
        let d2 = Number(frac[6]);

        let c = Number(frac[7]);

        const x = (c - b1 / d1 + b2 / d2) /
                  (a1 / d1 - a2 / d2);

        return {
            tipo: "Equação do 1.º grau com frações",
            resultado: `x = ${x}`,
            passos: [
                `Equação inicial: ${equation}`,
                `MMC de ${d1} e ${d2} = ${d1 * d2}`,
                `Multiplicamos toda a equação pelo MMC`,
                `Eliminamos os denominadores`,
                `Desenvolvemos os parênteses`,
                `Agrupamos os termos que contêm x`,
                `Isolamos x`,
                `x = ${x}`
            ]
        };
    }

    // Equação quadrática simples ax² + bx + c = 0
    const quad = equation.match(
        /^([+-]?\d*)x\^2([+-]\d*)x([+-]\d*)=0$/
    );

    if (quad) {
        let a = quad[1];
        let b = quad[2];
        let c = quad[3];

        a = a === "" || a === "+" ? 1 :
            a === "-" ? -1 : Number(a);

        b = b === "" || b === "+" ? 1 :
            b === "-" ? -1 : Number(b);

        c = Number(c);

        const delta = b * b - 4 * a * c;

        if (delta < 0) {
            return {
                tipo: "Equação do 2.º grau",
                resultado: "Não existem raízes reais.",
                passos: [
                    `Equação inicial: ${equation}`,
                    `Identificamos uma equação do 2.º grau`,
                    `Calculamos o discriminante: Δ = b² - 4ac`,
                    `Δ = ${delta}`,
                    `Como Δ < 0, não existem soluções reais.`
                ]
            };
        }

        const x1 = (-b + Math.sqrt(delta)) / (2 * a);
        const x2 = (-b - Math.sqrt(delta)) / (2 * a);

        return {
            tipo: "Equação do 2.º grau",
            resultado: `x₁ = ${x1}, x₂ = ${x2}`,
            passos: [
                `Equação inicial: ${equation}`,
                `Identificamos uma equação do 2.º grau`,
                `a = ${a}, b = ${b}, c = ${c}`,
                `Calculamos Δ = b² - 4ac`,
                `Δ = ${delta}`,
                `Aplicamos a fórmula de Bhaskara`,
                `x₁ = (-b + √Δ) / 2a`,
                `x₂ = (-b - √Δ) / 2a`,
                `x₁ = ${x1}`,
                `x₂ = ${x2}`
            ]
        };
    }

    // Operações matemáticas simples
    try {
        if (/^[0-9+\-*/().\s]+$/.test(equation)) {
            const result = Function(`"use strict"; return (${equation})`)();

            return {
                tipo: "Expressão matemática",
                resultado: String(result),
                passos: [
                    `Expressão: ${equation}`,
                    "Aplicamos a ordem das operações",
                    `Resultado = ${result}`
                ]
            };
        }
    } catch (e) {}

    return {
        tipo: "Expressão não reconhecida",
        resultado: "Não consegui resolver esta expressão.",
        passos: [
            "Analisei a expressão enviada.",
            "O formato ainda não está incluído no motor matemático.",
            "Tente uma equação do 1.º ou 2.º grau ou uma operação matemática."
        ]
    };
}

const server = http.createServer((req, res) => {

    if (req.method === "POST" && req.url === "/api/solve") {

        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", () => {

            try {
                const data = JSON.parse(body);
                const question = data.question || data.input || "";

                const answer = solveEquation(question);

                res.writeHead(200, {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                });

                res.end(JSON.stringify(answer));

            } catch (error) {

                res.writeHead(400, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify({
                    error: "Erro ao processar a equação."
                }));
            }
        });

        return;
    }

    let filePath = req.url === "/"
        ? path.join(__dirname, "public", "index.html")
        : path.join(__dirname, "public", req.url);

    if (!filePath.startsWith(path.join(__dirname, "public"))) {
        res.writeHead(403);
        return res.end("Acesso negado");
    }

    fs.readFile(filePath, (err, data) => {

        if (err) {
            res.writeHead(404);
            return res.end("Página não encontrada");
        }

        const ext = path.extname(filePath);

        const types = {
            ".html": "text/html",
            ".js": "application/javascript",
            ".css": "text/css"
        };

        res.writeHead(200, {
            "Content-Type": types[ext] || "text/plain"
        });

        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`Dream está funcionando na porta ${PORT}`);
});
