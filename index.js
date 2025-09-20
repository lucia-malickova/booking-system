// apps/backend/index.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();                 // 1) najprv vytvor app
const PORT = 4000;

// 2) až potom middleware-y
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());

// LOG každého requestu (pomáha vidieť, čo sa deje)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// ===== DEMO IZBY (zatím bez DB) =====
const ROOMS = [
  { id: 1, name: "Izba 1 – Dvojlôžko", capacity: 2, pricePerNight: 80 },
  { id: 2, name: "Izba 2 – Trojlôžko", capacity: 3, pricePerNight: 95 },
  { id: 3, name: "Apartmán – 4 osoby", capacity: 4, pricePerNight: 140 },
];

// ===== "PERZISTENCIA" DO SÚBORU (aby sa rezervácie nestratili) =====
const DATA_DIR = path.join(__dirname, "data");
const RES_FILE = path.join(DATA_DIR, "reservations.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(RES_FILE)) fs.writeFileSync(RES_FILE, "[]", "utf8");

function loadReservations() {
  return JSON.parse(fs.readFileSync(RES_FILE, "utf8"));
}
function saveReservations(arr) {
  fs.writeFileSync(RES_FILE, JSON.stringify(arr, null, 2), "utf8");
}

// Pomocná funkcia: vytvor zoznam dní medzi dvoma dátumami (YYYY-MM-DD)
function daysBetween(from, to) {
  // berieme noci: od checkIn (vrátane) po deň pred checkOut
  const out = [];
  const d1 = new Date(from + "T00:00:00Z");
  const d2 = new Date(to + "T00:00:00Z");
  for (let d = new Date(d1); d < d2; d.setUTCDate(d.getUTCDate() + 1)) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    out.push(`${yyyy}-${mm}-${dd}`);
  }
  return out;
}

// ===== ENDPOINTY =====
app.get("/", (_req, res) => res.send("Ahoj z backendu!"));
app.get("/health", (_req, res) => res.json({ ok: true, service: "backend", version: "0.3.0" }));
app.get("/public/rooms", (_req, res) => res.json({ rooms: ROOMS }));

// vytvorenie rezervácie
app.post("/public/reservations", (req, res) => {
  const { roomId, checkIn, checkOut, guests, guestName, email } = req.body || {};
  if (!roomId || !checkIn || !checkOut || !guestName || !email) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  // načítaj existujúce rezervácie
  const reservations = loadReservations();

  // jednoduchá kontrola kolízie (ak sa termín prekrýva s existujúcou rezerváciou tej istej izby)
  const overlap = reservations.find(
    (r) =>
      Number(r.roomId) === Number(roomId) &&
      !(r.checkOut <= checkIn || r.checkIn >= checkOut)
  );
  if (overlap) return res.status(409).json({ error: "Termín je obsadený." });

  const reservation = {
    id: Math.random().toString(36).slice(2),
    roomId: Number(roomId),
    checkIn,
    checkOut,
    guests: guests ?? 2,
    guestName,
    email,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  reservations.push(reservation);
  saveReservations(reservations);
  return res.status(201).json({ reservation, total: reservations.length });
});

// zoznam rezervácií
app.get("/public/reservations", (_req, res) => {
  res.json({ reservations: loadReservations() });
});

// dostupnosť pre kalendár: vráti obsadené dni
// GET /public/availability/1?from=2025-10-01&to=2025-10-31
app.get("/public/availability/:roomId", (req, res) => {
  const roomId = Number(req.params.roomId);
  const { from, to } = req.query; // YYYY-MM-DD (voliteľné)

  const reservations = loadReservations().filter((r) => Number(r.roomId) === roomId);

  // rozbalíme rezervácie na konkrétne dni
  let bookedDates = reservations.flatMap((r) => daysBetween(r.checkIn, r.checkOut));

  // ak prišiel filter from/to, obmedzíme výsledok
  if (from) bookedDates = bookedDates.filter((d) => d >= from);
  if (to) bookedDates = bookedDates.filter((d) => d <= to);

  // unikátne dni (pre istotu)
  bookedDates = [...new Set(bookedDates)].sort();

  res.json({ roomId, bookedDates, from: from || null, to: to || null });
});

app.listen(PORT, () => console.log(`Server beží na http://localhost:${PORT}`));
