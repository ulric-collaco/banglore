import { useEffect, useMemo, useReducer, useState } from 'react';
import { CHARGING_STATIONS, HOURLY_LOAD_PROFILES, RECOMMENDED_LOCATIONS } from '../data/bangalore_ev_data';
import { useAlgorithms } from '../hooks/useAlgorithms';
import { useLoadData } from '../hooks/useLoadData';
import TopBar from './TopBar';
import MapView from './MapView';
import ControlPanel from './ControlPanel';
import LegendPanel from './LegendPanel';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [plannerState, dispatchPlanner] = useReducer(plannerReducer, initialPlannerState);
  const loadData = useLoadData(CHARGING_STATIONS, HOURLY_LOAD_PROFILES, hour);
  const algorithms = useAlgorithms(CHARGING_STATIONS, HOURLY_LOAD_PROFILES, RECOMMENDED_LOCATIONS);

  useEffect(() => {
    if (!isPlaying || mode !== 0) return undefined;
    const timer = setInterval(() => setHour((value) => (value + 1) % 24), 800);
    return () => clearInterval(timer);
  }, [isPlaying, mode]);

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
          />
          <div className={`vizSwitcher ${panelOpen ? 'panelOpen' : ''}`}>
            {['heatmap', 'hex', 'coverage'].map(m => (
              <button 
                key={m} 
                className={vizMode === m ? 'active' : ''} 
                onClick={() => setVizMode(m)}
              >
                {m === 'heatmap' ? 'Heatmap' : m === 'hex' ? 'Hex Grid' : 'Coverage'}
              </button>
            ))}
          </div>
          <LegendPanel mode={mode} vizMode={vizMode} />
          {mode < 2 && (
            <ControlPanel
              mode={mode}
              hour={hour}
              setHour={setHour}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              loadStats={loadData}
              plannerState={plannerState}
              dispatchPlanner={dispatchPlanner}
              plannerStats={plannerStats}
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
