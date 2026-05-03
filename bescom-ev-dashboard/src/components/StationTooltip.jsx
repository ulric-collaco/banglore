import styles from '../styles/Tooltip.module.css';

function recommendation(load) {
  if (load > 0.8) return { tone: 'critical', text: 'Peak load - recommend shifting to off-peak hours' };
  if (load >= 0.5) return { tone: 'moderate', text: 'Moderate utilization - monitor closely' };
  return { tone: 'ok', text: 'Optimal - off-peak charging window' };
}

export default function StationTooltip({ hover }) {
  if (!hover?.object) return null;
  const item = hover.object;
  const isRecommended = item.id?.startsWith('REC_');
  const rec = isRecommended ? null : recommendation(item.load_factor);

  return (
    <aside className={styles.tooltip} style={{ left: hover.x + 16, top: hover.y + 8 }}>
      <header>
        <strong>{isRecommended ? `${item.zone} Candidate` : item.name}</strong>
        <span>{item.zone}</span>
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
          <Row label="Load" value={`${Math.round(item.load_factor * 100)}%`} />
          <Row label="kW in Use" value={`${Math.round(item.kw_in_use)} kW`} />
          <Row label="Ports" value={`${Math.round(item.num_ports * item.load_factor)}/${item.num_ports}`} />
          <Row label="Capacity" value={`${item.capacity_kw} kW`} />
          <p className={`${styles.note} ${styles[rec.tone]}`}>{rec.text}</p>
        </>
      )}
    </aside>
  );
}

function Row({ label, value }) {
  return (
    <div className={styles.row}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
