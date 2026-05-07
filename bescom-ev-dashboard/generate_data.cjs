const fs = require('fs');

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const rng = createRng(20260507);

function jitter(amount) {
  return (rng() - 0.5) * amount;
}

function round(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function peak(hour, center, width, height) {
  return height * Math.exp(-((hour - center) ** 2) / (2 * width ** 2));
}

const archetypes = {
  tech: {
    label: 'Tech employment corridor',
    operators: ['BESCOM', 'Tata Power', 'ChargeZone'],
    capacity: [260, 520],
    base: 0.16,
    curve: (hour) => peak(hour, 9, 1.5, 0.2) + peak(hour, 13, 3, 0.5) + peak(hour, 19, 1.8, 0.28)
  },
  residential: {
    label: 'Residential catchment',
    operators: ['BESCOM', 'Ather Grid', 'Tata Power'],
    capacity: [80, 220],
    base: 0.12,
    curve: (hour) => peak(hour, 8, 1.4, 0.22) + peak(hour, 20, 2.1, 0.58)
  },
  transit: {
    label: 'Metro and transport hub',
    operators: ['BESCOM', 'ChargeZone'],
    capacity: [140, 320],
    base: 0.14,
    curve: (hour) => peak(hour, 7, 1.7, 0.32) + peak(hour, 18, 1.8, 0.48) + peak(hour, 23, 1.3, 0.14)
  },
  retail: {
    label: 'Retail and hospital corridor',
    operators: ['Tata Power', 'Ather Grid', 'BESCOM'],
    capacity: [120, 300],
    base: 0.15,
    curve: (hour) => peak(hour, 13, 2.4, 0.34) + peak(hour, 19, 2.2, 0.46)
  },
  highway: {
    label: 'Highway and logistics route',
    operators: ['ChargeZone', 'BESCOM'],
    capacity: [180, 420],
    base: 0.2,
    curve: (hour) => peak(hour, 6, 2.4, 0.18) + peak(hour, 15, 3.8, 0.28) + peak(hour, 22, 2.5, 0.22)
  },
  industrial: {
    label: 'Industrial and fleet depot',
    operators: ['BESCOM', 'ChargeZone'],
    capacity: [220, 460],
    base: 0.17,
    curve: (hour) => peak(hour, 5, 1.8, 0.24) + peak(hour, 12, 3.2, 0.32) + peak(hour, 21, 2.4, 0.3)
  }
};

const stationBlueprints = [
  ['Whitefield', 77.7499, 12.9698, 'tech', 0.92],
  ['Koramangala', 77.6271, 12.9352, 'retail', 0.88],
  ['Indiranagar', 77.6387, 12.9784, 'retail', 0.84],
  ['Hebbal', 77.5919, 13.0354, 'transit', 0.78],
  ['Electronic City', 77.6650, 12.8452, 'tech', 0.9],
  ['Jayanagar', 77.5806, 12.9299, 'residential', 0.73],
  ['Yeshwanthpur', 77.5400, 13.0221, 'transit', 0.74],
  ['Marathahalli', 77.6984, 12.9569, 'tech', 0.86],
  ['HSR Layout', 77.6411, 12.9121, 'residential', 0.8],
  ['Bannerghatta Road', 77.6046, 12.8878, 'retail', 0.77],
  ['MG Road', 77.6094, 12.9730, 'retail', 0.82],
  ['Bellandur', 77.6680, 12.9304, 'tech', 0.89],
  ['Rajajinagar', 77.5540, 12.9881, 'residential', 0.7],
  ['JP Nagar', 77.5855, 12.9063, 'residential', 0.76],
  ['Malleshwaram', 77.5700, 13.0031, 'residential', 0.68],
  ['Sarjapur Road', 77.6782, 12.9135, 'residential', 0.83],
  ['Hennur Road', 77.6433, 13.0331, 'residential', 0.69],
  ['Kanakapura Road', 77.5501, 12.8800, 'highway', 0.58],
  ['Tumkur Road', 77.4984, 13.0382, 'industrial', 0.62],
  ['KR Puram', 77.7011, 13.0068, 'transit', 0.79],
  ['Yelahanka', 77.5963, 13.1007, 'transit', 0.55],
  ['Chandapura', 77.7032, 12.7937, 'highway', 0.52],
  ['Peenya', 77.5195, 13.0329, 'industrial', 0.66],
  ['Domlur', 77.6375, 12.9609, 'tech', 0.81],
  ['Vijayanagar', 77.5350, 12.9719, 'residential', 0.64]
];

const stations = stationBlueprints.map(([name, lng, lat, archetypeKey, demandIndex], index) => {
  const archetype = archetypes[archetypeKey];
  const [minCapacity, maxCapacity] = archetype.capacity;
  const capacity = minCapacity + Math.round((maxCapacity - minCapacity) * (0.45 + demandIndex * 0.4 + jitter(0.1)));
  const operator = archetype.operators[index % archetype.operators.length];
  return {
    id: `station_${index}`,
    name: `${name} Charging Hub`,
    operator,
    zone_type: archetype.label,
    demand_index: round(demandIndex),
    capacity_kw: capacity,
    connector_types: capacity > 260 ? ['CCS2', 'CHAdeMO', 'Type2'] : ['CCS2', 'Type2'],
    status: demandIndex > 0.86 && index % 4 === 0 ? 'constrained' : 'active',
    uptime_pct: round(96.2 + rng() * 3.4, 1),
    grid_headroom_mw: round(9 + (1 - demandIndex) * 18 + rng() * 6, 1),
    queue_minutes_peak: Math.round(4 + demandIndex * 22 + rng() * 8),
    lat: round(lat + jitter(0.006), 5),
    lng: round(lng + jitter(0.006), 5)
  };
});

const hourlyProfiles = stations.map((station) => {
  const archetypeKey = Object.entries(archetypes).find(([, archetype]) => archetype.label === station.zone_type)[0];
  const archetype = archetypes[archetypeKey];
  const demandBoost = station.demand_index * 0.22;
  return {
    station_id: station.id,
    hourly: Array.from({ length: 24 }, (_, hour) => {
      const overnightRelief = hour >= 1 && hour <= 4 ? -0.04 : 0;
      const value = archetype.base + archetype.curve(hour) + demandBoost + overnightRelief + jitter(0.055);
      return round(clamp(value, 0.05, 0.96));
    })
  };
});

const candidates = [
  ['REC_001', 'BTM Layout', 77.6101, 12.9165, 'high', 'High apartment density fills the gap between HSR, Jayanagar, and Koramangala.', 1180, 6.1, 18, 22400, 0.83, 188],
  ['REC_002', 'Sarjapur Road', 77.6963, 12.9001, 'high', 'Fast residential growth and ORR commute demand create a long evening queue risk.', 1260, 8.4, 26, 19200, 0.88, 204],
  ['REC_003', 'Bannerghatta Road', 77.5970, 12.8874, 'high', 'Hospital, retail, and office trips stack into a high-utilization weekend corridor.', 1120, 7.2, 21, 18100, 0.9, 196],
  ['REC_004', 'JP Nagar 6th Phase', 77.5857, 12.9063, 'high', 'Residential night charging pressure is high while fast-charger coverage is sparse.', 990, 6.6, 23, 20300, 0.79, 166],
  ['REC_005', 'Hoodi', 77.7159, 12.9912, 'high', 'IT commute turnover pairs with grid headroom near the Mahadevapura catchment.', 940, 5.3, 27, 16800, 0.84, 174],
  ['REC_006', 'Banashankari', 77.5468, 12.9255, 'medium', 'Evening residential demand is rising and nearby feeders can support a mid-size hub.', 780, 5.8, 17, 16600, 0.73, 118],
  ['REC_007', 'Hennur', 77.6424, 13.0347, 'medium', 'North-east housing growth needs charging redundancy before peak queues harden.', 810, 6.9, 19, 15400, 0.74, 126],
  ['REC_008', 'Kadugodi', 77.7611, 12.9955, 'medium', 'Terminal metro catchment and Whitefield spillover justify a compact fast hub.', 760, 5.7, 22, 14100, 0.78, 116],
  ['REC_009', 'Kengeri', 77.4838, 12.9177, 'medium', 'Mysuru Road trips need top-up capacity outside the dense core.', 640, 9.2, 24, 11200, 0.8, 108],
  ['REC_010', 'Nagarbhavi', 77.5128, 12.9726, 'medium', 'Western residential coverage has a long service gap and moderate feeder headroom.', 620, 7.6, 19, 13100, 0.65, 94],
  ['REC_011', 'RR Nagar', 77.5179, 12.9299, 'low', 'Stable grid headroom makes this a measured western coverage reserve.', 540, 5.4, 16, 10100, 0.63, 78],
  ['REC_012', 'Tumkur Road Corridor', 77.5158, 13.0587, 'low', 'Industrial and fleet users need depot backup more than dense public charging.', 460, 8.9, 31, 7600, 0.85, 86],
  ['REC_013', 'Bommanahalli', 77.6248, 12.9081, 'low', 'Secondary gap between BTM and Electronic City can be served with smaller capacity.', 580, 3.8, 13, 14800, 0.68, 74],
  ['REC_014', 'Attibele Road', 77.7714, 12.7788, 'low', 'Peripheral logistics traffic is emerging but public demand remains early-stage.', 330, 10.8, 33, 5800, 0.72, 66],
  ['REC_015', 'Yelahanka New Town', 77.5922, 13.0968, 'low', 'Airport-side residential growth suggests future coverage before heavy peak load.', 520, 6.3, 28, 9700, 0.7, 82]
].map(([id, zone, lng, lat, priority, reason, evDensity, gap, headroom, population, road, sessions]) => ({
  id,
  lat,
  lng,
  zone,
  priority,
  reason,
  projected_daily_sessions: sessions,
  recommended_capacity_kw: priority === 'high' ? 220 : priority === 'medium' ? 160 : 100,
  factors: {
    ev_density_raw: evDensity,
    gap_km: gap,
    grid_headroom_mw: headroom,
    population_density_raw: population,
    road_connectivity_raw: road
  }
}));

const output = `export const CHARGING_STATIONS = ${JSON.stringify(stations, null, 2)};\n\nexport const HOURLY_LOAD_PROFILES = ${JSON.stringify(hourlyProfiles, null, 2)};\n\nconst CANDIDATES = ${JSON.stringify(candidates, null, 2)};\n\nconst FACTORS = ['ev_density_raw', 'gap_km', 'grid_headroom_mw', 'population_density_raw', 'road_connectivity_raw'];\nconst WEIGHTS = [0.3, 0.25, 0.2, 0.15, 0.1];\n\nfunction normalizeFactor(values, value) {\n  const min = Math.min(...values);\n  const max = Math.max(...values);\n  return max === min ? 1 : (value - min) / (max - min);\n}\n\nexport const RECOMMENDED_LOCATIONS = CANDIDATES.map((candidate) => {\n  const normalized = FACTORS.map((factor) =>\n    normalizeFactor(CANDIDATES.map((item) => item.factors[factor]), candidate.factors[factor])\n  );\n  const demand_score = Math.round(normalized.reduce((sum, value, index) => sum + value * WEIGHTS[index], 0) * 100);\n  return { ...candidate, demand_score };\n});\n`;

fs.writeFileSync('src/data/bangalore_ev_data.js', output);
console.log(`Generated ${stations.length} stations, ${hourlyProfiles.length} load profiles, and ${candidates.length} candidates.`);
