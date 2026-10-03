async function resolver() {

    const input = document.getElementById("question").value;
    const resultado = document.getElementById("resultado");

    if (!input.trim()) {
        resultado.innerHTML = "Digite uma equação.";
        return;
    }

    resultado.innerHTML = "🧠 A Dream está resolvendo...";

    try {

        const response = await fetch("/api/solve", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                question: input
            })
        });

        const data = await response.json();

        mostrarResultado(data);

    } catch (error) {

        console.error(error);

        resultado.innerHTML =
            "❌ Não foi possível conectar ao servidor Dream.";
    }
}


// ==========================================
// MOSTRAR RESULTADO
// ==========================================

function mostrarResultado(data) {

    const resultado = document.getElementById("resultado");

    let html = `
        <h2>Tipo</h2>
        <p>${data.tipo}</p>

        <h2>Passo a passo</h2>

        <div class="passos">
    `;

    if (data.passos) {

        data.passos.forEach((passo, index) => {

            html += `
                <div class="passo">
                    <strong>Passo ${index + 1}:</strong>
                    <span>${passo}</span>
                </div>
            `;

        });
    }

    html += `
        </div>

        <h2>Resultado</h2>

        <div class="resultado-final">
            ${data.resultado}
        </div>
    `;

    resultado.innerHTML = html;
}


// ==========================================
// LER IMAGEM DO EXERCÍCIO
// ==========================================

async function lerImagem(event) {

    const arquivo = event.target.files[0];

    if (!arquivo) {
        return;
    }

    const preview = document.getElementById("preview");
    const textoLido = document.getElementById("texto-lido");

    // Mostrar a imagem escolhida
    const url = URL.createObjectURL(arquivo);

    preview.innerHTML = `
        <img
            src="${url}"
            class="imagem-preview"
            alt="Exercício enviado"
        >
    `;

    textoLido.innerHTML =
        "🔎 A Dream está lendo a imagem...";

    try {

        // Verificar se o Tesseract foi carregado
        if (typeof Tesseract === "undefined") {

            throw new Error(
                "O sistema OCR não foi carregado."
            );
        }

        // Criar o leitor OCR
        const worker = await Tesseract.createWorker("por");

        // Reconhecer o texto
        const resultadoOCR =
            await worker.recognize(arquivo);

        const texto =
            resultadoOCR.data.text.trim();

        // Encerrar o OCR
        await worker.terminate();

        // Verificar se encontrou texto
        if (!texto) {

            textoLido.innerHTML = `
                <h2>Texto identificado</h2>
                <p>❌ Não consegui identificar texto nessa imagem.</p>
            `;

            return;
        }

        // Mostrar texto identificado
        textoLido.innerHTML = `
            <h2>Texto identificado</h2>

            <div class="texto-reconhecido">
                ${texto}
            </div>
        `;

        // Colocar o texto reconhecido no campo
        document.getElementById("question").value = texto;

        // Informar que vai resolver
        document.getElementById("resultado").innerHTML =
            "🧠 A Dream está resolvendo o exercício...";

        // Enviar o texto reconhecido para o servidor
        const response = await fetch("/api/solve", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                question: texto
            })
        });

        const data = await response.json();

        // Mostrar solução
        mostrarResultado(data);

    } catch (error) {

        console.error(error);

        textoLido.innerHTML = `
            <h2>Leitura da imagem</h2>

            <p>
                ❌ Não foi possível ler a imagem.
            </p>
        `;

        document.getElementById("resultado").innerHTML = "";
    }
    }
function corrigirMatematica(texto) {

    let t = texto;

    // Normalizar símbolos
    t = t
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/=/g, "=");

    // Erros comuns do OCR
    t = t.replace(/\bO\b/g, "0");
    t = t.replace(/\bl\b/g, "1");
    t = t.replace(/\bI\b/g, "1");

    // x2 -> x^2
    t = t.replace(/x\s*2\b/g, "x^2");

    // x 2 -> x^2
    t = t.replace(/x\s+2/g, "x^2");

    // Remover espaços excessivos
    t = t.replace(/\s+/g, " ").trim();

    return t;
}
