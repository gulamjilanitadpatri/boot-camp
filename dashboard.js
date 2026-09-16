const session = getSession("studentSession");
if (!session) location.href = "login.html";

document.getElementById("studentName").textContent = session?.name || "Student";
document.getElementById("welcomeName").textContent = (session?.name || "Student").split(" ")[0];

document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession("studentSession");
  location.href = "login.html";
});

function renderProfile(s) {
  const items = [
    ["Name", s.name], ["Email", s.email], ["Mobile", s.mobile],
    ["Roll Number", s.roll], ["Department", s.department],
    ["Year", s.year], ["Division", s.division], ["College", s.college]
  ];
  document.getElementById("profile").innerHTML = items.map(([k,v]) =>
    `<div><span>${k}</span><strong>${escapeHtml(v || "-")}</strong></div>`).join("");
}
function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

async function loadDashboard() {
  try {
    const [studentData, testsData, resultsData] = await Promise.all([
      api("getStudent", {email: session.email}),
      api("getTests"),
      api("getStudentResults", {email: session.email})
    ]);
    renderProfile(studentData.student);
    renderTests(testsData.tests || []);
    renderResults(resultsData.results || []);
  } catch (err) {
    document.getElementById("tests").innerHTML = `<div class="empty error-text">${escapeHtml(err.message)}</div>`;
  }
}

function renderTests(tests) {
  const box = document.getElementById("tests");
  if (!tests.length) {
    box.innerHTML = `<div class="empty">No aptitude tests are available yet.</div>`;
    return;
  }
  box.innerHTML = tests.map(t => `
    <article class="test-card">
      <div class="test-number">${escapeHtml(t.testId)}</div>
      <h3>${escapeHtml(t.testName)}</h3>
      <p>${escapeHtml(t.description || "Aptitude assessment")}</p>
      <div class="test-meta"><span>⏱ ${t.duration} min</span><span>✦ ${t.questionCount} questions</span><span>★ ${t.maxScore} marks</span></div>
      ${t.completed ? `<button class="btn disabled-btn" disabled>Completed</button>` : `<a class="btn primary" href="aptitude.html?test=${encodeURIComponent(t.testId)}">Start Test</a>`}
    </article>`).join("");
}

function renderResults(results) {
  const box = document.getElementById("results");
  if (!results.length) {
    box.innerHTML = `<div class="empty">No test results yet.</div>`;
    return;
  }
  box.innerHTML = `<table><thead><tr><th>Test</th><th>Score</th><th>Max</th><th>Percentage</th><th>Date</th></tr></thead><tbody>${
    results.map(r => `<tr><td>${escapeHtml(r.testName)}</td><td>${r.score}</td><td>${r.maxScore}</td><td>${r.percentage}%</td><td>${escapeHtml(r.timestamp)}</td></tr>`).join("")
  }</tbody></table>`;
}
loadDashboard();
