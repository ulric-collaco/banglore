import LoadBadge from './LoadBadge';
import { formatHour } from '../hooks/useLoadData';
import styles from '../styles/ControlPanel.module.css';

export default function ControlPanel({
  mode,
  hour,
  setHour,
  isPlaying,
  setIsPlaying,
  loadStats,
  plannerState,
  dispatchPlanner,
  plannerStats
}) {
  const sliderFill = `${(hour / 23) * 100}%`;

  return (
    <section className={styles.panel}>
      {mode === 0 ? (
        <>
          <div className={styles.statsRow}>
            <LoadBadge label="Critical Load" value={loadStats.criticalCount} tone={loadStats.criticalCount ? 'critical' : 'default'} />
            <LoadBadge label="Avg Network Load" value={`${Math.round(loadStats.avgNetworkLoad)}%`} />
            <LoadBadge label="Total kW in Use" value={`${Math.round(loadStats.totalKwInUse)} kW`} />
            <LoadBadge label="Off-Peak Window" value={loadStats.offPeakWindow} />
          </div>
          <div className={styles.sliderRow}>
            <span className={styles.timeLabel}>{formatHour(hour)}</span>
            <div className={styles.sliderWrap}>
              <label htmlFor="hour-slider">Drag to explore charging load across the day</label>
              <input
                id="hour-slider"
                aria-label="Charging load hour"
                type="range"
                min="0"
                max="23"
                value={hour}
                onChange={(event) => setHour(Number(event.target.value))}
                style={{ '--slider-fill': sliderFill }}
              />
            </div>
            <button
              className={styles.playButton}
              onClick={() => setIsPlaying((value) => !value)}
              aria-label={isPlaying ? 'Pause time playback' : 'Play time playback'}
            >
              {isPlaying ? 'II' : '▶'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.statsRow}>
            <LoadBadge label="Recommended Sites" value={plannerStats.total} />
            <LoadBadge label="High Priority" value={plannerStats.high} tone={plannerStats.high ? 'critical' : 'default'} />
            <LoadBadge label="Projected Sessions" value={plannerStats.sessions} />
            <LoadBadge label="Avg Demand Score" value={Math.round(plannerStats.avgScore)} />
          </div>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup} aria-label="Priority filter">
              {['all', 'high', 'medium', 'low'].map((priority) => (
                <button
                  key={priority}
                  className={plannerState.priority === priority ? styles.filterActive : ''}
                  onClick={() => dispatchPlanner({ type: 'priority', value: priority })}
                  aria-pressed={plannerState.priority === priority}
                >
                  {priority[0].toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
            <label className={styles.selectLabel}>
              Sort by
              <select
                value={plannerState.sortBy}
                onChange={(event) => dispatchPlanner({ type: 'sort', value: event.target.value })}
              >
                <option value="demand_score">Demand Score</option>
                <option value="projected_daily_sessions">Projected Sessions</option>
                <option value="recommended_capacity_kw">Recommended Capacity</option>
              </select>
            </label>
          </div>
        </>
      )}
    </section>
  );
}
