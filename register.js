const form = document.getElementById("registerForm");
const statusEl = document.getElementById("status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mobile = document.getElementById("mobile").value.trim();
  if (!/^\d{10}$/.test(mobile)) {
    setStatus(statusEl, "Enter a valid 10-digit mobile number.", "error");
    return;
  }

  const btn = form.querySelector("button");
  btn.disabled = true;
  btn.textContent = "Creating account…";

  try {
    const result = await api("register", {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim().toLowerCase(),
      mobile,
      roll: document.getElementById("roll").value.trim(),
      department: document.getElementById("department").value.trim(),
      year: document.getElementById("year").value,
      division: document.getElementById("division").value.trim(),
      college: "V.V.P.I.E.T. Solapur",
      password: document.getElementById("password").value
    });
    setStatus(statusEl, result.message || "Registration successful!", "success");
    form.reset();
    document.getElementById("college").value = "V.V.P.I.E.T. Solapur";
    setTimeout(() => location.href = "login.html", 900);
  } catch (err) {
    setStatus(statusEl, err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create Account";
  }
});
