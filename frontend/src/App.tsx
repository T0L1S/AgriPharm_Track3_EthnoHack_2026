import { useState, useEffect, useRef } from 'react';

import { 
  Accordion, 
  AccordionItem, 
  AccordionTrigger, 
  AccordionContent 
} from "@/components/tremor/Accordion";

import { Card } from '@/components/tremor/Card';
import { Badge } from "@/components/tremor/Badge"

import { ThemeToggle } from '@/components/ThemeToggle';
import { Hero } from '@/components/sections/Hero';
import { PlanComparison } from '@/components/sections/PlanComparison';
import { Drought } from '@/components/sections/Drought';
import { Stochastic } from '@/components/sections/Stochastic';
import { BackTesting } from '@/components/sections/BackTesting';
import { MLForecast } from '@/components/sections/Forecast';
import { Sweep } from '@/components/sections/Sweep';
import { Field } from '@/components/sections/Field';

import './App.css';

function App() {
  const [config, setConfig] = useState<any>(null);
  const [sweepData, setSweepData] = useState<any>(null);
  const [runData, setRunData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentLand, setCurrentLand] = useState<number>(500);
  const [currentWeights, setCurrentWeights] = useState<Record<string, number>>({});

  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Added ref to track the active simulation request
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRun = async (landValue: number, weights: Record<string, number> = {}, regionName?: string) => {
    // If there is an ongoing request, abort it before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new controller for the current request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsRunning(true);
    setError(null); 
    
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          land: landValue, 
          weights: weights, 
          region: regionName 
        }),
        signal: controller.signal // Attach the abort signal to the fetch request
      });
      
      if (!response.ok) throw new Error('An error occurred during the simulation');
      
      const data = await response.json();
      setRunData(data);
    } catch (err: any) {
      // Ignore AbortErrors (they are intentional when a newer request is fired)
      if (err.name === 'AbortError') {
        console.log(`Aborted stale /api/run request for ${landValue} stremmata.`);
        return;
      }
      console.error(err);
      setError(err.message || 'Failed to connect to the simulation engine.');
    } finally {
      // Only set isRunning to false if THIS request is still the active one
      // (prevents aborted requests from disabling the loading overlay for new requests)
      if (abortControllerRef.current === controller) {
        setIsRunning(false);
      }
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
        setCurrentLand(configData.land);

        // NEW: Extract true default weights from backend config for all plants
        const initialWeights: Record<string, number> = {};
        if (configData.plants) {
          Object.keys(configData.plants).forEach(key => {
            initialWeights[key] = configData.plants[key].weight ?? 1;
          });
        }
        setCurrentWeights(initialWeights);
        
        // Pass the fully populated weights to the first simulation run
        await fetchRun(configData.land, initialWeights, configData.default_region);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 sm:p-8 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50">
        {/* Navbar Skeleton */}
        <header className="sticky top-0 z-50 w-full border-b border-gray-200/80 dark:border-slate-800/80 bg-white/75 dark:bg-slate-950/75 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 mb-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-slate-800/60 rounded-md"></div>
          <div className="h-8 w-16 bg-gray-200 dark:bg-slate-800/60 rounded-md"></div>
        </header>

        {/* Hero Section Skeleton */}
        <div className="relative overflow-hidden py-12 sm:py-16 text-center max-w-4xl mx-auto px-4 animate-pulse mb-4">
          <div className="inline-flex h-6 w-32 bg-gray-200 dark:bg-slate-800/60 rounded-full mb-6"></div>
          <div className="h-16 sm:h-20 w-3/4 mx-auto bg-gray-200 dark:bg-slate-800/60 rounded-xl mb-6"></div>
          <div className="h-6 w-2/3 mx-auto bg-gray-200 dark:bg-slate-800/40 rounded-lg mb-8"></div>
          <div className="flex justify-center gap-6">
            <div className="h-4 w-40 bg-gray-200 dark:bg-slate-800/50 rounded-full"></div>
            <div className="h-4 w-40 bg-gray-200 dark:bg-slate-800/50 rounded-full"></div>
            <div className="h-4 w-40 bg-gray-200 dark:bg-slate-800/50 rounded-full"></div>
          </div>
        </div>
        
        {/* Main Content Skeleton */}
        <div className="max-w-7xl mx-auto p-6 sm:p-10 border border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-900/30 rounded-[2rem] shadow-sm">
          <div className="space-y-24 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 flex flex-col gap-6 pt-4">
                <div className="h-8 bg-gray-200 dark:bg-slate-800/60 rounded-md w-3/4"></div>
                <div className="h-5 bg-gray-200 dark:bg-slate-800/50 rounded w-1/2"></div>
                <div className="space-y-3 mt-4">
                  <div className="h-4 bg-gray-200 dark:bg-slate-800/40 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-800/40 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-800/40 rounded w-4/5"></div>
                </div>
              </div>
              <div className="lg:col-span-7 h-[380px] bg-gray-200 dark:bg-slate-800/50 rounded-2xl"></div>
            </div>
            {/* Omitted other skeleton sections for brevity but they remain identical */}
          </div>
        </div>
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

      <Hero />

      <Card className="sm:mx-auto max-w-7xl p-6 sm:p-10">
        <div className="space-y-24">
          <MLForecast />

          {error ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-center min-h-[300px]">
              <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Simulation Engine Unavailable</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md">
                We couldn't connect to the backend solver. You can still explore the rest of the static reports and analyses on this page.
              </p>
              <div className="mt-4 px-3 py-2 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 rounded-md">
                <code className="text-xs text-red-600 dark:text-red-400">{error}</code>
              </div>
              <button 
                onClick={() => fetchRun(currentLand, currentWeights, config?.default_region)}
                className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : runData && runData.sim && runData.lp ? (
            <Field 
              simulationData={runData.sim} 
              plantsConfig={config?.plants} 
              lpCoverage={runData.lp.coverage} 
              currentLand={currentLand}
              onLandChange={(newLand) => {
                setCurrentLand(newLand);
                fetchRun(newLand, currentWeights, config?.default_region);
              }}
              initialWeights={currentWeights}
              onWeightsChange={(newWeights) => {
                console.log(newWeights);
                setCurrentWeights(newWeights);
                fetchRun(currentLand, newWeights, config?.default_region);
              }}
              isLoading={isRunning}
            />
          ) : null}

          <PlanComparison comparisonData={runData?.comparison} />
          <Drought droughtData={runData?.drought_test} />
          
          <div className="pt-10 border-t border-gray-200 dark:border-slate-800/80">
            <div className="mb-6">
              <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Extended Model Verification & Stress Tests
              </h3>
              <p className="text-base text-slate-600 dark:text-slate-300 mt-1">
                Mathematical sensitivity sweeps, scenario probability distributions, and retrospective replays.
              </p>
            </div>

            <Accordion type="multiple" className="space-y-4">
              <AccordionItem value="stochastic">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      Stochastic Optimization Analysis
                    </span>
                    <Badge variant="neutral" className="text-xs">Stochastic LP</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Stochastic stochasticData={runData?.stochastic_optimization} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="backtesting">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      12-Year Historical Back-Testing
                    </span>
                    <Badge variant="neutral" className="text-xs">Validation</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <BackTesting data={runData?.back_testing} />
                </AccordionContent>
              </AccordionItem>

              {sweepData && sweepData.length > 0 && (
                <AccordionItem value="sweep">
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Arable Land Sensitivity Sweep
                      </span>
                      <Badge variant="neutral" className="text-xs">Parametric</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Sweep data={sweepData} />
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </div>
      </Card>
    </main>
  );
}

export default App;