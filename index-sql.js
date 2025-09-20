const express = require("express");
const cors = require("cors");
const path = require("path");
const { randomUUID } = require("crypto");
const db = require("./db");

const app = express();
const PORT = 4100; // ← beží vedľa tvojej pôvodnej verzie

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health
app.get("/health", (_req, res) => res.json({ ok: true, engine: "sqlite", port: PORT }));

// Rooms
app.get("/public/rooms", (_req, res) => {
  const rooms = db.prepare(`
    SELECT id, name, capacity, price_per_night AS pricePerNight FROM rooms
  `).all();
  res.json({ rooms });
});

// List reservations
app.get("/public/reservations", (_req, res) => {
  const reservations = db.prepare(`
    SELECT id, room_id AS roomId, check_in AS checkIn, check_out AS checkOut,
           guests, guest_name AS guestName, email, status, created_at AS createdAt
    FROM reservations
    ORDER BY created_at DESC
  `).all();
  res.json({ reservations });
});

// Create reservation
app.post("/public/reservations", (req, res) => {
  const { roomId, checkIn, checkOut, guests, guestName, email } = req.body || {};
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!roomId || !checkIn || !checkOut || !guestName || !email || !re.test(checkIn) || !re.test(checkOut) || checkOut <= checkIn) {
    return res.status(400).json({ error: "Invalid payload." });
  }
  const conflict = db.prepare(`
    SELECT 1 FROM reservations
    WHERE room_id = ?
      AND NOT (check_out <= ? OR check_in >= ?)
    LIMIT 1
  `).get(roomId, checkIn, checkOut);
  if (conflict) return res.status(409).json({ error: "Term is already booked." });

  const id = randomUUID();
  db.prepare(`
    INSERT INTO reservations (id, room_id, check_in, check_out, guests, guest_name, email, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `).run(id, roomId, checkIn, checkOut, guests ?? 2, guestName, email, new Date().toISOString());

  const reservation = db.prepare(`
    SELECT id, room_id AS roomId, check_in AS checkIn, check_out AS CheckOut,
           guests, guest_name AS guestName, email, status, created_at AS createdAt
    FROM reservations WHERE id = ?
  `).get(id);

  res.status(201).json({ reservation });
});

// Delete reservation
app.delete("/public/reservations/:id", (req, res) => {
  const info = db.prepare("DELETE FROM reservations WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Reservation not found" });
  res.json({ ok: true, id: req.params.id });
});

// Availability helper
function daysBetween(from, to) {
  const out = [];
  const d1 = new Date(from + "T00:00:00Z");
  const d2 = new Date(to + "T00:00:00Z");
  for (let d = new Date(d1); d < d2; d.setUTCDate(d.getUTCDate() + 1)) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

// Availability
app.get("/public/availability/:roomId", (req, res) => {
  const roomId = Number(req.params.roomId);
  const from = String(req.query.from || "");
  const to = String(req.query.to || "");
  if (!roomId || !from || !to) return res.status(400).json({ error: "roomId, from, to required" });

  const rows = db.prepare(`
    SELECT check_in AS checkIn, check_out AS checkOut
    FROM reservations
    WHERE room_id = ?
      AND NOT (check_out <= ? OR check_in >= ?)
  `).all(roomId, from, to);

  let bookedDates = [];
  for (const r of rows) bookedDates.push(...daysBetween(r.checkIn, r.checkOut));
  bookedDates = [...new Set(bookedDates)].sort();

  res.json({ roomId, bookedDates, from, to });
});

app.listen(PORT, () => console.log(`SQL server running on http://localhost:${PORT}`));
