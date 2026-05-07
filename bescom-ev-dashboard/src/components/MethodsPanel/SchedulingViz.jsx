import styles from '../../styles/Methods.module.css';

function formatHour(hour) {
  const h = hour % 24;
  return `${String(h % 12 || 12).padStart(2, '0')}:00 ${h >= 12 ? 'PM' : 'AM'}`;
}

const SEVERITY_STYLE = {
  critical: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'Critical' },
  elevated: { bg: 'rgba(249,115,22,0.1)', color: '#c2410c', label: 'Elevated' },
  moderate: { bg: 'rgba(234,179,8,0.1)', color: '#a16207', label: 'Moderate' },
  low: { bg: 'rgba(22,163,74,0.1)', color: '#15803d', label: 'Low' }
};

export default function SchedulingViz({ schedules, summary }) {
  if (!schedules || !summary) return null;

  const topSchedules = schedules.slice(0, 8);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <StatBox label="Network Peak Hour" value={`${summary.modePeakHour}:00`} />
        <StatBox label="Avg Shift Potential" value={`${summary.avgShiftPct}%`} />
        <StatBox label="Total Peak Relief" value={`${summary.totalReliefKw.toLocaleString()} kW`} />
        <StatBox label="Critical Stations" value={summary.criticalCount} critical={summary.criticalCount > 0} />
      </div>

      <table className={styles.scoringTable}>
        <thead>
          <tr>
            <th>Station</th>
            <th>Severity</th>
            <th>Avg Load</th>
            <th>Peak</th>
            <th>Off-Peak Window</th>
            <th>Shift %</th>
            <th>Relief</th>
          </tr>
        </thead>
        <tbody>
          {topSchedules.map((schedule) => {
            const sev = SEVERITY_STYLE[schedule.severity];
            return (
              <tr key={schedule.stationId}>
                <td style={{ fontWeight: 600, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {schedule.stationName}
                </td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                    background: sev.bg, color: sev.color
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                    {sev.label}
                  </span>
                </td>
                <td>{schedule.avgLoad}%</td>
                <td>{formatHour(schedule.peakHour)}</td>
                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                  {formatHour(schedule.offpeakStart)}–{formatHour(schedule.offpeakEnd + 1)}
                </td>
                <td style={{ fontWeight: 700, color: schedule.shiftPct > 25 ? '#dc2626' : '#15803d' }}>
                  {schedule.shiftPct}%
                </td>
                <td>{schedule.reliefKw} kW</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {summary.topActions.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
            Top Scheduling Actions
          </h3>
          {summary.topActions.map((action, i) => (
            <div key={i} style={{
              padding: '10px 14px', marginBottom: '8px',
              borderLeft: '3px solid var(--color-bescom-orange)',
              borderRadius: '0 6px 6px 0',
              background: 'rgba(249,115,22,0.05)',
              fontSize: '13px', lineHeight: '1.5'
            }}>
              <strong style={{ color: '#c2410c' }}>{action.station}</strong>
              <span style={{ color: '#94a3b8', margin: '0 8px' }}>→</span>
              <span style={{ color: '#334155' }}>{action.action}</span>
              <span style={{
                marginLeft: '10px', padding: '1px 6px', borderRadius: '4px',
                background: 'rgba(22,163,74,0.1)', color: '#15803d',
                fontSize: '11px', fontWeight: 700
              }}>{action.impact}</span>
            </div>
          ))}
        </div>
      )}
      <p className={styles.caption} style={{ marginTop: '14px' }}>
        Shift percentages represent the portion of peak-hour sessions that can feasibly be moved to off-peak
        windows via time-of-use pricing, smart charging APIs, or fleet scheduling agreements.
      </p>
    </div>
  );
}

function StatBox({ label, value, critical = false }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: '8px',
      background: '#f8fafc',
      border: '1px solid rgba(148,163,184,0.22)'
    }}>
      <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
        {label}
      </span>
      <strong style={{ fontSize: '18px', fontFamily: "'JetBrains Mono', monospace", color: critical ? '#dc2626' : '#0f172a' }}>
        {value}
      </strong>
    </div>
  );
}
