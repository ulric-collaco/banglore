import stationCsv from './ev-charging-stations-india.csv?raw';

const RESIDENTIAL_ZONES = new Set(['Koramangala', 'Indiranagar', 'Jayanagar', 'HSR Layout', 'BTM Layout', 'Katriguppe', 'Banashankari', 'Jalahalli', 'Mathikere', 'Banaswadi']);
const COMMERCIAL_ZONES = new Set(['MG Road / CBD', 'Whitefield', 'Electronic City', 'Marathahalli', 'Mahadevapura', 'Airport Corridor', 'Yelahanka']);
const BENGALURU_BOUNDS = { minLat: 12.78, maxLat: 13.22, minLng: 77.43, maxLng: 77.78 };

function parseCsvRows(csv) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value.trim());
    rows.push(row);
  }

  return rows;
}

function normalizeCoordinates(rawLat, rawLng) {
  let lat = Number(rawLat);
  let lng = Number(rawLng);
  if (lat > 70 && lng < 20) [lat, lng] = [lng, lat];
  return { lat, lng };
}

function isBengaluruStation(record) {
  const { lat, lng } = normalizeCoordinates(record.lattitude, record.longitude);
  const locationText = `${record.city} ${record.address} ${record.name}`.toLowerCase();
  const mentionsBengaluru = /bengaluru|bangalore|banglore/.test(locationText);
  const insideBounds = lat >= BENGALURU_BOUNDS.minLat && lat <= BENGALURU_BOUNDS.maxLat
    && lng >= BENGALURU_BOUNDS.minLng && lng <= BENGALURU_BOUNDS.maxLng;
  return Number.isFinite(lat) && Number.isFinite(lng) && insideBounds && mentionsBengaluru;
}

function inferZone(record) {
  const text = `${record.name} ${record.address} ${record.city}`.toLowerCase();
  const zones = [
    ['Koramangala', ['koramangala', 'forum mall']],
    ['Whitefield', ['whitefield', 'itpb', 'hoodi', 'pattandur', 'epip', 'ktpo']],
    ['Electronic City', ['electronic city', 'infosys', 'hosur road', 'kudlu', 'singasandra']],
    ['HSR Layout', ['hsr']],
    ['BTM Layout', ['btm']],
    ['Indiranagar', ['indiranagar', 'hal 2nd stage', 'domlur', 'murugeshpalya']],
    ['MG Road / CBD', ['mg road', 'museum road', 'ashok nagar', 'cubbon', 'corporate office', 'kr circle', 'sivanchetti']],
    ['Marathahalli', ['marathahalli', 'kadubeesanahalli', 'outer ring', 'e-zone']],
    ['Mahadevapura', ['mahadevapura', 'phoenix', 'vr mall']],
    ['Yelahanka', ['yelahanka', 'yalhanka', 'airport road', 'chikkajala']],
    ['Hebbal', ['hebbal', 'nagawara', 'manyata', 'veerapalya', 'lumbini']],
    ['Jayanagar', ['jayanagar']],
    ['Bannerghatta Road', ['bannerghatta', 'gottigere']],
    ['Peenya', ['peenya', 'yeshwanthpur', 'yesvantpur']],
    ['Kengeri Corridor', ['kengeri', 'mysore road', 'nice road']],
    ['Banaswadi', ['banaswadi', 'hrbr', 'kalyan nagar']]
  ];
  return zones.find(([, tokens]) => tokens.some((token) => text.includes(token)))?.[0] || 'Bengaluru Urban';
}

function inferCapacity(connectorType) {
  const numericType = Number(connectorType) || 6;
  return Math.max(50, Math.min(240, numericType * 10));
}

function inferStationType(capacity) {
  if (capacity >= 160) return 'ultra-fast';
  if (capacity >= 80) return 'fast';
  return 'slow';
}

function parseChargingStations() {
  const [header, ...rows] = parseCsvRows(stationCsv);
  const records = rows.map((row) => Object.fromEntries(header.map((key, index) => [key, row[index] || ''])));
  const seen = new Set();

  return records
    .filter(isBengaluruStation)
    .map((record) => {
      const { lat, lng } = normalizeCoordinates(record.lattitude, record.longitude);
      return { record, lat, lng, key: `${record.name}-${lat.toFixed(5)}-${lng.toFixed(5)}` };
    })
    .filter((item) => {
      if (seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    })
    .sort((a, b) => a.record.name.localeCompare(b.record.name))
    .map(({ record, lat, lng }, index) => {
      const capacity_kw = inferCapacity(record.type);
      return {
        id: `CS_${String(index + 1).padStart(3, '0')}`,
        name: record.name.replace(/\s+/g, ' ').trim(),
        lat,
        lng,
        zone: inferZone(record),
        capacity_kw,
        num_ports: Math.max(2, Math.min(12, Math.round(capacity_kw / 25))),
        type: inferStationType(capacity_kw),
        installed_year: 2021 + (index % 4),
        source: 'EV charging stations India CSV'
      };
    });
}

export const CHARGING_STATIONS = parseChargingStations();

function noise(seed, hour) {
  return (((seed * 37 + hour * 17) % 11) - 5) / 100;
}

function baseLoad(hour, zone) {
  let load = 0.08 - 0.0566836 * hour + 0.0143973 * hour ** 2 - 0.0004843 * hour ** 3;
  if (hour >= 12 && hour <= 14) load -= COMMERCIAL_ZONES.has(zone) ? 0.05 : 0.22;
  if (hour >= 9 && hour <= 18 && COMMERCIAL_ZONES.has(zone)) load += 0.08;
  if (hour >= 18 && hour <= 21 && RESIDENTIAL_ZONES.has(zone)) load += 0.08;
  if (hour >= 22) load -= 0.04;
  return load;
}

export const HOURLY_LOAD_PROFILES = CHARGING_STATIONS.map((station, index) => ({
  station_id: station.id,
  hourly: Array.from({ length: 24 }, (_, hour) =>
    Math.max(0.03, Math.min(0.98, Number((baseLoad(hour, station.zone) + noise(index + 1, hour)).toFixed(2))))
  )
}));

const CANDIDATES = [
  { id: 'REC_001', lat: 12.9915, lng: 77.5545, zone: 'Rajajinagar', priority: 'high', reason: 'High EV density corridor with no station within 3km', projected_daily_sessions: 142, recommended_capacity_kw: 180, factors: { ev_density_raw: 1030, gap_km: 6.8, grid_headroom_mw: 24, population_density_raw: 18300, road_connectivity_raw: 0.86 } },
  { id: 'REC_002', lat: 12.9165, lng: 77.6101, zone: 'BTM Layout', priority: 'high', reason: 'Dense mixed-use demand between HSR and Jayanagar coverage zones', projected_daily_sessions: 136, recommended_capacity_kw: 180, factors: { ev_density_raw: 980, gap_km: 5.9, grid_headroom_mw: 18, population_density_raw: 21400, road_connectivity_raw: 0.81 } },
  { id: 'REC_003', lat: 12.9063, lng: 77.5857, zone: 'JP Nagar', priority: 'high', reason: 'Residential evening surge with limited fast charging south of Jayanagar', projected_daily_sessions: 128, recommended_capacity_kw: 160, factors: { ev_density_raw: 910, gap_km: 6.4, grid_headroom_mw: 22, population_density_raw: 19700, road_connectivity_raw: 0.78 } },
  { id: 'REC_004', lat: 12.8874, lng: 77.5970, zone: 'Bannerghatta Road', priority: 'high', reason: 'Hospital and retail corridor with strong weekend charging demand', projected_daily_sessions: 149, recommended_capacity_kw: 200, factors: { ev_density_raw: 1100, gap_km: 7.2, grid_headroom_mw: 20, population_density_raw: 17600, road_connectivity_raw: 0.89 } },
  { id: 'REC_005', lat: 12.9001, lng: 77.6963, zone: 'Sarjapur Road', priority: 'high', reason: 'Rapid apartment growth and long gap from existing ORR stations', projected_daily_sessions: 154, recommended_capacity_kw: 220, factors: { ev_density_raw: 1160, gap_km: 8.1, grid_headroom_mw: 26, population_density_raw: 18800, road_connectivity_raw: 0.88 } },
  { id: 'REC_006', lat: 12.9255, lng: 77.5468, zone: 'Banashankari', priority: 'medium', reason: 'Residential feeder load rising during evening parking hours', projected_daily_sessions: 104, recommended_capacity_kw: 140, factors: { ev_density_raw: 740, gap_km: 5.7, grid_headroom_mw: 16, population_density_raw: 16100, road_connectivity_raw: 0.72 } },
  { id: 'REC_007', lat: 12.9726, lng: 77.5128, zone: 'Nagarbhavi', priority: 'medium', reason: 'Underserved western residential area with growing EV registrations', projected_daily_sessions: 91, recommended_capacity_kw: 120, factors: { ev_density_raw: 620, gap_km: 7.5, grid_headroom_mw: 19, population_density_raw: 12800, road_connectivity_raw: 0.64 } },
  { id: 'REC_008', lat: 12.9177, lng: 77.4838, zone: 'Kengeri', priority: 'medium', reason: 'Mysuru Road commuter node with long-distance top-up demand', projected_daily_sessions: 96, recommended_capacity_kw: 140, factors: { ev_density_raw: 580, gap_km: 9.1, grid_headroom_mw: 23, population_density_raw: 10400, road_connectivity_raw: 0.78 } },
  { id: 'REC_009', lat: 13.0347, lng: 77.6424, zone: 'Hennur', priority: 'medium', reason: 'North-east housing growth with limited charging redundancy', projected_daily_sessions: 112, recommended_capacity_kw: 160, factors: { ev_density_raw: 790, gap_km: 6.9, grid_headroom_mw: 17, population_density_raw: 15200, road_connectivity_raw: 0.73 } },
  { id: 'REC_010', lat: 12.9912, lng: 77.7159, zone: 'Hoodi', priority: 'medium', reason: 'IT commute destination near Mahadevapura with high daytime turnover', projected_daily_sessions: 121, recommended_capacity_kw: 180, factors: { ev_density_raw: 850, gap_km: 4.8, grid_headroom_mw: 25, population_density_raw: 16700, road_connectivity_raw: 0.83 } },
  { id: 'REC_011', lat: 12.9955, lng: 77.7611, zone: 'Kadugodi', priority: 'medium', reason: 'Terminal metro catchment needs fast-charging support', projected_daily_sessions: 108, recommended_capacity_kw: 160, factors: { ev_density_raw: 760, gap_km: 5.5, grid_headroom_mw: 21, population_density_raw: 13900, road_connectivity_raw: 0.76 } },
  { id: 'REC_012', lat: 12.9299, lng: 77.5179, zone: 'RR Nagar', priority: 'low', reason: 'Moderate western residential demand with stable grid headroom', projected_daily_sessions: 74, recommended_capacity_kw: 100, factors: { ev_density_raw: 520, gap_km: 5.2, grid_headroom_mw: 15, population_density_raw: 9800, road_connectivity_raw: 0.62 } },
  { id: 'REC_013', lat: 13.0587, lng: 77.5158, zone: 'Tumkur Road Corridor', priority: 'low', reason: 'Industrial corridor suited to fleet and highway backup charging', projected_daily_sessions: 82, recommended_capacity_kw: 120, factors: { ev_density_raw: 430, gap_km: 8.8, grid_headroom_mw: 30, population_density_raw: 7200, road_connectivity_raw: 0.84 } },
  { id: 'REC_014', lat: 12.9081, lng: 77.6248, zone: 'Bommanahalli', priority: 'low', reason: 'Secondary gap between BTM and Electronic City clusters', projected_daily_sessions: 69, recommended_capacity_kw: 100, factors: { ev_density_raw: 560, gap_km: 3.6, grid_headroom_mw: 12, population_density_raw: 14500, road_connectivity_raw: 0.66 } },
  { id: 'REC_015', lat: 12.7788, lng: 77.7714, zone: 'Attibele Road', priority: 'low', reason: 'Peripheral logistics route for future depot charging coverage', projected_daily_sessions: 63, recommended_capacity_kw: 100, factors: { ev_density_raw: 300, gap_km: 10.6, grid_headroom_mw: 32, population_density_raw: 5600, road_connectivity_raw: 0.71 } }
];

const FACTORS = ['ev_density_raw', 'gap_km', 'grid_headroom_mw', 'population_density_raw', 'road_connectivity_raw'];
const WEIGHTS = [0.3, 0.25, 0.2, 0.15, 0.1];

function normalizeFactor(values, value) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return max === min ? 1 : (value - min) / (max - min);
}

export const RECOMMENDED_LOCATIONS = CANDIDATES.map((candidate) => {
  const normalized = FACTORS.map((factor) =>
    normalizeFactor(CANDIDATES.map((item) => item.factors[factor]), candidate.factors[factor])
  );
  const demand_score = Math.round(normalized.reduce((sum, value, index) => sum + value * WEIGHTS[index], 0) * 100);
  return { ...candidate, demand_score };
});
