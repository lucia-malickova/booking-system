# Booking System

This is a demo reservation system project built in **Node.js (Express)** with support for **JSON storage** and a future plan to integrate **PostgreSQL**.

## Features
- Backend API with `GET` and `POST` endpoints for reservations
- In-memory and JSON file storage
- Ready for SQL / PostgreSQL integration
- Simple logging of requests
- REST API tested with Thunder Client / Postman

## Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/<your-username>/booking-system.git
  
Install dependencies:

bash
Kopírovať kód
npm install
Start the server:

bash
Kopírovať kód
node index.js
API will be available at http://localhost:4000

Example Requests
Health check

http
Kopírovať kód
GET /health
Get reservations

http
Kopírovať kód
GET /public/reservations
Create a reservation

http
Kopírovať kód
POST /public/reservations
Content-Type: application/json
{
  "name": "John Doe",
  "room": "101",
  "date": "2025-09-20"
}
Future Plans
Frontend calendar UI

PostgreSQL database support

Dockerized deployment

Multi-language support (Slovak/English)

💡 This project is also used as a portfolio example to demonstrate backend architecture, API design, database integration, and test management skills.
