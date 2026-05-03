import { useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ArcLayer, ColumnLayer, PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { BENGALURU_MAX_BOUNDS, MAP_INITIAL_VIEW_STATE, MAPBOX_STYLE, MAPBOX_TOKEN } from '../config';
import { CHARGING_STATIONS } from '../data/bangalore_ev_data';
import StationTooltip from './StationTooltip';

mapboxgl.accessToken = MAPBOX_TOKEN;

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

function trafficColor(load) {
  if (load > 0.8) return [248, 113, 113];
  if (load > 0.6) return [251, 146, 60];
  return [56, 189, 248];
}

function nearestStations(site) {
  return [...CHARGING_STATIONS]
    .map((station) => ({ station, distance: (station.lat - site.lat) ** 2 + (station.lng - site.lng) ** 2 }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2)
    .map(({ station }) => ({ ...site, target: station }));
}

function clampViewState(next) {
  const [[minLng, minLat], [maxLng, maxLat]] = BENGALURU_MAX_BOUNDS;
  return {
    ...next,
    longitude: Math.min(maxLng, Math.max(minLng, next.longitude)),
    latitude: Math.min(maxLat, Math.max(minLat, next.latitude)),
    zoom: Math.min(14.5, Math.max(10.2, next.zoom)),
    pitch: Math.min(68, Math.max(35, next.pitch))
  };
}

export default function MapView({ mode, stationsWithLoad, recommendedSites }) {
  const mapNode = useRef(null);
  const mapRef = useRef(null);
  const [viewState, setViewState] = useState(MAP_INITIAL_VIEW_STATE);
  const [hover, setHover] = useState(null);
  const [trafficTick, setTrafficTick] = useState(0);

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: mapNode.current,
      style: MAPBOX_STYLE,
      center: [MAP_INITIAL_VIEW_STATE.longitude, MAP_INITIAL_VIEW_STATE.latitude],
      zoom: MAP_INITIAL_VIEW_STATE.zoom,
      pitch: MAP_INITIAL_VIEW_STATE.pitch,
      bearing: MAP_INITIAL_VIEW_STATE.bearing,
      maxBounds: BENGALURU_MAX_BOUNDS,
      attributionControl: false
    });
    mapRef.current.on('load', () => {
      const layers = mapRef.current.getStyle().layers || [];
      const labelLayer = layers.find((layer) => layer.type === 'symbol' && layer.layout?.['text-field']);
      if (!mapRef.current.getLayer('bescom-3d-buildings') && mapRef.current.getSource('composite')) {
        mapRef.current.addLayer({
          id: 'bescom-3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 10,
          paint: {
            'fill-extrusion-color': '#1e293b',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 10, 0, 15, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 10, 0, 15, ['get', 'min_height']],
            'fill-extrusion-opacity': 0.52
          }
        }, labelLayer?.id);
      }
    });
    mapRef.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.jumpTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing
    });
  }, [viewState]);

  const arcs = useMemo(() => recommendedSites.flatMap(nearestStations), [recommendedSites]);
  const trafficRoutes = useMemo(() => {
    const center = [77.5946, 12.9716];
    return [...stationsWithLoad]
      .sort((a, b) => b.load_factor - a.load_factor)
      .slice(0, 16)
      .map((station, index) => {
        const bend = [
          (station.lng + center[0]) / 2 + Math.sin(index * 1.7) * 0.018,
          (station.lat + center[1]) / 2 + Math.cos(index * 1.3) * 0.012
        ];
        return {
          id: `traffic-${station.id}`,
          load: station.load_factor,
          color: trafficColor(station.load_factor),
          path: [[station.lng, station.lat], bend, center],
          offset: index / 16
        };
      });
  }, [stationsWithLoad]);

  const vehicles = useMemo(() => trafficRoutes.map((route) => {
    const progress = (trafficTick / 240 + route.offset) % 1;
    const segment = progress < 0.5 ? 0 : 1;
    const t = segment === 0 ? progress * 2 : (progress - 0.5) * 2;
    const start = route.path[segment];
    const end = route.path[segment + 1];
    return {
      id: `vehicle-${route.id}`,
      color: route.color,
      position: [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t]
    };
  }), [trafficRoutes, trafficTick]);

  useEffect(() => {
    if (mode !== 0) return undefined;
    let animationFrame;
    const animate = () => {
      setTrafficTick((tick) => (tick + 1) % 240);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [mode]);

  const layers = useMemo(() => {
    if (mode === 0) {
      return [
        new HeatmapLayer({
          id: 'load-heatmap',
          data: stationsWithLoad.filter((station) => station.load_factor > 0.5),
          getPosition: (station) => [station.lng, station.lat],
          getWeight: (station) => station.load_factor * station.capacity_kw,
          intensity: 3,
          radiusPixels: 58,
          opacity: 0.28,
          colorRange: [[20, 184, 166], [56, 189, 248], [234, 179, 8], [249, 115, 22], [239, 68, 68], [127, 29, 29]]
        }),
        new PathLayer({
          id: 'traffic-flow-corridors',
          data: trafficRoutes,
          getPath: (route) => route.path,
          getColor: (route) => [...route.color, 135],
          widthMinPixels: 2,
          widthMaxPixels: 5,
          getWidth: (route) => 2 + route.load * 3,
          rounded: true,
          jointRounded: true,
          capRounded: true
        }),
        new ScatterplotLayer({
          id: 'traffic-flow-vehicles',
          data: vehicles,
          getPosition: (vehicle) => vehicle.position,
          getFillColor: (vehicle) => [...vehicle.color, 245],
          getLineColor: [255, 255, 255, 210],
          getRadius: 5,
          radiusUnits: 'pixels',
          stroked: true,
          lineWidthMinPixels: 1
        }),
        new ColumnLayer({
          id: 'load-columns-3d',
          data: stationsWithLoad,
          pickable: true,
          extruded: true,
          diskResolution: 24,
          radius: 42,
          elevationScale: 34,
          getPosition: (station) => [station.lng, station.lat],
          getElevation: (station) => 35 + station.capacity_kw * station.load_factor,
          getFillColor: (station) => [...loadColor(station.load_factor), 185],
          getLineColor: [226, 232, 240, 210],
          lineWidthMinPixels: 1,
          onHover: setHover
        }),
        new ScatterplotLayer({
          id: 'station-scatter',
          data: stationsWithLoad,
          pickable: true,
          stroked: true,
          lineWidthMinPixels: 2,
          getPosition: (station) => [station.lng, station.lat],
          getRadius: (station) => 7 + ((station.capacity_kw - 50) / 190) * 8,
          radiusUnits: 'pixels',
          getFillColor: (station) => [...loadColor(station.load_factor), 245],
          getLineColor: [241, 245, 249, 245],
          onHover: setHover
        })
      ];
    }

    return [
      new ScatterplotLayer({
        id: 'existing-context',
        data: stationsWithLoad,
        getPosition: (station) => [station.lng, station.lat],
        getRadius: 5,
        radiusUnits: 'pixels',
        getFillColor: [148, 163, 184, 185]
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
        getRadius: (site) => 10 + ((site.demand_score - 60) / 40) * 16,
        radiusUnits: 'pixels',
        getFillColor: (site) => [...priorityColor(site.priority), 235],
        getLineColor: [255, 255, 255, 220],
        onHover: setHover
      })
    ];
  }, [mode, stationsWithLoad, recommendedSites, arcs, trafficRoutes, vehicles]);

  return (
    <div className="mapView">
      <div ref={mapNode} className="mapboxCanvas" />
      <DeckGL
        layers={layers}
        viewState={viewState}
        controller
        onViewStateChange={({ viewState: next }) => setViewState(clampViewState(next))}
      />
      <StationTooltip hover={hover} />
    </div>
  );
}
