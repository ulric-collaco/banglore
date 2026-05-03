import raw from './ocm_raw.json';

const FALLBACK_STATIONS = [
  { name: 'BESCOM Charging Station - KR Circle', lat: 12.9746, lng: 77.5863, zone: 'Bengaluru', capacity_kw: 44, num_ports: 2, type: 'fast', installed_year: 2022, ocm_id: 'fallback_kr_circle' },
  { name: 'Ather Grid - Indiranagar', lat: 12.9784, lng: 77.6408, zone: 'Indiranagar', capacity_kw: 22, num_ports: 2, type: 'fast', installed_year: 2022, ocm_id: 'fallback_indiranagar' },
  { name: 'EV Charge Point - Koramangala', lat: 12.9352, lng: 77.6245, zone: 'Koramangala', capacity_kw: 44, num_ports: 2, type: 'fast', installed_year: 2022, ocm_id: 'fallback_koramangala' },
  { name: 'ChargeZone - Whitefield', lat: 12.9698, lng: 77.7499, zone: 'Whitefield', capacity_kw: 60, num_ports: 3, type: 'fast', installed_year: 2023, ocm_id: 'fallback_whitefield' },
  { name: 'Tata Power EZ Charge - Electronic City', lat: 12.8452, lng: 77.6602, zone: 'Electronic City', capacity_kw: 60, num_ports: 3, type: 'fast', installed_year: 2022, ocm_id: 'fallback_electronic_city' },
  { name: 'EVRE Station - MG Road', lat: 12.9758, lng: 77.6068, zone: 'MG Road', capacity_kw: 50, num_ports: 2, type: 'fast', installed_year: 2021, ocm_id: 'fallback_mg_road' },
  { name: 'Fast Charger - Marathahalli ORR', lat: 12.9592, lng: 77.6974, zone: 'Marathahalli', capacity_kw: 60, num_ports: 3, type: 'fast', installed_year: 2023, ocm_id: 'fallback_marathahalli' },
  { name: 'Public EV Charger - Hebbal', lat: 13.0358, lng: 77.5970, zone: 'Hebbal', capacity_kw: 44, num_ports: 2, type: 'fast', installed_year: 2022, ocm_id: 'fallback_hebbal' },
  { name: 'Residential EV Point - Jayanagar', lat: 12.9250, lng: 77.5938, zone: 'Jayanagar', capacity_kw: 22, num_ports: 2, type: 'fast', installed_year: 2021, ocm_id: 'fallback_jayanagar' },
  { name: 'Ather Grid - HSR Layout', lat: 12.9116, lng: 77.6389, zone: 'HSR Layout', capacity_kw: 22, num_ports: 2, type: 'fast', installed_year: 2022, ocm_id: 'fallback_hsr' }
];

export function parseOCMStations() {
  const parsed = Array.isArray(raw)
    ? raw
      .filter((station) =>
        station.AddressInfo?.Latitude &&
        station.AddressInfo?.Longitude &&
        station.Connections?.length > 0
      )
      .map((station, index) => ({
        id: `CS_${String(index + 1).padStart(3, '0')}`,
        name: station.AddressInfo.Title,
        lat: station.AddressInfo.Latitude,
        lng: station.AddressInfo.Longitude,
        zone: station.AddressInfo.Town || station.AddressInfo.City || 'Bengaluru',
        capacity_kw: estimateCapacity(station.Connections),
        num_ports: station.Connections.length,
        type: inferType(station.Connections),
        installed_year: station.DateCreated ? new Date(station.DateCreated).getFullYear() : 2022,
        ocm_id: station.ID
      }))
    : [];

  return parsed.length > 0 ? parsed : fallbackStations();
}

function fallbackStations() {
  return FALLBACK_STATIONS.map((station, index) => ({
    id: `CS_${String(index + 1).padStart(3, '0')}`,
    ...station
  }));
}

function estimateCapacity(connections) {
  const total = connections.reduce((sum, connection) => sum + (connection.PowerKW || 22), 0);
  return Math.round(total);
}

function inferType(connections) {
  const maxKw = Math.max(...connections.map((connection) => connection.PowerKW || 0));
  if (maxKw >= 100) return 'ultra-fast';
  if (maxKw >= 22) return 'fast';
  return 'slow';
}
