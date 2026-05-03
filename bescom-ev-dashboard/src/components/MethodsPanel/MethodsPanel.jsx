import AlgoCard from './AlgoCard';
import KMeansViz from './KMeansViz';
import RegressionViz from './RegressionViz';
import ScoringViz from './ScoringViz';
import styles from '../../styles/Methods.module.css';

export default function MethodsPanel({ active, stations, loadProfiles, algorithms }) {
  const featuredStation = stations[algorithms.featuredStationIndex];
  const featuredProfile = loadProfiles[algorithms.featuredStationIndex];
  const featuredRegression = algorithms.regressionResults[algorithms.featuredStationIndex];

  return (
    <section className={`${styles.methodsPanel} ${active ? styles.active : ''}`} aria-hidden={!active}>
      <div className={styles.header}>
        <h1>Algorithmic Foundation</h1>
        <p>
          Three pure-JavaScript algorithms power BESCOM's EV decision layer - built without ML libraries to ensure full
          transparency and auditability.
        </p>
      </div>
      <AlgoCard
        badge="Clustering"
        title="K-Means Clustering"
        description="Groups existing stations by geography and average utilization so planners can reason about demand corridors instead of isolated chargers."
        inputLabel="Normalized latitude, longitude, average daily load"
        outputLabel={`${algorithms.k} clusters, centroids, inertia`}
        keyFinding="The strongest cluster concentrates in east and south-east commute corridors where high capacity stations still experience elevated evening load."
      >
        <KMeansViz stations={stations} loadProfiles={loadProfiles} algorithms={algorithms} />
      </AlgoCard>
      <AlgoCard
        badge="Regression"
        title="Polynomial Regression"
        description="Fits a degree-3 curve to station load profiles to smooth noise while preserving the morning ramp, daytime plateau, and evening peak."
        inputLabel="24 hourly load factors"
        outputLabel="Coefficients, R2, peak hour, off-peak window"
        keyFinding={`${featuredStation.name} has the highest modeled peak, with charging pressure cresting around ${featuredRegression.peak_hour}:00.`}
      >
        <RegressionViz station={featuredStation} profile={featuredProfile} regression={featuredRegression} />
      </AlgoCard>
      <AlgoCard
        badge="Scoring"
        title="Weighted Scoring Matrix"
        description="Ranks candidate locations with transparent, normalized factors for EV density, supply gap, grid headroom, population density, and road access."
        inputLabel="Raw candidate factors"
        outputLabel="Composite demand score"
        keyFinding={`${algorithms.scoringResults[0].zone} is the top candidate because strong EV density combines with a meaningful service gap and grid headroom.`}
      >
        <ScoringViz scoringResults={algorithms.scoringResults} />
      </AlgoCard>
    </section>
  );
}
