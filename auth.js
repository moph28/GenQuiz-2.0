const AUTH_KEYS = {
  teacherAccount: "genquiz_teacher_account",
  teacherSession: "genquiz_teacher_session",
};

function authRedirect(path) {
  window.location.href = path;
}

function saveTeacherAccount(username, password) {
  localStorage.setItem(
    AUTH_KEYS.teacherAccount,
    JSON.stringify({
      username: username.trim(),
      password: password,
    })
  );
}

function getTeacherAccount() {
  const raw = localStorage.getItem(AUTH_KEYS.teacherAccount);
  return raw ? JSON.parse(raw) : null;
}

function saveTeacherSession(username) {
  localStorage.setItem(
    AUTH_KEYS.teacherSession,
    JSON.stringify({
      username: username.trim(),
      role: "teacher",
    })
  );
}

function getTeacherSession() {
  const raw = localStorage.getItem(AUTH_KEYS.teacherSession);
  return raw ? JSON.parse(raw) : null;
}

function clearTeacherSession() {
  localStorage.removeItem(AUTH_KEYS.teacherSession);
}

function handleTeacherRegister() {
  const form = document.getElementById("teacher-register-form");
  const message = document.getElementById("register-message");
  if (!form || !message) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("register-username")?.value.trim() || "";
    const password = document.getElementById("register-password")?.value || "";
    const confirmPassword =
      document.getElementById("register-confirm-password")?.value || "";

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

    saveTeacherAccount(username, password);

    message.className = "message success";
    message.textContent = "Account created successfully. Redirecting to login...";

    setTimeout(() => {
      authRedirect("teacher-login.html");
    }, 700);
  });
}

function handleTeacherLogin() {
  const form = document.getElementById("teacher-login-form");
  const message = document.getElementById("login-message");
  if (!form || !message) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("login-username")?.value.trim() || "";
    const password = document.getElementById("login-password")?.value || "";

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

    if (account.username !== username || account.password !== password) {
      message.className = "message error";
      message.textContent = "Invalid username or password.";
      return;
    }

    saveTeacherSession(username);

    message.className = "message success";
    message.textContent = "Login successful. Redirecting to dashboard...";

    setTimeout(() => {
      authRedirect("teacher-dashboard.html");
    }, 700);
  });
}

function protectTeacherPages() {
  const currentPage = window.location.pathname.split("/").pop();
  const protectedPages = [
    "teacher-dashboard.html",
    "quiz-generator.html",
    "quiz-library.html",
    "teacher-results.html",
  ];

  if (!protectedPages.includes(currentPage)) return;

  const session = getTeacherSession();

  if (!session || session.role !== "teacher") {
    authRedirect("teacher-login.html");
    return;
  }

  const welcome = document.getElementById("teacher-welcome");
  const display = document.getElementById("teacher-username-display");
  const logoutBtn = document.getElementById("logout-btn");

  if (welcome) {
    welcome.textContent = `Welcome, ${session.username}`;
  }

  if (display) {
    display.textContent = session.username;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearTeacherSession();
      authRedirect("index.html");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  handleTeacherRegister();
  handleTeacherLogin();
  protectTeacherPages();
});
