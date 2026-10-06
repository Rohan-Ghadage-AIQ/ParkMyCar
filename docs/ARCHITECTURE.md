# ParkMumbai Architecture & Design Specifications

## 1. System Overview
**ParkMumbai** is an intelligent pre-booking and on-ground vehicle verification parking management application tailored for Mumbai's public and private parking ecosystem.

```
                  +----------------------------------------------+
                  |         React + Vite + TS (PWA)              |
                  |  Leaflet Map | TanStack Query | Tailwind CSS |
                  +----------------------+-----------------------+
                                         | REST / JSON
                                         v
                  +----------------------------------------------+
                  |          FastAPI Application (Python)        |
                  |   Auth (JWT) | Capacity Engine | Pricing Calc|
                  +----------------------+-----------------------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
             +--------------------+               +--------------------+
             | SQLAlchemy 2.0 ORM |               | Payment Gateway    |
             | SQLite (WAL) / PG  |               | (Mock Service SPI) |
             +--------------------+               +--------------------+
```

## 2. Municipal Data Integration
- **Source**: MCGM Open Parking Data v1.1 and BEST Bus Depots/Terminals dataset.
- **Idempotency**: Upserts matching on `(agency, gis_id)` so repetitive imports never create duplicate records.
- **Quirk Tolerant**:
  - Unquantified capacity strings like `"ALLOWED"` or blanks are stored as `NULL` with `capacity_note`, keeping the lot unbookable until an administrator configures numeric spots.
  - Missing coordinates automatically mark lot as `bookable = False`.
  - BEST depots default to `bookable = False` to protect municipal bus operations.
  - MCGM `free_parking = 'Y'` is preserved and badged appropriately.

## 3. Capacity & Concurrency Model
- Inventory is calculated as available slots per vehicle class per time slot `[start, end]`.
- Online capacity = `floor(total_bays * bookable_quota_percent / 100)`.
- Default online quota is **30%**, leaving 70% for street walk-ins.
- Transactions are serialized with row-level locks to prevent overbooking races.

## 4. Tariff & Billing Bands
- Official MCGM Category A, B, C bands:
  - `Upto 1 hr`
  - `1-3 hrs`
  - `3-6 hrs`
  - `6-12 hrs`
- Overstay: 1.5x applicable 1-hour rate per started 30-minute block.
- Cancellation tiers:
  - `> 2 hours before arrival`: 100% refund
  - `30 mins - 2 hours`: 50% refund
  - `< 30 mins`: 0% refund
- No-show penalty: 15-minute grace period held. After cutoff, marked `NO_SHOW`, keeps 20% penalty fee, mock refunds 80%.
