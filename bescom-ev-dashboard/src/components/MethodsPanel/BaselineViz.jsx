import styles from '../../styles/Methods.module.css';

const METRICS = [
  { key: 'avgGapKm', label: 'Avg Service Gap', unit: ' km', lower: true },
  { key: 'coveragePct', label: 'Station Coverage', unit: '%', lower: false },
  { key: 'totalSessions', label: 'Daily Sessions', unit: '', lower: false },
  { key: 'avgDemandScore', label: 'Demand Score', unit: '/100', lower: false },
  { key: 'peakLoadPct', label: 'Peak-Hour Load', unit: '%', lower: true },
  { key: 'highLoadRelief', label: 'High-Load Relief', unit: ' stations', lower: false }
];

function bar(value, max, color) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ height: '8px', width: '100%', borderRadius: '999px', background: 'rgba(148,163,184,0.18)' }}>
      <div style={{ height: '100%', width: `${pct}%`, borderRadius: '999px', background: color, transition: 'width 0.6s ease' }} />
    </div>
  );
}

export default function BaselineViz({ comparison }) {
  if (!comparison) return null;
  const { ai, uniform, improvement } = comparison;

  return (
    <div>
      <p className={styles.caption} style={{ marginBottom: '16px' }}>
        Compares AI-optimized weighted scoring placement against a naive uniform grid baseline.
        Green cells indicate the winning strategy for each metric.
      </p>
      <table className={styles.scoringTable}>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Uniform Grid</th>
            <th>AI-Optimized</th>
            <th>Δ Improvement</th>
          </tr>
        </thead>
        <tbody>
          {METRICS.map(({ key, label, unit, lower }) => {
            const aiVal = ai[key];
            const uniVal = uniform[key];
            const aiWins = lower ? aiVal <= uniVal : aiVal >= uniVal;
            return (
              <tr key={key}>
                <td>{label}</td>
                <td className={!aiWins ? styles.strongScore : styles.weakScore}>
                  {typeof uniVal === 'number' ? uniVal.toLocaleString() : uniVal}{unit}
                </td>
                <td className={aiWins ? styles.strongScore : styles.weakScore}>
                  {typeof aiVal === 'number' ? aiVal.toLocaleString() : aiVal}{unit}
                </td>
                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                  {key === 'avgGapKm' && `${improvement.gapReduction}% closer`}
                  {key === 'coveragePct' && `+${improvement.coverageGain}% more`}
                  {key === 'totalSessions' && `+${improvement.sessionGain}% demand captured`}
                  {key === 'avgDemandScore' && `${Math.round(ai.avgDemandScore - uniform.avgDemandScore)} pts higher`}
                  {key === 'peakLoadPct' && `${improvement.peakReduction} pp reduction`}
                  {key === 'highLoadRelief' && `${ai.highLoadRelief - uniform.highLoadRelief} more stations`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
        <div>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Uniform — Coverage Reach
          </span>
          {bar(uniform.coveragePct, 100, '#94a3b8')}
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{uniform.coveragePct}%</span>
        </div>
        <div>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            AI-Optimized — Coverage Reach
          </span>
          {bar(ai.coveragePct, 100, '#16a34a')}
          <span style={{ fontSize: '11px', color: '#bbf7d0' }}>{ai.coveragePct}%</span>
        </div>
      </div>

      <p className={styles.caption} style={{ marginTop: '16px' }}>
        The AI-optimized strategy captures {improvement.sessionGain}% more daily sessions and reduces
        peak-hour grid stress by {improvement.peakReduction} percentage points compared to uniform placement.
      </p>
    </div>
  );
}
