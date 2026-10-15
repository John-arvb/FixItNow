let currentUser = null;
const protectedSections = ["request", "payment", "track"];

async function api(path, options = {}) {
  const res = await fetch("/api" + path, {
    credentials: "same-origin",
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

const postJSON = (path, body) =>
  api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const $ = (id) => document.getElementById(id);
const setMsg = (id, text, ok = false) => {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? "#15803d" : "#c0392b";
};

function showSection(id) {
  if (!document.getElementById(id)) id = "home";
  if (protectedSections.includes(id) && !currentUser) id = "login"; // must log in first
  document.querySelectorAll("section").forEach((s) => (s.hidden = true));
  $(id).hidden = false;
}
const route = () => showSection(location.hash.slice(1) || "home");
window.addEventListener("hashchange", route);

function updateNav() {
  const out = $("logoutLink");
  if (out) out.parentElement.hidden = !currentUser;
  const login = document.querySelector('a[href="#login"]');
  if (login) login.parentElement.hidden = Boolean(currentUser);
}

$("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await postJSON("/register", {
      name: $("regName").value,
      email: $("regEmail").value,
      password: $("regPassword").value,
    });
    e.target.reset();
    setMsg("regMsg", "");
    document.querySelector(".container").classList.remove("active");

    setMsg("loginMsg", "Account created. Please log in.", true);
  } catch (err) {
    setMsg("regMsg", err.message);
  }
});

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await postJSON("/login", {
      email: $("loginEmail").value,
      password: $("loginPassword").value,
    });
    currentUser = data.user;
    e.target.reset();
    setMsg("loginMsg", "");
    updateNav();
    location.hash = "#request";
    route();
  } catch (err) {
    setMsg("loginMsg", err.message);
  }
});

$("logoutLink").addEventListener("click", async (e) => {
  e.preventDefault();
  await postJSON("/logout", {});
  currentUser = null;
  updateNav();
  location.hash = "#login";
  route();
});

$("requestForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    const data = await postJSON(
      "/requests",
      Object.fromEntries(new FormData(form)),
    );
    form.reset();
    setMsg(
      "requestMsg",
      `Request submitted! Your Ticket ID is ${data.ticket}. Save it to track and pay.`,
      true,
    );
  } catch (err) {
    setMsg("requestMsg", err.message);
  }
});

$("paymentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    
    await api("/payments", { method: "POST", body: new FormData(form) });
    form.reset();
    setMsg(
      "paymentMsg",
      "Payment proof received. We will verify it shortly.",
      true,
    );
  } catch (err) {
    setMsg("paymentMsg", err.message);
  }
});


$("trackBtn").addEventListener("click", async () => {
  const ticket = $("trackInput").value.trim().toUpperCase();
  const box = $("trackResult");
  box.replaceChildren(); // clear the previous result

  try {
    const { request, steps } = await api(
      "/requests/" + encodeURIComponent(ticket),
    );

    const title = document.createElement("h3");
    title.textContent = `${request.ticket}: ${request.status}`;
    const info = document.createElement("p");
    info.textContent = `${request.equipment}, service date ${request.serviceDate}`;

    const list = document.createElement("ol");
    const current = steps.indexOf(request.status);
    steps.forEach((s, i) => {
      const li = document.createElement("li");
      li.textContent =
        s + (i < current ? " ✓" : i === current ? " ← current" : "");
      list.append(li);
    });
    box.append(title, info, list);

  } catch (err) {
    const p = document.createElement("p");
    p.style.color = "#c0392b";
    p.textContent = err.message;
    box.append(p);
  }
});


(async function init() {
  const dateInput = $("date");
  if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10); // no past dates

  try {
    currentUser = (await api("/me")).user; 

  } catch {
    currentUser = null;
  }
  updateNav();
  route();
})();
