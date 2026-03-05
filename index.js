const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const ical = require('node-ical'); // NOVÉ: Spracovanie kalendára
const axios = require('axios');    // NOVÉ: Sťahovanie dát

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_KEY = "lucia123"; 

// SEM VLOŽÍŠ SVOJ AIRBNB LINK (Export Calendar -> iCal link)
const AIRBNB_ICAL_URL = https://sk.airbnb.com/calendar/ical/1252224630542609904.ics?t=62f0dee1a462427d966afb29d18dc2c4;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");
const RES_FILE = path.join(DATA_DIR, "reservations.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(RES_FILE)) fs.writeFileSync(RES_FILE, "[]", "utf8");

function loadRes() { return JSON.parse(fs.readFileSync(RES_FILE, "utf8")); }
function saveRes(arr) { fs.writeFileSync(RES_FILE, JSON.stringify(arr, null, 2), "utf8"); }

function daysBetween(from, to) {
  const out = [];
  let d = new Date(from);
  let end = new Date(to);
  while (d < end) {
    out.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// NOVÉ: Funkcia na sťahovanie dát z Airbnb
async function getAirbnbDates() {
  if (!AIRBNB_ICAL_URL || AIRBNB_ICAL_URL === "TVOJ_AIRBNB_ICAL_LINK_TU") return [];
  
  try {
    const response = await axios.get(AIRBNB_ICAL_URL);
    const data = ical.parseICS(response.data);
    const blocked = [];

    for (let k in data) {
      const event = data[k];
      if (event.type === 'VEVENT') {
        blocked.push(...daysBetween(event.start, event.end));
      }
    }
    return blocked;
  } catch (error) {
    console.error("Airbnb Sync Error:", error.message);
    return [];
  }
}

// GET: Spojíme manuálne rezervácie + Airbnb
app.get("/public/reservations", async (req, res) => {
  const manualRes = loadRes();
  const manualDates = manualRes.flatMap(r => daysBetween(r.checkIn, r.checkOut));
  
  // Stiahneme aktuálne dáta z Airbnb
  const airbnbDates = await getAirbnbDates();
  
  // Spojíme ich a odstránime duplicity
  const allBooked = [...new Set([...manualDates, ...airbnbDates])];
  
  res.json({ 
    reservations: manualRes, 
    bookedDates: allBooked 
  });
});

// Ostatné cesty zostávajú rovnaké (POST, DELETE)
app.post("/public/reservations", (req, res) => {
  const { checkIn, checkOut, guestName, email, auth } = req.body;
  if (auth !== ADMIN_KEY) return res.status(401).json({ error: "Unauthorized" });

  const reservations = loadRes();
  const newRes = { id: uuidv4(), checkIn, checkOut, guestName, email };
  reservations.push(newRes);
  saveRes(reservations);
  res.status(201).json(newRes);
});

app.delete("/public/reservations/:id", (req, res) => {
  const { auth } = req.body;
  if (auth !== ADMIN_KEY) return res.status(401).json({ error: "Unauthorized" });

  let reservations = loadRes();
  reservations = reservations.filter(r => r.id !== req.params.id);
  saveRes(reservations);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Villa Lucia Engine Syncing on ${PORT}`));
