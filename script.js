const STORAGE_KEYS = {
  teacherAccount: "genquiz_teacher_account",
  teacherSession: "genquiz_teacher_session",
  quizzes: "genquiz_saved_quizzes",
  studentAccess: "genquiz_student_access",
  studentResults: "genquiz_student_results",
  activeStudentQuiz: "genquiz_active_student_quiz",
  activeStudentResult: "genquiz_active_student_result",
};

function saveTeacherAccount(username, password) {
  localStorage.setItem(
    STORAGE_KEYS.teacherAccount,
    JSON.stringify({ username, password })
  );
}

function getTeacherAccount() {
  const raw = localStorage.getItem(STORAGE_KEYS.teacherAccount);
  return raw ? JSON.parse(raw) : null;
}

function saveTeacherSession(username) {
  localStorage.setItem(
    STORAGE_KEYS.teacherSession,
    JSON.stringify({ username, role: "teacher" })
  );
}

function getTeacherSession() {
  const raw = localStorage.getItem(STORAGE_KEYS.teacherSession);
  return raw ? JSON.parse(raw) : null;
}

function clearTeacherSession() {
  localStorage.removeItem(STORAGE_KEYS.teacherSession);
}

function getSavedQuizzes() {
  const raw = localStorage.getItem(STORAGE_KEYS.quizzes);
  return raw ? JSON.parse(raw) : [];
}

function saveQuiz(quiz) {
  const quizzes = getSavedQuizzes();
  quizzes.push(quiz);
  localStorage.setItem(STORAGE_KEYS.quizzes, JSON.stringify(quizzes));
}

function saveStudentAccess(username, quizCode) {
  localStorage.setItem(
    STORAGE_KEYS.studentAccess,
    JSON.stringify({ username, quizCode })
  );
}

function getStudentAccess() {
  const raw = localStorage.getItem(STORAGE_KEYS.studentAccess);
  return raw ? JSON.parse(raw) : null;
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
  const raw = localStorage.getItem(STORAGE_KEYS.studentResults);
  const results = raw ? JSON.parse(raw) : [];
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

function redirect(path) {
  window.location.href = path;
}

function _toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
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

function getDifficultyRules(difficulty) {
  if (difficulty === "easy") {
    return { minLen: 20, maxLen: 110, tfFalseRate: 20 };
  }
  if (difficulty === "hard") {
    return { minLen: 25, maxLen: 180, tfFalseRate: 60 };
  }
  return { minLen: 20, maxLen: 140, tfFalseRate: 40 };
}

function extractDefinitions(text, difficulty) {
  const rules = getDifficultyRules(difficulty);
  const sentences = splitSentences(text);
  const definitions = [];

  for (const sentence of sentences) {
    const lowered = sentence.toLowerCase();
    const isCount = (lowered.match(/\sis\s/g) || []).length;
    const areCount = (lowered.match(/\sare\s/g) || []).length;

    if (isCount + areCount !== 1) continue;
    if (sentence.length < rules.minLen || sentence.length > rules.maxLen) continue;

    let parts;
    if (/\sis\s/i.test(sentence)) {
      parts = sentence.split(/\bis\b/i);
    } else {
      parts = sentence.split(/\bare\b/i);
    }

    if (!parts || parts.length < 2) continue;

    const term = cleanTerm(parts[0]);
    const definition = normalizeSpaces(parts.slice(1).join(" ")).replace(/[.]+$/, "");

    if (term.length < 2 || definition.length < 8) continue;

    definitions.push({ term, definition });
  }

  return definitions;
}

function makeIdentificationQuestion(definitionObj) {
  return {
    type: "Identification",
    question: `What term matches the following description: ${definitionObj.definition}?`,
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
    question: `Which term best matches this description: ${definitionObj.definition}?`,
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
  const mcqCount = _toInt(document.getElementById("mcq-count")?.value, 0);
  const tfCount = _toInt(document.getElementById("tf-count")?.value, 0);
  const idCount = _toInt(document.getElementById("id-count")?.value, 0);

  const distribution = [];
  if (mcqCount > 0) distribution.push(["mcq", mcqCount]);
  if (tfCount > 0) distribution.push(["tf", tfCount]);
  if (idCount > 0) distribution.push(["id", idCount]);

  return distribution;
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

  preview.innerHTML = `
    <div class="preview-meta">
      <p><strong>Quiz Code:</strong> ${quiz.quizCode}</p>
      <p><strong>Title:</strong> ${quiz.title}</p>
      <p><strong>Difficulty:</strong> ${quiz.difficulty}</p>
      <p><strong>Total Questions:</strong> ${quiz.questions.length}</p>
    </div>
    ${questionMarkup}
  `;
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

async function extractTextFromFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "txt") {
    return readTextFile(file);
  }

  if (extension === "pdf" || extension === "docx") {
    throw new Error(
      "PDF and DOCX support will be added in the next implementation step. Please use TXT first."
    );
  }

  throw new Error("Unsupported file type. Please upload a TXT file.");
}

function handleTeacherRegister() {
  const form = document.getElementById("teacher-register-form");
  const message = document.getElementById("register-message");
  if (!form || !message) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm-password").value;

    if (!username || !password || !confirmPassword) {
      message.className = "message error";
      message.textContent = "All fields are required.";
      return;
    }

    if (password !== confirmPassword) {
      message.className = "message error";
      message.textContent = "Passwords do not match.";
      return;
    }

    const existing = getTeacherAccount();
    if (existing && existing.username.toLowerCase() === username.toLowerCase()) {
      message.className = "message error";
      message.textContent = "Username already exists.";
      return;
    }

    saveTeacherAccount(username, password);
    message.className = "message success";
    message.textContent = "Account created successfully. Redirecting to login...";

    setTimeout(() => redirect("teacher-login.html"), 900);
  });
}

function handleTeacherLogin() {
  const form = document.getElementById("teacher-login-form");
  const message = document.getElementById("login-message");
  if (!form || !message) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
      message.className = "message error";
      message.textContent = "Username and password are required.";
      return;
    }

    const account = getTeacherAccount();
    if (!account) {
      message.className = "message error";
      message.textContent = "No teacher account found. Please create one first.";
      return;
    }

    const isValid =
      account.username === username &&
      account.password === password;

    if (!isValid) {
      message.className = "message error";
      message.textContent = "Invalid username or password.";
      return;
    }

    saveTeacherSession(username);
    message.className = "message success";
    message.textContent = "Login successful. Redirecting to dashboard...";

    setTimeout(() => redirect("teacher-dashboard.html"), 700);
  });
}

function protectTeacherPages() {
  const protectedPages = ["teacher-dashboard.html", "quiz-generator.html"];
  const currentPath = window.location.pathname.split("/").pop();

  if (!protectedPages.includes(currentPath)) return;

  const session = getTeacherSession();
  if (!session || session.role !== "teacher") {
    redirect("teacher-login.html");
    return;
  }

  const welcome = document.getElementById("teacher-welcome");
  const display = document.getElementById("teacher-username-display");
  if (welcome) welcome.textContent = `Welcome, ${session.username}`;
  if (display) display.textContent = session.username;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearTeacherSession();
      redirect("index.html");
    });
  }
}

function handleQuizGenerator() {
  const form = document.getElementById("quiz-generator-form");
  const message = document.getElementById("generator-message");
  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    message.className = "message";
    message.textContent = "";

    const fileInput = document.getElementById("lesson-file");
    const difficulty = document.getElementById("difficulty")?.value || "medium";
    const totalQuestions = _toInt(document.getElementById("question-count")?.value, 10);
    const selectedTypes = getSelectedQuestionTypes();
    const distribution = buildDistribution();
    const file = fileInput?.files?.[0];

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

    if (!distribution.length) {
      message.className = "message error";
      message.textContent = "Please enter a valid question distribution.";
      return;
    }

    const distributionTotal = distribution.reduce((sum, [, count]) => sum + count, 0);
    if (distributionTotal !== totalQuestions) {
      message.className = "message error";
      message.textContent = "The total distribution must match the number of questions.";
      return;
    }

    try {
      const text = await extractTextFromFile(file);
      const definitions = extractDefinitions(text, difficulty);

      if (!definitions.length) {
        message.className = "message error";
        message.textContent = "No suitable definition sentences were found. Use lesson content with clear 'X is Y' statements.";
        renderQuizPreview(null);
        return;
      }

      const questions = generateByDistribution(definitions, difficulty, distribution);

      const session = getTeacherSession();
      const quiz = {
        quizId: `quiz_${Date.now()}`,
        quizCode: generateQuizCode(),
        title: file.name,
        sourceFileName: file.name,
        difficulty,
        questionCount: questions.length,
        teacherUsername: session?.username || "unknown",
        questionTypes: selectedTypes,
        questions,
        createdAt: new Date().toISOString(),
      };

      saveQuiz(quiz);
      renderQuizPreview(quiz);

      message.className = "message success";
      message.textContent = `Quiz generated successfully. Quiz code: ${quiz.quizCode}`;
    } catch (error) {
      message.className = "message error";
      message.textContent = error.message || "An error occurred while generating the quiz.";
    }
  });
}

function handleStudentAccess() {
  const form = document.getElementById("student-access-form");
  const message = document.getElementById("student-access-message");
  if (!form || !message) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("student-username").value.trim();
    const quizCode = document.getElementById("student-quiz-code").value.trim().toUpperCase();

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

  if (currentQuestion.type === "Multiple Choice" || currentQuestion.type === "True/False") {
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
          value="${answers[currentIndex] ? String(answers[currentIndex]).replace(/"/g, "&quot;") : ""}"
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

  prevBtn.disabled = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;
  nextBtn.classList.toggle("hidden", isLast);
  submitBtn.classList.toggle("hidden", !isLast);
}

function captureCurrentStudentAnswer(payload) {
  const currentQuestion = payload.questions[payload.currentIndex];

  if (currentQuestion.type === "Multiple Choice" || currentQuestion.type === "True/False") {
    const selected = document.querySelector('input[name="student-answer"]:checked');
    payload.answers[payload.currentIndex] = selected ? selected.value : "";
  } else {
    const input = document.getElementById("student-identification-answer");
    payload.answers[payload.currentIndex] =
      input ? input.value.trim() : "";
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

  prevBtn.addEventListener("click", () => {
    captureCurrentStudentAnswer(payload);
    if (payload.currentIndex > 0) {
      payload.currentIndex -= 1;
      saveActiveStudentQuiz(payload);
      renderStudentQuestion(payload);
      message.className = "message";
      message.textContent = "";
    }
  });

  nextBtn.addEventListener("click", () => {
    captureCurrentStudentAnswer(payload);
    if (payload.currentIndex < payload.questions.length - 1) {
      payload.currentIndex += 1;
      saveActiveStudentQuiz(payload);
      renderStudentQuestion(payload);
      message.className = "message";
      message.textContent = "";
    }
  });

  submitBtn.addEventListener("click", () => {
    captureCurrentStudentAnswer(payload);

    const unanswered = payload.questions.some((_, index) => {
      const value = String(payload.answers[index] || "").trim();
      return !value;
    });

    if (unanswered) {
      message.className = "message error";
      message.textContent = "Please answer all questions before submitting.";
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
  document.getElementById("result-student-username").textContent = result.studentUsername;
  document.getElementById("result-quiz-code").textContent = result.quizCode;
  document.getElementById("result-score").textContent = result.score;
  document.getElementById("result-total").textContent = result.totalItems;
  document.getElementById("result-percentage").textContent = `${result.percentage}%`;
}

document.addEventListener("DOMContentLoaded", () => {
  handleTeacherRegister();
  handleTeacherLogin();
  protectTeacherPages();
  handleQuizGenerator();
  handleStudentAccess();
  handleStudentQuiz();
  handleStudentResultPage();
});
