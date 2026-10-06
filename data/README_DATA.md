# MCGM Open Parking Data Mumbai (v1.1)

## Source Description
The official MCGM parking data comes from the MCGM (Municipal Corporation of Greater Mumbai) portal and Brihanmumbai Electric Supply & Transport (BEST).
Off-Street Parking Data v1.1 contains:
1. `mcgm_offstreet_lots.csv` - 26 MCGM-owned Public Parking Lots (PPL) and multi-level car parks across Mumbai wards (A, G/South, K/West, H/West, etc.)
2. `best_depots_terminals.csv` - 27 BEST bus depots and 38 bus terminals
3. `parking_charges.csv` - Official tariff schedule: Category A (High demand / commercial hub), Category B (Moderate), Category C (Low demand / peripheral), plus fixed BEST depot rates.

## Manual Download Instructions (if updating from portal)
1. Visit MCGM Citizen Portal: `https://crmapp.mcgm.gov.in` (search "Off-Street Parking Data").
2. Download:
   - `OffStreet_Parking_MCGM_v1.1.csv` -> save as `/data/mcgm_offstreet_lots.csv`
   - `BEST_Depots_Terminals_v1.1.csv` -> save as `/data/best_depots_terminals.csv`
   - `Parking_Charges_Schedule_v1.1.csv` -> save as `/data/parking_charges.csv`
3. Run the importer:
   ```bash
   cd backend
   python -m app.importers.mcgm_import --dir ../data
   ```

## Attribution Notice
*Contains data provided by Municipal Corporation of Greater Mumbai and/or Brihanmumbai Electric Supply Unit (BEST).*
*Dataset version: v1.1. Note that operational hours, bay counts, and prices may be updated by municipal gazettes.*
