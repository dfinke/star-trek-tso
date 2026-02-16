# TypeScript Port (Separate Directory)

This folder contains a TypeScript/Node.js port of the PowerShell game, preserving the same architecture style:

- MVC-ish separation
- GoF Command pattern for player actions
- Strategy pattern for combat math
- Factory for scenario setup
- Observer-style view updates
- State for ship condition

## Commands

- `NAV <x> <y>`
- `PHA <energy>`
- `TOR <x> <y>`
- `SRS`
- `STATUS`
- `HELP`
- `QUIT`

## Run

1. Install dependencies:
   - `npm install`
2. Build:
   - `npm run build`
3. Start game:
   - `npm run start`

## Smoke Test

After build:

- `npm run smoke`
