const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const ical = require('node-ical');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_KEY = "lucia123"; 

// 1. OPRAVENÝ ZOZNAM LINKOV (Všetky spolu v jednom poli)
const ICAL_URLS = [
  "https://sk.airbnb.com/calendar/ical/1252224630542609904.ics?t=62f0dee1a462427d966afb29d18dc2c4",
  "https://ical.booking.com/v1/export?t=34e8749b-1bb2-4b99-8668-8e21cf7c2fb3",
  "https://www.hauzi.sk/ics/V7oDwxnDFaVD5R7aU/fW7c2DwyDvsxTvzOV"
];

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
  d.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  while (d < end) {
    out.push(d.toISOString().split('T')[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

// 2. FUNKCIA NA SYNCHRONIZÁCIU VŠETKÝCH KALENDÁROV
async function getExternalDates() {
  const allBlocked = [];
  for (const url of ICAL_URLS) {
    try {
      console.log(`Lucy is fetching: ${url.substring(0, 40)}...`);
      const response = await axios.get(url);
      const data = ical.sync.parseICS(response.data);
      for (let k in data) {
        const event = data[k];
        if (event.type === 'VEVENT') {
          allBlocked.push(...daysBetween(event.start, event.end));
        }
      }
    } catch (error) {
      console.error(`Sync error for link:`, error.message);
    }
  }
  return allBlocked;
}

// 3. CESTA PRE VEREJNÝ KALENDÁR
app.get("/public/reservations", async (req, res) => {
  const manualRes = loadRes();
  const manualDates = manualRes.flatMap(r => daysBetween(r.checkIn, r.checkOut));
  const externalDates = await getExternalDates();
  const allBooked = [...new Set([...manualDates, ...externalDates])];
  
  res.json({ 
    reservations: manualRes, 
    bookedDates: allBooked 
  });
});

// 4. PRIDANIE REZERVÁCIE (ADMIN)
app.post("/public/reservations", (req, res) => {
  const { checkIn, checkOut, guestName, email, auth } = req.body;
  if (auth !== ADMIN_KEY) return res.status(401).json({ error: "Unauthorized" });

  const reservations = loadRes();
  const newRes = { id: uuidv4(), checkIn, checkOut, guestName, email };
  reservations.push(newRes);
  saveRes(reservations);
  res.status(201).json(newRes);
});

// 5. MAZANIE REZERVÁCIE (ADMIN)
app.delete("/public/reservations/:id", (req, res) => {
  const { auth } = req.body; // Heslo posielame v tele požiadavky
  if (auth !== ADMIN_KEY) return res.status(401).json({ error: "Unauthorized" });

  let reservations = loadRes();
  reservations = reservations.filter(r => r.id !== req.params.id);
  saveRes(reservations);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Villa Lucia Engine Syncing on ${PORT}`));
