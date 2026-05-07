import { useMemo, useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { latLngToCell } from 'h3-js';
import { CHARGING_STATIONS, HOURLY_LOAD_PROFILES } from '../data/bangalore_ev_data';
import { MAP_INITIAL_VIEW_STATE, MAP_STYLE } from '../config';
import { createAfterBuildStations } from '../utils/buildoutImpact';
import StationTooltip from './StationTooltip';
import { formatHour } from '../hooks/useLoadData';

function loadColor(load) {
  if (load < 0.2) return [34, 197, 94];
  if (load < 0.4) return [163, 230, 53];
  if (load < 0.6) return [234, 179, 8];
  if (load < 0.8) return [249, 115, 22];
  return [239, 68, 68];
}

function loadColorCss(load) {
  const [r, g, b] = loadColor(load);
  return `rgb(${r}, ${g}, ${b})`;
}

function priorityColor(priority) {
  return priority === 'high' ? [234, 88, 12] : priority === 'medium' ? [234, 179, 8] : [163, 230, 53];
}

function selectedColor(priority) {
  return priority === 'high' ? [22, 163, 74] : priority === 'medium' ? [20, 184, 166] : [59, 130, 246];
}

function nearestStations(site) {
  return [...CHARGING_STATIONS]
    .map((station) => ({ station, distance: (station.lat - site.lat) ** 2 + (station.lng - site.lng) ** 2 }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2)
    .map(({ station }) => ({ ...site, target: station }));
}

const ZONE_SPREAD = {
  'Tech employment corridor': 0.024,
  'Residential catchment': 0.032,
  'Metro and transport hub': 0.026,
  'Retail and hospital corridor': 0.022,
  'Highway and logistics route': 0.038,
  'Industrial and fleet depot': 0.03,
  'Recommended buildout': 0.028
};

const DEMAND_OFFSETS = [
  [0, 0, 1],
  [0.8, 0.1, 0.62],
  [-0.75, 0.18, 0.58],
  [0.16, 0.82, 0.52],
  [-0.2, -0.78, 0.5],
  [0.58, 0.58, 0.44],
  [-0.58, 0.52, 0.4],
  [0.52, -0.56, 0.38],
  [-0.5, -0.5, 0.36]
];

function stationDemandFootprint(station) {
  const spread = ZONE_SPREAD[station.zone_type] ?? 0.026;
  const baseWeight = station.load_factor * station.capacity_kw * (0.9 + (station.demand_index ?? 0.65));
  return DEMAND_OFFSETS.map(([lngOffset, latOffset, multiplier], index) => ({
    id: `${station.id}-${index}`,
    lat: station.lat + latOffset * spread,
    lng: station.lng + lngOffset * spread,
    weight: baseWeight * multiplier
  }));
}

export default function MapView({
  mode,
  stationsWithLoad,
  recommendedSites,
  vizMode,
  hour,
  panelOpen,
  setPanelOpen,
  selectedCandidateIds,
  onCandidateToggle,
  comparisonView = 'before',
  plannedBuildoutSites = []
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  
  const [hover, setHover] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [overlayReady, setOverlayReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [selectedStationId, setSelectedStationId] = useState(null);
  
  const arcs = useMemo(() => recommendedSites.flatMap(nearestStations), [recommendedSites]);
  const selectedCandidateSet = useMemo(() => new Set(selectedCandidateIds), [selectedCandidateIds]);
  const selectedSites = useMemo(
    () => recommendedSites.filter((site) => selectedCandidateSet.has(site.id)),
    [recommendedSites, selectedCandidateSet]
  );
  const reliefArcs = useMemo(() => selectedSites.flatMap(nearestStations), [selectedSites]);

  useEffect(() => {
    if (mapRef.current) return;
    
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [MAP_INITIAL_VIEW_STATE.longitude, MAP_INITIAL_VIEW_STATE.latitude],
      zoom: MAP_INITIAL_VIEW_STATE.zoom,
      pitch: MAP_INITIAL_VIEW_STATE.pitch,
      bearing: MAP_INITIAL_VIEW_STATE.bearing
    });

    mapRef.current = map;

    map.on('load', () => {
      const overlay = new MapboxOverlay({
        interleaved: true,
        layers: []
      });
      
      map.addControl(overlay);
      overlayRef.current = overlay;
      setOverlayReady(true);
    });

    map.on('error', () => {
      setMapError('Map tiles are taking longer than expected. Data layers are still available.');
    });

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

  const heatmapData = useMemo(() => {
    if (mode !== 0 || vizMode !== 'heatmap') return [];
    const sourceStations = comparisonView === 'after'
      ? createAfterBuildStations(stationsWithLoad, plannedBuildoutSites, hour)
      : stationsWithLoad;
    return sourceStations.flatMap(stationDemandFootprint);
  }, [mode, vizMode, stationsWithLoad, comparisonView, plannedBuildoutSites, hour]);

  const mapStations = useMemo(() => {
    if (mode === 0 && vizMode === 'heatmap' && comparisonView === 'after') {
      return createAfterBuildStations(stationsWithLoad, plannedBuildoutSites, hour);
    }
    return stationsWithLoad;
  }, [mode, vizMode, comparisonView, stationsWithLoad, plannedBuildoutSites, hour]);

  const layers = useMemo(() => {
    const mapLayers = [];
    const profileByStation = new Map(HOURLY_LOAD_PROFILES.map((p) => [p.station_id, p.hourly]));

    if (mode === 0) {
      if (vizMode === 'heatmap') {
        mapLayers.push(
          new HeatmapLayer({
            id: 'load-heatmap',
            data: heatmapData,
            getPosition: (point) => [point.lng, point.lat],
            getWeight: (point) => point.weight,
            intensity: 1.35,
            radiusPixels: 118,
            threshold: 0.018,
            colorRange: [[34, 197, 94, 0], [34, 197, 94, 80], [234, 179, 8, 135], [249, 115, 22, 185], [239, 68, 68, 230]],
            transitions: {
              getWeight: 600
            },
            updateTriggers: {
              getWeight: [hour, heatmapData]
            }
          })
        );
      } else if (vizMode === 'hex') {
        mapLayers.push(
          new H3HexagonLayer({
            id: 'load-hex',
            data: hexData,
            pickable: false,
            wireframe: false,
            filled: true,
            extruded: true,
            elevationScale: 380,
            getHexagon: d => d.hex,
            getFillColor: d => [...loadColor(d.avgLoad), 185],
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
            data: CHARGING_STATIONS,
            pickable: false,
            opacity: 0.2,
            stroked: false,
            filled: true,
            radiusMinPixels: 1,
            getPosition: (station) => [station.lng, station.lat],
            getRadius: 3000,
            getFillColor: (station) => {
              const load_factor = profileByStation.get(station.id)?.[hour] ?? 0;
              return loadColor(load_factor);
            },
            transitions: {
              getFillColor: 600,
              getRadius: 600
            },
            updateTriggers: {
              getFillColor: [hour]
            }
          }),
          new ScatterplotLayer({
            id: 'coverage-points',
            data: CHARGING_STATIONS,
            pickable: false,
            opacity: 1,
            stroked: true,
            filled: true,
            lineWidthMinPixels: 2,
            radiusMinPixels: 4,
            getPosition: (station) => [station.lng, station.lat],
            getRadius: 50,
            getFillColor: [255, 255, 255],
            getLineColor: (station) => {
              const load_factor = profileByStation.get(station.id)?.[hour] ?? 0;
              return loadColor(load_factor);
            },
            transitions: {
              getLineColor: 600
            },
            updateTriggers: {
              getLineColor: [hour]
            }
          })
        );
      }

      if (vizMode !== 'coverage') {
        mapLayers.push(
          new ScatterplotLayer({
            id: 'load-station-points',
            data: mapStations,
            pickable: true,
            stroked: true,
            filled: true,
            lineWidthMinPixels: 2,
            radiusMinPixels: 4,
            getPosition: (station) => [station.lng, station.lat],
            getRadius: (station) => station.status === 'planned'
              ? 86
              : (station.id === selectedStationId ? 95 : 62),
            getFillColor: (station) => station.status === 'planned'
              ? [20, 184, 166, 235]
              : [...loadColor(station.load_factor), station.id === selectedStationId ? 255 : 230],
            getLineColor: (station) => station.status === 'planned'
              ? [5, 46, 22, 255]
              : (station.id === selectedStationId ? [15, 23, 42, 255] : [255, 255, 255, 230]),
            onHover: setHover,
            updateTriggers: {
              getRadius: [selectedStationId],
              getFillColor: [hour, selectedStationId, comparisonView],
              getLineColor: [selectedStationId, comparisonView]
            }
          })
        );
      }
      
      // Hidden layer for hover tooltip across all modes
      mapLayers.push(
        new ScatterplotLayer({
          id: 'hover-stations',
          data: mapStations,
          pickable: true,
          opacity: 0,
          stroked: false,
          filled: true,
          getPosition: (station) => [station.lng, station.lat],
          getRadius: 300,
          getFillColor: [0, 0, 0, 0],
          onHover: setHover
        })
      );
      
    } else if (mode === 1) {
      mapLayers.push(
        new ScatterplotLayer({
          id: 'selected-impact-coverage',
          data: selectedSites,
          pickable: false,
          stroked: true,
          filled: true,
          lineWidthMinPixels: 2,
          getPosition: (site) => [site.lng, site.lat],
          getRadius: (site) => 1800 + site.demand_score * 34,
          getFillColor: (site) => [...selectedColor(site.priority), 28],
          getLineColor: (site) => [...selectedColor(site.priority), 150],
          updateTriggers: {
            getRadius: [selectedCandidateIds],
            getFillColor: [selectedCandidateIds],
            getLineColor: [selectedCandidateIds]
          }
        }),
        new ScatterplotLayer({
          id: 'existing-context',
          data: stationsWithLoad,
          getPosition: (station) => [station.lng, station.lat],
          getRadius: 48,
          getFillColor: [71, 85, 105, 165],
          getLineColor: [255, 255, 255, 210],
          stroked: true,
          lineWidthMinPixels: 1
        }),
        new ArcLayer({
          id: 'coverage-arcs',
          data: arcs,
          getSourcePosition: (site) => [site.lng, site.lat],
          getTargetPosition: (site) => [site.target.lng, site.target.lat],
          getSourceColor: (site) => [...priorityColor(site.priority), 140],
          getTargetColor: [71, 85, 105, 80],
          getWidth: 1.3
        }),
        new ArcLayer({
          id: 'selected-relief-arcs',
          data: reliefArcs,
          getSourcePosition: (site) => [site.lng, site.lat],
          getTargetPosition: (site) => [site.target.lng, site.target.lat],
          getSourceColor: (site) => [...selectedColor(site.priority), 210],
          getTargetColor: [22, 163, 74, 130],
          getWidth: 3.2
        }),
        new ScatterplotLayer({
          id: 'recommended-sites',
          data: recommendedSites,
          pickable: true,
          stroked: true,
          lineWidthMinPixels: 3,
          getPosition: (site) => [site.lng, site.lat],
          getRadius: (site) => (selectedCandidateSet.has(site.id) ? 96 : 56 + site.demand_score * 1.05),
          getFillColor: (site) => selectedCandidateSet.has(site.id)
            ? [...selectedColor(site.priority), 245]
            : [...priorityColor(site.priority), 225],
          getLineColor: (site) => selectedCandidateSet.has(site.id) ? [5, 46, 22, 255] : [255, 255, 255, 220],
          onHover: setHover,
          onClick: ({ object }) => {
            if (object) onCandidateToggle(object);
          },
          updateTriggers: {
            getRadius: [selectedCandidateIds],
            getFillColor: [selectedCandidateIds],
            getLineColor: [selectedCandidateIds]
          }
        })
      );
    }

    return mapLayers;
  }, [
    mode,
    vizMode,
    stationsWithLoad,
    hexData,
    heatmapData,
    mapStations,
    arcs,
    reliefArcs,
    recommendedSites,
    selectedSites,
    selectedCandidateSet,
    selectedCandidateIds,
    hour,
    comparisonView,
    selectedStationId,
    onCandidateToggle
  ]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setProps({ layers });
    }
  }, [layers, overlayReady]);

  const handleStationClick = (station) => {
    setSelectedStationId(station.id);
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [station.lng, station.lat], zoom: 15, duration: 800 });
    }
  };

  const filteredStations = stationsWithLoad
    .filter(s => `${s.name} ${s.operator} ${s.zone_type}`.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.load_factor - a.load_factor);

  return (
    <div className="mapView">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <StationTooltip hover={hover} />
      {!overlayReady && !mapError && <div className="mapStatus">Loading map and demand layers</div>}
      {mapError && <div className="mapStatus mapError">{mapError}</div>}
      
      {mode === 0 && (
        <>
          <button 
            className={`sidePanelToggle ${panelOpen ? 'open' : ''}`}
            aria-label={panelOpen ? 'Close station panel' : 'Open station panel'}
            onClick={() => setPanelOpen(!panelOpen)}
          >
            {panelOpen ? '>' : '<'}
          </button>
          <div className={`sidePanel ${panelOpen ? 'open' : ''}`}>
            <header>
              <h3>Stations</h3>
              <span>{formatHour(hour)}</span>
            </header>
            <div className="search">
              <input 
                type="text" 
                placeholder="Search stations..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="list">
              {filteredStations.map(station => (
                <div
                  key={station.id}
                  className={`stationRow ${selectedStationId === station.id ? 'selected' : ''}`}
                  onClick={() => handleStationClick(station)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="name">{station.name}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{Math.round(station.load_factor * 100)}%</span>
                  </div>
                  <div className="operator">{station.operator} / {station.zone_type}</div>
                  <div className="rowMeta">
                    <span>{station.capacity_kw} kW</span>
                    <span>{station.queue_minutes_peak} min peak queue</span>
                  </div>
                  <div className="loadBarContainer">
                    <div 
                      className="loadBar" 
                      style={{ 
                        width: `${Math.min(100, station.load_factor * 100)}%`, 
                        background: loadColorCss(station.load_factor) 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
