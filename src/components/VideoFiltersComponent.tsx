import React from 'react';
import { VideoFilters } from '../types';
import { SlidersHorizontal, RotateCcw, Eye, HelpCircle } from 'lucide-react';

interface VideoFiltersComponentProps {
  filters: VideoFilters;
  onChangeFilters: (filters: Partial<VideoFilters>) => void;
  onResetFilters: () => void;
}

export default function VideoFiltersComponent({
  filters,
  onChangeFilters,
  onResetFilters,
}: VideoFiltersComponentProps) {
  return (
    <div id="video-filters-container" className="bg-transparent flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
          <h2 className="font-bold text-zinc-100 text-xs tracking-tight font-display">Effects</h2>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          className="glass-button flex items-center gap-1.5 text-[11px] text-zinc-200 px-3.5 py-1.5 rounded-xl font-bold"
          title="Reset to default"
        >
          <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
          <span>Reset</span>
        </button>
      </div>

      {/* Control Sliders */}
      <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar p-0.5">
        {/* Brightness */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-200 font-semibold">Brightness</span>
            <span className="text-indigo-400 font-bold font-mono text-[10px]">{filters.brightness}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="150"
            value={filters.brightness}
            onChange={(e) => onChangeFilters({ brightness: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-white/5 rounded-full cursor-pointer"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-200 font-semibold">Contrast</span>
            <span className="text-indigo-400 font-bold font-mono text-[10px]">{filters.contrast}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="150"
            value={filters.contrast}
            onChange={(e) => onChangeFilters({ contrast: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-white/5 rounded-full cursor-pointer"
          />
        </div>

        {/* Saturation */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-200 font-semibold">Saturation</span>
            <span className="text-indigo-400 font-bold font-mono text-[10px]">{filters.saturate}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={filters.saturate}
            onChange={(e) => onChangeFilters({ saturate: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-white/5 rounded-full cursor-pointer"
          />
        </div>

        {/* Hue Rotate */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-200 font-semibold">Color tone</span>
            <span className="text-indigo-400 font-bold font-mono text-[10px]">{filters.hueRotate}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={filters.hueRotate}
            onChange={(e) => onChangeFilters({ hueRotate: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-white/5 rounded-full cursor-pointer"
          />
        </div>

        {/* Blur */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-200 font-semibold">Blur</span>
            <span className="text-indigo-400 font-bold font-mono text-[10px]">{filters.blur}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={filters.blur}
            onChange={(e) => onChangeFilters({ blur: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-white/5 rounded-full cursor-pointer"
          />
        </div>

        {/* Invert */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-200 font-semibold">Invert</span>
            <span className="text-indigo-400 font-bold font-mono text-[10px]">{filters.invert}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.invert}
            onChange={(e) => onChangeFilters({ invert: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-white/5 rounded-full cursor-pointer"
          />
        </div>

        {/* Sepia */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-200 font-semibold">Sepia</span>
            <span className="text-indigo-400 font-bold font-mono text-[10px]">{filters.sepia}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.sepia}
            onChange={(e) => onChangeFilters({ sepia: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-white/5 rounded-full cursor-pointer"
          />
        </div>
      </div>

      {/* Info footer */}
      <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-3 bg-black/20 p-2.5 rounded-xl border border-white/10">
        <Eye className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>Adjust video colors in real-time.</span>
      </div>
    </div>
  );
}
