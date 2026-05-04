import { useMemo } from 'react';

function formatHour(hour) {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 || 12;
  return `${String(display).padStart(2, '0')}:00 ${suffix}`;
}

function formatWindow(start) {
  const end = (start + 4) % 24;
  return `${formatHour(start).replace(':00 ', '')}-${formatHour(end)}`;
}

export function useLoadData(stations, loadProfiles, currentHour) {
  return useMemo(() => {
    const profileByStation = new Map(loadProfiles.map((profile) => [profile.station_id, profile.hourly]));
    const prevHour = (currentHour + 23) % 24;

    const stationsWithLoad = stations.map((station) => {
      const load_factor = profileByStation.get(station.id)?.[currentHour] ?? 0;
      const prev_load_factor = profileByStation.get(station.id)?.[prevHour] ?? 0;
      return {
        ...station,
        load_factor,
        prev_load_factor,
        kw_in_use: load_factor * station.capacity_kw,
        prev_kw_in_use: prev_load_factor * station.capacity_kw,
        port_utilization: Math.min(100, Math.round(load_factor * 100))
      };
    });

    const criticalCount = stationsWithLoad.filter((station) => station.load_factor > 0.8).length;
    const prevCriticalCount = stationsWithLoad.filter((station) => station.prev_load_factor > 0.8).length;
    
    const avgNetworkLoad = stationsWithLoad.reduce((sum, station) => sum + station.load_factor, 0) / stationsWithLoad.length * 100;
    const prevAvgNetworkLoad = stationsWithLoad.reduce((sum, station) => sum + station.prev_load_factor, 0) / stationsWithLoad.length * 100;
    
    const totalKwInUse = stationsWithLoad.reduce((sum, station) => sum + station.kw_in_use, 0);
    const prevTotalKwInUse = stationsWithLoad.reduce((sum, station) => sum + station.prev_kw_in_use, 0);

    const loadTrend = {
      criticalCount: criticalCount - prevCriticalCount,
      avgNetworkLoad: avgNetworkLoad - prevAvgNetworkLoad,
      totalKwInUse: totalKwInUse - prevTotalKwInUse
    };

    const hourlyTotalLoad = Array.from({ length: 24 }, (_, h) => 
      stations.reduce((sum, station) => {
        const lf = profileByStation.get(station.id)?.[h] ?? 0;
        return sum + (lf * station.capacity_kw);
      }, 0)
    );

    const hourlyAverages = Array.from({ length: 24 }, (_, hour) =>
      loadProfiles.reduce((sum, profile) => sum + profile.hourly[hour], 0) / loadProfiles.length
    );
    let bestStart = 0;
    let bestAverage = Infinity;
    for (let start = 0; start < 24; start += 1) {
      const average = [0, 1, 2, 3].reduce((sum, offset) => sum + hourlyAverages[(start + offset) % 24], 0) / 4;
      if (average < bestAverage) {
        bestAverage = average;
        bestStart = start;
      }
    }

    return {
      stationsWithLoad,
      criticalCount,
      avgNetworkLoad,
      totalKwInUse,
      loadTrend,
      hourlyTotalLoad,
      offPeakWindow: formatWindow(bestStart)
    };
  }, [stations, loadProfiles, currentHour]);
}

export { formatHour };
