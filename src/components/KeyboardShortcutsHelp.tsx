import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  shortcutKeys: { [actionId: string]: string };
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  action: string;
}

export default function KeyboardShortcutsHelp({ shortcutKeys, onClose }: KeyboardShortcutsHelpProps) {
  const getBinding = (actionId: string, defaultFallback: string): string => {
    return shortcutKeys[actionId] || defaultFallback;
  };

  const generalShortcuts: ShortcutItem[] = [
    { key: getBinding('playPause', 'Space'), action: 'Play / Pause' },
    { key: getBinding('fullscreen', 'F'), action: 'Toggle Fullscreen' },
    { key: getBinding('mute', 'M'), action: 'Toggle Mute' },
    { key: getBinding('stop', 'S'), action: 'Stop Media' },
  ];

  const navigationShortcuts: ShortcutItem[] = [
    { key: getBinding('backward', '← Arrow'), action: 'Seek back 5s' },
    { key: getBinding('forward', '→ Arrow'), action: 'Seek forward 5s' },
    { key: getBinding('volumeUp', '↑ Arrow'), action: 'Volume up 10%' },
    { key: getBinding('volumeDown', '↓ Arrow'), action: 'Volume down 10%' },
  ];

  const advancedShortcuts: ShortcutItem[] = [
    { key: getBinding('speedDown', '['), action: 'Slower speed' },
    { key: getBinding('speedUp', ']'), action: 'Faster speed' },
    { key: getBinding('speedReset', 'R'), action: 'Reset speed 1.0x' },
    { key: getBinding('nextTrack', 'N'), action: 'Next track' },
    { key: getBinding('prevTrack', 'P'), action: 'Previous track' },
    { key: getBinding('bookmark', 'B'), action: 'Add bookmark' },
    { key: getBinding('loop', 'L'), action: 'Cycle repeat mode' },
    { key: getBinding('aspectRatio', 'A'), action: 'Cycle aspect ratio' },
    { key: getBinding('sidebar', 'H'), action: 'Toggle sidebar panel' },
    { key: getBinding('resetVideo', 'Backspace'), action: 'Reset picture adjustment' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="glass-thick rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-black/30 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-zinc-100 text-xs font-display">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* General */}
          <div>
            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Playback</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {generalShortcuts.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-zinc-300 font-medium">{item.action}</span>
                  <kbd className="px-2.5 py-0.5 bg-black/40 border border-white/10 rounded-lg text-[10px] font-mono text-indigo-300 font-bold shadow-md">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10" />

          {/* Navigation */}
          <div>
            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Audio & Seeking</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {navigationShortcuts.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-zinc-300 font-medium">{item.action}</span>
                  <kbd className="px-2.5 py-0.5 bg-black/40 border border-white/10 rounded-lg text-[10px] font-mono text-indigo-300 font-bold shadow-md">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10" />

          {/* Advanced */}
          <div>
            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Advanced</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {advancedShortcuts.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-zinc-300 font-medium">{item.action}</span>
                  <kbd className="px-2.5 py-0.5 bg-black/40 border border-white/10 rounded-lg text-[10px] font-mono text-indigo-300 font-bold shadow-md">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-black/20 border-t border-white/10 text-center text-[10px] text-zinc-400 font-semibold">
          Tip: Press these keys while using the player.
        </div>
      </div>
    </div>
  );
}
