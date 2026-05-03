export const WEIGHTS = {
  ev_density: 0.3,
  gap: 0.25,
  grid_headroom: 0.2,
  population_density: 0.15,
  road_connectivity: 0.1
};

function minMaxNormalize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((value) => (max === min ? 1 : (value - min) / (max - min)));
}

function computeScore(candidate, weights) {
  return (
    candidate.ev_density_score * weights.ev_density +
    candidate.gap_score * weights.gap +
    candidate.grid_headroom_score * weights.grid_headroom +
    candidate.population_density_score * weights.population_density +
    candidate.road_connectivity_score * weights.road_connectivity
  ) * 100;
}

export function scoreAllCandidates(candidates, weights = WEIGHTS) {
  const normalized = {
    ev_density: minMaxNormalize(candidates.map((candidate) => candidate.factors.ev_density_raw)),
    gap: minMaxNormalize(candidates.map((candidate) => candidate.factors.gap_km)),
    grid_headroom: minMaxNormalize(candidates.map((candidate) => candidate.factors.grid_headroom_mw)),
    population_density: minMaxNormalize(candidates.map((candidate) => candidate.factors.population_density_raw)),
    road_connectivity: minMaxNormalize(candidates.map((candidate) => candidate.factors.road_connectivity_raw))
  };

  return candidates.map((candidate, index) => {
    const scored = {
      ...candidate,
      ev_density_score: normalized.ev_density[index],
      gap_score: normalized.gap[index],
      grid_headroom_score: normalized.grid_headroom[index],
      population_density_score: normalized.population_density[index],
      road_connectivity_score: normalized.road_connectivity[index]
    };
    return { ...scored, demand_score: Math.round(computeScore(scored, weights)) };
  });
}

export { minMaxNormalize, computeScore };
