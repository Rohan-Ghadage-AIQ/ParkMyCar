# Vehicle Verification & Gate Protocol

```mermaid
flowchart TD
    A[Car Arrives at Gate] --> B[Marshal Scans QR / Enters 6-Char Code]
    B --> C[System Checks Slot Time & Lot ID]
    C --> D[Display Huge Expected License Plate in App]
    D --> E[Marshal Compares with Physical Number Plate]
    
    E -->|Physical Plate Matches| F[Tap MATCH]
    F --> G[Capture Photo Audit]
    G --> H[Session Starts • Boom Barrier Opens]
    
    E -->|Physical Plate Differs| I[Tap MISMATCH]
    I --> J[Select Reason & Capture Car Photo]
    
    J --> K{Select Mismatch Action}
    K -->|1. Reject Entry| L[Booking set to MISMATCH_REJECTED<br/>Dispute ticket dispatched to Admin]
    K -->|2. Allow with Fee| M[Charge ₹50 Vehicle-Change Fee<br/>Logged to Cash Shift • Session Starts]
    K -->|3. Escalate| N[Entry on hold<br/>Dispatched to Admin Review Queue]

    H --> O[Exit & Overstay Settlement]
    O --> P{Overstay Detected?}
    P -->|Yes| Q[Calculate 1.5x Rate per 30m Block<br/>Collect UPI/Cash before Exit]
    P -->|No| R[Session Completed • Barrier Raised]
    Q --> R
```

### Key Safety Edge Cases
1. **Early Arrival**: Check-in is locked until `start_time - 15 mins`.
2. **Expired / Cancelled Pass**: Gate scanner immediately warns attendant and blocks access.
3. **Wrong Lot QR**: Warns attendant that customer is at the wrong location with direct lot name.
4. **Discrepancy Reporting**: Attendant submits cash at shift close; system flags any shortage or surplus in the Admin ledger.
