# Apollo CAD

Apollo CAD is the standalone computer-aided dispatch application used with the Apollo MDT integration.

## Version 0.6.5

This operationalization release adds:

- A clean startup state with no preloaded calls, completed incidents, activity, or units.
- Active Unit Sessions so only logged-on units appear on the Unit Board.
- Unit logon using the authoritative physical-vehicle and radio-identifier roster.
- Each ambulance vehicle receives its own ALS/BLS identifiers plus the shared 311, 313, 316, 318, 9311, 9313, 9316, and 9318 identifiers.
- One required and up to four operational crew members.
- A separate optional Paramedic Intern, EMT Student, or Other Ride Along record.
- CAD crew changes, unit status changes, and protected unit logoff.
- CAD-only Out of Service status with a required reason and assignment protection.
- Secure CAD-to-MDT unit-status events so MDT can display CAD-controlled Out of Service state and reason.
- Hydration-safe Pacific clock initialization on every CAD screen.
- Responsive Unit Management controls with full status labels and contained action buttons.
- Non-blocking CAD-to-MDT delivery warnings while the future MDT receiver endpoint is unavailable.
- Call assignment and reassignment limited to logged-on units not committed elsewhere.
- Session synchronization through assignment, status changes, completion, and MDT status updates.
- Four-digit CCEMSA daily EMS sequence display with Pacific-time timestamps.

Crew names are entered manually in the standalone CAD for now. The data model includes employee IDs so the controls can later use active ApolloEMS employee profiles without changing the session structure.

## Local development

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

Open `http://localhost:3000/CAD`.

Keep `.env.local` private. Use `.env.local.example` only as the configuration template.
