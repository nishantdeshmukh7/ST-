# ST Pay Lite

A premium, mobile-first Web Application for state transport bus ticketing. Built with React (Vite) and a Node.js/Express SQLite backend.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, Sequelize (SQLite)
- **Authentication**: JWT & bcrypt
- **Payments**: Razorpay Integration

## Features
- **Mobile-First Design**: Responsive PWA-ready shell optimized for mobile devices.
- **Role-Based Access**: Secure portals for Passengers, Conductors, and Admins.
- **QR Code Booking**: Passengers scan route-specific QR codes to instantly generate a ticket flow.
- **Digital Ticketing**: Generate and download verified digital boarding passes with dynamic barcodes.
- **Secure Payments**: Integrated UPI intent flow with session timers and secure SSL checkups.

---

## Local Development Setup

### 1. Backend Setup
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory (optional, defaults are provided in `server.js` for local dev):
   ```
   PORT=5000
   JWT_SECRET=supersecretjwtkey_change_in_production
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```
4. Start the backend server:
   ```bash
   npm start
   # or node server.js
   ```
   *Note: The SQLite database (`database.sqlite`) will be created automatically on the first run.*

### 2. Frontend Setup
1. Open a new terminal and navigate to the project root (`st-pay-lite`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the project root:
   ```
   VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```

### 3. Testing the Application
1. Open `http://localhost:5173` in your browser.
2. Navigate to the **Verify (Conductor)** or **Admin** tab.
3. Click the **"Seed emulator accounts"** button (only visible on localhost) to populate the SQLite database with test accounts.
4. Log in using the seeded credentials:
   - **Admin**: `admin@stpay.com` / `password123`
   - **Conductor**: `conductor@stpay.com` / `password123`
5. Test the passenger flow by booking a ticket and simulating a Razorpay payment.

---

## Migration Note
This project was migrated from Firebase (Auth/Firestore/Functions) to a custom Node.js/Express + SQLite backend for complete data ownership and zero-setup local development.
