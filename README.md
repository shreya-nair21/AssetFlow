# AssetFlow - Enterprise Asset & Resource Management ERP

AssetFlow is a modern Enterprise Resource Planning (ERP) web application designed to help organizations streamline, track, and audit their physical assets, equipment, and shared resources in real-time.

## Features

- **Organization Setup & Hierarchy**: Configure departments, asset categories, employees, and roles (`Admin`, `Asset Manager`, `Department Head`, `Employee`).
- **Asset Directory & Lifecycle Management**: Track registration details, cost, acquisition date, warranty, current status (Active, Maintenance, Retired), and custom attributes.
- **Asset Allocation & Tracking**: Seamless workflows for allocating assets to employees, requesting transfers, and returning assets.
- **Maintenance & Incident Requests**: Create and assign service tickets to technicians, track maintenance status, cost, and approval history.
- **Auditing & Reconciliation**: Launch periodic audit cycles, verify asset statuses/locations, and automatically generate reconciliation discrepancies.
- **Resource & Room Booking**: Schedule bookings for shared workspace assets, meeting rooms, and conference areas.
- **Analytics Dashboard**: Interactive charts and cards detailing asset health, breakdown statistics, allocation counts, and depreciation.
- **Activity & Audit Logs**: Detailed logging of administrative, allocation, and audit events.

---

## Technology Stack

- **Frontend**: React (Vite), TailwindCSS, Recharts, Lucide Icons.
- **Backend**: Node.js, Express.js, sqlite.
- **Authentication**: JWT-based secure sessions with password hashing (bcryptjs).

---

## Directory Structure

```text
AssetFlow/
├── backend/            # Express.js REST API
│   ├── config/         # Database and environment settings
│   ├── controllers/    # API request logic handlers
│   ├── middleware/     # JWT protection & role auth middlewares
│   ├── models/         # MongoDB schema definitions
│   ├── routes/         # Express endpoint definitions
│   ├── server.js       # Main server entrypoint
│   └── package.json
└── frontend/           # Vite + React Client
    ├── src/
    │   ├── components/ # Dashboard, Views, & Auth panels
    │   ├── App.jsx     # App entry routing
    │   └── main.jsx    # React render bootstrap
    └── package.json
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v16 or higher recommended)
- **MongoDB** (running locally on port `27017` or using a MongoDB Atlas URI)

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by creating a `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/assetflow
   JWT_SECRET=supersecretassetflowkey
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```
   *Note: Upon first launch, the server automatically seeds a default Admin user if none exists in the database.*

---

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the local URL (usually `http://localhost:5173`).

---

## Seeded Admin Credentials

You can use the following credentials to access the full application functionality as an Admin:

* **Email:** `admin@assetflow.com`
* **Password:** `admin123`
