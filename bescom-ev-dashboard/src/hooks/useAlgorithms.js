import { useMemo } from 'react';
import { kMeans } from '../algorithms/kmeans';
import { polynomialRegression } from '../algorithms/regression';
import { scoreAllCandidates } from '../algorithms/scoring';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const LABELS = [
  { label: 'Critical Corridor', color: '#ef4444' },
  { label: 'High Demand', color: '#f97316' },
  { label: 'Moderate Zone', color: '#eab308' },
  { label: 'Moderate Zone', color: '#ca8a04' },
  { label: 'Low Demand', color: '#22c55e' },
  { label: 'Low Demand', color: '#16a34a' }
];

export function useAlgorithms(stations, loadProfiles, recommendedLocations) {
  return useMemo(() => {
    const profileByStation = new Map(loadProfiles.map((profile) => [profile.station_id, profile.hourly]));
    const stationPoints = stations.map((station) => {
      const hourly = profileByStation.get(station.id);
      return {
        id: station.id,
        lat: station.lat,
        lng: station.lng,
        avg_daily_load: hourly.reduce((sum, value) => sum + value, 0) / hourly.length
      };
    });

    const k = 6;
    const kmeansResult = kMeans(stationPoints, k);
    const clusterLoads = Array.from({ length: k }, (_, clusterIndex) => {
      const members = stationPoints.filter((_, index) => kmeansResult.assignments[index] === clusterIndex);
      const avg = members.reduce((sum, point) => sum + point.avg_daily_load, 0) / Math.max(1, members.length);
      return { clusterIndex, avg };
    }).sort((a, b) => b.avg - a.avg);

    const clusterMeta = Array.from({ length: k }, (_, clusterIndex) => {
      const rank = clusterLoads.findIndex((item) => item.clusterIndex === clusterIndex);
      return { ...LABELS[rank], rank };
    });

    const regressionResults = loadProfiles.map((profile) => polynomialRegression(HOURS, profile.hourly, 3));
    const featuredStationIndex = regressionResults.reduce((best, result, index) => {
      const bestPeak = regressionResults[best].predicted[regressionResults[best].peak_hour];
      const nextPeak = result.predicted[result.peak_hour];
      return nextPeak > bestPeak ? index : best;
    }, 0);

    const scoringResults = scoreAllCandidates(recommendedLocations);
    return { k, kmeansResult, clusterMeta, regressionResults, featuredStationIndex, scoringResults };
  }, [stations, loadProfiles, recommendedLocations]);
}
