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

export default function LegendPanel({ mode, vizMode }) {
  if (mode === 2) return null;
  
  if (mode === 0) {
    if (vizMode === 'heatmap') {
      return (
        <aside className={styles.legend}>
          <h2>Demand Intensity</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <div style={{ 
              height: '8px', 
              width: '100%', 
              background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)',
              borderRadius: '4px'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              <span>Low</span>
              <span>Moderate</span>
              <span>High</span>
              <span>Critical</span>
            </div>
          </div>
        </aside>
      );
    }
    
    if (vizMode === 'hex') {
      return (
        <aside className={styles.legend}>
          <h2>Avg Load per Zone</h2>
          {LOAD.slice(1).map(([color, label, range]) => (
            <div className={styles.legendRow} key={label} style={{ alignItems: 'center' }}>
              <svg width="14" height="16" viewBox="0 0 14 16" style={{ marginRight: '8px', flexShrink: 0 }}>
                <path d="M7 0L13.0622 3.5V10.5L7 14L0.937822 10.5V3.5L7 0Z" fill={color} opacity="0.8" />
              </svg>
              <strong>{label}</strong>
              <em>{range}</em>
            </div>
          ))}
        </aside>
      );
    }

    if (vizMode === 'coverage') {
      return (
        <aside className={styles.legend}>
          <h2>Station Coverage</h2>
          {LOAD.map(([color, label, range]) => (
            <div className={styles.legendRow} key={label}>
              <span style={{ background: color, borderRadius: '50%' }} />
              <strong>{label}</strong>
              <em>{range}</em>
            </div>
          ))}
          <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--color-text-muted)' }}>Circle radius = 3km service area</p>
        </aside>
      );
    }
  }

  // mode === 1 (Planner)
  return (
    <aside className={styles.legend}>
      <h2>Recommendation Priority</h2>
      {PRIORITY.map(([color, label, range]) => (
        <div className={styles.legendRow} key={label}>
          <span style={{ background: color }} />
          <strong>{label}</strong>
          <em>{range}</em>
        </div>
      ))}
      <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--color-text-muted)' }}>White arcs connect candidate sites to the two nearest existing stations.</p>
    </aside>
  );
}
