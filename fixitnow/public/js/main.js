let currentUser = null;
const protectedSections = ["request", "payment", "track", "admin"];

/* ---------- API helpers ---------- */
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

/* ---------- Page switching ---------- */
function showSection(id) {
  if (!document.getElementById(id)) id = "home";
  if (protectedSections.includes(id) && !currentUser) id = "login"; // must log in first
  if (id === "admin" && currentUser && currentUser.role !== "admin")
    id = "home"; // admins only
  document.querySelectorAll("section").forEach((s) => (s.hidden = true));
  $(id).hidden = false;
  if (id === "admin") loadAdmin();
}
const route = () => showSection(location.hash.slice(1) || "home");
window.addEventListener("hashchange", route);

function updateNav() {
  const out = $("logoutLink");
  if (out) out.parentElement.hidden = !currentUser;
  const adminLi = $("adminLink");
  if (adminLi)
    adminLi.parentElement.hidden = !(
      currentUser && currentUser.role === "admin"
    );
  const login = document.querySelector('a[href="#login"]');
  if (login) login.parentElement.hidden = Boolean(currentUser);
}

/* ---------- Register ---------- */
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
    document.querySelector(".container").classList.remove("active"); // slide back to login
    setMsg("loginMsg", "Account created. Please log in.", true);
  } catch (err) {
    setMsg("regMsg", err.message);
  }
});

/* ---------- Login / Logout ---------- */
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
    location.hash = currentUser.role === "admin" ? "#admin" : "#request";
    route(); // in case the hash didn't change
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

/* ---------- Submit repair request ---------- */
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

/* ---------- Submit payment proof ---------- */
$("paymentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    // FormData carries the file. Don't set Content-Type yourself.
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

/* ---------- Track a request ---------- */
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

    const pay = document.createElement("p");
    const amt = request.payment.amount
      ? ` (PHP ${request.payment.amount})`
      : "";
    pay.textContent = `Payment: ${request.payment.label}${amt}`;
    pay.style.fontWeight = "bold";
    pay.style.color = {
      Paid: "#15803d",
      Pending: "#b45309",
      Rejected: "#c0392b",
      Unpaid: "#555",
    }[request.payment.state];

    const list = document.createElement("ol");
    const current = steps.indexOf(request.status);
    steps.forEach((s, i) => {
      const li = document.createElement("li");
      li.textContent =
        s + (i < current ? " ✓" : i === current ? " ← current" : "");
      list.append(li);
    });
    box.append(title, info, pay, list); // textContent everywhere, so no HTML injection
  } catch (err) {
    const p = document.createElement("p");
    p.style.color = "#c0392b";
    p.textContent = err.message;
    box.append(p);
  }
});

/* ---------- Admin dashboard ---------- */
const STATUS_LIST = [
  "Submitted",
  "Reviewed",
  "Repaired",
  "Ready for Pickup",
  "Completed",
];

function cell(text, multiline = false) {
  const td = document.createElement("td");
  td.textContent = text;
  if (multiline) td.style.whiteSpace = "pre-line";
  return td;
}

async function loadAdmin(keepPanel = false) {
  const body = $("adminRows");
  setMsg("adminMsg", "Loading...", true);
  try {
    const { requests } = await api("/admin/requests");
    body.replaceChildren();
    if (!keepPanel) $("adminPayments").replaceChildren();
    setMsg(
      "adminMsg",
      requests.length ? `${requests.length} request(s)` : "No requests yet.",
      true,
    );
    requests.forEach((r) => body.append(adminRow(r)));
  } catch (err) {
    setMsg("adminMsg", err.message);
  }
}

function adminRow(r) {
  const tr = document.createElement("tr");

  // Repair status dropdown
  const sel = document.createElement("select");
  STATUS_LIST.forEach((st) => {
    const o = document.createElement("option");
    o.value = st;
    o.textContent = st;
    o.selected = st === r.status;
    sel.append(o);
  });
  sel.addEventListener("change", async () => {
    sel.disabled = true;
    try {
      await api("/admin/requests/" + r.ticket, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: sel.value }),
      });
      r.status = sel.value;
      setMsg("adminMsg", `${r.ticket} is now "${sel.value}".`, true);
    } catch (err) {
      sel.value = r.status; // put it back if the save failed
      setMsg("adminMsg", err.message);
    } finally {
      sel.disabled = false;
    }
  });
  const statusTd = document.createElement("td");
  statusTd.append(sel);

  // Delete button (under the status dropdown)
  const del = document.createElement("button");
  del.type = "button";
  del.textContent = "Delete";
  del.style.display = "block";
  del.style.marginTop = "6px";
  del.style.color = "#c0392b";
  del.addEventListener("click", async () => {
    const ok = confirm(
      `Delete ${r.ticket}? This also deletes its payment proofs and cannot be undone.`,
    );
    if (!ok) return;
    del.disabled = true;
    try {
      await api("/admin/requests/" + r.ticket, { method: "DELETE" });
      $("adminPayments").replaceChildren(); // close any open proofs panel
      await loadAdmin();
      setMsg("adminMsg", `${r.ticket} was deleted.`, true);
    } catch (err) {
      del.disabled = false;
      setMsg("adminMsg", err.message);
    }
  });
  statusTd.append(del);

  // Payment cell: current state + button to review proofs
  const payTd = document.createElement("td");
  payTd.className = "pay-" + r.payment.state;
  const label = document.createElement("div");
  label.textContent =
    r.payment.label + (r.payment.amount ? ` (PHP ${r.payment.amount})` : "");
  payTd.append(label);
  if (r.payments > 0) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `Review proofs (${r.payments})`;
    btn.addEventListener("click", () => showPayments(r.ticket));
    payTd.append(btn);
  }

  tr.append(
    cell(r.ticket),
    cell(`${r.fullName}\n${r.contact}\n${r.email}`, true),
    cell(r.equipment),
    cell(r.serviceDate),
    cell(r.problem, true),
    statusTd,
    payTd,
  );
  return tr;
}

async function showPayments(ticket) {
  const box = $("adminPayments");
  box.replaceChildren();
  try {
    const { payments } = await api("/admin/payments/" + ticket);
    const h = document.createElement("h3");
    h.textContent = `Payment proofs for ${ticket}`;
    box.append(h);
    payments.forEach((p) => box.append(paymentCard(ticket, p)));
    box.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    setMsg("adminMsg", err.message);
  }
}

function paymentCard(ticket, p) {
  const card = document.createElement("div");
  card.className = "proof-card";

  const img = document.createElement("img");
  img.src = "/api/admin/payments/file/" + p.id; // only admins can load this
  img.alt = "Payment screenshot";
  img.addEventListener("click", () => window.open(img.src, "_blank"));

  const info = document.createElement("div");
  const line = document.createElement("p");
  line.textContent = `${p.method.toUpperCase()}: PHP ${p.amount} (sent ${p.created_at} UTC)`;
  const status = document.createElement("p");
  status.textContent = "Status: " + p.status;
  status.style.fontWeight = "bold";
  info.append(line, status);

  [
    ["Verify", "Verified"],
    ["Reject", "Rejected"],
  ].forEach(([text, value]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.disabled = p.status === value;
    b.addEventListener("click", async () => {
      try {
        await api("/admin/payments/" + p.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: value }),
        });
        await showPayments(ticket); // redraw the proofs
        await loadAdmin(true); // refresh the table, keep the proofs open
        setMsg("adminMsg", `Payment marked ${value}.`, true);
      } catch (err) {
        setMsg("adminMsg", err.message);
      }
    });
    info.append(b);
  });

  card.append(img, info);
  return card;
}

$("adminRefresh").addEventListener("click", () => loadAdmin());

/* ---------- Start ---------- */
(async function init() {
  const dateInput = $("date");
  if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10); // no past dates

  try {
    currentUser = (await api("/me")).user; // is there a valid login cookie?
  } catch {
    currentUser = null;
  }
  updateNav();
  route();
})();