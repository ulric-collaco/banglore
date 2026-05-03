import { CHARGING_STATIONS } from './bangalore_ev_data';

export function generateMockTraffic() {
  const trips = [];
  const loopTime = 1800; // total animation loop time (e.g. 1800 units)
  
  // Generate random paths between stations
  for (let i = 0; i < 150; i++) {
    const startIdx = Math.floor(Math.random() * CHARGING_STATIONS.length);
    let endIdx = Math.floor(Math.random() * CHARGING_STATIONS.length);
    while (endIdx === startIdx) {
      endIdx = Math.floor(Math.random() * CHARGING_STATIONS.length);
    }
    
    const start = CHARGING_STATIONS[startIdx];
    const end = CHARGING_STATIONS[endIdx];
    
    // Add some noise to create curved/varied paths (mimicking road networks)
    const midLng = (start.lng + end.lng) / 2 + (Math.random() - 0.5) * 0.05;
    const midLat = (start.lat + end.lat) / 2 + (Math.random() - 0.5) * 0.05;
    
    const path = [
      [start.lng, start.lat],
      [midLng, midLat],
      [end.lng, end.lat]
    ];
    
    const startTime = Math.random() * loopTime;
    const duration = 200 + Math.random() * 400; // 200-600 units of time
    
    const timestamps = [
      startTime,
      startTime + duration / 2,
      startTime + duration
    ];
    
    // Some go fast, some go slow, determine color
    const isEv = Math.random() > 0.3; // mostly EVs going to charge
    const color = isEv ? [59, 130, 246] : [239, 68, 68]; // Blue for EV, Red for normal traffic
    
    trips.push({ path, timestamps, color });
    
    // Add a return trip for continuous flow
    const returnStartTime = (startTime + duration + 100) % loopTime;
    trips.push({
      path: [ [end.lng, end.lat], [midLng, midLat], [start.lng, start.lat] ],
      timestamps: [
        returnStartTime,
        returnStartTime + duration / 2,
        returnStartTime + duration
      ],
      color
    });
  }
  
  return { trips, loopLength: loopTime };
}
