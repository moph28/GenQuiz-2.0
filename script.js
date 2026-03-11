const STORAGE_KEYS = {
  teacherAccount: "genquiz_teacher_account",
  teacherSession: "genquiz_teacher_session",
};

function saveTeacherAccount(username, password) {
  const teacherAccount = { username, password };
  localStorage.setItem(STORAGE_KEYS.teacherAccount, JSON.stringify(teacherAccount));
}

function getTeacherAccount() {
  const raw = localStorage.getItem(STORAGE_KEYS.teacherAccount);
  return raw ? JSON.parse(raw) : null;
}

function saveTeacherSession(username) {
  localStorage.setItem(STORAGE_KEYS.teacherSession, JSON.stringify({ username, role: "teacher" }));
}

function getTeacherSession() {
  const raw = localStorage.getItem(STORAGE_KEYS.teacherSession);
  return raw ? JSON.parse(raw) : null;
}

function clearTeacherSession() {
  localStorage.removeItem(STORAGE_KEYS.teacherSession);
}

function redirect(path) {
  window.location.href = path;
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

function protectTeacherDashboard() {
  const onTeacherDashboard = window.location.pathname.endsWith("teacher-dashboard.html");
  if (!onTeacherDashboard) return;

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

document.addEventListener("DOMContentLoaded", () => {
  handleTeacherRegister();
  handleTeacherLogin();
  protectTeacherDashboard();
});
