import styles from '../styles/ControlPanel.module.css';

export default function LoadBadge({ label, value, tone = 'default' }) {
  return (
    <div className={styles.statCard}>
      <span>{label}</span>
      <strong className={tone === 'critical' ? styles.criticalValue : ''}>{value}</strong>
    </div>
  );
}
