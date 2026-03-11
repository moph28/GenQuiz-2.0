// script.js
const landingView = document.getElementById("landing-view");
const teacherView = document.getElementById("teacher-view");
const studentView = document.getElementById("student-view");

const teacherRoleBtn = document.getElementById("teacher-role-btn");
const studentRoleBtn = document.getElementById("student-role-btn");
const teacherBackBtn = document.getElementById("teacher-back-btn");
const studentBackBtn = document.getElementById("student-back-btn");

function showView(viewId) {
  const views = [landingView, teacherView, studentView];
  views.forEach((view) => view.classList.remove("active"));

  if (viewId === "teacher") teacherView.classList.add("active");
  if (viewId === "student") studentView.classList.add("active");
  if (viewId === "landing") landingView.classList.add("active");
}

teacherRoleBtn.addEventListener("click", () => showView("teacher"));
studentRoleBtn.addEventListener("click", () => showView("student"));
teacherBackBtn.addEventListener("click", () => showView("landing"));
studentBackBtn.addEventListener("click", () => showView("landing"));
