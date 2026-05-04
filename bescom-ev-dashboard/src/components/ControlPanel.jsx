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
            <LoadBadge label="Critical Load" value={loadStats.criticalCount} tone={loadStats.criticalCount ? 'critical' : 'default'} trendValue={loadStats.loadTrend.criticalCount} trendSuffix="" />
            <LoadBadge label="Avg Network Load" value={`${Math.round(loadStats.avgNetworkLoad)}%`} trendValue={loadStats.loadTrend.avgNetworkLoad} trendSuffix="%" />
            <LoadBadge label="Total kW in Use" value={`${Math.round(loadStats.totalKwInUse)} kW`} trendValue={loadStats.loadTrend.totalKwInUse} trendSuffix=" kW" />
            <LoadBadge label="Off-Peak Window" value={loadStats.offPeakWindow} />
          </div>
          <div className={styles.sliderRow} style={{ flexWrap: 'wrap' }}>
            <div style={{ width: '100%', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                <span>Network Load (24h)</span>
                <span>Max: {Math.round(Math.max(...loadStats.hourlyTotalLoad))} kW</span>
              </div>
              <svg viewBox="0 0 100 40" style={{ width: '100%', height: '40px', overflow: 'visible' }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="loadGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                    <stop offset="20%" stopColor="#ef4444" stopOpacity="0.4" />
                    <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                <path
                  d={(() => {
                    const max = Math.max(...loadStats.hourlyTotalLoad, 1);
                    const pts = loadStats.hourlyTotalLoad.map((val, i) => ({ x: (i / 23) * 100, y: 40 - (val / max) * 40 }));
                    let d = `M 0,40 L 0,${pts[0].y}`;
                    for (let i = 0; i < pts.length - 1; i++) {
                      const p0 = pts[i];
                      const p1 = pts[i + 1];
                      d += ` C ${p0.x + (p1.x - p0.x)/2},${p0.y} ${p0.x + (p1.x - p0.x)/2},${p1.y} ${p1.x},${p1.y}`;
                    }
                    return d + ' L 100,40 Z';
                  })()}
                  fill="url(#loadGradient)"
                />
                <line x1={(hour / 23) * 100} x2={(hour / 23) * 100} y1="0" y2="40" stroke="#fff" strokeWidth="0.5" />
                <circle cx={(hour / 23) * 100} cy={40 - (loadStats.hourlyTotalLoad[hour] / Math.max(...loadStats.hourlyTotalLoad, 1)) * 40} r="1.5" fill="#fff" />
              </svg>
            </div>
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
