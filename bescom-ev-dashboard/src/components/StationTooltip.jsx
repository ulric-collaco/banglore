import styles from '../styles/Tooltip.module.css';

function recommendation(load) {
  if (load > 0.8) return { tone: 'critical', text: 'Peak load - recommend shifting to off-peak hours' };
  if (load >= 0.5) return { tone: 'moderate', text: 'Moderate utilization - monitor closely' };
  return { tone: 'ok', text: 'Optimal - off-peak charging window' };
}

function loadStatus(load) {
  if (load < 0.2) return { text: 'Idle', tone: 'ok' };
  if (load < 0.4) return { text: 'Low', tone: 'ok' };
  if (load < 0.6) return { text: 'Moderate', tone: 'moderate' };
  if (load < 0.8) return { text: 'High', tone: 'critical' };
  return { text: 'Critical', tone: 'critical' };
}

export default function StationTooltip({ hover }) {
  if (!hover?.object) return null;
  const item = hover.object;
  const isRecommended = item.id?.startsWith('REC_');
  const rec = isRecommended ? null : recommendation(item.load_factor);
  const status = isRecommended ? null : loadStatus(item.load_factor);

  return (
    <aside className={styles.tooltip} style={{ left: hover.x + 16, top: hover.y + 8, pointerEvents: 'none' }}>
      <header>
        <strong>{isRecommended ? `${item.zone} Candidate` : item.name}</strong>
        <span>{item.zone || item.operator}</span>
      </header>
      <div className={styles.separator} />
      {isRecommended ? (
        <>
          <Row label="Priority" value={item.priority.toUpperCase()} />
          <Row label="Demand Score" value={`${item.demand_score}/100`} />
          <Row label="Daily Sessions" value={item.projected_daily_sessions} />
          <Row label="Capacity" value={`${item.recommended_capacity_kw} kW`} />
          <p className={`${styles.note} ${styles[item.priority]}`}>{item.reason}</p>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Status</span>
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
              background: status.tone === 'critical' ? 'rgba(239, 68, 68, 0.2)' : status.tone === 'moderate' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
              color: status.tone === 'critical' ? '#fca5a5' : status.tone === 'moderate' ? '#fde047' : '#86efac'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
              {status.text}
            </span>
          </div>
          <Row label="Load" value={`${Math.round(item.load_factor * 100)}%`} />
          <Row label="Capacity" value={`${item.capacity_kw} kW`} />
          <Row label="Connectors" value={item.connector_types?.join(', ') || 'CCS2, Type2'} />
          <p className={`${styles.note} ${styles[rec.tone]}`}>{rec.text}</p>
        </>
      )}
    </aside>
  );
}

function Row({ label, value }) {
  return (
    <div className={styles.row} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{label}</span>
      <strong style={{ fontSize: '12px', color: 'var(--color-surface)' }}>{value}</strong>
    </div>
  );
}
