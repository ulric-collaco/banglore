const fs = require('fs');

const neighborhoods = [
  { name: 'Whitefield', coords: [77.7499, 12.9698] },
  { name: 'Koramangala', coords: [77.6271, 12.9352] },
  { name: 'Indiranagar', coords: [77.6387, 12.9784] },
  { name: 'Hebbal', coords: [77.5919, 13.0354] },
  { name: 'Electronic City', coords: [77.6650, 12.8452] },
  { name: 'Jayanagar', coords: [77.5806, 12.9299] },
  { name: 'Yeshwanthpur', coords: [77.5400, 13.0221] },
  { name: 'Marathahalli', coords: [77.6984, 12.9569] },
  { name: 'HSR Layout', coords: [77.6411, 12.9121] },
  { name: 'Bannerghatta Road', coords: [77.6046, 12.8878] },
  { name: 'MG Road', coords: [77.6094, 12.9730] },
  { name: 'Bellandur', coords: [77.6680, 12.9304] },
  { name: 'Rajajinagar', coords: [77.5540, 12.9881] },
  { name: 'JP Nagar', coords: [77.5855, 12.9063] },
  { name: 'Malleshwaram', coords: [77.5700, 13.0031] },
  { name: 'Sarjapur Road', coords: [77.6782, 12.9135] },
  { name: 'Hennur Road', coords: [77.6433, 13.0331] },
  { name: 'Kanakapura Road', coords: [77.5501, 12.8800] },
  { name: 'Tumkur Road', coords: [77.4984, 13.0382] },
  { name: 'KR Puram', coords: [77.7011, 13.0068] },
  { name: 'Yelahanka', coords: [77.5963, 13.1007] },
  { name: 'Chandapura', coords: [77.7032, 12.7937] },
  { name: 'Peenya', coords: [77.5195, 13.0329] },
  { name: 'Domlur', coords: [77.6375, 12.9609] },
  { name: 'Vijayanagar', coords: [77.5350, 12.9719] }
];

const operators = ['BESCOM', 'Tata Power', 'ChargeZone', 'Ather Grid'];

const stations = neighborhoods.map((hood, i) => {
  const isCommercial = ['Whitefield', 'Electronic City', 'MG Road', 'Koramangala', 'Indiranagar'].includes(hood.name);
  return {
    id: 'station_' + i,
    name: hood.name + ' Charging Hub',
    operator: operators[i % operators.length],
    capacity_kw: isCommercial ? Math.floor(Math.random() * 200 + 300) : Math.floor(Math.random() * 150 + 50),
    connector_types: ['CCS2', 'CHAdeMO', 'Type2'],
    status: 'active',
    lat: hood.coords[1],
    lng: hood.coords[0]
  };
});

const hourlyProfiles = stations.map((station, i) => {
  const profile = [];
  for (let h = 0; h < 24; h++) {
    let base = 0.1;
    if (h >= 7 && h <= 9) base = 0.4 + Math.random() * 0.3; // morning peak
    else if (h >= 11 && h <= 14) base = 0.6 + Math.random() * 0.35; // noon peak
    else if (h >= 18 && h <= 21) base = 0.7 + Math.random() * 0.25; // evening peak
    else if (h >= 10 && h <= 17) base = 0.3 + Math.random() * 0.3; // day
    else base = 0.05 + Math.random() * 0.15; // night
    
    // Smooth the profile slightly and clamp between 0.05 and 0.95
    profile.push(Number(Math.max(0.05, Math.min(0.95, base)).toFixed(2)));
  }
  return {
    station_id: station.id,
    hourly: profile
  };
});

const originalContent = fs.readFileSync('src/data/bangalore_ev_data.js', 'utf-8');
const lines = originalContent.split('\n');
const candidatesStart = lines.findIndex(l => l.startsWith('const CANDIDATES = ['));

const newContent = `export const CHARGING_STATIONS = ${JSON.stringify(stations, null, 2)};\n\nexport const HOURLY_LOAD_PROFILES = ${JSON.stringify(hourlyProfiles, null, 2)};\n\n` + lines.slice(candidatesStart).join('\n');

fs.writeFileSync('src/data/bangalore_ev_data.js', newContent);
console.log("Done");
