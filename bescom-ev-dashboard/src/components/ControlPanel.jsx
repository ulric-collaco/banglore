
import { useState, useEffect } from 'react';
import { formatHour } from '../hooks/useLoadData';
import LoadBadge from './LoadBadge';
import styles from '../styles/ControlPanel.module.css';

const FACTOR_LABELS = {
  ev_density_score: 'EV Density',
  gap_score: 'Gap',
  grid_headroom_score: 'Grid',
  population_density_score: 'Population',
  road_connectivity_score: 'Roads'
};

function FactorBar({ label, value }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.75 ? '#22c55e' : value >= 0.45 ? '#eab308' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
      <span style={{ width: '62px', fontSize: '10px', color: '#94a3b8', textAlign: 'right' }}>{label}</span>
      <div style={{ flex: 1, height: '5px', borderRadius: '999px', background: 'rgba(148,163,184,0.18)' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: '999px', background: color, transition: 'width 0.4s' }} />
      </div>
      <span style={{ width: '28px', fontSize: '10px', color: '#cbd5e1', fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</span>
    </div>
  );
}

export default function ControlPanel({
  mode,
  hour,
  setHour,
  loadStats,
  plannerState,
  dispatchPlanner,
  plannerStats,
  selectedCandidates = [],
  impactStats = {
    selected: 0,
    addedCapacity: 0,
    projectedSessions: 0,
    avgGapAddressed: 0,
    peakReliefKw: 0,
    queueReliefMinutes: 0
  },
  onClearCandidates,
  comparisonView = 'before',
  buildoutStats = null
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [sliderValue, setSliderValue] = useState(hour);

  useEffect(() => {
    setSliderValue(hour);
  }, [hour]);

  if (mode !== 0) {
    const hasSelection = selectedCandidates.length > 0;
    return (
      <section className={`${styles.panel} ${styles.plannerPanel} ${hasSelection ? styles.plannerPanelExpanded : ''}`}>
        <div className={styles.statsRow}>
          <LoadBadge label="Selected Sites" value={impactStats.selected} tone={hasSelection ? 'default' : 'muted'} />
          <LoadBadge label="Added Capacity" value={`${impactStats.addedCapacity} kW`} />
          <LoadBadge label="Daily Sessions" value={impactStats.projectedSessions} />
          <LoadBadge label="Peak Relief" value={`${impactStats.peakReliefKw} kW`} />
        </div>
        <div className={styles.impactStrip}>
          <div>
            <span className={styles.impactEyebrow}>Candidate Impact Preview</span>
            <strong>
              {hasSelection
                ? `${selectedCandidates.map((site) => site.zone).join(', ')}`
                : 'Click candidate sites on the map to preview coverage and relief'}
            </strong>
          </div>
          <div className={styles.impactMetrics}>
            <span>{impactStats.avgGapAddressed.toFixed(1)} km avg gap</span>
            <span>{impactStats.queueReliefMinutes} min queue relief</span>
            <span>{plannerStats.total} ranked sites</span>
          </div>
          {hasSelection && (
            <button className={styles.clearButton} onClick={onClearCandidates}>
              Clear
            </button>
          )}
        </div>

        {/* Expanded candidate detail cards */}
        {hasSelection && (
          <div className={styles.candidateCards}>
            {selectedCandidates.map((site) => (
              <div
                key={site.id}
                className={`${styles.candidateCard} ${expandedCandidate === site.id ? styles.candidateExpanded : ''}`}
                onClick={() => setExpandedCandidate(expandedCandidate === site.id ? null : site.id)}
              >
                <div className={styles.candidateHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`${styles.priorityDot} ${styles[`priority_${site.priority}`]}`} />
                    <strong>{site.zone}</strong>
                    <span className={styles.scoreChip}>{site.demand_score}/100</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{expandedCandidate === site.id ? '▲' : '▼'}</span>
                </div>
                {expandedCandidate === site.id && (
                  <div className={styles.candidateDetail}>
                    <p className={styles.candidateReason}>{site.reason}</p>
                    <div style={{ marginTop: '8px' }}>
                      {Object.entries(FACTOR_LABELS).map(([key, label]) => (
                        <FactorBar key={key} label={label} value={site[key] ?? 0} />
                      ))}
                    </div>
                    <div className={styles.candidateMeta}>
                      <span>{site.recommended_capacity_kw} kW capacity</span>
                      <span>{site.projected_daily_sessions} sessions/day</span>
                      <span>{site.factors.grid_headroom_mw} MW headroom</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className={styles.plannerControls}>
          <div className={styles.filterGroup} aria-label="Priority filter">
            {['all', 'high', 'medium', 'low'].map((priority) => (
              <button
                key={priority}
                className={plannerState.priority === priority ? styles.filterActive : ''}
                onClick={() => dispatchPlanner({ type: 'priority', value: priority })}
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
      </section>
    );
  }

  const hourlyData = comparisonView === 'after' && buildoutStats?.afterHourlyTotalLoad 
    ? buildoutStats.afterHourlyTotalLoad 
    : loadStats.hourlyTotalLoad;

  const baselineMax = Math.max(...loadStats.hourlyTotalLoad, 1);
  const afterMax = buildoutStats?.afterHourlyTotalLoad ? Math.max(...buildoutStats.afterHourlyTotalLoad, 1) : 1;
  const maxTotalLoad = Math.max(baselineMax, afterMax);
  const cursorX = (sliderValue / 23) * 100;
  
  const h1 = Math.floor(sliderValue);
  const h2 = Math.min(23, Math.ceil(sliderValue));
  const fraction = sliderValue - h1;
  const interpolatedLoad = hourlyData[h1] + (hourlyData[h2] - hourlyData[h1]) * fraction;

  const sparklinePath = (() => {
    const data = hourlyData;
    const width = 1000; // Use a large fixed coordinate system for smoothness
    const height = 80;
    const pts = data.map((val, i) => ({
      x: (i / 23) * width,
      y: height - (val / maxTotalLoad) * height
    }));
    
    let d = `M 0,${height} L 0,${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpX = p0.x + (p1.x - p0.x) / 2;
      d += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
    }
    d += ` L ${width},${height} Z`;
    return d;
  })();

  return (
    <section className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}>
      <button
        className={styles.collapseHandle}
        aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
        onClick={() => setCollapsed((v) => !v)}
      >
        {collapsed ? 'Expand' : 'Collapse'}
      </button>
      <div className={styles.sparklineSection}>
        <div className={styles.sparklineHeader}>
          <span>{comparisonView === 'after' ? 'After Buildout Load (24h)' : 'Current Network Load (24h)'}</span>
          <span>
            {buildoutStats && comparisonView === 'after'
              ? `After: ${buildoutStats.totalAfterKw.toLocaleString()} kW`
              : `Now: ${Math.round(loadStats.totalKwInUse).toLocaleString()} kW`}
          </span>
        </div>
        
        <div className={styles.sparklineCursorLabel} style={{ left: `${cursorX}%` }}>
          {formatHour(hour)}
        </div>

        <svg 
          viewBox="0 0 1000 80" 
          style={{ width: '100%', height: '80px', overflow: 'visible' }} 
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="sparkGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="20%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="20%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          
          <path d={sparklinePath} fill="url(#sparkGradient)" />
          
          <line 
            x1={cursorX * 10} 
            x2={cursorX * 10} 
            y1="0" 
            y2="80" 
            stroke="#0f172a" 
            strokeWidth="2" 
            strokeDasharray="4 2"
            opacity="0.5"
          />
          
          <circle 
            cx={cursorX * 10} 
            cy={80 - (interpolatedLoad / maxTotalLoad) * 80} 
            r="4" 
            fill="white" 
            stroke="var(--color-bescom-green)" 
            strokeWidth="2" 
          />
        </svg>
      </div>

      <div className={styles.sliderRow}>
        <div className={styles.sliderContainer}>
          <div className={styles.sliderWrap}>
            <input
              type="range"
              min="0"
              max="23"
              step="0.01"
              value={sliderValue}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSliderValue(val);
                setHour(Math.round(val));
              }}
            />
          </div>
          <div className={styles.sliderLabels}>
            <span>12AM</span>
            <span>6AM</span>
            <span>12PM</span>
            <span>6PM</span>
            <span>12AM</span>
          </div>
        </div>
      </div>

      {buildoutStats ? (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span>Before Critical</span>
            <strong className={buildoutStats.beforeCritical > 0 ? styles.criticalValue : ''}>
              {buildoutStats.beforeCritical}
            </strong>
          </div>
          <div className={styles.statCard}>
            <span>After Critical</span>
            <strong>{buildoutStats.afterCritical}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Existing Load Relief</span>
            <strong>{buildoutStats.relievedKw.toLocaleString()} kW</strong>
          </div>
          <div className={styles.statCard}>
            <span>Planned Hub Load</span>
            <strong>{buildoutStats.plannedKw.toLocaleString()} kW</strong>
          </div>
        </div>
      ) : (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.labelGroup}>
              <span>Critical Load</span>
              {loadStats.loadTrend.criticalCount !== 0 && (
                <TrendArrow value={loadStats.loadTrend.criticalCount} />
              )}
            </div>
            <strong className={loadStats.criticalCount > 0 ? styles.criticalValue : ''}>
              {loadStats.criticalCount}
            </strong>
            <TrendText value={loadStats.loadTrend.criticalCount} suffix="" />
          </div>

          <div className={styles.statCard}>
            <div className={styles.labelGroup}>
              <span>Avg Network Load</span>
              {Math.abs(loadStats.loadTrend.avgNetworkLoad) > 0.1 && (
                <TrendArrow value={loadStats.loadTrend.avgNetworkLoad} />
              )}
            </div>
            <strong>{Math.round(loadStats.avgNetworkLoad)}%</strong>
            <TrendText value={loadStats.loadTrend.avgNetworkLoad} suffix="%" />
          </div>

          <div className={styles.statCard}>
            <div className={styles.labelGroup}>
              <span>Total kW in Use</span>
              {Math.abs(loadStats.loadTrend.totalKwInUse) > 1 && (
                <TrendArrow value={loadStats.loadTrend.totalKwInUse} />
              )}
            </div>
            <strong>{Math.round(loadStats.totalKwInUse).toLocaleString()} kW</strong>
            <TrendText value={loadStats.loadTrend.totalKwInUse} suffix=" kW" />
          </div>

          <div className={styles.statCard}>
            <span>Off-Peak Window</span>
            <strong>{loadStats.offPeakWindow}</strong>
          </div>
        </div>
      )}
    </section>
  );
}

function TrendArrow({ value }) {
  const color = value > 0 ? '#ef4444' : '#22c55e';
  return <span style={{ color, fontSize: '12px', margin: 0 }}>{value > 0 ? '+' : '-'}</span>;
}

function TrendText({ value, suffix }) {
  if (Math.abs(value) < 0.1) return <div style={{ height: '14px' }} />;
  const color = value > 0 ? '#ef4444' : '#22c55e';
  const prefix = value > 0 ? '+' : '';
  return (
    <div style={{ fontSize: '10px', color, marginTop: '2px' }}>
      {prefix}{Math.round(value)}{suffix} from last hr
    </div>
  );
}
