function normalize(value, min, max) {
  return max === min ? 0.5 : (value - min) / (max - min);
}

function euclideanDistance(a, b) {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2 + (a.avg_daily_load - b.avg_daily_load) ** 2);
}

function assignClusters(points, centroids) {
  return points.map((point) => {
    let bestIndex = 0;
    let bestDistance = Infinity;
    centroids.forEach((centroid, index) => {
      const distance = euclideanDistance(point, centroid);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  });
}

function recomputeCentroids(points, assignments, k) {
  return Array.from({ length: k }, (_, clusterIndex) => {
    const members = points.filter((_, index) => assignments[index] === clusterIndex);
    if (!members.length) return points[clusterIndex % points.length];
    return {
      lat: members.reduce((sum, point) => sum + point.lat, 0) / members.length,
      lng: members.reduce((sum, point) => sum + point.lng, 0) / members.length,
      avg_daily_load: members.reduce((sum, point) => sum + point.avg_daily_load, 0) / members.length
    };
  });
}

function seededRandom(seed) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function initializeCentroids(points, k) {
  const centroids = [points[Math.floor(seededRandom(17) * points.length)]];
  let seed = 31;

  while (centroids.length < k) {
    const distances = points.map((point) => {
      const nearest = Math.min(...centroids.map((centroid) => euclideanDistance(point, centroid)));
      return nearest ** 2;
    });
    const total = distances.reduce((sum, distance) => sum + distance, 0);
    let threshold = seededRandom(seed++) * total;

    for (let index = 0; index < points.length; index += 1) {
      threshold -= distances[index];
      if (threshold <= 0) {
        centroids.push(points[index]);
        break;
      }
    }
  }

  return centroids;
}

export function kMeans(points, k = 6, maxIter = 100) {
  const mins = {
    lat: Math.min(...points.map((point) => point.lat)),
    lng: Math.min(...points.map((point) => point.lng)),
    load: Math.min(...points.map((point) => point.avg_daily_load))
  };
  const maxs = {
    lat: Math.max(...points.map((point) => point.lat)),
    lng: Math.max(...points.map((point) => point.lng)),
    load: Math.max(...points.map((point) => point.avg_daily_load))
  };

  const normalizedPoints = points.map((point) => ({
    id: point.id,
    lat: normalize(point.lat, mins.lat, maxs.lat),
    lng: normalize(point.lng, mins.lng, maxs.lng),
    avg_daily_load: normalize(point.avg_daily_load, mins.load, maxs.load),
    original: point
  }));

  // K-Means++ seeds centroids by D² probability to avoid poor initial clusters.
  let centroids = initializeCentroids(normalizedPoints, k);
  let assignments = assignClusters(normalizedPoints, centroids);
  let iterations = 0;

  for (; iterations < maxIter; iterations += 1) {
    const nextCentroids = recomputeCentroids(normalizedPoints, assignments, k);
    const movement = nextCentroids.reduce((sum, centroid, index) => sum + euclideanDistance(centroid, centroids[index]), 0);
    centroids = nextCentroids;
    assignments = assignClusters(normalizedPoints, centroids);
    if (movement < 1e-6) break;
  }

  const inertia = normalizedPoints.reduce((sum, point, index) => {
    const centroid = centroids[assignments[index]];
    return sum + euclideanDistance(point, centroid) ** 2;
  }, 0);

  const denormalizedCentroids = centroids.map((centroid) => ({
    lat: centroid.lat * (maxs.lat - mins.lat) + mins.lat,
    lng: centroid.lng * (maxs.lng - mins.lng) + mins.lng,
    avg_daily_load: centroid.avg_daily_load * (maxs.load - mins.load) + mins.load
  }));

  return { assignments, centroids: denormalizedCentroids, iterations: iterations + 1, inertia };
}

export { normalize, euclideanDistance, assignClusters, recomputeCentroids };
