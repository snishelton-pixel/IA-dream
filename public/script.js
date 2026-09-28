let selectedSubject = "Matemática";

const subjectButtons = document.querySelectorAll(".subject");
const questionInput = document.getElementById("question");
const solveButton = document.getElementById("solve");
const result = document.getElementById("result");

subjectButtons.forEach(button => {

  button.addEventListener("click", () => {

    subjectButtons.forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    selectedSubject = button.dataset.subject;
  });

});

solveButton.addEventListener("click", async () => {

  const question = questionInput.value.trim();

  if (!question) {
    alert("Digite um problema primeiro.");
    return;
  }

  result.style.display = "block";
  result.textContent = "Dream está a resolver...";

  solveButton.disabled = true;

  try {

    const response = await fetch("/api/solve", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        question: question,
        subject: selectedSubject
      })

    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao resolver.");
    }

    result.textContent = data.answer;

  } catch (error) {

    result.textContent =
      "Erro: " + error.message;

  } finally {

    solveButton.disabled = false;

  }

});
