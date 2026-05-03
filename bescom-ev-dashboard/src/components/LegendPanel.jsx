import styles from '../styles/Legend.module.css';

const LOAD = [
  ['#22c55e', 'Idle', '0-20%'],
  ['#a3e635', 'Low', '20-40%'],
  ['#eab308', 'Moderate', '40-60%'],
  ['#f97316', 'High', '60-80%'],
  ['#ef4444', 'Critical', '80-100%']
];

const PRIORITY = [
  ['#ea580c', 'High priority', 'Immediate grid action'],
  ['#eab308', 'Medium priority', 'Plan in next cycle'],
  ['#a3e635', 'Low priority', 'Future coverage reserve']
];

export default function LegendPanel({ mode }) {
  if (mode === 2) return null;
  const rows = mode === 0 ? LOAD : PRIORITY;
  return (
    <aside className={styles.legend}>
      <h2>{mode === 0 ? 'Load Factor' : 'Recommendation Priority'}</h2>
      {rows.map(([color, label, range]) => (
        <div className={styles.legendRow} key={label}>
          <span style={{ background: color }} />
          <strong>{label}</strong>
          <em>{range}</em>
        </div>
      ))}
      {mode === 1 && <p>White arcs connect candidate sites to the two nearest existing stations.</p>}
    </aside>
  );
}
