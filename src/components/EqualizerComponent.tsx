import React from 'react';
import { EQ_BANDS, EQ_PRESETS, EqPreset } from '../types';
import { Sliders, VolumeX, Volume2, Sparkles } from 'lucide-react';

interface EqualizerComponentProps {
  eqEnabled: boolean;
  onToggleEq: (enabled: boolean) => void;
  eqGains: number[];
  onGainChange: (bandIndex: number, gain: number) => void;
  preamp: number;
  onPreampChange: (gain: number) => void;
}

export default function EqualizerComponent({
  eqEnabled,
  onToggleEq,
  eqGains,
  onGainChange,
  preamp,
  onPreampChange,
}: EqualizerComponentProps) {

  const handlePresetSelect = (presetName: string) => {
    const preset = EQ_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      preset.gains.forEach((gain, index) => {
        onGainChange(index, gain);
      });
    }
  };

  const getActivePresetName = (): string => {
    // Check if the current gains match a preset
    const matched = EQ_PRESETS.find((preset) =>
      preset.gains.every((g, index) => Math.abs(g - eqGains[index]) < 0.1)
    );
    return matched ? matched.name : 'Custom';
  };

  const currentPresetName = getActivePresetName();

  return (
    <div id="equalizer-container" className="bg-transparent flex flex-col h-full">
      {/* EQ Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h2 className="font-bold text-zinc-100 text-xs tracking-tight font-display">Equalizer</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-300 font-semibold">Enable</span>
          <button
            type="button"
            onClick={() => onToggleEq(!eqEnabled)}
            className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              eqEnabled ? 'bg-indigo-500' : 'bg-white/10'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-[1px] ${
                eqEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      <div className={`flex flex-col flex-1 gap-3.5 transition-opacity duration-300 ${eqEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-[10px] font-bold text-zinc-200">Preset</span>
          <select
            value={currentPresetName}
            onChange={(e) => handlePresetSelect(e.target.value)}
            disabled={!eqEnabled}
            className="flex-1 bg-black/40 border border-white/10 text-zinc-100 text-[11px] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 transition-all hover:bg-white/[0.04]"
          >
            <option value="Custom" disabled>Custom</option>
            {EQ_PRESETS.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        {/* 10 Band Controls */}
        <div className="flex-1 flex justify-between items-stretch gap-1.5 h-32 mt-1 overflow-x-auto p-2 bg-black/40 rounded-xl border border-white/10 custom-scrollbar">
          {/* Preamp Column */}
          <div className="flex flex-col items-center justify-between flex-1 min-w-[24px]">
            <span className="text-[8px] font-bold text-rose-400 tracking-wider">PRE</span>
            <div className="relative flex-1 flex items-center justify-center my-0.5">
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={preamp}
                onChange={(e) => onPreampChange(parseFloat(e.target.value))}
                disabled={!eqEnabled}
                className="accent-rose-500 cursor-pointer h-full"
                style={{
                  writingMode: 'vertical-lr',
                  direction: 'rtl',
                }}
              />
            </div>
            <span className="text-[9px] font-mono text-rose-400 font-bold leading-none">
              {preamp > 0 ? `+${preamp}` : preamp}
            </span>
          </div>

          <div className="w-[1px] bg-white/10 my-0.5 shrink-0" />

          {/* Equalizer Frequency Columns */}
          {EQ_BANDS.map((frequency, index) => {
            const gain = eqGains[index] || 0;
            const label = frequency >= 1000 ? `${frequency / 1000}k` : `${frequency}`;
            return (
              <div key={frequency} className="flex flex-col items-center justify-between flex-1 min-w-[24px]">
                <span className="text-[8px] font-medium text-zinc-400 tracking-tight">{label}</span>
                <div className="relative flex-1 flex items-center justify-center my-0.5">
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={gain}
                    onChange={(e) => onGainChange(index, parseFloat(e.target.value))}
                    disabled={!eqEnabled}
                    className="accent-indigo-500 cursor-pointer h-full"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                    }}
                  />
                </div>
                <span className={`text-[9px] font-mono font-medium leading-none ${gain !== 0 ? 'text-indigo-400 font-bold' : 'text-zinc-500'}`}>
                  {gain > 0 ? `+${gain}` : gain}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hints */}
        <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-1 bg-black/20 p-2.5 rounded-xl border border-white/10">
          <Volume2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Adjust audio frequencies (EQ) in decibels (dB).</span>
        </div>
      </div>
    </div>
  );
}
