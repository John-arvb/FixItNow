require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const { DatabaseSync } = require("node:sqlite"); // built into Node 22.13+, nothing to compile

const { JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, NODE_ENV } = process.env;
const PORT = process.env.PORT || 3000;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("Set JWT_SECRET (32+ characters) in your .env file.");
  process.exit(1);
}

/* ---------------- Database ---------------- */
const db = new DatabaseSync(path.join(__dirname, "fixitnow.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'customer',
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    full_name    TEXT NOT NULL,
    contact      TEXT NOT NULL,
    email        TEXT NOT NULL,
    equipment    TEXT NOT NULL,
    service_date TEXT NOT NULL,
    problem      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'Submitted',
    created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS payments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL REFERENCES requests(id),
    method     TEXT NOT NULL,
    amount     REAL NOT NULL,
    screenshot TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Older databases: add the payment status column if it's missing
if (
  !db
    .prepare("PRAGMA table_info(payments)")
    .all()
    .some((c) => c.name === "status")
) {
  db.exec(
    "ALTER TABLE payments ADD COLUMN status TEXT NOT NULL DEFAULT 'Pending'",
  );
}

// Create the first admin account if it doesn't exist yet
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const email = ADMIN_EMAIL.toLowerCase();
  if (!db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
    ).run("Admin", email, bcrypt.hashSync(ADMIN_PASSWORD, 10), "admin");
    console.log("Admin account created:", email);
  }
}

/* ---------------- Helpers ---------------- */
const EQUIPMENT = ["computer", "laptop", "phone", "tablet", "printer", "other"];
const WALLETS = ["gcash", "maya", "shopeepay", "other"];
const STATUSES = [
  "Submitted",
  "Reviewed",
  "Repaired",
  "Ready for Pickup",
  "Completed",
];

const ticketOf = (id) => "FIN-" + String(id).padStart(5, "0");
const idOf = (ticket) => {
  const m = /^FIN-(\d{5})$/i.exec(String(ticket).trim());
  return m ? Number(m[1]) : null;
};
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const publicRequest = (r) => ({
  ticket: ticketOf(r.id),
  equipment: r.equipment,
  serviceDate: r.service_date,
  problem: r.problem,
  status: r.status,
  createdAt: r.created_at,
});

// Works out a ticket's payment state from its uploaded proofs
function paymentOf(requestId) {
  const rows = db
    .prepare(
      "SELECT status, amount FROM payments WHERE request_id = ? ORDER BY id DESC",
    )
    .all(requestId);
  if (!rows.length) return { state: "Unpaid", label: "Unpaid", amount: 0 };
  const paid = rows
    .filter((r) => r.status === "Verified")
    .reduce((sum, r) => sum + r.amount, 0);
  if (paid > 0) return { state: "Paid", label: "Paid", amount: paid };
  if (rows.some((r) => r.status === "Pending")) {
    return {
      state: "Pending",
      label: "Payment submitted, awaiting verification",
      amount: rows[0].amount,
    };
  }
  return {
    state: "Rejected",
    label: "Payment rejected, please resubmit",
    amount: 0,
  };
}

function signIn(res, user) {
  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
  res.cookie("token", token, {
    httpOnly: true, // JavaScript in the page can't read it
    sameSite: "lax", // blocks cross-site POSTs
    secure: NODE_ENV === "production", // HTTPS only in production
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function auth(req, res, next) {
  try {
    req.user = jwt.verify(req.cookies.token, JWT_SECRET);
    next();
  } catch {
    bad(res, "Please log in first.", 401);
  }
}
const adminOnly = (req, res, next) =>
  req.user.role === "admin" ? next() : bad(res, "Admins only.", 403);

/* ---------------- App setup ---------------- */
const app = express();
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.get('/favicon.ico', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'images', 'FIXITNOW.png'))
);

const uploadDir = path.join(__dirname, "uploads"); // NOT served publicly
fs.mkdirSync(uploadDir, { recursive: true });

const EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) =>
      cb(null, crypto.randomBytes(16).toString("hex") + EXT[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, Boolean(EXT[file.mimetype])),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Try again in 15 minutes." },
});

/* ---------------- Auth routes ---------------- */
app.post("/api/register", authLimiter, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password || "");

  if (!name || name.length > 100) return bad(res, "Enter your full name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad(res, "Enter a valid email.");
  if (password.length < 6 || password.length > 72)
    return bad(res, "Password must be 6 to 72 characters.");

  try {
    const hash = await bcrypt.hash(password, 10);
    db.prepare(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
    ).run(name, email, hash);
    res.status(201).json({ ok: true });
  } catch (e) {
    if (/UNIQUE/i.test(String(e.message)))
      return bad(res, "That email is already registered.", 409);
    console.error(e);
    bad(res, "Could not create account.", 500);
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return bad(res, "Wrong email or password.", 401);
  }
  signIn(res, user);
  res.json({ user: { name: user.name, email: user.email, role: user.role } });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  try {
    const u = jwt.verify(req.cookies.token, JWT_SECRET);
    res.json({ user: { name: u.name, role: u.role } });
  } catch {
    res.json({ user: null });
  }
});

/* ---------------- Repair requests ---------------- */
app.post("/api/requests", auth, (req, res) => {
  const b = req.body;
  const fullName = String(b.fullname || "").trim();
  const contact = String(b.contact || "").trim();
  const email = String(b.email || "")
    .trim()
    .toLowerCase();
  const equipment = String(b.equipment || "");
  const date = String(b.date || "");
  const problem = String(b.problem || "").trim();

  if (!fullName || fullName.length > 100)
    return bad(res, "Enter your full name.");
  if (!/^09\d{9}$/.test(contact))
    return bad(res, "Contact number must be 11 digits starting with 09.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad(res, "Enter a valid email.");
  if (!EQUIPMENT.includes(equipment))
    return bad(res, "Choose an equipment type.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date < new Date().toISOString().slice(0, 10)
  ) {
    return bad(res, "Choose a service date that is today or later.");
  }
  if (!problem || problem.length > 2000)
    return bad(res, "Describe the problem (max 2000 characters).");

  const info = db
    .prepare(
      `
    INSERT INTO requests (user_id, full_name, contact, email, equipment, service_date, problem)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(req.user.id, fullName, contact, email, equipment, date, problem);

  res.status(201).json({ ticket: ticketOf(info.lastInsertRowid) });
});

app.get("/api/requests/mine", auth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM requests WHERE user_id = ? ORDER BY id DESC")
    .all(req.user.id);
<<<<<<< HEAD
  res.json({ requests: rows.map(publicRequest) });
=======
  res.json({
    requests: rows.map((r) => ({
      ...publicRequest(r),
      payment: paymentOf(r.id),
    })),
  });
>>>>>>> c99ba7a760bd51aca054ba33ef960f286fb7d7a9
});

app.get("/api/requests/:ticket", auth, (req, res) => {
  const id = idOf(req.params.ticket);
  if (!id) return bad(res, "Ticket format should look like FIN-00123.");

  const row = db.prepare("SELECT * FROM requests WHERE id = ?").get(id);
  // Same message whether it doesn't exist or belongs to someone else
  if (!row || (row.user_id !== req.user.id && req.user.role !== "admin")) {
    return bad(res, "Ticket not found.", 404);
  }
  res.json({
    request: { ...publicRequest(row), payment: paymentOf(row.id) },
    steps: STATUSES,
  });
});

/* ---------------- Payments ---------------- */
app.post(
  "/api/payments",
  auth,
  upload.single("paymentScreenshot"),
  (req, res) => {
    const discard = () => req.file && fs.unlink(req.file.path, () => {});

    const id = idOf(req.body.ticketRef);
    const method = String(req.body.paymentMethod || "");
    const amount = Number(req.body.paymentAmount);

    if (!req.file)
      return bad(res, "Upload an image (JPG, PNG, WEBP or GIF, max 5 MB).");
    if (!id) {
      discard();
      return bad(res, "Ticket format should look like FIN-00123.");
    }
    if (!WALLETS.includes(method)) {
      discard();
      return bad(res, "Choose an e-wallet.");
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
      discard();
      return bad(res, "Enter a valid amount.");
    }

    const row = db.prepare("SELECT * FROM requests WHERE id = ?").get(id);
    if (!row || row.user_id !== req.user.id) {
      discard();
      return bad(res, "Ticket not found.", 404);
    }

    db.prepare(
      "INSERT INTO payments (request_id, method, amount, screenshot) VALUES (?, ?, ?, ?)",
    ).run(id, method, amount, req.file.filename);
    res.status(201).json({ ok: true });
  },
);

/* ---------------- Admin ---------------- */
app.get("/api/admin/requests", auth, adminOnly, (req, res) => {
  const rows = db
    .prepare(
      `
    SELECT r.*, (SELECT COUNT(*) FROM payments p WHERE p.request_id = r.id) AS payment_count
    FROM requests r ORDER BY r.id DESC
  `,
    )
    .all();
  res.json({
    requests: rows.map((r) => ({
      ...publicRequest(r),
      fullName: r.full_name,
      contact: r.contact,
      email: r.email,
      payments: r.payment_count,
<<<<<<< HEAD
=======
      payment: paymentOf(r.id),
>>>>>>> c99ba7a760bd51aca054ba33ef960f286fb7d7a9
    })),
  });
});

app.patch("/api/admin/requests/:ticket", auth, adminOnly, (req, res) => {
  const id = idOf(req.params.ticket);
  const status = String(req.body.status || "");
  if (!id) return bad(res, "Invalid ticket.");
  if (!STATUSES.includes(status))
    return bad(res, "Status must be one of: " + STATUSES.join(", "));

  const info = db
    .prepare("UPDATE requests SET status = ? WHERE id = ?")
    .run(status, id);
  if (!info.changes) return bad(res, "Ticket not found.", 404);
  res.json({ ok: true, status });
});

app.get("/api/admin/payments/:ticket", auth, adminOnly, (req, res) => {
  const id = idOf(req.params.ticket);
  const rows = id
    ? db
        .prepare(
<<<<<<< HEAD
          "SELECT id, method, amount, created_at FROM payments WHERE request_id = ?",
=======
          "SELECT id, method, amount, status, created_at FROM payments WHERE request_id = ?",
>>>>>>> c99ba7a760bd51aca054ba33ef960f286fb7d7a9
        )
        .all(id)
    : [];
  res.json({ payments: rows });
});

<<<<<<< HEAD
=======
app.patch("/api/admin/payments/:id", auth, adminOnly, (req, res) => {
  const status = String(req.body.status || "");
  if (!["Pending", "Verified", "Rejected"].includes(status))
    return bad(res, "Status must be Pending, Verified or Rejected.");
  const info = db
    .prepare("UPDATE payments SET status = ? WHERE id = ?")
    .run(status, Number(req.params.id));
  if (!info.changes) return bad(res, "Payment not found.", 404);
  res.json({ ok: true, status });
});

>>>>>>> c99ba7a760bd51aca054ba33ef960f286fb7d7a9
app.get("/api/admin/payments/file/:id", auth, adminOnly, (req, res) => {
  const row = db
    .prepare("SELECT screenshot FROM payments WHERE id = ?")
    .get(Number(req.params.id));
  if (!row) return bad(res, "Not found.", 404);
  res.sendFile(path.join(uploadDir, row.screenshot));
});

/* ---------------- Errors ---------------- */
app.use("/api", (req, res) => bad(res, "Not found.", 404));
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError)
    return bad(res, "Upload failed: " + err.message);
  console.error(err);
  bad(res, "Server error.", 500);
});

app.listen(PORT, () =>
  console.log(`FixItNow running at http://localhost:${PORT}`),
);
