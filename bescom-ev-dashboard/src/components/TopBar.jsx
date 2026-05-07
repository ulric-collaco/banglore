import { useEffect, useState } from 'react';
import styles from '../styles/TopBar.module.css';

const MODES = ['Live Load', 'Site Planning', 'Algorithms'];

export default function TopBar({ mode, onModeChange, stationCount }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <span className={styles.logo}>GridPulse</span>
        <span>
          <strong>BESCOM</strong>
          <small>EV Charging Optimization</small>
        </span>
      </div>
      <nav className={styles.switcher} aria-label="Dashboard mode switcher">
        {MODES.map((label, index) => (
          <button
            key={label}
            className={`${styles.modeButton} ${mode === index ? styles.active : ''} ${index === 2 ? styles.science : ''}`}
            onClick={() => onModeChange(index)}
            aria-label={`Switch to ${label}`}
            aria-pressed={mode === index}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className={styles.liveMeta}>
        <span>{now.toLocaleString('en-IN', { hour12: true })}</span>
        <span className={styles.liveDot} />
        <span>Simulated weekday</span>
        <span className={styles.metaSeparator}>|</span>
        <span className={styles.sourceBadge}>Bengaluru CSV</span>
        <span className={styles.stationCount}>{stationCount} sites</span>
      </div>
    </header>
  );
}
