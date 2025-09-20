const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "app.db"));
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  price_per_night INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  guests INTEGER NOT NULL,
  guest_name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_res_room_dates
  ON reservations (room_id, check_in, check_out);
`);

const count = db.prepare("SELECT COUNT(*) AS c FROM rooms").get().c;
if (count === 0) {
  const ins = db.prepare("INSERT INTO rooms(id,name,capacity,price_per_night) VALUES (?,?,?,?)");
  ins.run(1, "Room 1 – Double", 2, 80);
  ins.run(2, "Room 2 – Triple", 3, 95);
  ins.run(3, "Apartment – 4 persons", 4, 140);
}

module.exports = db;
