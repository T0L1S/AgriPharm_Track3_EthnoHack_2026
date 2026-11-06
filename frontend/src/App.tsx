import { useState, useEffect } from 'react';

// UI imports
import { Card } from '@/components/tremor/Card';
import { ThemeToggle } from '@/components/ThemeToggle';

import { PlanComparison } from '@/components/sections/PlanComparison';
import { Drought } from '@/components/sections/Drought';
import { SowingArea } from '@/components/sections/SowingArea';
import { Stochastic } from '@/components/sections/Stochastic';
import { BackTesting } from '@/components/sections/BackTesting';
import { Sweep } from '@/components/sections/Sweep';
import { Field } from '@/components/Field';

import './App.css';

function App() {
  const [config, setConfig] = useState<any>(null);
  const [sweepData, setSweepData] = useState<any>(null);
  const [runData, setRunData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Νέο state για το Available Land
  const [currentLand, setCurrentLand] = useState<number>(100);

  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRun = async (landValue: number, currentWeights = {}, regionName?: string) => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          land: landValue, 
          weights: currentWeights, 
          region: regionName 
        })
      });
      if (!response.ok) throw new Error('An error occured during the simulation');
      const data = await response.json();
      setRunData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [configRes, sweepRes] = await Promise.all([
          fetch('/api/config'),
          fetch('/api/sweep', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weights: {} }), 
          }),
        ]);

        if (!configRes.ok || !sweepRes.ok) {
          throw new Error('An error occured while fetching the data');
        }

        const [configData, sweepResult] = await Promise.all([
          configRes.json(),
          sweepRes.json(),
        ]);

        setConfig(configData);
        setSweepData(sweepResult.points); 
        
        // Αρχικοποίηση του currentLand από το config
        setCurrentLand(configData.land);
        
        await fetchRun(configData.land, {}, configData.default_region);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 sm:p-8 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50">
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/80 dark:border-slate-800/80 bg-white/75 dark:bg-slate-950/75 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Agri<span className="lora-font">Pharm</span>
          </h1>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/T0L1S/AgriPharm_Track3_EthnoHack_2026"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
              className="p-2 rounded-md border border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50 transition-colors"
            >
              <svg
                className="size-5"
                viewBox="0 0 1024 1024"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M692.906667 938.666667a42.666667 42.666667 0 0 1-42.666667-42.666667v-110.933333a91.733333 91.733333 0 0 0-23.04-70.826667 42.666667 42.666667 0 0 1 26.026667-71.253333C757.333333 630.613333 853.333333 597.333333 853.333333 416.853333a170.666667 170.666667 0 0 0-28.586666-94.72 117.333333 117.333333 0 0 1-17.493334-87.893333 158.293333 158.293333 0 0 0 0-60.16 326.4 326.4 0 0 0-89.173333 46.506667 42.666667 42.666667 0 0 1-35.84 6.4 433.066667 433.066667 0 0 0-235.52 0 42.666667 42.666667 0 0 1-35.84-6.4 315.733333 315.733333 0 0 0-90.026667-46.506667 150.186667 150.186667 0 0 0 0 60.16 121.173333 121.173333 0 0 1-18.346666 88.746667 173.653333 173.653333 0 0 0-28.586667 95.146666c0 165.973333 80.213333 210.346667 200.533333 225.706667a42.666667 42.666667 0 0 1 34.986667 28.16 42.666667 42.666667 0 0 1-8.96 42.666667 87.893333 87.893333 0 0 0-23.466667 66.56V896a42.666667 42.666667 0 0 1-85.333333 0v-24.32a256 256 0 0 1-224.853333-89.173333 166.4 166.4 0 0 0-49.493334-37.546667 42.666667 42.666667 0 1 1 21.333334-82.773333 210.346667 210.346667 0 0 1 85.333333 58.026666c42.666667 42.666667 85.333333 80.213333 166.4 64.853334a165.973333 165.973333 0 0 1 9.813333-67.413334c-87.893333-22.186667-213.333333-85.333333-213.333333-298.666666a256 256 0 0 1 42.666667-142.08 36.266667 36.266667 0 0 0 5.546666-26.453334 242.773333 242.773333 0 0 1 14.08-136.96 42.666667 42.666667 0 0 1 26.88-24.32c14.506667-4.266667 66.56-12.8 165.12 51.2a518.826667 518.826667 0 0 1 242.773334 0c98.56-64 150.613333-55.893333 164.693333-51.2a42.666667 42.666667 0 0 1 26.88 24.32 243.626667 243.626667 0 0 1 14.08 137.386667 32 32 0 0 0 4.693333 24.32 256 256 0 0 1 42.666667 142.506667c0 216.32-124.586667 279.04-213.333333 298.666666a182.613333 182.613333 0 0 1 9.386666 71.253334V896a42.666667 42.666667 0 0 1-40.106666 42.666667z" />
              </svg>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <Card className="sm:mx-auto max-w-7xl p-6 sm:p-10">
        <div className="space-y-24">
          {runData && runData.sim && runData.lp && (
            <Field 
              simulationData={runData.sim} 
              plantsConfig={config?.plants} 
              lpCoverage={runData.lp.coverage} 
              currentLand={currentLand}
              onLandChange={(newLand) => {
                setCurrentLand(newLand);
                fetchRun(newLand, {}, config?.default_region);
              }}
              isLoading={isRunning}
            />
          )}

          <PlanComparison />
          <Drought />
          <SowingArea />
          <Stochastic />
          <BackTesting />

          {sweepData && sweepData.length > 0 && (
            <Sweep data={sweepData} />
          )}
        </div>
      </Card>
    </main>
  );
}

export default App;