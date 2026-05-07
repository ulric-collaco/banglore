function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function peak(hour, center, width, height) {
  return height * Math.exp(-((hour - center) ** 2) / (2 * width ** 2));
}

function distanceKm(a, b) {
  const latKm = (a.lat - b.lat) * 111;
  const lngKm = (a.lng - b.lng) * 111 * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  return Math.sqrt(latKm ** 2 + lngKm ** 2);
}

export function plannedSiteLoadFactor(site, hour) {
  const priorityBoost = site.priority === 'high' ? 0.11 : site.priority === 'medium' ? 0.07 : 0.04;
  const demandBoost = site.demand_score / 520;
  const commuteShape = peak(hour, 8, 1.9, 0.16) + peak(hour, 19, 2.3, 0.34);
  const daytimeShape = peak(hour, 13, 3.2, 0.2);
  const overnightRelief = hour >= 1 && hour <= 4 ? -0.06 : 0;
  return clamp(0.14 + priorityBoost + demandBoost + commuteShape + daytimeShape + overnightRelief, 0.08, 0.82);
}

export function reliefForStation(station, plannedSites, hour) {
  const eveningMultiplier = hour >= 17 && hour <= 22 ? 1.16 : hour >= 7 && hour <= 10 ? 1.04 : 0.86;
  const relief = plannedSites.reduce((sum, site) => {
    const km = distanceKm(station, site);
    const proximity = Math.max(0, 1 - km / 7.5);
    const priority = site.priority === 'high' ? 1.16 : site.priority === 'medium' ? 0.94 : 0.76;
    return sum + proximity * priority * (site.recommended_capacity_kw / 900);
  }, 0);
  return clamp(relief * eveningMultiplier, 0, 0.34);
}

export function createAfterBuildStations(stationsWithLoad, plannedSites, hour) {
  const relievedStations = stationsWithLoad.map((station) => {
    const relief = reliefForStation(station, plannedSites, hour);
    const loadFactor = station.load_factor * (1 - relief);
    return {
      ...station,
      load_factor: loadFactor,
      kw_in_use: loadFactor * station.capacity_kw,
      buildout_relief: relief,
      original_load: station.load_factor
    };
  });

  const plannedStations = plannedSites.map((site) => {
    const loadFactor = plannedSiteLoadFactor(site, hour);
    return {
      ...site,
      name: `${site.zone} Planned Hub`,
      operator: 'Recommended buildout',
      zone_type: 'Recommended buildout',
      demand_index: site.demand_score / 100,
      capacity_kw: site.recommended_capacity_kw,
      load_factor: loadFactor,
      kw_in_use: loadFactor * site.recommended_capacity_kw,
      connector_types: ['CCS2', 'Type2'],
      status: 'planned'
    };
  });

  return [...relievedStations, ...plannedStations];
}

export function summarizeBuildoutImpact(stationsWithLoad, plannedSites, hour) {
  const afterStations = createAfterBuildStations(stationsWithLoad, plannedSites, hour);
  const relievedExisting = afterStations.filter((station) => station.status !== 'planned');
  const beforeKw = stationsWithLoad.reduce((sum, station) => sum + station.kw_in_use, 0);
  const afterExistingKw = relievedExisting.reduce((sum, station) => sum + station.kw_in_use, 0);
  const plannedKw = afterStations
    .filter((station) => station.status === 'planned')
    .reduce((sum, station) => sum + station.kw_in_use, 0);
  const beforeCritical = stationsWithLoad.filter((station) => station.load_factor > 0.8).length;
  const afterCritical = relievedExisting.filter((station) => station.load_factor > 0.8).length;
  const avgBefore = stationsWithLoad.reduce((sum, station) => sum + station.load_factor, 0) / Math.max(1, stationsWithLoad.length);
  const avgAfter = relievedExisting.reduce((sum, station) => sum + station.load_factor, 0) / Math.max(1, relievedExisting.length);

  return {
    plannedCount: plannedSites.length,
    addedCapacity: plannedSites.reduce((sum, site) => sum + site.recommended_capacity_kw, 0),
    projectedSessions: plannedSites.reduce((sum, site) => sum + site.projected_daily_sessions, 0),
    relievedKw: Math.max(0, Math.round(beforeKw - afterExistingKw)),
    plannedKw: Math.round(plannedKw),
    beforeCritical,
    afterCritical,
    avgLoadDrop: Math.max(0, Math.round((avgBefore - avgAfter) * 100)),
    totalAfterKw: Math.round(afterExistingKw + plannedKw)
  };
}
