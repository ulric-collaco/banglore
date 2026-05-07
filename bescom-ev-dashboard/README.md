# GridPulse

**AI-Driven EV Charging Optimization and Infrastructure Planning for BESCOM**

GridPulse is a decision-support dashboard designed to help Bengaluru's electricity supply company (BESCOM) anticipate, manage, and plan for the growing impact of electric vehicle charging on the power distribution network. Built with React 18, Vite, deck.gl, and maplibre-gl, it operates entirely as a non-invasive overlay using predictive modeling and spatial analytics.

## Features

### 🌍 Live Load Monitor
An interactive 3D map of Bengaluru showing existing EV charging stations with extruded load columns, animated traffic flows, and spatial heatmaps. Time-based visualization reveals how charging demand shifts throughout the day.

### 📍 Site Planning
Displays recommended candidate locations for new charging stations to address coverage gaps. Connects candidates to existing infrastructure with arc layers and provides impact metrics like added capacity, projected sessions, and peak relief.

### 📊 Algorithmic Audit
A dedicated panel explaining the mathematical methods powering the dashboard:
- **K-Means Clustering**: Groups stations by usage patterns for targeted load management.
- **Polynomial Regression**: Forecasts load curves and identifies off-peak charging windows.
- **Weighted Scoring Matrix**: Evaluates and ranks candidate sites based on EV density, service gaps, grid headroom, and more.

## Setup & Local Development

### Prerequisites
- Node.js version 18+
- npm (comes with Node.js)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/ulric-collaco/banglore.git
   cd banglore/bescom-ev-dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App
```bash
npm run dev
```
Open `http://localhost:5173/` in your browser.

## Deployment
GridPulse requires no backend server. To build for production (static hosting like Vercel, Netlify, or GitHub Pages):
```bash
npm run build
```
The optimized assets will be generated in the `dist` directory.

## Project Structure
- `src/algorithms/` - Pure JavaScript implementations of regression, clustering, and scoring matrices.
- `src/components/` - React components for the UI, panels, and Map layers.
- `src/data/` - Base configuration and synthetic generation for Bangalore stations.
- `src/styles/` - Global and modular CSS stylesheets ensuring a consistent, premium light-mode theme.
