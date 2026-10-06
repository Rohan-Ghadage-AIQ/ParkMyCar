# 🚗 ParkMumbai — Smart Pre-Booking Parking App for Mumbai (MCGM Open Data)

ParkMumbai is a full-stack, mobile-first parking pre-booking and on-ground vehicle verification platform powered by official **Municipal Corporation of Greater Mumbai (MCGM)** and **Brihanmumbai Electric Supply & Transport (BEST)** open datasets.

---

## 🌟 Key Features

### 1. 🚗 Car Owner Experience
- **Interactive Search & Map**: Find parking facilities across all Mumbai wards (A, D, G/South, H/West, K/West, etc.) using Leaflet + OpenStreetMap.
- **Dynamic Availability**: Live color-coded availability badges (Green: bays open, Amber: low, Red: full / on-site only).
- **Official MCGM Tariff Schedule**: Category A, B, C and BEST fixed duration bands (`Upto 1 hr`, `1-3 hrs`, `3-6 hrs`, `6-12 hrs`).
- **Mock Digital UPI Checkout**: 1-tap booking confirmation with receipt generation.
- **Digital QR Pass**: High-resolution QR ticket with unique 6-character alphanumeric code (e.g. `PK7M2A`), Google Maps directions, countdown timer, plate edit (allowed once before arrival), and tiered cancellations.

### 2. 🛡️ On-Ground Gate Marshal Console
- **QR Scanner & 6-Char Fallback**: Camera barcode reader powered by `html5-qrcode`.
- **Physical Vehicle Verification**: Displays expected license plate in large 36px font to prevent ticket sharing and counterfeit entry.
- **MATCH vs. MISMATCH Workflow**:
  - `MATCH`: 1-tap instant check-in, photo audit, session starts.
  - `MISMATCH`: Modal with reasons and 3 strict actions:
    1. *Reject Entry* (Flags `MISMATCH_REJECTED`, creates Admin dispute ticket).
    2. *Allow with ₹50 Fee* (Charges ₹50 vehicle-change fee, logs payment & shift cash).
    3. *Escalate to Admin* (Entry on hold for Admin review).
- **Walk-in Parking Gate**: Register unregistered street vehicles with cash / UPI receipt.
- **Overstay Settlement at Exit**: Automatically calculates 1.5x penalty per started 30-minute block.
- **Cash Reconciliation**: Shift start/end with physical cash entered vs expected cash discrepancy calculation.
- **Emergency "Lot Full" Action**: 100% auto-refund for pending 1-hour arrivals and provides nearby available alternatives.

### 3. 🏢 MCGM Municipal Admin Console
- **Operations Dashboard**: Total bookings, digital UPI vs cash breakdown, live occupancy gauge.
- **Lot Inventory & Quota Manager**: Adjust online pre-booking quota (default 30% to reserve street walk-ins), enable/disable lots, set price overrides.
- **Dispute Queue**: Review mismatch escalation tickets with attendant photo proof and 1-tap 100% refund resolution.
- **Shift Reconciliation**: Full audit of marshal cash submissions with shortage/surplus tags.
- **Government Data Sync**: 1-click trigger for idempotent CLI importer + CSV file uploader.
- **Immutable Audit Trail**: Chronological event log of all transactions, overrides, and gate scans.

---

## ⚡ Quick Start & Development

### 1. Start Backend & Frontend

#### Option A: Windows Batch Launcher
Double-click `run_dev.bat` or run:
```bash
./run_dev.bat
```

#### Option B: Make / Terminal Commands
```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
python -m app.importers.mcgm_import --dir ../data
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

- **Frontend App**: `http://localhost:5173`
- **Backend API & Swagger Docs**: `http://localhost:8000/docs`

---

## 👥 Demo Quick Login Credentials

The app features a top **1-Tap Demo Mode Switcher Bar** on every page and the login screen:

| Role | Name | Mobile No | Mock OTP | Default Vehicle |
| :--- | :--- | :--- | :--- | :--- |
| **1. Car Owner** | Rahul Sharma | `9820011111` | `123456` | `MH02CB4567` (Car) |
| **2. Gate Marshal** | Santosh Kadam | `9820022222` | `123456` | Assigned to Colaba / Bandra Lots |
| **3. MCGM Admin** | Priya Desai | `9820033333` | `123456` | Municipal Operations Authority |

---

## 🏛️ Government Open Data Attribution

> **Attribution Notice**:
> *Contains data provided by Municipal Corporation of Greater Mumbai (MCGM) and Brihanmumbai Electric Supply & Transport Undertaking (BEST).*
> *Dataset: Off-Street Parking Data v1.1 published on the MCGM Portal.*

The dataset includes 3 primary CSV files located in `/data`:
1. `mcgm_offstreet_lots.csv` — 26 MCGM-owned Public Parking Lots (PPL).
2. `best_depots_terminals.csv` — 27 BEST bus depots and 38 bus terminals (imported with `bookable = False` by default).
3. `parking_charges.csv` — Official municipal duration band tariffs (Category A, B, C, and BEST fixed).

To run the importer from CLI:
```bash
cd backend
python -m app.importers.mcgm_import --dir ../data
```

---

## 🧪 Automated Pytest Test Suite

Run all backend unit and concurrency tests:
```bash
cd backend
pytest -v
```

### Verified Test Cases:
- `test_importer_and_quirks`: Tests idempotent re-runs, text "ALLOWED" and blank capacity handling, missing coordinates, and BEST depot default flags.
- `test_pricing_calculation`: Tests duration bands ("Upto 1 hr", "1-3 hrs"), category resolution, and price overrides.
- `test_cancellation_refund_tiers`: Tests 100% (>2h), 50% (30m-2h), and 0% (<30m) refund logic.
- `test_overstay_calculation`: Tests 1.5x penalty per started 30-minute block at exit.
- `test_availability_and_concurrency_race`: Tests transactional slot reservation preventing quota overflow.
- `test_payment_idempotency`: Tests unique `client_request_id` preventing duplicate charges.
- `test_no_show_task_penalty`: Tests 15-minute grace period cutoff and 20% penalty retention.
- `test_marshal_checkin_match_flow`: Tests QR scan and plate matching gate check-in.
- `test_marshal_mismatch_reject_flow`: Tests plate mismatch rejection and dispute ticket dispatch.
- `test_marshal_mismatch_allow_with_fee_flow`: Tests ₹50 fee collection on vehicle mismatch.

---

## 📌 Architecture & Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 ORM, SQLite (WAL mode) / PostgreSQL ready, PyJWT auth, Pydantic v2.
- **Frontend**: React, Vite, TypeScript, Tailwind CSS v4, TanStack Query, Leaflet Maps, `qrcode.react`, `html5-qrcode`.
- **PWA**: Mobile-first viewport, manifest + service worker installable on low-end Android devices.

---

## 🛠️ Out of Scope / Mocked Modules
- **Payments**: Mock UPI Screen (Success / Fail / Pending) behind `IPaymentGateway` SPI interface for easy Razorpay/Cashfree drop-in.
- **SMS OTP**: Mock OTP fixed to `123456`.
- **License Plate OCR**: Attendants visually verify plate with photo capture fallback.
