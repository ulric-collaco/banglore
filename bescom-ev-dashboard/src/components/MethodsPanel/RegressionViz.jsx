import styles from '../../styles/Methods.module.css';

const WIDTH = 560;
const HEIGHT = 280;
const PAD = 38;

function xScale(hour) {
  return PAD + (hour / 23) * (WIDTH - PAD * 2);
}

function yScale(load) {
  return HEIGHT - PAD - load * (HEIGHT - PAD * 2);
}

function pathFrom(values) {
  return values.map((value, hour) => `${hour === 0 ? 'M' : 'L'} ${xScale(hour)} ${yScale(value)}`).join(' ');
}

export default function RegressionViz({ station, profile, regression }) {
  const offStart = regression.offpeak_window.start;
  const offWidth = xScale(regression.offpeak_window.end) - xScale(offStart);
  const coefficientText = regression.coefficients.map((value) => value.toFixed(4));

  return (
    <div>
      <p className={styles.showing}>Showing: <strong>{station.name}</strong> <span>(station with highest peak load in dataset)</span></p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={styles.chart} role="img" aria-label="Polynomial regression load chart">
        <rect width={WIDTH} height={HEIGHT} rx="8" fill="#f8fafc" />
        <rect x={xScale(offStart)} y={PAD} width={offWidth} height={HEIGHT - PAD * 2} fill="#dcfce7" opacity="0.55" />
        <text x={xScale(offStart) + 8} y={PAD + 16} fill="#16a34a">Recommended off-peak</text>
        {[0.2, 0.4, 0.6, 0.8, 1].map((tick) => (
          <g key={tick}>
            <line x1={PAD} y1={yScale(tick)} x2={WIDTH - PAD} y2={yScale(tick)} />
            <text x={8} y={yScale(tick) + 4}>{tick.toFixed(1)}</text>
          </g>
        ))}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => <text key={hour} x={xScale(hour) - 8} y={HEIGHT - 12}>{String(hour).padStart(2, '0')}</text>)}
        <path d={pathFrom(profile.hourly)} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
        {profile.hourly.map((value, hour) => <circle key={hour} cx={xScale(hour)} cy={yScale(value)} r="3" fill="#94a3b8" />)}
        <path d={pathFrom(regression.predicted)} fill="none" stroke="#16a34a" strokeWidth="2.5" />
        <line x1={xScale(regression.peak_hour)} y1={PAD} x2={xScale(regression.peak_hour)} y2={HEIGHT - PAD} className={styles.peakLine} />
        <text x={xScale(regression.peak_hour) + 6} y={PAD + 14} fill="#ef4444">Peak: {regression.peak_hour}:00</text>
        <g className={styles.chartLegend}>
          <circle cx="392" cy="24" r="4" fill="#94a3b8" /><text x="402" y="28">Actual</text>
          <line x1="460" y1="24" x2="482" y2="24" stroke="#16a34a" strokeWidth="2.5" /><text x="490" y="28">Fitted curve</text>
        </g>
      </svg>
      <pre className={styles.equation}>{`f(x) = beta0 + beta1x + beta2x^2 + beta3x^3
     = ${coefficientText[0]} + ${coefficientText[1]}x + ${coefficientText[2]}x^2 + ${coefficientText[3]}x^3
R2 = ${regression.r_squared.toFixed(3)}   (goodness of fit)`}</pre>
    </div>
  );
}
