const express = require("express");
const OpenAI = require("openai");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Teste do servidor
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    dream: "Dream IA"
  });
});

// Resolver exercício
app.post("/api/solve", async (req, res) => {

  console.log("📥 Pergunta recebida:", req.body);

  try {

    const { question, subject } = req.body;

    if (!question || question.trim() === "") {
      return res.status(400).json({
        error: "A pergunta está vazia."
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY não está configurada no Render."
      });
    }

    console.log("🤖 Enviando pergunta para a IA...");

    const response = await client.responses.create({
      model: "gpt-5-mini",

      instructions: `
Você é a Dream IA, uma inteligência artificial educacional.

Sua função é ajudar estudantes a resolver problemas de:
- Matemática
- Física
- Química
- Biologia
- Inglês
- Outras disciplinas escolares

Sempre que possível:

1. Identifique os dados.
2. Mostre a fórmula.
3. Faça os cálculos passo a passo.
4. Explique de forma simples.
5. Apresente a resposta final.

Disciplina escolhida: ${subject || "Geral"}
`,

      input: question
    });

    console.log("✅ Resposta recebida da IA");

    const answer = response.output_text;

    if (!answer) {
      return res.status(500).json({
        error: "A IA não retornou texto."
      });
    }

    res.json({
      answer: answer
    });

  } catch (error) {

    console.error("❌ ERRO DA DREAM:", error);

    res.status(500).json({
      error: error.message || "Erro desconhecido ao consultar a IA."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Dream IA funcionando na porta ${PORT}`);
});
