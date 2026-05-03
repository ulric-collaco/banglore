# BESCOM EV Charging Optimization Dashboard

Decision-support dashboard for Bengaluru EV charging infrastructure planning. Built with React 18, Vite, deck.gl, and Mapbox GL JS. Existing station coordinates are parsed from the local India EV charging station CSV, candidate future sites are synthetic, and all algorithmic work runs locally in pure JavaScript.

## Setup

```bash
npm install
npm run dev
```

The app reads Mapbox settings from Vite env variables. Create a local `.env` or `.env.local` in the `bescom-ev-dashboard` folder and add your token:

```bash
# file: bescom-ev-dashboard/.env
VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token_here
```

An example file is provided at `bescom-ev-dashboard/.env.example`.

## Modes

### Load Monitor

Shows CSV-backed Bengaluru charging stations on a tilted dark Mapbox basemap with 3D buildings, extruded load columns, traffic-flow animation, and a heatmap. The 24-hour slider updates marker color, heatmap intensity, critical station count, average network load, total kW in use, and the recommended four-hour off-peak window.

### Infrastructure Planner

Shows 15 recommended charging station locations in underserved zones. Existing chargers are muted context markers, recommendations are colored by priority, and arc layers connect each candidate to the two nearest existing stations to explain coverage gaps.

### Science Methods

Replaces the map with an audit panel explaining the algorithms behind the dashboard. It includes a K-Means cluster scatter plot, a polynomial regression chart for the highest-peak station, and a weighted scoring matrix for the top candidate locations.

## Algorithm Implementations

### K-Means Clustering

`src/algorithms/kmeans.js` normalizes latitude, longitude, and average daily load, then groups the loaded Bengaluru charging stations into six clusters. It uses K-Means++ seeding with a deterministic random stream, assigns each station to the nearest centroid, recomputes centroid means, and stops when movement falls below `1e-6` or the iteration cap is reached.

### Polynomial Regression

`src/algorithms/regression.js` builds a Vandermonde matrix for degree-3 polynomial regression, solves the normal equations with Gaussian elimination and partial pivoting, then computes predicted hourly load, peak hour, off-peak window, and R2 goodness of fit.

### Weighted Scoring Matrix

`src/algorithms/scoring.js` min-max normalizes candidate factors across all 15 recommended locations, applies transparent weights for EV density, service gap, grid headroom, population density, and road connectivity, and returns a final demand score out of 100.
