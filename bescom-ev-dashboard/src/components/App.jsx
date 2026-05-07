import { useEffect, useMemo, useReducer, useState } from 'react';
import { CHARGING_STATIONS, HOURLY_LOAD_PROFILES, RECOMMENDED_LOCATIONS } from '../data/bangalore_ev_data';
import { useAlgorithms } from '../hooks/useAlgorithms';
import { useLoadData } from '../hooks/useLoadData';
import { summarizeBuildoutImpact } from '../utils/buildoutImpact';
import TopBar from './TopBar';
import MapView from './MapView';
import ControlPanel from './ControlPanel';
import MethodsPanel from './MethodsPanel/MethodsPanel';

const initialPlannerState = { priority: 'all', sortBy: 'demand_score' };

function plannerReducer(state, action) {
  if (action.type === 'priority') return { ...state, priority: action.value };
  if (action.type === 'sort') return { ...state, sortBy: action.value };
  return state;
}

export default function App() {
  const [mode, setMode] = useState(0);
  const [vizMode, setVizMode] = useState('heatmap');
  const [panelOpen, setPanelOpen] = useState(false);
  const [hour, setHour] = useState(18);
  const [comparisonView, setComparisonView] = useState('before');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [plannerState, dispatchPlanner] = useReducer(plannerReducer, initialPlannerState);
  const loadData = useLoadData(CHARGING_STATIONS, HOURLY_LOAD_PROFILES, hour);
  const algorithms = useAlgorithms(CHARGING_STATIONS, HOURLY_LOAD_PROFILES, RECOMMENDED_LOCATIONS);


  const plannerSites = useMemo(() => {
    const filtered = plannerState.priority === 'all'
      ? algorithms.scoringResults
      : algorithms.scoringResults.filter((site) => site.priority === plannerState.priority);
    return [...filtered].sort((a, b) => b[plannerState.sortBy] - a[plannerState.sortBy]);
  }, [algorithms.scoringResults, plannerState]);

  const plannerStats = useMemo(() => ({
    total: plannerSites.length,
    high: plannerSites.filter((site) => site.priority === 'high').length,
    sessions: plannerSites.reduce((sum, site) => sum + site.projected_daily_sessions, 0),
    avgScore: plannerSites.reduce((sum, site) => sum + site.demand_score, 0) / Math.max(1, plannerSites.length)
  }), [plannerSites]);

  const selectedCandidates = useMemo(() => {
    const selectedIds = new Set(selectedCandidateIds);
    return algorithms.scoringResults.filter((site) => selectedIds.has(site.id));
  }, [algorithms.scoringResults, selectedCandidateIds]);

  const impactStats = useMemo(() => {
    const addedCapacity = selectedCandidates.reduce((sum, site) => sum + site.recommended_capacity_kw, 0);
    const projectedSessions = selectedCandidates.reduce((sum, site) => sum + site.projected_daily_sessions, 0);
    const weightedGap = selectedCandidates.reduce((sum, site) => sum + site.factors.gap_km * site.projected_daily_sessions, 0);
    const avgGapAddressed = weightedGap / Math.max(1, projectedSessions);
    const peakReliefKw = Math.round(addedCapacity * 0.54);
    const queueReliefMinutes = Math.min(32, Math.round(projectedSessions / 24));
    return {
      selected: selectedCandidates.length,
      addedCapacity,
      projectedSessions,
      avgGapAddressed,
      peakReliefKw,
      queueReliefMinutes
    };
  }, [selectedCandidates]);

  const buildoutStats = useMemo(
    () => summarizeBuildoutImpact(loadData.stationsWithLoad, algorithms.scoringResults, hour),
    [loadData.stationsWithLoad, algorithms.scoringResults, hour]
  );

  const toggleCandidate = (site) => {
    setSelectedCandidateIds((ids) => (
      ids.includes(site.id) ? ids.filter((id) => id !== site.id) : [...ids, site.id]
    ));
  };

  return (
    <div className="appShell">
      <TopBar mode={mode} onModeChange={setMode} stationCount={CHARGING_STATIONS.length} />
      <main>
        <div className={`mapStage ${mode === 2 ? 'mapHidden' : ''}`}>
          <MapView
            mode={mode}
            stationsWithLoad={loadData.stationsWithLoad}
            recommendedSites={plannerSites}
            vizMode={vizMode}
            hour={hour}
            panelOpen={panelOpen}
            setPanelOpen={setPanelOpen}
            selectedCandidateIds={selectedCandidateIds}
            onCandidateToggle={toggleCandidate}
            comparisonView={comparisonView}
            plannedBuildoutSites={algorithms.scoringResults}
          />
          {mode === 0 && vizMode === 'heatmap' && (
            <div className="comparisonSwitcher" aria-label="Buildout comparison">
              {['before', 'after'].map((view) => (
                <button
                  key={view}
                  className={comparisonView === view ? 'active' : ''}
                  onClick={() => setComparisonView(view)}
                >
                  {view === 'before' ? 'Before' : 'After Buildout'}
                </button>
              ))}
            </div>
          )}
          <div className={`vizSwitcher ${panelOpen ? 'panelOpen' : ''}`}>
            {['heatmap', 'hex'].map(m => (
              <button 
                key={m} 
                className={vizMode === m ? 'active' : ''} 
                onClick={() => setVizMode(m)}
              >
                {m === 'heatmap' ? 'Heatmap' : 'Hex Grid'}
              </button>
            ))}
          </div>
          {mode < 2 && (
            <ControlPanel
              mode={mode}
              hour={hour}
              setHour={setHour}
              loadStats={loadData}
              plannerState={plannerState}
              dispatchPlanner={dispatchPlanner}
              plannerStats={plannerStats}
              selectedCandidates={selectedCandidates}
              impactStats={impactStats}
              onClearCandidates={() => setSelectedCandidateIds([])}
              comparisonView={comparisonView}
              buildoutStats={buildoutStats}
            />
          )}
        </div>
        <MethodsPanel
          active={mode === 2}
          stations={CHARGING_STATIONS}
          loadProfiles={HOURLY_LOAD_PROFILES}
          recommendedLocations={RECOMMENDED_LOCATIONS}
          algorithms={algorithms}
        />
      </main>
    </div>
  );
}
