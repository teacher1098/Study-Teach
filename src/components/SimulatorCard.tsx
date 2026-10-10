import React, { useState, useMemo } from 'react';
import { Sliders, RefreshCw, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';
import type { SimulatorData } from '../types';

interface SimulatorCardProps {
  data: SimulatorData;
  isLatest?: boolean;
}

export const SimulatorCard: React.FC<SimulatorCardProps> = ({ data, isLatest }) => {
  // Initialize values map with defaultVal
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const v of data.variables) {
      initial[v.name] = v.defaultVal;
    }
    return initial;
  });

  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  const handleSliderChange = (name: string, val: number) => {
    setValues((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  const handleReset = () => {
    const resetVals: Record<string, number> = {};
    for (const v of data.variables) {
      resetVals[v.name] = v.defaultVal;
    }
    setValues(resetVals);
  };

  // Safe compute expression
  const computedResult = useMemo(() => {
    try {
      // Create a function with variable arguments
      const varNames = Object.keys(values);
      const varVals = Object.values(values);

      // Support basic math functions
      const safeMathScope = `
        const sin = Math.sin;
        const cos = Math.cos;
        const sqrt = Math.sqrt;
        const pow = Math.pow;
        const log = Math.log;
        const PI = Math.PI;
        const E = Math.E;
        const exp = Math.exp;
        const abs = Math.abs;
      `;

      // Sanitization: disallow arbitrary access
      const cleanExpr = data.computeExpression.replace(/window|document|eval|fetch|import/gi, '');
      const fn = new Function(...varNames, `${safeMathScope} return (${cleanExpr});`);
      const res = fn(...varVals);

      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        return Number(res.toFixed(3));
      }
      return 0;
    } catch (err) {
      console.warn('Calculation error:', err);
      return 0;
    }
  }, [values, data.computeExpression]);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden bg-zinc-900/90 ${
        isLatest ? 'border-indigo-500/40 shadow-lg shadow-indigo-500/5' : 'border-zinc-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">{data.title}</h4>
            <p className="text-xs text-zinc-400 line-clamp-1">{data.description}</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition flex items-center gap-1"
          title="Reset to defaults"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="text-[11px]">Reset</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Formula Badge & Result Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span className="font-medium text-zinc-300">Target Formula</span>
              <button
                onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                className="hover:text-zinc-200 text-zinc-500"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="font-mono text-base font-semibold text-indigo-300 tracking-wide">
              {data.formula}
            </div>
            {showFormulaDetails && (
              <div className="text-[11px] text-zinc-400 mt-2 pt-2 border-t border-zinc-800/60">
                Expression: <code className="text-zinc-300">{data.computeExpression}</code>
              </div>
            )}
          </div>

          {/* Computed Output Result */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-950 border border-indigo-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-indigo-300/80">
              <span className="font-medium">{data.outputLabel}</span>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {computedResult.toLocaleString()}
              </span>
              <span className="text-xs font-mono font-medium text-indigo-300">
                {data.outputUnit}
              </span>
            </div>
          </div>
        </div>

        {/* Sliders Area */}
        <div className="space-y-3 pt-1">
          <div className="text-xs font-medium text-zinc-400 flex items-center justify-between">
            <span>Dynamic Parameters</span>
            <span className="text-[11px] text-zinc-500">Live compute</span>
          </div>

          <div className="space-y-3">
            {data.variables.map((v) => {
              const currentVal = values[v.name] ?? v.defaultVal;
              const step = v.step || (v.max - v.min > 50 ? 1 : 0.1);

              return (
                <div
                  key={v.name}
                  className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/80 hover:border-zinc-700/80 transition"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-zinc-200">{v.label}</span>
                      <span className="font-mono text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                        ({v.name})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <span className="font-semibold text-zinc-100">{currentVal}</span>
                      <span className="text-zinc-500 text-[11px]">{v.unit}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-500 w-8">{v.min}</span>
                    <input
                      type="range"
                      min={v.min}
                      max={v.max}
                      step={step}
                      value={currentVal}
                      onChange={(e) => handleSliderChange(v.name, parseFloat(e.target.value))}
                      className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">{v.max}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Explanation Footer */}
        {data.explanation && (
          <div className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800 text-xs text-zinc-300 leading-relaxed flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
            <p>{data.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};
