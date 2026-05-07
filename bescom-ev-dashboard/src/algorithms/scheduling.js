/**
 * Per-station smart charging schedule recommendations.
 * Generates actionable advice like "Shift 34% of sessions to 02:00–05:00"
 * for each station based on its load profile and grid conditions.
 */

import { polynomialRegression } from './regression';

function formatHourShort(hour) {
  const h = hour % 24;
  return `${String(h % 12 || 12).padStart(2, '0')}:00 ${h >= 12 ? 'PM' : 'AM'}`;
}

function loadSeverity(avgLoad) {
  if (avgLoad > 0.7) return 'critical';
  if (avgLoad > 0.5) return 'elevated';
  if (avgLoad > 0.35) return 'moderate';
  return 'low';
}

function shiftablePercentage(peakLoad, offpeakLoad) {
  const headroom = Math.max(0, 0.75 - offpeakLoad);
  const excess = Math.max(0, peakLoad - 0.6);
  return Math.min(45, Math.round((headroom / (headroom + 0.2)) * (excess / (excess + 0.15)) * 100 + 12));
}

export function generateStationSchedules(stations, loadProfiles) {
  const HOURS = Array.from({ length: 24 }, (_, h) => h);
  const profileByStation = new Map(loadProfiles.map((p) => [p.station_id, p.hourly]));

  return stations.map((station) => {
    const hourly = profileByStation.get(station.id);
    if (!hourly) return null;

    const regression = polynomialRegression(HOURS, hourly, 3);
    const peakHour = regression.peak_hour;
    const offpeak = regression.offpeak_window;
    const avgLoad = hourly.reduce((s, v) => s + v, 0) / 24;
    const peakLoad = hourly[peakHour];
    const offpeakAvgLoad = [0, 1, 2, 3].reduce((s, o) => s + hourly[(offpeak.start + o) % 24], 0) / 4;
    const shiftPct = shiftablePercentage(peakLoad, offpeakAvgLoad);
    const severity = loadSeverity(avgLoad);

    // Estimate kW relief if shiftPct of peak sessions move
    const peakKw = peakLoad * station.capacity_kw;
    const reliefKw = Math.round(peakKw * (shiftPct / 100) * 0.82);

    // Compute the top 3 peak hours (contiguous window)
    const peakWindow = [peakHour - 1, peakHour, peakHour + 1]
      .map((h) => ((h % 24) + 24) % 24);

    // Generate natural-language recommendation
    let recommendation;
    if (severity === 'critical') {
      recommendation = `Shift ${shiftPct}% of evening sessions to ${formatHourShort(offpeak.start)}–${formatHourShort(offpeak.end + 1)}. Estimated ${reliefKw} kW peak relief. Consider time-of-use pricing incentives.`;
    } else if (severity === 'elevated') {
      recommendation = `Recommend delayed charging: shift ${shiftPct}% to ${formatHourShort(offpeak.start)}–${formatHourShort(offpeak.end + 1)} window. This reduces peak by ~${reliefKw} kW.`;
    } else if (severity === 'moderate') {
      recommendation = `Light scheduling adjustment: ${shiftPct}% shift to off-peak could save ${reliefKw} kW. Monitor for demand growth.`;
    } else {
      recommendation = `Station load is healthy. Current off-peak window (${formatHourShort(offpeak.start)}–${formatHourShort(offpeak.end + 1)}) has ample headroom.`;
    }

    return {
      stationId: station.id,
      stationName: station.name,
      zone: station.zone_type,
      severity,
      avgLoad: Math.round(avgLoad * 100),
      peakHour,
      peakLoad: Math.round(peakLoad * 100),
      peakWindow,
      offpeakStart: offpeak.start,
      offpeakEnd: offpeak.end,
      shiftPct,
      reliefKw,
      recommendation,
      gridHeadroom: station.grid_headroom_mw,
      capacityKw: station.capacity_kw
    };
  }).filter(Boolean).sort((a, b) => b.avgLoad - a.avgLoad);
}

/**
 * Aggregate scheduling impact across the entire network.
 */
export function networkSchedulingSummary(schedules) {
  const critical = schedules.filter((s) => s.severity === 'critical');
  const elevated = schedules.filter((s) => s.severity === 'elevated');
  const totalReliefKw = schedules.reduce((s, r) => s + r.reliefKw, 0);
  const avgShiftPct = Math.round(schedules.reduce((s, r) => s + r.shiftPct, 0) / Math.max(1, schedules.length));
  const peakHours = schedules.map((s) => s.peakHour);
  const modePeakHour = peakHours.sort((a, b) =>
    peakHours.filter((v) => v === a).length - peakHours.filter((v) => v === b).length
  ).pop();

  return {
    totalStations: schedules.length,
    criticalCount: critical.length,
    elevatedCount: elevated.length,
    totalReliefKw,
    avgShiftPct,
    modePeakHour,
    topActions: critical.slice(0, 5).map((s) => ({
      station: s.stationName,
      action: s.recommendation,
      impact: `${s.reliefKw} kW relief`
    }))
  };
}
