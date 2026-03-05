// Uprav tento endpoint v index.js:
app.post("/public/reservations", (req, res) => {
  const { checkIn, checkOut, guestName, email } = req.body || {};
  
  // roomId už nekontrolujeme, automaticky priradíme 1 (celá Villa)
  if (!checkIn || !checkOut || !guestName || !email) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const reservations = loadReservations();

  // Kontrola kolízie pre celý objekt
  const overlap = reservations.find(
    (r) => !(r.checkOut <= checkIn || r.checkIn >= checkOut)
  );
  
  if (overlap) return res.status(409).json({ error: "Termín je obsadený." });

  const reservation = {
    id: Math.random().toString(36).slice(2),
    roomId: 1, // Vždy celá Villa
    checkIn,
    checkOut,
    guestName,
    email,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  reservations.push(reservation);
  saveReservations(reservations);
  return res.status(201).json({ reservation, total: reservations.length });
});
