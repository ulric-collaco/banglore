import styles from '../styles/ControlPanel.module.css';

export default function LoadBadge({ label, value, tone = 'default', trendValue = null, trendSuffix = '' }) {
  let indicator = null;
  let trendColor = '';
  let trendText = '';

  if (trendValue !== null) {
    if (Math.abs(trendValue) < (trendSuffix === '%' ? 2 : 0.1)) {
      indicator = '0';
      trendColor = '#94a3b8'; // gray
      trendText = 'stable';
    } else if (trendValue > 0) {
      indicator = '+';
      trendColor = '#f97316'; // orange/red
      trendText = `+${Math.round(trendValue)}${trendSuffix} from last hour`;
    } else {
      indicator = '-';
      trendColor = '#22c55e'; // green
      trendText = `${Math.round(trendValue)}${trendSuffix} from last hour`;
    }
  }

  return (
    <div className={styles.statCard}>
      <span className={styles.labelGroup}>
        {label}
        {indicator && <span style={{ color: trendColor, marginLeft: 4 }}>{indicator}</span>}
      </span>
      <strong className={tone === 'critical' ? styles.criticalValue : ''}>{value}</strong>
      {trendText && <span style={{ fontSize: '11px', color: '#64748b', marginTop: 4 }}>{trendText}</span>}
    </div>
  );
}
