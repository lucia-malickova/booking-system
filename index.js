const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // Povolí prepojenie s tvojím webom
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");
const RES_FILE = path.join(DATA_DIR, "reservations.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(RES_FILE)) fs.writeFileSync(RES_FILE, "[]", "utf8");

function loadReservations() { return JSON.parse(fs.readFileSync(RES_FILE, "utf8")); }
function saveReservations(arr) { fs.writeFileSync(RES_FILE, JSON.stringify(arr, null, 2), "utf8"); }

// TVOJA LOGIKA ROZBITIA NA DNI
function daysBetween(from, to) {
  const out = [];
  const d1 = new Date(from + "T00:00:00Z");
  const d2 = new Date(to + "T00:00:00Z");
  for (let d = new Date(d1); d < d2; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().split('T')[0]);
  }
  return out;
}

// GET - VRÁTI DÁTA PRE WEB
app.get("/public/reservations", (req, res) => {
  const reservations = loadReservations();
  const allBookedDates = reservations.flatMap(r => daysBetween(r.checkIn, r.checkOut));
  res.json({ 
    reservations, 
    bookedDates: [...new Set(allBookedDates)].sort() 
  });
});

// POST - PRIDÁ REZERVÁCIU CEZ TVOJ ADMIN FORMULÁR
app.post("/public/reservations", (req, res) => {
  const { checkIn, checkOut, guestName, email } = req.body;
  if (!checkIn || !checkOut || !guestName) return res.status(400).json({ error: "Missing fields" });

  const reservations = loadReservations();
  const overlap = reservations.find(r => !(r.checkOut <= checkIn || r.checkIn >= checkOut));
  if (overlap) return res.status(409).json({ error: "Termín je obsadený." });

  const newRes = {
    id: Math.random().toString(36).slice(2),
    checkIn, checkOut, guestName, email,
    createdAt: new Date().toISOString()
  };

  reservations.push(newRes);
  saveReservations(reservations);
  res.status(201).json(newRes);
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
