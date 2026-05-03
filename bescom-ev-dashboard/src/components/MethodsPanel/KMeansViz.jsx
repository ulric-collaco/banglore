import styles from '../../styles/Methods.module.css';

const WIDTH = 560;
const HEIGHT = 320;
const PADDING = 42;

function scale(value, min, max, outMin, outMax) {
  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
}

export default function KMeansViz({ stations, loadProfiles, algorithms }) {
  const lngs = stations.map((station) => station.lng);
  const lats = stations.map((station) => station.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const rows = Array.from({ length: algorithms.k }, (_, clusterIndex) => {
    const members = stations.filter((_, index) => algorithms.kmeansResult.assignments[index] === clusterIndex);
    const avgLoad = members.reduce((sum, station) => {
      const profile = loadProfiles.find((item) => item.station_id === station.id);
      return sum + profile.hourly.reduce((loadSum, value) => loadSum + value, 0) / 24;
    }, 0) / Math.max(1, members.length);
    const hourly = Array.from({ length: 24 }, (_, hour) =>
      members.reduce((sum, station) => sum + loadProfiles.find((item) => item.station_id === station.id).hourly[hour], 0) / Math.max(1, members.length)
    );
    const peakHour = hourly.indexOf(Math.max(...hourly));
    return { clusterIndex, members, avgLoad, peakHour, meta: algorithms.clusterMeta[clusterIndex] };
  });

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={styles.chart} role="img" aria-label="K-Means cluster scatter plot">
        <rect width={WIDTH} height={HEIGHT} rx="8" fill="#f8fafc" />
        {[0, 1, 2, 3, 4].map((line) => {
          const x = PADDING + line * ((WIDTH - PADDING * 2) / 4);
          const y = PADDING + line * ((HEIGHT - PADDING * 2) / 4);
          return <g key={line}><line x1={x} y1={PADDING} x2={x} y2={HEIGHT - PADDING} /><line x1={PADDING} y1={y} x2={WIDTH - PADDING} y2={y} /></g>;
        })}
        <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} className={styles.axis} />
        <line x1={PADDING} y1={PADDING} x2={PADDING} y2={HEIGHT - PADDING} className={styles.axis} />
        <text x={WIDTH / 2} y={HEIGHT - 12}>Longitude (normalized)</text>
        <text x={14} y={HEIGHT / 2} transform={`rotate(-90 14 ${HEIGHT / 2})`}>Latitude (normalized)</text>
        {stations.map((station, index) => (
          <circle
            key={station.id}
            cx={scale(station.lng, minLng, maxLng, PADDING, WIDTH - PADDING)}
            cy={scale(station.lat, minLat, maxLat, HEIGHT - PADDING, PADDING)}
            r="7"
            fill={algorithms.clusterMeta[algorithms.kmeansResult.assignments[index]].color}
            stroke="#fff"
            strokeWidth="1.5"
          />
        ))}
        {algorithms.kmeansResult.centroids.map((centroid, index) => {
          const x = scale(centroid.lng, minLng, maxLng, PADDING, WIDTH - PADDING);
          const y = scale(centroid.lat, minLat, maxLat, HEIGHT - PADDING, PADDING);
          return <polygon key={index} points={`${x},${y - 10} ${x + 10},${y} ${x},${y + 10} ${x - 10},${y}`} fill={algorithms.clusterMeta[index].color} stroke="#111827" strokeWidth="1.5" />;
        })}
      </svg>
      <div className={styles.clusterLegend}>
        {rows.map((row) => (
          <span key={row.clusterIndex}><i style={{ background: row.meta.color }} />{row.meta.label} - {row.members.length}</span>
        ))}
      </div>
      <table className={styles.methodTable}>
        <thead><tr><th>Cluster</th><th>Zone Label</th><th>Stations</th><th>Avg Load</th><th>Peak Hour</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.clusterIndex}><td>{row.clusterIndex + 1}</td><td>{row.meta.label}</td><td>{row.members.length}</td><td>{Math.round(row.avgLoad * 100)}%</td><td>{row.peakHour}:00</td></tr>
          ))}
        </tbody>
      </table>
      <p className={styles.caption}>K-Means++ seeded with a deterministic random stream. Converged in {algorithms.kmeansResult.iterations} iterations. Inertia: {algorithms.kmeansResult.inertia.toFixed(3)}.</p>
    </div>
  );
}
