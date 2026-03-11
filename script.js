const STORAGE_KEYS = {
  quizzes: "genquiz_saved_quizzes",
  studentAccess: "genquiz_student_access",
  studentResults: "genquiz_student_results",
  activeStudentQuiz: "genquiz_active_student_quiz",
  activeStudentResult: "genquiz_active_student_result",
};

function redirect(path) {
  window.location.href = path;
}

function _toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getTeacherSession() {
  const raw = localStorage.getItem("genquiz_teacher_session");
  return raw ? JSON.parse(raw) : null;
}

function getSavedQuizzes() {
  const raw = localStorage.getItem(STORAGE_KEYS.quizzes);
  return raw ? JSON.parse(raw) : [];
}

function setSavedQuizzes(quizzes) {
  localStorage.setItem(STORAGE_KEYS.quizzes, JSON.stringify(quizzes));
}

function saveQuiz(quiz) {
  const quizzes = getSavedQuizzes();
  quizzes.push(quiz);
  setSavedQuizzes(quizzes);
}

function saveStudentAccess(username, quizCode) {
  localStorage.setItem(
    STORAGE_KEYS.studentAccess,
    JSON.stringify({ username, quizCode })
  );
}

function getStudentResults() {
  const raw = localStorage.getItem(STORAGE_KEYS.studentResults);
  return raw ? JSON.parse(raw) : [];
}

function saveActiveStudentQuiz(payload) {
  localStorage.setItem(
    STORAGE_KEYS.activeStudentQuiz,
    JSON.stringify(payload)
  );
}

function getActiveStudentQuiz() {
  const raw = localStorage.getItem(STORAGE_KEYS.activeStudentQuiz);
  return raw ? JSON.parse(raw) : null;
}

function saveStudentResult(result) {
  const results = getStudentResults();
  results.push(result);
  localStorage.setItem(STORAGE_KEYS.studentResults, JSON.stringify(results));
  localStorage.setItem(
    STORAGE_KEYS.activeStudentResult,
    JSON.stringify(result)
  );
}

function getActiveStudentResult() {
  const raw = localStorage.getItem(STORAGE_KEYS.activeStudentResult);
  return raw ? JSON.parse(raw) : null;
}

function normalizeSpaces(text) {
  return text.replace(/\s+/g, " ").trim();
}

function splitSentences(text) {
  return text
    .split(/[\n\r]+|(?<=[.!?])\s+/)
    .map((sentence) => normalizeSpaces(sentence))
    .filter(Boolean);
}

function cleanTerm(term) {
  return normalizeSpaces(
    term.replace(/^(the|a|an)\s+/i, "").replace(/[,:;]+$/g, "")
  );
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
}

function getDifficultyRules(difficulty) {
  if (difficulty === "easy") {
    return { tfFalseRate: 20 };
  }
  if (difficulty === "hard") {
    return { tfFalseRate: 60 };
  }
  return { tfFalseRate: 40 };
}

function extractDefinitions(text) {
  const sentences = splitSentences(text);
  const definitions = [];

  for (const sentence of sentences) {
    const cleanSentence = normalizeSpaces(sentence).replace(/[.]+$/, "");
    const lowered = cleanSentence.toLowerCase();

    let parts = null;

    if (lowered.includes(" is ")) {
      parts = cleanSentence.split(/\bis\b/i);
    } else if (lowered.includes(" are ")) {
      parts = cleanSentence.split(/\bare\b/i);
    } else if (lowered.includes(" refers to ")) {
      parts = cleanSentence.split(/\brefers to\b/i);
    } else if (lowered.includes(" means ")) {
      parts = cleanSentence.split(/\bmeans\b/i);
    }

    if (!parts || parts.length < 2) continue;

    const term = cleanTerm(parts[0]);
    const definition = normalizeSpaces(parts.slice(1).join(" "));

    if (!term || !definition) continue;
    if (term.length < 2) continue;
    if (definition.length < 5) continue;

    definitions.push({ term, definition });
  }

  return definitions;
}

function makeIdentificationQuestion(definitionObj) {
  return {
    type: "Identification",
    question: `${definitionObj.definition}.`,
    answer: definitionObj.term,
  };
}

function makeTrueFalseQuestion(definitionObj, termPool, tfFalseRate) {
  const makeFalse = Math.random() * 100 < tfFalseRate;

  if (makeFalse && termPool.length > 1) {
    const wrongChoices = termPool.filter(
      (term) => term.toLowerCase() !== definitionObj.term.toLowerCase()
    );
    const wrongTerm =
      wrongChoices[Math.floor(Math.random() * wrongChoices.length)];

    return {
      type: "True/False",
      question: `True or False: ${wrongTerm} is ${definitionObj.definition}.`,
      options: ["True", "False"],
      answer: "False",
    };
  }

  return {
    type: "True/False",
    question: `True or False: ${definitionObj.term} is ${definitionObj.definition}.`,
    options: ["True", "False"],
    answer: "True",
  };
}

function shuffleArray(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function makeMultipleChoiceQuestion(definitionObj, termPool) {
  const distractors = shuffleArray(
    termPool.filter(
      (term) => term.toLowerCase() !== definitionObj.term.toLowerCase()
    )
  ).slice(0, 3);

  const options = shuffleArray([definitionObj.term, ...distractors]);

  while (options.length < 4) {
    options.push("None of the above");
  }

  return {
    type: "Multiple Choice",
    question: `${definitionObj.definition}.`,
    options,
    answer: definitionObj.term,
  };
}

function generateQuizCode() {
  return `GQ${Math.floor(1000 + Math.random() * 9000)}`;
}

function getSelectedQuestionTypes() {
  return Array.from(
    document.querySelectorAll('input[name="question_types"]:checked')
  ).map((checkbox) => checkbox.value);
}

function buildDistribution() {
  const mcq = _toInt(document.getElementById("mcq-count")?.value, 0);
  const tf = _toInt(document.getElementById("tf-count")?.value, 0);
  const id = _toInt(document.getElementById("id-count")?.value, 0);

  const distribution = [];
  if (mcq > 0) distribution.push(["mcq", mcq]);
  if (tf > 0) distribution.push(["tf", tf]);
  if (id > 0) distribution.push(["id", id]);

  return distribution;
}

function validateDistribution(totalQuestions, distribution) {
  const total = distribution.reduce((sum, [, count]) => sum + count, 0);

  if (totalQuestions <= 0) {
    return "Please enter the total number of questions.";
  }

  if (total === 0) {
    return "Please enter question distribution.";
  }

  if (total !== totalQuestions) {
    return "Distribution must equal total questions.";
  }

  return null;
}

function cycleDefinitions(definitions, count) {
  const selected = [];
  let index = 0;

  while (selected.length < count && definitions.length > 0) {
    selected.push(definitions[index % definitions.length]);
    index += 1;
  }

  return selected;
}

function generateByDistribution(definitions, difficulty, distribution) {
  if (!definitions.length) return [];

  const rules = getDifficultyRules(difficulty);
  const termPool = [...new Set(definitions.map((item) => item.term))];
  const questions = [];

  for (const [type, count] of distribution) {
    const selectedDefinitions = cycleDefinitions(definitions, count);

    for (const definitionObj of selectedDefinitions) {
      if (type === "mcq") {
        questions.push(makeMultipleChoiceQuestion(definitionObj, termPool));
      } else if (type === "tf") {
        questions.push(
          makeTrueFalseQuestion(definitionObj, termPool, rules.tfFalseRate)
        );
      } else if (type === "id") {
        questions.push(makeIdentificationQuestion(definitionObj));
      }
    }
  }

  return questions;
}

function renderQuizPreview(quiz) {
  const preview = document.getElementById("quiz-preview");
  if (!preview) return;

  if (!quiz || !quiz.questions.length) {
    preview.innerHTML = `<p class="preview-empty">No quiz generated yet.</p>`;
    return;
  }

  const questionMarkup = quiz.questions
    .map((item, index) => {
      const optionsMarkup = item.options
        ? `<ul class="preview-options">${item.options
            .map((option) => `<li>${option}</li>`)
            .join("")}</ul>`
        : "";

      return `
        <div class="preview-question">
          <h4>${index + 1}. ${item.question}</h4>
          ${optionsMarkup}
          <p class="preview-answer"><strong>Answer:</strong> ${item.answer}</p>
        </div>
      `;
    })
    .join("");

  preview.innerHTML = `
    <div class="preview-meta">
      <p><strong>Quiz Code:</strong> ${quiz.quizCode}</p>
      <p><strong>Title:</strong> ${quiz.title}</p>
      <p><strong>Difficulty:</strong> ${quiz.difficulty}</p>
      <p><strong>Questions:</strong> ${quiz.questions.length}</p>
    </div>
    <div class="preview-list">
      ${questionMarkup}
    </div>
  `;
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read TXT file."));
    reader.readAsText(file);
  });
}

function readArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file data."));
    reader.readAsArrayBuffer(file);
  });
}

async function readPdfFile(file) {
  if (typeof pdfjsLib === "undefined") {
    throw new Error("PDF library failed to load.");
  }

  const arrayBuffer = await readArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let text = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const pageText = content.items.map((item) => item.str || "").join(" ");
    text += ` ${pageText}`;
  }

  return normalizeSpaces(text);
}

async function readDocxFile(file) {
  if (typeof mammoth === "undefined") {
    throw new Error("DOCX library failed to load.");
  }

  const arrayBuffer = await readArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer });

  return normalizeSpaces(result.value || "");
}

async function extractTextFromFile(file) {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt") return readTextFile(file);
  if (ext === "pdf") return readPdfFile(file);
  if (ext === "docx") return readDocxFile(file);

  throw new Error("Unsupported file type.");
}

function handleQuizGenerator() {
  const form = document.getElementById("quiz-generator-form");
  const message = document.getElementById("generator-message");

  if (!form || !message) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = document.getElementById("lesson-file")?.files?.[0];
    const difficulty = document.getElementById("difficulty")?.value || "medium";
    const totalQuestions = _toInt(
      document.getElementById("question-count")?.value,
      0
    );

    const distribution = buildDistribution();
    const selectedTypes = getSelectedQuestionTypes();

    if (!file) {
      message.className = "message error";
      message.textContent = "Please upload a lesson file.";
      return;
    }

    if (!selectedTypes.length) {
      message.className = "message error";
      message.textContent = "Please select at least one question type.";
      return;
    }

    const validationError = validateDistribution(totalQuestions, distribution);
    if (validationError) {
      message.className = "message error";
      message.textContent = validationError;
      return;
    }

    try {
      message.className = "message";
      message.textContent = "Reading file...";

      const text = await extractTextFromFile(file);

      if (!text || !text.trim()) {
        message.className = "message error";
        message.textContent = "No readable text was extracted from the file.";
        renderQuizPreview(null);
        return;
      }

      const definitions = extractDefinitions(text);

      if (!definitions.length) {
        message.className = "message error";
        message.textContent =
          "No definition sentences were detected. Use sentences like 'A computer is an electronic device.'";
        renderQuizPreview(null);
        return;
      }

      const questions = generateByDistribution(
        definitions,
        difficulty,
        distribution
      );

      if (!questions.length) {
        message.className = "message error";
        message.textContent = "No questions were generated.";
        renderQuizPreview(null);
        return;
      }

      const session = getTeacherSession();

      const quiz = {
        quizId: `quiz_${Date.now()}`,
        quizCode: generateQuizCode(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        sourceFileName: file.name,
        teacherUsername: session?.username || "unknown",
        difficulty,
        questionTypes: selectedTypes,
        questionCount: questions.length,
        questions,
        createdAt: new Date().toISOString(),
      };

      saveQuiz(quiz);
      renderQuizPreview(quiz);

      message.className = "message success";
      message.textContent = `Quiz generated successfully. Quiz code: ${quiz.quizCode}`;
    } catch (err) {
      message.className = "message error";
      message.textContent = err.message || "Error generating quiz.";
    }
  });
}

function handleStudentAccess() {
  const form = document.getElementById("student-access-form");
  const message = document.getElementById("student-access-message");
  if (!form || !message) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("student-username")?.value.trim() || "";
    const quizCode =
      document.getElementById("student-quiz-code")?.value.trim().toUpperCase() || "";

    if (!username || !quizCode) {
      message.className = "message error";
      message.textContent = "Username and quiz code are required.";
      return;
    }

    const quizzes = getSavedQuizzes();
    const quiz = quizzes.find((item) => item.quizCode.toUpperCase() === quizCode);

    if (!quiz) {
      message.className = "message error";
      message.textContent = "Quiz code not found.";
      return;
    }

    saveStudentAccess(username, quizCode);
    saveActiveStudentQuiz({
      username,
      quizCode,
      quizId: quiz.quizId,
      title: quiz.title,
      questions: quiz.questions,
      answers: {},
      currentIndex: 0,
    });

    message.className = "message success";
    message.textContent = "Quiz found. Redirecting...";

    setTimeout(() => redirect("student-quiz.html"), 500);
  });
}

function renderStudentQuestion(payload) {
  const container = document.getElementById("student-quiz-container");
  const progressText = document.getElementById("quiz-progress-text");
  const progressBar = document.getElementById("quiz-progress-bar");
  const title = document.getElementById("quiz-title");
  const studentName = document.getElementById("quiz-student-name");
  const codeDisplay = document.getElementById("quiz-code-display");
  const prevBtn = document.getElementById("prev-question-btn");
  const nextBtn = document.getElementById("next-question-btn");
  const submitBtn = document.getElementById("submit-quiz-btn");

  if (!container || !payload) return;

  const { questions, currentIndex, username, quizCode, answers } = payload;
  const currentQuestion = questions[currentIndex];

  title.textContent = payload.title || "Quiz";
  studentName.textContent = username;
  codeDisplay.textContent = quizCode;
  progressText.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
  progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;

  let answerMarkup = "";

  if (
    currentQuestion.type === "Multiple Choice" ||
    currentQuestion.type === "True/False"
  ) {
    const options = currentQuestion.options || [];
    answerMarkup = `
      <div class="answer-group">
        ${options
          .map(
            (option) => `
              <label class="answer-option">
                <input
                  type="radio"
                  name="student-answer"
                  value="${option.replace(/"/g, "&quot;")}"
                  ${answers[currentIndex] === option ? "checked" : ""}
                />
                <span>${option}</span>
              </label>
            `
          )
          .join("")}
      </div>
    `;
  } else {
    answerMarkup = `
      <div class="form-group">
        <label for="student-identification-answer">Your Answer</label>
        <input
          id="student-identification-answer"
          type="text"
          value="${
            answers[currentIndex]
              ? String(answers[currentIndex]).replace(/"/g, "&quot;")
              : ""
          }"
          placeholder="Type your answer"
        />
      </div>
    `;
  }

  container.innerHTML = `
    <article class="question-card">
      <h2>${currentQuestion.question}</h2>
      ${answerMarkup}
    </article>
  `;

  if (prevBtn) prevBtn.disabled = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;
  if (nextBtn) nextBtn.classList.toggle("hidden", isLast);
  if (submitBtn) submitBtn.classList.toggle("hidden", !isLast);
}

function captureCurrentStudentAnswer(payload) {
  const currentQuestion = payload.questions[payload.currentIndex];

  if (
    currentQuestion.type === "Multiple Choice" ||
    currentQuestion.type === "True/False"
  ) {
    const selected = document.querySelector('input[name="student-answer"]:checked');
    payload.answers[payload.currentIndex] = selected ? selected.value : "";
  } else {
    const input = document.getElementById("student-identification-answer");
    payload.answers[payload.currentIndex] = input ? input.value.trim() : "";
  }

  saveActiveStudentQuiz(payload);
}

function computeStudentScore(payload) {
  let score = 0;

  payload.questions.forEach((question, index) => {
    const studentAnswer = String(payload.answers[index] || "").trim();
    const correctAnswer = String(question.answer || "").trim();

    if (question.type === "Identification") {
      if (studentAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
        score += 1;
      }
    } else if (studentAnswer === correctAnswer) {
      score += 1;
    }
  });

  return score;
}

function handleStudentQuiz() {
  const currentPage = window.location.pathname.split("/").pop();
  if (currentPage !== "student-quiz.html") return;

  const payload = getActiveStudentQuiz();
  if (!payload || !payload.questions || !payload.questions.length) {
    redirect("student-access.html");
    return;
  }

  if (typeof payload.currentIndex !== "number") {
    payload.currentIndex = 0;
  }
  if (!payload.answers) {
    payload.answers = {};
  }

  renderStudentQuestion(payload);

  const prevBtn = document.getElementById("prev-question-btn");
  const nextBtn = document.getElementById("next-question-btn");
  const submitBtn = document.getElementById("submit-quiz-btn");
  const message = document.getElementById("student-quiz-message");

  prevBtn?.addEventListener("click", () => {
    captureCurrentStudentAnswer(payload);
    if (payload.currentIndex > 0) {
      payload.currentIndex -= 1;
      saveActiveStudentQuiz(payload);
      renderStudentQuestion(payload);
      if (message) {
        message.className = "message";
        message.textContent = "";
      }
    }
  });

  nextBtn?.addEventListener("click", () => {
    captureCurrentStudentAnswer(payload);
    if (payload.currentIndex < payload.questions.length - 1) {
      payload.currentIndex += 1;
      saveActiveStudentQuiz(payload);
      renderStudentQuestion(payload);
      if (message) {
        message.className = "message";
        message.textContent = "";
      }
    }
  });

  submitBtn?.addEventListener("click", () => {
    captureCurrentStudentAnswer(payload);

    const unanswered = payload.questions.some((_, index) => {
      const value = String(payload.answers[index] || "").trim();
      return !value;
    });

    if (unanswered) {
      if (message) {
        message.className = "message error";
        message.textContent = "Please answer all questions before submitting.";
      }
      return;
    }

    const score = computeStudentScore(payload);
    const totalItems = payload.questions.length;
    const percentage = Math.round((score / totalItems) * 100);

    const result = {
      resultId: `result_${Date.now()}`,
      studentUsername: payload.username,
      quizCode: payload.quizCode,
      quizId: payload.quizId,
      score,
      totalItems,
      percentage,
      submittedAt: new Date().toISOString(),
    };

    saveStudentResult(result);
    redirect("student-result.html");
  });
}

function handleStudentResultPage() {
  const currentPage = window.location.pathname.split("/").pop();
  if (currentPage !== "student-result.html") return;

  const result = getActiveStudentResult();
  if (!result) {
    redirect("student-access.html");
    return;
  }

  const usernameEl = document.getElementById("result-student-username");
  const codeEl = document.getElementById("result-quiz-code");
  const scoreEl = document.getElementById("result-score");
  const totalEl = document.getElementById("result-total");
  const percentEl = document.getElementById("result-percentage");

  if (usernameEl) usernameEl.textContent = result.studentUsername;
  if (codeEl) codeEl.textContent = result.quizCode;
  if (scoreEl) scoreEl.textContent = result.score;
  if (totalEl) totalEl.textContent = result.totalItems;
  if (percentEl) percentEl.textContent = `${result.percentage}%`;
}

function getTeacherOwnedQuizzes() {
  const session = getTeacherSession();
  if (!session) return [];

  return getSavedQuizzes()
    .filter((quiz) => quiz.teacherUsername === session.username)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getTeacherOwnedQuizCodes() {
  return new Set(getTeacherOwnedQuizzes().map((quiz) => quiz.quizCode));
}

function getTeacherOwnedResults() {
  const quizCodes = getTeacherOwnedQuizCodes();

  return getStudentResults()
    .filter((result) => quizCodes.has(result.quizCode))
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

function renderRecentQuizzes(quizzes) {
  const tbody = document.getElementById("recent-quizzes-body");
  if (!tbody) return;

  if (!quizzes.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">No quizzes saved yet.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = quizzes
    .map(
      (quiz) => `
        <tr>
          <td>${quiz.title || "--"}</td>
          <td>${quiz.quizCode || "--"}</td>
          <td>${quiz.questionCount ?? "--"}</td>
          <td>${quiz.difficulty || "--"}</td>
          <td>${formatDateTime(quiz.createdAt)}</td>
        </tr>
      `
    )
    .join("");
}

function renderRecentResults(results) {
  const tbody = document.getElementById("recent-results-body");
  if (!tbody) return;

  if (!results.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">No student results yet.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = results
    .map(
      (result) => `
        <tr>
          <td>${result.studentUsername || "--"}</td>
          <td>${result.quizCode || "--"}</td>
          <td>${result.score}/${result.totalItems}</td>
          <td>${result.percentage}%</td>
          <td>${formatDateTime(result.submittedAt)}</td>
        </tr>
      `
    )
    .join("");
}

function populateTeacherDashboard() {
  const currentPage = window.location.pathname.split("/").pop();
  if (currentPage !== "teacher-dashboard.html") return;

  const session = getTeacherSession();
  if (!session) return;

  const teacherQuizzes = getTeacherOwnedQuizzes();
  const teacherResults = getTeacherOwnedResults();

  const totalQuizzesEl = document.getElementById("stat-total-quizzes");
  const totalAttemptsEl = document.getElementById("stat-total-attempts");
  const latestQuizCodeEl = document.getElementById("stat-latest-quiz-code");
  const averageScoreEl = document.getElementById("summary-average-score");
  const highestScoreEl = document.getElementById("summary-highest-score");
  const lowestScoreEl = document.getElementById("summary-lowest-score");
  const recentStudentEl = document.getElementById("summary-recent-student");

  if (totalQuizzesEl) totalQuizzesEl.textContent = String(teacherQuizzes.length);
  if (totalAttemptsEl) totalAttemptsEl.textContent = String(teacherResults.length);
  if (latestQuizCodeEl) {
    latestQuizCodeEl.textContent = teacherQuizzes.length
      ? teacherQuizzes[0].quizCode
      : "--";
  }

  if (teacherResults.length) {
    const percentages = teacherResults.map((item) => Number(item.percentage) || 0);
    const average =
      Math.round(
        percentages.reduce((sum, value) => sum + value, 0) / percentages.length
      ) + "%";
    const highest = Math.max(...percentages) + "%";
    const lowest = Math.min(...percentages) + "%";
    const recentStudent = teacherResults[0].studentUsername || "--";

    if (averageScoreEl) averageScoreEl.textContent = average;
    if (highestScoreEl) highestScoreEl.textContent = highest;
    if (lowestScoreEl) lowestScoreEl.textContent = lowest;
    if (recentStudentEl) recentStudentEl.textContent = recentStudent;
  } else {
    if (averageScoreEl) averageScoreEl.textContent = "--";
    if (highestScoreEl) highestScoreEl.textContent = "--";
    if (lowestScoreEl) lowestScoreEl.textContent = "--";
    if (recentStudentEl) recentStudentEl.textContent = "--";
  }

  renderRecentQuizzes(teacherQuizzes.slice(0, 5));
  renderRecentResults(teacherResults.slice(0, 5));
}

function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return;
  }

  const tempInput = document.createElement("input");
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
}

function deleteQuizById(quizId) {
  const quizzes = getSavedQuizzes().filter((quiz) => quiz.quizId !== quizId);
  setSavedQuizzes(quizzes);

  const results = getStudentResults().filter((result) => result.quizId !== quizId);
  localStorage.setItem(STORAGE_KEYS.studentResults, JSON.stringify(results));
}

function renderLibraryQuizPreview(quiz) {
  const panel = document.getElementById("quiz-preview-panel");
  const title = document.getElementById("preview-quiz-title");
  const meta = document.getElementById("quiz-preview-meta");
  const questionsBox = document.getElementById("quiz-preview-questions");

  if (!panel || !title || !meta || !questionsBox) return;

  if (!quiz) {
    panel.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");
  title.textContent = quiz.title || "Saved Quiz";

  meta.innerHTML = `
    <p><strong>Quiz Code:</strong> ${quiz.quizCode || "--"}</p>
    <p><strong>Difficulty:</strong> ${quiz.difficulty || "--"}</p>
    <p><strong>Total Questions:</strong> ${quiz.questionCount ?? "--"}</p>
    <p><strong>Date Created:</strong> ${formatDateTime(quiz.createdAt)}</p>
  `;

  questionsBox.innerHTML = quiz.questions
    .map((item, index) => {
      const optionsMarkup = item.options
        ? `<ul>${item.options.map((option) => `<li>${option}</li>`).join("")}</ul>`
        : "";

      return `
        <article class="preview-question">
          <h3>${index + 1}. [${item.type}] ${item.question}</h3>
          ${optionsMarkup}
          <p><strong>Answer:</strong> ${item.answer}</p>
        </article>
      `;
    })
    .join("");

  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderQuizLibraryTable(quizzes) {
  const tbody = document.getElementById("quiz-library-body");
  if (!tbody) return;

  if (!quizzes.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">No quizzes saved yet.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = quizzes
    .map(
      (quiz) => `
        <tr>
          <td>${quiz.title || "--"}</td>
          <td>${quiz.quizCode || "--"}</td>
          <td>${quiz.questionCount ?? "--"}</td>
          <td>${quiz.difficulty || "--"}</td>
          <td>${formatDateTime(quiz.createdAt)}</td>
          <td>
            <div class="library-actions">
              <button class="inline-btn open-quiz-btn" type="button" data-id="${quiz.quizId}">
                Open
              </button>
              <button class="inline-btn copy-quiz-code-btn" type="button" data-code="${quiz.quizCode}">
                Copy Code
              </button>
              <button class="inline-btn danger-btn delete-quiz-btn" type="button" data-id="${quiz.quizId}">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderQuizLibraryCards(quizzes) {
  const cardList = document.getElementById("quiz-library-cards");
  if (!cardList) return;

  if (!quizzes.length) {
    cardList.innerHTML = `<div class="empty-state-card">No quizzes saved yet.</div>`;
    return;
  }

  cardList.innerHTML = quizzes
    .map(
      (quiz) => `
        <article class="library-card">
          <h3>${quiz.title || "--"}</h3>
          <div class="library-meta">
            <div class="library-meta-row">
              <span>Quiz Code</span>
              <strong>${quiz.quizCode || "--"}</strong>
            </div>
            <div class="library-meta-row">
              <span>Questions</span>
              <strong>${quiz.questionCount ?? "--"}</strong>
            </div>
            <div class="library-meta-row">
              <span>Difficulty</span>
              <strong>${quiz.difficulty || "--"}</strong>
            </div>
            <div class="library-meta-row">
              <span>Date Created</span>
              <strong>${formatDateTime(quiz.createdAt)}</strong>
            </div>
          </div>
          <div class="library-actions">
            <button class="inline-btn open-quiz-btn" type="button" data-id="${quiz.quizId}">
              Open
            </button>
            <button class="inline-btn copy-quiz-code-btn" type="button" data-code="${quiz.quizCode}">
              Copy Code
            </button>
            <button class="inline-btn danger-btn delete-quiz-btn" type="button" data-id="${quiz.quizId}">
              Delete
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function bindQuizLibraryActions(filteredQuizzes) {
  document.querySelectorAll(".copy-quiz-code-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const quizCode = button.getAttribute("data-code") || "";
      copyTextToClipboard(quizCode);
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = "Copy Code";
      }, 1000);
    });
  });

  document.querySelectorAll(".open-quiz-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const quizId = button.getAttribute("data-id");
      const quiz = filteredQuizzes.find((item) => item.quizId === quizId);
      renderLibraryQuizPreview(quiz);
    });
  });

  document.querySelectorAll(".delete-quiz-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const quizId = button.getAttribute("data-id");
      const quiz = filteredQuizzes.find((item) => item.quizId === quizId);
      if (!quiz) return;

      const modal = document.getElementById("delete-modal");
      const modalText = document.getElementById("delete-modal-text");
      const confirmBtn = document.getElementById("confirm-delete-btn");
      const cancelBtn = document.getElementById("cancel-delete-btn");

      if (!modal || !modalText || !confirmBtn || !cancelBtn) {
        const confirmed = window.confirm(
          `Delete "${quiz.title}"?\n\nThis will also remove related student results.`
        );
        if (!confirmed) return;

        deleteQuizById(quizId);
        renderLibraryQuizPreview(null);
        populateQuizLibrary();
        return;
      }

      modal.classList.remove("hidden");
      modalText.textContent = `Delete "${quiz.title}"?`;

      confirmBtn.onclick = () => {
        deleteQuizById(quizId);
        modal.classList.add("hidden");
        renderLibraryQuizPreview(null);
        populateQuizLibrary();
      };

      cancelBtn.onclick = () => {
        modal.classList.add("hidden");
      };
    });
  });
}

function populateQuizLibrary() {
  const currentPage = window.location.pathname.split("/").pop();
  if (currentPage !== "quiz-library.html") return;

  const searchInput = document.getElementById("quiz-library-search");

  function applyRender() {
    const allQuizzes = getTeacherOwnedQuizzes();
    const keyword = (searchInput?.value || "").trim().toLowerCase();

    const filteredQuizzes = allQuizzes.filter((quiz) => {
      const title = String(quiz.title || "").toLowerCase();
      const code = String(quiz.quizCode || "").toLowerCase();
      return title.includes(keyword) || code.includes(keyword);
    });

    renderQuizLibraryTable(filteredQuizzes);
    renderQuizLibraryCards(filteredQuizzes);
    bindQuizLibraryActions(filteredQuizzes);
  }

  searchInput?.addEventListener("input", applyRender);
  applyRender();
}

function renderTeacherResultsTable(results) {
  const tbody = document.getElementById("teacher-results-body");
  if (!tbody) return;

  if (!results.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">No results found.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = results
    .map(
      (result) => `
        <tr>
          <td>${result.studentUsername || "--"}</td>
          <td>${result.quizCode || "--"}</td>
          <td>${result.score}/${result.totalItems}</td>
          <td>${result.percentage}%</td>
          <td>${formatDateTime(result.submittedAt)}</td>
        </tr>
      `
    )
    .join("");
}

function renderTeacherResultsCards(results) {
  const cardList = document.getElementById("teacher-results-cards");
  if (!cardList) return;

  if (!results.length) {
    cardList.innerHTML = `<div class="empty-state-card">No results found.</div>`;
    return;
  }

  cardList.innerHTML = results
    .map(
      (result) => `
        <article class="library-card">
          <h3>${result.studentUsername || "--"}</h3>
          <div class="library-meta">
            <div class="library-meta-row">
              <span>Quiz Code</span>
              <strong>${result.quizCode || "--"}</strong>
            </div>
            <div class="library-meta-row">
              <span>Score</span>
              <strong>${result.score}/${result.totalItems}</strong>
            </div>
            <div class="library-meta-row">
              <span>Percentage</span>
              <strong>${result.percentage}%</strong>
            </div>
            <div class="library-meta-row">
              <span>Submitted At</span>
              <strong>${formatDateTime(result.submittedAt)}</strong>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function updateTeacherResultsStats(results) {
  const totalAttemptsEl = document.getElementById("results-total-attempts");
  const averageScoreEl = document.getElementById("results-average-score");
  const highestScoreEl = document.getElementById("results-highest-score");
  const lowestScoreEl = document.getElementById("results-lowest-score");

  if (totalAttemptsEl) totalAttemptsEl.textContent = String(results.length);

  if (!results.length) {
    if (averageScoreEl) averageScoreEl.textContent = "--";
    if (highestScoreEl) highestScoreEl.textContent = "--";
    if (lowestScoreEl) lowestScoreEl.textContent = "--";
    return;
  }

  const percentages = results.map((item) => Number(item.percentage) || 0);
  const average = Math.round(
    percentages.reduce((sum, value) => sum + value, 0) / percentages.length
  );
  const highest = Math.max(...percentages);
  const lowest = Math.min(...percentages);

  if (averageScoreEl) averageScoreEl.textContent = `${average}%`;
  if (highestScoreEl) highestScoreEl.textContent = `${highest}%`;
  if (lowestScoreEl) lowestScoreEl.textContent = `${lowest}%`;
}

function filterTeacherResults(results, studentKeyword, quizCodeKeyword, selectedDate) {
  return results.filter((result) => {
    const username = String(result.studentUsername || "").toLowerCase();
    const quizCode = String(result.quizCode || "").toLowerCase();
    const submittedDate = result.submittedAt
      ? new Date(result.submittedAt).toISOString().slice(0, 10)
      : "";

    const matchesStudent = username.includes(studentKeyword);
    const matchesQuizCode = quizCode.includes(quizCodeKeyword);
    const matchesDate = !selectedDate || submittedDate === selectedDate;

    return matchesStudent && matchesQuizCode && matchesDate;
  });
}
function populateTeacherResultsPage() {
  const currentPage = window.location.pathname.split("/").pop();
  if (currentPage !== "teacher-results.html") return;

  const studentFilter = document.getElementById("results-student-filter");
  const quizCodeFilter = document.getElementById("results-quiz-filter");
  const dateFilter = document.getElementById("results-date-filter");
  const clearBtn = document.getElementById("results-clear-btn");

  const allTeacherResults = getTeacherOwnedResults();

  function applyFilters() {
    const studentKeyword = (studentFilter?.value || "").trim().toLowerCase();
    const quizCodeKeyword = (quizCodeFilter?.value || "").trim().toLowerCase();
    const selectedDate = (dateFilter?.value || "").trim();

    const filteredResults = filterTeacherResults(
      allTeacherResults,
      studentKeyword,
      quizCodeKeyword,
      selectedDate
    );

    renderTeacherResultsTable(filteredResults);
    renderTeacherResultsCards(filteredResults);
    updateTeacherResultsStats(filteredResults);
  }

  studentFilter?.addEventListener("input", applyFilters);
  quizCodeFilter?.addEventListener("input", applyFilters);
  dateFilter?.addEventListener("change", applyFilters);

  clearBtn?.addEventListener("click", () => {
    if (studentFilter) studentFilter.value = "";
    if (quizCodeFilter) quizCodeFilter.value = "";
    if (dateFilter) dateFilter.value = "";
    applyFilters();
  });

  applyFilters();
}

document.addEventListener("DOMContentLoaded", () => {
  handleQuizGenerator();
  handleStudentAccess();
  handleStudentQuiz();
  handleStudentResultPage();
  populateTeacherDashboard();
  populateQuizLibrary();
  populateTeacherResultsPage();
});
