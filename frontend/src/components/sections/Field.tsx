import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/tremor/Badge';
import { Slider } from '@/components/tremor/Slider';
import { Divider } from '@/components/tremor/Divider';
import { BarList } from '@/components/tremor/BarList';

interface FieldProps {
  simulationData: any; 
  plantsConfig: any;   
  lpCoverage: number;
  currentLand: number; 
  onLandChange: (land: number) => void; 
  initialWeights?: Record<string, number>;
  onWeightsChange?: (weights: Record<string, number>) => void;
  isLoading?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CROP_COLORS: Record<string, { bg: string, text: string }> = {
  'gloriosa_superba_seed': { bg: 'bg-emerald-500', text: 'text-emerald-400' },
  'digitalis_lanata_leaf': { bg: 'bg-lime-400', text: 'text-lime-300' },
  "pilocarpus_microphyllus_leaf": { bg: 'bg-purple-500', text: 'text-purple-400' },
  'catharanthus_roseus_leaf': { bg: 'bg-amber-400', text: 'text-amber-300' },
  'atropa_belladonna_leaf': { bg: 'bg-rose-500', text: 'text-rose-400' },
  'artemisia_annua_leaf': { bg: 'bg-sky-400', text: 'text-sky-300' },
};

const PLANT_SPECIES_MAPPING: Record<string, string> = {
  'gloriosa_superba_seed': 'Gloriosa superba',
  'digitalis_lanata_leaf': 'Digitalis lanata',
  'pilocarpus_microphyllus_leaf': 'Pilocarpus microphyllus',
  'duboisia_hybrid_leaf': 'Duboisia myoporoides × D. leichhardtii',
  'atropa_belladonna_leaf': 'Atropa belladonna',
  'podophyllum_peltatum_leaf': 'Podophyllum peltatum',
  'artemisia_annua_leaf': 'Artemisia annua',
  'catharanthus_roseus_leaf': 'Catharanthus roseus',
  'plantago_ovata_husk': 'Plantago ovata'
};

function roundToTotal(values: number[], total: number): number[] {
  const floors = values.map((v) => Math.floor(v));
  let remaining = total - floors.reduce((acc, v) => acc + v, 0);
  const order = values
    .map((v, i) => ({ i, remainder: v - Math.floor(v) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] += 1;
    remaining -= 1;
  }
  return floors;
}

export const Field: React.FC<FieldProps> = ({ 
  simulationData, 
  plantsConfig,
  lpCoverage, 
  currentLand, 
  onLandChange,
  initialWeights = {},
  onWeightsChange,
  isLoading = false 
}) => {
  const [currentMonth, setCurrentMonth] = useState<number>(3);
  const [selectedYear, setSelectedYear] = useState<number>(2);
  const [isWeightsExpanded, setIsWeightsExpanded] = useState<boolean>(false);
  
  const [localLand, setLocalLand] = useState<number>(currentLand);
  const [localWeights, setLocalWeights] = useState<Record<string, number>>(initialWeights);

  useEffect(() => {
    setLocalLand(currentLand);
  }, [currentLand]);

  useEffect(() => {
    if (Object.keys(initialWeights).length > 0) {
      setLocalWeights(initialWeights);
    }
  }, [initialWeights]);

  const handleWeightChange = (plantKey: string, val: number) => {
    setLocalWeights(prev => ({ ...prev, [plantKey]: val }));
  };

  const handleApplyWeights = () => {
    if (onWeightsChange) {
      onWeightsChange(localWeights);
    }
  };

  const activeCrops = useMemo(() => {
    if (!simulationData || !simulationData.parcels) return [];

    const stepsPerMonth = simulationData.steps_per_month || 4; 
    const absoluteMonth = (selectedYear - 1) * 12 + currentMonth; 
    // Show the field as it is in the last week of the month, so crops sown during the month
    // appear as planted (crops harvested during the month already show as cleared).
    const stepToRead = absoluteMonth * stepsPerMonth + stepsPerMonth - 1; 

    const rawCrops: any[] = [];
    Object.keys(simulationData.parcels).forEach((name) => {
      const parcel = simulationData.parcels[name];
      const cells = parcel?.cells?.[stepToRead];
      if (cells && Array.isArray(cells)) {
        const plantedSquares = cells.filter((val: number) => val >= 0).length;
        const area = plantedSquares * (parcel.square_area ?? 0);
        if (area > 0) {
          const colors = CROP_COLORS[name] || { bg: 'bg-blue-500', text: 'text-blue-400' };
          rawCrops.push({ name, area, color: colors.bg, textColor: colors.text });
        }
      }
    });

    if (rawCrops.length === 0 || currentLand <= 0) return [];

    const occupiedShare = Math.min(1, rawCrops.reduce((acc, c) => acc + c.area, 0) / currentLand);
    const tiles = roundToTotal(rawCrops.map(c => (c.area / currentLand) * 100), Math.round(occupiedShare * 100));

    rawCrops.forEach((_, i) => {
      if (tiles[i] === 0) {
        const largest = tiles.indexOf(Math.max(...tiles));
        if (tiles[largest] > 1) {
          tiles[largest] -= 1;
          tiles[i] = 1;
        }
      }
    });

    const currentCrops = rawCrops.map((crop, i) => ({
      name: crop.name,
      visualTiles: tiles[i],
      stremmas: crop.area,
      color: crop.color,
      textColor: crop.textColor
    }));

    return currentCrops;
  }, [simulationData, currentMonth, selectedYear, currentLand]);

  const occupiedStremmas = activeCrops.reduce((acc, c) => acc + c.stremmas, 0);
  const fallowStremmas = Math.max(0, currentLand - occupiedStremmas);
  const usedPercentage = currentLand > 0 ? Math.min(100, Math.round((occupiedStremmas / currentLand) * 100)) : 0;

  let occupiedVisualTiles = 0;
  const gridCells: { name: string; color: string }[] = [];
  
  activeCrops.forEach((crop) => {
    const tilesToPush = Math.min(crop.visualTiles, 100 - occupiedVisualTiles);
    for (let i = 0; i < tilesToPush; i++) {
      gridCells.push({ 
        name: PLANT_SPECIES_MAPPING[crop.name] || crop.name, 
        color: crop.color 
      });
    }
    occupiedVisualTiles += tilesToPush;
  });

  const fallowVisualTiles = Math.max(0, 100 - occupiedVisualTiles);
  for (let i = 0; i < fallowVisualTiles; i++) {
    gridCells.push({ 
      name: 'Fallow / Idle', 
      color: 'bg-slate-200/50 dark:bg-slate-800/40 border border-slate-300/30 dark:border-slate-700/30' 
    });
  }

  const plantKeys = plantsConfig ? Object.keys(plantsConfig) : Object.keys(PLANT_SPECIES_MAPPING);

  const containerStyle = "relative rounded-2xl bg-white/60 dark:bg-slate-900/50 backdrop-blur-md shadow-xl ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={containerStyle}
    >
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-950/50 backdrop-blur-sm transition-all duration-300">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="w-5 h-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Running simulation for {localLand} stremmata...
            </span>
          </div>
        </div>
      )}

      <div className={`p-6 sm:p-8 transition-all duration-300 ${isLoading ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Interactive Simulator
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Visualizing active medicinal plot sowing across the annual cycle. (1 tile = {Math.max(1, Math.round(currentLand / 10) / 10)} stremmata)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-slate-200/50 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              {[1, 2, 3].map((year) => (
                <button 
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    selectedYear === year 
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-emerald-600 dark:text-emerald-400' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Year {year}
                </button>
              ))}
            </div>
            <Badge variant="success" className="font-semibold p-2">{MONTH_NAMES[currentMonth]}</Badge>
          </div>
        </div>

        <Divider />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-start">
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800/60 w-full h-full flex flex-col justify-center">
            <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300 font-medium">
              <div className="flex items-center gap-2">
                
                <div className="group relative flex items-center gap-1.5 cursor-help">
                  <span>Available Land (stremmata)</span>
                  <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">ⓘ</span>
                  
                  <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 opacity-0 transition-opacity group-hover:opacity-100 z-50 bg-slate-900 dark:bg-slate-100 text-slate-200 dark:text-slate-800 text-xs rounded-lg p-3 shadow-xl border border-slate-700 dark:border-slate-300 font-normal leading-relaxed">
                    <strong className="text-white dark:text-black block mb-1">What is a stremma?</strong>
                    A Greek unit of land area equal to:<br />
                    • 1,000 m² (0.1 hectares)<br />
                    • ~0.247 acres (approx. 1/4 acre)
                  </div>
                </div>

                {(localLand !== currentLand || isLoading) && (
                  <span className="text-xs text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-md font-semibold">
                    Results shown for {currentLand} stremmata
                  </span>
                )}
              </div>
              <Badge className="font-mono">{localLand}</Badge>
            </div>

            <Slider
              value={[localLand]}
              onValueChange={(val: number[]) => setLocalLand(val[0])}
              onValueCommit={(val: number[]) => onLandChange(val[0])}
              min={50}
              max={1500} 
              step={50}
              aria-label="Available Land Selector"
              className="w-full"
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/60 overflow-hidden">
            <button
              onClick={() => setIsWeightsExpanded(!isWeightsExpanded)}
              className="w-full flex items-center justify-between p-4 text-sm text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors focus:outline-none"
            >
              <span>Adjust Crop Weights (Priority)</span>
              <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-md">
                {isWeightsExpanded ? 'Hide' : 'Configure'}
              </span>
            </button>
            
            <AnimatePresence initial={false}>
              {isWeightsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 space-y-5 border-t border-slate-200/60 dark:border-slate-800/60 mt-2">
                    {/* Hiding scrollbars cross-browser using Tailwind arbitrary values */}
                    <div className="max-h-72 overflow-y-auto mt-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 px-1">
                        {plantKeys.map((plantKey) => {
                          const weight = localWeights[plantKey] ?? (plantsConfig?.[plantKey]?.weight ?? 1);
                          
                          return (
                            <div key={plantKey} className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                <span className="truncate pr-2">{PLANT_SPECIES_MAPPING[plantKey] || plantKey}</span>
                                <Badge className="font-mono text-[10px] py-0">{weight}</Badge>
                              </div>
                              <Slider
                                value={[weight]}
                                onValueChange={(val: number[]) => handleWeightChange(plantKey, val[0])}
                                min={0}
                                max={2}
                                step={0.1}
                                aria-label={`${PLANT_SPECIES_MAPPING[plantKey] || plantKey} Weight Selector`}
                                className="w-full"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <button
                      onClick={handleApplyWeights}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 active:scale-[0.98]"
                    >
                      Apply Weights
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mb-8 px-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-medium text-slate-500 dark:text-slate-400">
              <span>Crop calendar: pick a month</span>
              <Badge variant="success">{MONTH_NAMES[currentMonth]}</Badge>
            </div>

            <div className="pt-2 pb-2">
              <Slider
                value={[currentMonth]}
                onValueChange={(val: number[]) => {
                  setCurrentMonth(val[0]);
                }}
                min={0}
                max={11}
                step={1}
                aria-label="Simulation Month Selector"
                className="w-full relative z-10"
              />

              <div className="relative w-full h-6 mt-3">
                {MONTH_NAMES.map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    aria-label={m}
                    onClick={() => setCurrentMonth(idx)}
                    className={`absolute top-0 -translate-x-1/2 text-[11px] font-mono min-w-4 sm:min-w-8 flex justify-center cursor-pointer transition-colors focus:outline-none ${
                      currentMonth === idx 
                        ? 'text-emerald-700 dark:text-emerald-400 font-bold scale-125' 
                        : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    style={{ left: `${(idx / 11) * 100}%` }}
                  >
                    <span className="sm:hidden">{m.slice(0, 1)}</span>
                    <span className="hidden sm:inline">{m.slice(0, 3)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800/70 shadow-inner flex justify-center">
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
            <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-4">
                Active Crops ({MONTH_NAMES[currentMonth]} - Yr {selectedYear})
              </h3>
              <div className="space-y-3">
                {activeCrops.map((crop) => (
                  <div key={crop.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3.5 h-3.5 rounded-sm shadow-sm ${crop.color}`} />
                      <span className="text-slate-700 dark:text-slate-200 font-medium italic">
                        {PLANT_SPECIES_MAPPING[crop.name] || crop.name}
                      </span>
                    </div>
                    <span className={`font-mono text-xs font-semibold tabular-nums ${crop.textColor}`}>
                      {crop.stremmas.toFixed(1)} stremmata
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm pt-3 mt-1 border-t border-slate-200 dark:border-slate-800/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-sm bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm" />
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Fallow / Available</span>
                  </div>
                  <span className="font-mono text-xs text-slate-500 tabular-nums font-medium">
                    {fallowStremmas.toFixed(1)} stremmata
                  </span>
                </div>
              </div>
            </div>

            {simulationData?.by_year && lpCoverage !== undefined && (
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 mt-auto">
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                  Arable land in use: <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400">{usedPercentage}%</span>
                </h3>
                
                <h3 className="font-bold text-xs text-slate-500 dark:text-slate-400 mt-5 uppercase tracking-wider">Coverage by year</h3>
                <BarList 
                  data={simulationData.by_year.map((year: any, index: number) => ({
                    name: `Year ${index + 1}`,
                    value: Math.round(year.coverage * 1000) / 10
                  }))}
                  valueFormatter={(value: number) => `${value}%`}
                  sortOrder="ascending"
                  className="mt-3"
                />

                <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                  Starting from an empty field, the simulation's {Math.round(simulationData.by_year[simulationData.by_year.length - 1].coverage * 1000) / 10}% coverage is achieved in year {simulationData.by_year.length}.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
};