// Read Mapbox token and style from Vite environment variables.
// Create a `.env` or `.env.local` file with `VITE_MAPBOX_TOKEN` to avoid committing secrets.
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN';

export const MAP_INITIAL_VIEW_STATE = {
  longitude: 77.5946,
  latitude: 12.9716,
  zoom: 11.35,
  pitch: 62,
  bearing: -22,
  transitionDuration: 1000
};

export const BENGALURU_MAX_BOUNDS = [
  [77.40, 12.76],
  [77.80, 13.24]
];

export const MAPBOX_STYLE = import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/dark-v11';
