import styles from '../../styles/Methods.module.css';

export default function AlgoCard({ badge, title, description, inputLabel, outputLabel, children, keyFinding }) {
  return (
    <article className={styles.algoCard}>
      <div className={styles.algoHeader}>
        <span>{badge}</span>
        <h2>{title}</h2>
      </div>
      <p className={styles.description}>{description}</p>
      <div className={styles.chips}>
        <span>Input: {inputLabel}</span>
        <span>Output: {outputLabel}</span>
      </div>
      <div className={styles.divider} />
      {children}
      <p className={styles.finding}>
        <strong>Key finding:</strong> {keyFinding}
      </p>
    </article>
  );
}
