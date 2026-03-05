const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid'); // npm install uuid

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_KEY = "lucia123"; // Tvoj tajný kľúč pre admin operácie

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");
const RES_FILE = path.join(DATA_DIR, "reservations.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(RES_FILE)) fs.writeFileSync(RES_FILE, "[]", "utf8");

function loadRes() { return JSON.parse(fs.readFileSync(RES_FILE, "utf8")); }
function saveRes(arr) { fs.writeFileSync(RES_FILE, JSON.stringify(arr, null, 2), "utf8"); }

// Pomocná funkcia na rozbalenie dní (v tvojom štýle)
function daysBetween(from, to) {
  const out = [];
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d < end) {
    out.push(d.toISOString().split('T')[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

// GET: Verejné dáta pre kalendár
app.get("/public/reservations", (req, res) => {
  const reservations = loadRes();
  const bookedDates = reservations.flatMap(r => daysBetween(r.checkIn, r.checkOut));
  res.json({ reservations, bookedDates: [...new Set(bookedDates)] });
});

// POST: Pridanie novej rezervácie (z tvojho Adminu)
app.post("/public/reservations", (req, res) => {
  const { checkIn, checkOut, guestName, email, auth } = req.body;
  if (auth !== ADMIN_KEY) return res.status(401).json({ error: "Unauthorized" });

  const reservations = loadRes();
  const overlap = reservations.find(r => !(r.checkOut <= checkIn || r.checkIn >= checkOut));
  if (overlap) return res.status(409).json({ error: "Termín je obsadený." });

  const newRes = { id: uuidv4(), checkIn, checkOut, guestName, email, source: 'manual' };
  reservations.push(newRes);
  saveRes(reservations);
  res.status(201).json(newRes);
});

// DELETE: Mazanie rezervácie
app.delete("/public/reservations/:id", (req, res) => {
  const { auth } = req.body;
  if (auth !== ADMIN_KEY) return res.status(401).json({ error: "Unauthorized" });

  let reservations = loadRes();
  reservations = reservations.filter(r => r.id !== req.params.id);
  saveRes(reservations);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Villa Lucia Engine on ${PORT}`));
