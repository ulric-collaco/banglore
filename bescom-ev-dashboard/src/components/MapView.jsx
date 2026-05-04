import { useMemo, useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { latLngToCell } from 'h3-js';
import { CHARGING_STATIONS } from '../data/bangalore_ev_data';
import StationTooltip from './StationTooltip';

function loadColor(load) {
  if (load < 0.2) return [34, 197, 94];
  if (load < 0.4) return [163, 230, 53];
  if (load < 0.6) return [234, 179, 8];
  if (load < 0.8) return [249, 115, 22];
  return [239, 68, 68];
}

function priorityColor(priority) {
  return priority === 'high' ? [234, 88, 12] : priority === 'medium' ? [234, 179, 8] : [163, 230, 53];
}

function nearestStations(site) {
  return [...CHARGING_STATIONS]
    .map((station) => ({ station, distance: (station.lat - site.lat) ** 2 + (station.lng - site.lng) ** 2 }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2)
    .map(({ station }) => ({ ...site, target: station }));
}

export default function MapView({ mode, stationsWithLoad, recommendedSites, vizMode }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  
  const [hover, setHover] = useState(null);
  
  const arcs = useMemo(() => recommendedSites.flatMap(nearestStations), [recommendedSites]);

  // Initialize Mapbox map exactly once
  useEffect(() => {
    if (mapRef.current) return;
    
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [77.5946, 12.9716],
      zoom: 11,
      pitch: 45,
      bearing: 0
    });
    
    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: []
    });
    
    map.addControl(overlay);
    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  const hexData = useMemo(() => {
    if (mode !== 0 || vizMode !== 'hex') return [];
    const cellMap = new Map();
    
    stationsWithLoad.forEach(station => {
      const hexId = latLngToCell(station.lat, station.lng, 7);
      if (!cellMap.has(hexId)) cellMap.set(hexId, { hex: hexId, loadSum: 0, count: 0 });
      const cell = cellMap.get(hexId);
      cell.loadSum += station.load_factor;
      cell.count += 1;
    });
    
    return Array.from(cellMap.values()).map(cell => ({
      hex: cell.hex,
      avgLoad: cell.loadSum / cell.count
    }));
  }, [stationsWithLoad, vizMode, mode]);

  const layers = useMemo(() => {
    const mapLayers = [];

    if (mode === 0) {
      if (vizMode === 'heatmap') {
        mapLayers.push(
          new HeatmapLayer({
            id: 'load-heatmap',
            data: stationsWithLoad,
            getPosition: (station) => [station.lng, station.lat],
            getWeight: (station) => station.load_factor * station.capacity_kw,
            intensity: 2,
            radiusPixels: 60,
            colorRange: [[34, 197, 94], [132, 204, 22], [234, 179, 8], [249, 115, 22], [239, 68, 68]],
            updateTriggers: {
              getWeight: [stationsWithLoad]
            }
          })
        );
      } else if (vizMode === 'hex') {
        mapLayers.push(
          new H3HexagonLayer({
            id: 'load-hex',
            data: hexData,
            pickable: true,
            wireframe: false,
            filled: true,
            extruded: true,
            elevationScale: 500,
            getHexagon: d => d.hex,
            getFillColor: d => [...loadColor(d.avgLoad), 200],
            getElevation: d => d.avgLoad * 10,
            updateTriggers: {
              getFillColor: [hexData],
              getElevation: [hexData]
            }
          })
        );
      } else if (vizMode === 'coverage') {
        mapLayers.push(
          new ScatterplotLayer({
            id: 'coverage-areas',
            data: stationsWithLoad,
            pickable: true,
            opacity: 0.2,
            stroked: false,
            filled: true,
            radiusMinPixels: 1,
            getPosition: (station) => [station.lng, station.lat],
            getRadius: 3000,
            getFillColor: (station) => loadColor(station.load_factor),
            onHover: setHover,
            updateTriggers: {
              getFillColor: [stationsWithLoad]
            }
          }),
          new ScatterplotLayer({
            id: 'coverage-points',
            data: stationsWithLoad,
            pickable: false,
            opacity: 1,
            stroked: true,
            filled: true,
            lineWidthMinPixels: 2,
            radiusMinPixels: 4,
            getPosition: (station) => [station.lng, station.lat],
            getRadius: 50,
            getFillColor: [255, 255, 255],
            getLineColor: (station) => loadColor(station.load_factor),
            updateTriggers: {
              getLineColor: [stationsWithLoad]
            }
          })
        );
      }
    } else if (mode === 1) {
      mapLayers.push(
        new ScatterplotLayer({
          id: 'existing-context',
          data: stationsWithLoad,
          getPosition: (station) => [station.lng, station.lat],
          getRadius: 40,
          getFillColor: [156, 163, 175, 180]
        }),
        new ArcLayer({
          id: 'coverage-arcs',
          data: arcs,
          getSourcePosition: (site) => [site.lng, site.lat],
          getTargetPosition: (site) => [site.target.lng, site.target.lat],
          getSourceColor: (site) => priorityColor(site.priority),
          getTargetColor: [255, 255, 255],
          getWidth: 2
        }),
        new ScatterplotLayer({
          id: 'recommended-sites',
          data: recommendedSites,
          pickable: true,
          stroked: true,
          lineWidthMinPixels: 3,
          getPosition: (site) => [site.lng, site.lat],
          getRadius: (site) => 70 + ((site.demand_score - 60) / 40) * 90,
          getFillColor: (site) => [...priorityColor(site.priority), 235],
          getLineColor: [255, 255, 255, 220],
          onHover: setHover
        })
      );
    }

    return mapLayers;
  }, [mode, vizMode, stationsWithLoad, hexData, arcs, recommendedSites]);

  // Update mapbox overlay layers when they change
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setProps({ layers });
    }
  }, [layers]);

  return (
    <div className="mapView">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <StationTooltip hover={hover} />
    </div>
  );
}
