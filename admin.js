const admin = getSession("adminSession");
if (!admin) location.href = "admin.html";

document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession("adminSession");
  location.href = "admin.html";
});

document.querySelectorAll(".side-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".side-btn").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".admin-section").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("section-" + btn.dataset.section).classList.add("active");
    if (btn.dataset.section === "tests") loadTests();
    if (btn.dataset.section === "students") loadStudents();
    if (btn.dataset.section === "results") loadResults();
  });
});

const createForm = document.getElementById("createTestForm");
createForm.addEventListener("submit", async e => {
  e.preventDefault();
  const status = document.getElementById("createStatus");
  const btn = createForm.querySelector("button");
  btn.disabled = true;
  try {
    const r = await api("adminCreateTest", {
      testId: v("testId"), testName: v("testName"), description: v("testDescription"),
      duration: Number(v("duration")), marksPerQuestion: Number(v("marksPerQuestion")),
      startDate: v("startDate"), endDate: v("endDate"), status: v("testStatus")
    });
    setStatus(status, r.message, "success");
    createForm.reset();
    document.getElementById("duration").value = 20;
    document.getElementById("marksPerQuestion").value = 1;
  } catch(err) { setStatus(status, err.message, "error"); }
  finally { btn.disabled = false; }
});

const qForm = document.getElementById("questionForm");
qForm.addEventListener("submit", async e => {
  e.preventDefault();
  const status = document.getElementById("questionStatus");
  const btn = qForm.querySelector("button");
  btn.disabled = true;
  try {
    const r = await api("adminAddQuestion", {
      testId: v("qTestId"), questionId: v("questionId"), question: v("question"),
      optionA: v("optionA"), optionB: v("optionB"), optionC: v("optionC"), optionD: v("optionD"),
      correctAnswer: v("correctAnswer"), marks: Number(v("qMarks"))
    });
    setStatus(status, r.message, "success");
    qForm.reset();
    document.getElementById("qMarks").value = 1;
  } catch(err) { setStatus(status, err.message, "error"); }
  finally { btn.disabled = false; }
});

function v(id){ return document.getElementById(id).value.trim(); }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

async function loadTests() {
  const box = document.getElementById("adminTests");
  box.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const r = await api("adminGetTests");
    box.innerHTML = (r.tests || []).map(t => `<div class="admin-row"><div><strong>${esc(t.testId)} · ${esc(t.testName)}</strong><small>${esc(t.description || "")}</small></div><span>${t.questionCount} questions · ${t.status}</span></div>`).join("") || '<div class="empty">No tests created.</div>';
  } catch(e){ box.innerHTML = `<div class="empty error-text">${esc(e.message)}</div>`; }
}

async function loadStudents() {
  const box = document.getElementById("students");
  box.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const r = await api("adminGetStudents");
    box.innerHTML = `<table><thead><tr><th>Name</th><th>Email</th><th>Roll</th><th>Department</th><th>Year</th></tr></thead><tbody>${(r.students||[]).map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${esc(s.roll)}</td><td>${esc(s.department)}</td><td>${esc(s.year)}</td></tr>`).join("")}</tbody></table>`;
  } catch(e){ box.innerHTML = `<div class="empty error-text">${esc(e.message)}</div>`; }
}

async function loadResults() {
  const box = document.getElementById("adminResults");
  box.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const r = await api("adminGetResults");
    box.innerHTML = `<table><thead><tr><th>Student</th><th>Test</th><th>Score</th><th>%</th><th>Date</th></tr></thead><tbody>${(r.results||[]).map(x=>`<tr><td>${esc(x.studentName)}</td><td>${esc(x.testName)}</td><td>${x.score}/${x.maxScore}</td><td>${x.percentage}%</td><td>${esc(x.timestamp)}</td></tr>`).join("")}</tbody></table>`;
  } catch(e){ box.innerHTML = `<div class="empty error-text">${esc(e.message)}</div>`; }
}

loadTests();
