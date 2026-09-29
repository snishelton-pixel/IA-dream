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

    } catch (error) {

        resultado.innerHTML =
            "❌ Não foi possível conectar ao servidor Dream.";
    }
}
