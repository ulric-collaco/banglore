import { useMemo, useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { ArcLayer, BitmapLayer, ScatterplotLayer, ColumnLayer, PathLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { MAP_INITIAL_VIEW_STATE, OSM_ATTRIBUTION, OSM_TILE_URL } from '../config';
import { CHARGING_STATIONS } from '../data/bangalore_ev_data';
import StationTooltip from './StationTooltip';
import { generateMockTraffic } from '../data/mockTraffic';

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

function osmTileUrl({ x, y, z }) {
  return OSM_TILE_URL.replace('{x}', x).replace('{y}', y).replace('{z}', z);
}

function loadOsmTile({ index, signal }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Tile request aborted', 'AbortError'));
      return;
    }

    const image = new Image();
    const abort = () => reject(new DOMException('Tile request aborted', 'AbortError'));
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load OSM tile ${index.z}/${index.x}/${index.y}`));
    signal?.addEventListener('abort', abort, { once: true });
    image.src = osmTileUrl(index);
  });
}

function animatedPosition(trip, time, loopLength) {
  const start = trip.timestamps[0];
  const end = trip.timestamps[trip.timestamps.length - 1];
  const duration = Math.max(1, end - start);

  let normalized = time;
  if (normalized < start) normalized += loopLength;

  const progress = Math.max(0, Math.min(1, (normalized - start) / duration));
  const [p0, p1, p2] = trip.path;

  if (progress <= 0.5) {
    const t = progress * 2;
    return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
  }

  const t = (progress - 0.5) * 2;
  return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
}

export default function MapView({ mode, stationsWithLoad, recommendedSites }) {
  const [viewState, setViewState] = useState(MAP_INITIAL_VIEW_STATE);
  const [hover, setHover] = useState(null);
  const [time, setTime] = useState(0);
  const traffic = useMemo(() => generateMockTraffic(), []);
  const trafficRoads = useMemo(
    () => traffic.trips.map((trip, index) => ({ id: `road-${index}`, path: trip.path, color: trip.color })),
    [traffic.trips]
  );
  const vehicles = useMemo(
    () =>
      traffic.trips.map((trip, index) => ({
        id: `car-${index}`,
        color: trip.color,
        position: animatedPosition(trip, time, traffic.loopLength)
      })),
    [traffic.trips, time, traffic.loopLength]
  );
  const arcs = useMemo(() => recommendedSites.flatMap(nearestStations), [recommendedSites]);

  useEffect(() => {
    let animationFrame;
    const animate = () => {
      setTime((t) => (t + 1) % traffic.loopLength);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [traffic.loopLength]);

  const layers = useMemo(() => {
    const baseLayer = new TileLayer({
      id: 'osm-basemap',
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      getTileData: loadOsmTile,
      onTileError: () => null,
      renderSubLayers: (props) => {
        const [[west, south], [east, north]] = props.tile.boundingBox;
        return new BitmapLayer(props, {
          id: `${props.id}-bitmap`,
          data: null,
          image: props.data,
          bounds: [west, south, east, north]
        });
      }
    });

    if (mode === 0) {
      return [
        baseLayer,
        new HeatmapLayer({
          id: 'load-heatmap',
          data: stationsWithLoad.filter((station) => station.load_factor > 0.5),
          getPosition: (station) => [station.lng, station.lat],
          getWeight: (station) => station.load_factor * station.capacity_kw,
          intensity: 3,
          radiusPixels: 80,
          opacity: 0.4,
          colorRange: [[34, 197, 94], [132, 204, 22], [234, 179, 8], [249, 115, 22], [239, 68, 68], [153, 27, 27]]
        }),
        new ColumnLayer({
          id: 'station-columns',
          data: stationsWithLoad,
          pickable: true,
          extruded: true,
          radius: 120,
          elevationScale: 10,
          getPosition: (station) => [station.lng, station.lat],
          getElevation: (station) => station.capacity_kw * Math.max(0.2, station.load_factor),
          getFillColor: (station) => [...loadColor(station.load_factor), 200],
          getLineColor: [255, 255, 255, 240],
          onHover: setHover
        }),
        new PathLayer({
          id: 'traffic-roads',
          data: trafficRoads,
          getPath: (d) => d.path,
          getColor: (d) => [...d.color, 110],
          widthMinPixels: 2,
          rounded: true,
          capRounded: true,
          jointRounded: true
        }),
        new ScatterplotLayer({
          id: 'traffic-vehicles',
          data: vehicles,
          getPosition: (d) => d.position,
          getFillColor: (d) => [...d.color, 230],
          getLineColor: [255, 255, 255, 220],
          stroked: true,
          lineWidthMinPixels: 1,
          getRadius: 14,
          radiusMinPixels: 3,
          radiusMaxPixels: 6,
          billboard: true
        })
      ];
    }

    return [
      baseLayer,
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
    ];
  }, [mode, stationsWithLoad, recommendedSites, arcs, trafficRoads, vehicles]);

  return (
    <div className="mapView">
      <DeckGL
        layers={layers}
        viewState={viewState}
        controller
        onViewStateChange={({ viewState: next }) => setViewState(next)}
      />
      <a className="osmAttribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        {OSM_ATTRIBUTION}
      </a>
      <StationTooltip hover={hover} />
    </div>
  );
}
