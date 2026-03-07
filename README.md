# ⚙️ Booking Engine (API)

This repository contains the **Node.js (Express) backend** powering the reservation logic for **Villa Lucia** — a luxury forest sanctuary in Banská Štiavnica (UNESCO Heritage). 

It acts as a lightweight, high-performance API that synchronizes guest availability between the Villa's neural companion (Lucy) and the frontend interface.

## 🚀 Core Functionalities
* **RESTful API Architecture:** Clean GET/POST endpoints for seamless calendar integration.
* **Hybrid Data Storage:** Currently utilizing JSON file persistence, architected for future PostgreSQL migration.
* **CORS Optimized:** Securely serves the Villa Lucia frontend hosted on Vercel.
* **Automated Health Monitoring:** Built-in vitality checks for 24/7 reliability.

## 🛠️ Technical Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **Deployment:** Render (Live Production)
* **Testing:** Postman / Thunder Client Verified

## 📍 API Endpoints
* `GET /public/reservations` — Retrieve live availability dates.
* `POST /public/reservations` — Securely submit new booking inquiries.
* `GET /health` — System status and vitality check.

## 🔧 Installation & Local Setup
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/lucia-malickova/booking-system.git](https://github.com/lucia-malickova/booking-system.git)
   
