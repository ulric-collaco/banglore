import styles from '../../styles/Methods.module.css';

const COLUMNS = [
  ['ev_density_score', 'EV Density (0.30)'],
  ['gap_score', 'Gap Score (0.25)'],
  ['grid_headroom_score', 'Grid Headroom (0.20)'],
  ['population_density_score', 'Population (0.15)'],
  ['road_connectivity_score', 'Road Access (0.10)']
];

function tone(value) {
  if (value >= 0.75) return styles.strongScore;
  if (value >= 0.45) return styles.midScore;
  return styles.weakScore;
}

export default function ScoringViz({ scoringResults }) {
  const topFive = [...scoringResults].sort((a, b) => b.demand_score - a.demand_score).slice(0, 5);

  return (
    <div>
      <table className={styles.scoringTable}>
        <thead>
          <tr>
            <th>Zone</th>
            {COLUMNS.map(([, label]) => <th key={label}>{label}</th>)}
            <th>Final Score</th>
          </tr>
        </thead>
        <tbody>
          {topFive.map((site, index) => (
            <tr key={site.id} className={index === 0 ? styles.topScore : ''}>
              <td>{site.zone}</td>
              {COLUMNS.map(([key]) => (
                <td key={key} className={tone(site[key])}>{site[key].toFixed(2)}</td>
              ))}
              <td className={styles.finalScore}>{site.demand_score}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.formula}>
        <span>Score = 0.30 x EV_density</span>
        <span>+ 0.25 x Gap</span>
        <span>+ 0.20 x Grid</span>
        <span>+ 0.15 x Population</span>
        <span>+ 0.10 x Roads</span>
      </p>
      <p className={styles.caption}>All factor scores normalized to [0,1] using min-max scaling across 15 candidate locations.</p>
    </div>
  );
}
