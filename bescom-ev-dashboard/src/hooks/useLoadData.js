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
    const stationsWithLoad = stations.map((station) => {
      const load_factor = profileByStation.get(station.id)?.[currentHour] ?? 0;
      return {
        ...station,
        load_factor,
        kw_in_use: load_factor * station.capacity_kw,
        port_utilization: Math.min(100, Math.round(load_factor * 100))
      };
    });

    const criticalCount = stationsWithLoad.filter((station) => station.load_factor > 0.8).length;
    const avgNetworkLoad = stationsWithLoad.reduce((sum, station) => sum + station.load_factor, 0) / stationsWithLoad.length * 100;
    const totalKwInUse = stationsWithLoad.reduce((sum, station) => sum + station.kw_in_use, 0);

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
      offPeakWindow: formatWindow(bestStart)
    };
  }, [stations, loadProfiles, currentHour]);
}

export { formatHour };
