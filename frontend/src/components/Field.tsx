import React, { useState, useMemo } from 'react';
import { Slider } from '@/components/tremor/Slider';
import { Divider } from '@/components/tremor/Divider';
import { BarList } from '@/components/tremor/BarList';

interface FieldProps {
  simulationData: any; 
  plantsConfig: any;   
  lpCoverage: number;
  currentLand: number; 
  onLandChange: (land: number) => void; 
  isLoading?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CROP_COLORS: Record<string, { bg: string, text: string }> = {
  'echinacea': { bg: 'bg-emerald-500', text: 'text-emerald-400' },
  'thyme': { bg: 'bg-lime-400', text: 'text-lime-300' },
  "chamomile": { bg: 'bg-purple-500', text: 'text-purple-400' },
  'valerian': { bg: 'bg-amber-400', text: 'text-amber-300' },
  'hypericum': { bg: 'bg-rose-500', text: 'text-rose-400' },
  'milk_thistle': { bg: 'bg-sky-400', text: 'text-sky-300' },
};

export const Field: React.FC<FieldProps> = ({ 
  simulationData, 
  // plantsConfig, 
  lpCoverage, 
  currentLand, 
  onLandChange,
  isLoading = false 
}) => {
  const [currentMonth, setCurrentMonth] = useState<number>(3);
  const [selectedYear, setSelectedYear] = useState<number>(3);

  const activeCrops = useMemo(() => {
    if (!simulationData || !simulationData.parcels) return [];

    const stepsPerMonth = simulationData.steps_per_month || 4; 
    const absoluteMonth = (selectedYear - 1) * 12 + currentMonth; 
    const stepToRead = absoluteMonth * stepsPerMonth; 

    const rawCrops: any[] = [];
    const parcelKeys = Object.keys(simulationData.parcels);
    
    if (parcelKeys.length === 0) return [];

    // 1. Βρίσκουμε το συνολικό μέγεθος του πίνακα (π.χ. 100 ή 1200)
    let fieldSize = 0;
    parcelKeys.forEach(key => {
        const arr = simulationData.parcels[key]?.cells?.[stepToRead];
        if (arr && arr.length > fieldSize) {
            fieldSize = arr.length;
        }
    });
    if (fieldSize === 0) fieldSize = 100;

    // 2. Μετράμε τα ακατέργαστα (raw) ενεργά κελιά για κάθε φυτό
    let totalRawActive = 0;
    
    parcelKeys.forEach((name) => {
      const cells = simulationData.parcels[name]?.cells?.[stepToRead];
      if (cells && Array.isArray(cells)) {
        // Αγνοούμε το -1 (fallow) και το 0 (empty state)
        const activeApiTiles = cells.filter((val: number) => val !== -1 && val !== 0).length;
        
        if (activeApiTiles > 0) {
          const colors = CROP_COLORS[name] || { bg: 'bg-blue-500', text: 'text-blue-400' };
          rawCrops.push({ name, activeApiTiles, color: colors.bg, textColor: colors.text });
          totalRawActive += activeApiTiles;
        }
      }
    });

    // 3. ΚΑΝΟΝΙΚΟΠΟΙΗΣΗ: Αν ο solver δίνει άθροισμα που υπερβαίνει τη γη, το προσαρμόζουμε (scale down)
    const scaleFactor = totalRawActive > fieldSize ? (fieldSize / totalRawActive) : 1;

    const currentCrops = rawCrops.map(crop => {
      // Υπολογίζουμε τα νέα, κανονικοποιημένα κελιά
      const normalizedTiles = crop.activeApiTiles * scaleFactor;
      const ratio = normalizedTiles / fieldSize;
      
      return {
        name: crop.name,
        visualTiles: Math.round(ratio * 100), // Αναγωγή στα 100 τετράγωνα του UI Grid
        stremmas: Math.round(ratio * currentLand), // Αναγωγή στα πραγματικά στρέμματα βάσει του slider
        color: crop.color,
        textColor: crop.textColor
      };
    });

    return currentCrops;
  }, [simulationData, currentMonth, selectedYear, currentLand]);

  // Πραγματικά νούμερα για τα κείμενα (legend)
  const occupiedStremmas = activeCrops.reduce((acc, c) => acc + c.stremmas, 0);
  const fallowStremmas = Math.max(0, currentLand - occupiedStremmas);

  // Διασφαλίζουμε ότι η ποσοστιαία χρήση δεν ξεπερνά το 100%
  const usedPercentage = currentLand > 0 ? Math.min(100, Math.round((occupiedStremmas / currentLand) * 100)) : 0;

  // Κατασκευή των 100 Visual Tiles (τετραγωνάκια) για το Grid
  let occupiedVisualTiles = 0;
  const gridCells: { name: string; color: string }[] = [];
  
  activeCrops.forEach((crop) => {
    // Math.min για αποφυγή υπέρβασης των 100 κελιών λόγω στρογγυλοποιήσεων
    const tilesToPush = Math.min(crop.visualTiles, 100 - occupiedVisualTiles);
    for (let i = 0; i < tilesToPush; i++) {
      gridCells.push({ name: crop.name, color: crop.color });
    }
    occupiedVisualTiles += tilesToPush;
  });

  // Συμπλήρωση με Fallow tiles μέχρι να γίνουν ακριβώς 100
  const fallowVisualTiles = Math.max(0, 100 - occupiedVisualTiles);
  for (let i = 0; i < fallowVisualTiles; i++) {
    gridCells.push({ 
      name: 'Fallow / Idle', 
      color: 'bg-gray-200/50 dark:bg-slate-800/40 border border-gray-300/30 dark:border-slate-700/30' 
    });
  }

  return (
    <div className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-900/30 backdrop-blur-md shadow-sm dark:shadow-xl border border-slate-800/80 bg-slate-900/40 ring-1 ring-white/5 overflow-hidden">
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-950/50 backdrop-blur-sm transition-all duration-300">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
            <div className="w-5 h-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Running simulation...
            </span>
          </div>
        </div>
      )}

      <div className={`p-6 sm:p-8 transition-all duration-300 ${isLoading ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
        
        {/* Header and Live Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                Arable Land Allocation Simulator
              </h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                Visualizing active medicinal plot sowing across the annual cycle. (1 tile = {Math.max(1, Math.round(currentLand / 100))} stremmas)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-gray-200/50 dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-700">
              {[1, 2, 3].map((year) => (
                <button 
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    selectedYear === year 
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-emerald-600 dark:text-emerald-400' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Year {year}
                </button>
              ))}
            </div>

            <span className="px-3 py-1.5 font-mono text-sm font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tabular-nums">
              {MONTH_NAMES[currentMonth]}
            </span>
          </div>
        </div>

        <Divider></Divider>

        {/* Slider για Available Land */}
        <div className="space-y-3 mb-8 bg-gray-50 dark:bg-slate-950/40 p-4 rounded-xl border border-gray-200 dark:border-slate-800/60">
          <div className="flex items-center justify-between text-sm text-gray-700 dark:text-slate-300 font-medium">
            <span>Available Land (Stremmas)</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
              {currentLand}
            </span>
          </div>

          <Slider
            value={[currentLand]}
            onValueChange={(val: number[]) => {
              onLandChange(val[0]);
            }}
            min={100}
            max={2000} 
            step={100}
            aria-label="Available Land Selector"
            className="w-full"
          />
        </div>

        {/* Main Grid & Side Legend Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-7 bg-gray-50 dark:bg-slate-950/60 p-4 rounded-xl border border-gray-200 dark:border-slate-800/70 shadow-inner flex justify-center">
            <div className="grid grid-cols-10 gap-1.5 w-full aspect-square max-w-[450px]">
              {gridCells.map((cell, idx) => (
                <div
                  key={idx}
                  title={`${cell.name} (Tile #${idx + 1})`}
                  className={`w-full h-full rounded-[3px] transition-all duration-300 ease-out hover:scale-110 hover:z-10 cursor-pointer ${cell.color}`}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6">
            <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800/50">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400 mb-4">
                Active Crops ({MONTH_NAMES[currentMonth]} - Yr {selectedYear})
              </h3>
              <div className="space-y-3">
                {activeCrops.map((crop) => (
                  <div key={crop.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3.5 h-3.5 rounded-sm shadow-sm ${crop.color}`} />
                      <span className="text-gray-700 dark:text-slate-200 font-medium">{crop.name}</span>
                    </div>
                    <span className={`font-mono text-xs font-semibold tabular-nums ${crop.textColor}`}>
                      {crop.stremmas} stremmas
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm pt-3 mt-1 border-t border-gray-200 dark:border-slate-800/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-sm bg-gray-200 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 shadow-sm" />
                    <span className="text-gray-500 dark:text-slate-400 font-medium">Fallow / Available</span>
                  </div>
                  <span className="font-mono text-xs text-slate-500 tabular-nums font-medium">
                    {fallowStremmas} stremmas
                  </span>
                </div>
              </div>
            </div>

            {simulationData?.by_year && lpCoverage !== undefined && (
              <div className="p-4 rounded-xl bg-gray-100 dark:bg-slate-950/40 border border-gray-200 dark:border-slate-800/60 mt-auto">
                <h3 className="font-bold text-sm text-gray-700 dark:text-slate-300">
                  Arable land in use: <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400">{usedPercentage}%</span>
                </h3>
                
                <h3 className="font-bold text-xs text-gray-500 dark:text-slate-400 mt-5 uppercase tracking-wider">Coverage by year</h3>
                <BarList 
                  data={simulationData.by_year.map((year: any, index: number) => ({
                    name: `Year ${index + 1}`,
                    value: Math.round(year.coverage * 100)
                  }))}
                  valueFormatter={(value: number) => `${value}%`}
                  className="mt-3"
                />

                <p className="mt-4 text-xs text-gray-400 leading-relaxed">
                  Starting from an empty field, the simulations's {Math.round(lpCoverage * 100)}% coverage is achieved in year {simulationData.by_year.length}.
                </p>
              </div>
            )}
          </div>
        </div>

        <Divider></Divider>

        {/* Tremor Timeline Slider & Month Clickables */}
        <div className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 font-mono font-medium px-1">
              <span>Crop Calendar Timeline</span>
              <span className="text-emerald-500 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded">
                {MONTH_NAMES[currentMonth]}
              </span>
            </div>

            <Slider
              value={[currentMonth]}
              onValueChange={(val: number[]) => {
                setCurrentMonth(val[0]);
              }}
              min={0}
              max={11}
              step={1}
              aria-label="Simulation Month Selector"
              className="w-full"
            />

            <div className="flex justify-between text-[11px] font-mono text-gray-400 dark:text-slate-500 pt-1 px-1">
              {MONTH_NAMES.map((m, idx) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCurrentMonth(idx)}
                  className={`cursor-pointer transition-colors focus:outline-none ${
                    currentMonth === idx 
                      ? 'text-emerald-500 dark:text-emerald-400 font-bold scale-110' 
                      : 'hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};