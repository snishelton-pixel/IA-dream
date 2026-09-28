const express = require("express");
const OpenAI = require("openai");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/api/solve", async (req, res) => {
  try {
    const { question, subject } = req.body;

    if (!question) {
      return res.status(400).json({
        error: "Digite um problema para resolver."
      });
    }

    const prompt = `
Você é a Dream, uma IA educacional.

Disciplina: ${subject || "Não especificada"}

Resolva o seguinte problema de forma clara e didática:

${question}

Regras:
- Mostre os dados fornecidos.
- Apresente as fórmulas necessárias.
- Resolva passo a passo.
- Explique os cálculos de forma simples.
- Termine com uma resposta final destacada.
- Se faltar alguma informação, diga o que está faltando.
`;

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: prompt
    });

    res.json({
      answer: response.output_text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Não foi possível resolver o problema."
    });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    name: "Dream IA"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Dream IA funcionando na porta ${PORT}`);
});
