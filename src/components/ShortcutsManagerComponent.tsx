import React, { useState, useEffect } from 'react';
import { 
  Keyboard, 
  RotateCcw, 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Volume1, 
  VolumeX,
  Maximize, 
  Bookmark, 
  Camera, 
  SlidersHorizontal,
  Tv,
  RefreshCw,
  Repeat,
  Monitor,
  Layout,
  Gauge,
  Eye
} from 'lucide-react';

interface ShortcutsManagerComponentProps {
  shortcutKeys: { [actionId: string]: string };
  onUpdateShortcut: (actionId: string, newKey: string) => void;
  onResetToDefault: () => void;
  
  // Handlers to trigger actions directly (acting as "shortcut buttons")
  onPlayPause: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onForward: () => void;
  onBackward: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onSpeedUp: () => void;
  onSpeedDown: () => void;
  onAddBookmark: () => void;
  onResetFilters: () => void;
  onTogglePiP: () => void;
  onScreenshot: () => void;
  onClearLoop: () => void;
  
  // New actions handlers
  onToggleFullscreen: () => void;
  onToggleMute: () => void;
  onCycleLoop: () => void;
  onCycleAspectRatio: () => void;
  onResetSpeed: () => void;
  onToggleSidebar: () => void;
}

interface ActionDefinition {
  id: string;
  label: string;
  category: string;
  icon: React.ReactNode;
  trigger: () => void;
}

export default function ShortcutsManagerComponent({
  shortcutKeys,
  onUpdateShortcut,
  onResetToDefault,
  onPlayPause,
  onStop,
  onPrev,
  onNext,
  onForward,
  onBackward,
  onVolumeUp,
  onVolumeDown,
  onSpeedUp,
  onSpeedDown,
  onAddBookmark,
  onResetFilters,
  onTogglePiP,
  onScreenshot,
  onClearLoop,
  onToggleFullscreen,
  onToggleMute,
  onCycleLoop,
  onCycleAspectRatio,
  onResetSpeed,
  onToggleSidebar
}: ShortcutsManagerComponentProps) {
  const [listeningAction, setListeningAction] = useState<string | null>(null);

  // Handle capturing key for the listener
  useEffect(() => {
    if (!listeningAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      let keyToSet = e.key;
      if (keyToSet === ' ') {
        keyToSet = 'Space';
      }
      
      onUpdateShortcut(listeningAction, keyToSet);
      setListeningAction(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listeningAction, onUpdateShortcut]);

  const actions: ActionDefinition[] = [
    { id: 'playPause', label: 'Play / Pause', category: 'Playback', icon: <Play className="w-3.5 h-3.5" />, trigger: onPlayPause },
    { id: 'stop', label: 'Stop Media', category: 'Playback', icon: <Square className="w-3.5 h-3.5" />, trigger: onStop },
    { id: 'prevTrack', label: 'Previous File', category: 'Playback', icon: <SkipBack className="w-3.5 h-3.5" />, trigger: onPrev },
    { id: 'nextTrack', label: 'Next File', category: 'Playback', icon: <SkipForward className="w-3.5 h-3.5" />, trigger: onNext },
    { id: 'fullscreen', label: 'Fullscreen', category: 'Playback', icon: <Monitor className="w-3.5 h-3.5" />, trigger: onToggleFullscreen },
    { id: 'loop', label: 'Repeat Mode', category: 'Playback', icon: <Repeat className="w-3.5 h-3.5" />, trigger: onCycleLoop },
    
    { id: 'forward', label: 'Skip Forward 5s', category: 'Navigation', icon: <RefreshCw className="w-3.5 h-3.5" />, trigger: onForward },
    { id: 'backward', label: 'Skip Backward 5s', category: 'Navigation', icon: <RotateCcw className="w-3.5 h-3.5" />, trigger: onBackward },
    
    { id: 'volumeUp', label: 'Volume Up', category: 'Audio', icon: <Volume2 className="w-3.5 h-3.5" />, trigger: onVolumeUp },
    { id: 'volumeDown', label: 'Volume Down', category: 'Audio', icon: <Volume1 className="w-3.5 h-3.5" />, trigger: onVolumeDown },
    { id: 'mute', label: 'Mute / Unmute', category: 'Audio', icon: <VolumeX className="w-3.5 h-3.5" />, trigger: onToggleMute },
    
    { id: 'speedUp', label: 'Increase Speed', category: 'Adjustments', icon: <SkipForward className="w-3.5 h-3.5 text-amber-400" />, trigger: onSpeedUp },
    { id: 'speedDown', label: 'Decrease Speed', category: 'Adjustments', icon: <SkipBack className="w-3.5 h-3.5 text-amber-400" />, trigger: onSpeedDown },
    { id: 'speedReset', label: 'Normal Speed (1x)', category: 'Adjustments', icon: <Gauge className="w-3.5 h-3.5 text-amber-400" />, trigger: onResetSpeed },
    { id: 'aspectRatio', label: 'Aspect Ratio', category: 'Adjustments', icon: <Layout className="w-3.5 h-3.5" />, trigger: onCycleAspectRatio },
    { id: 'resetVideo', label: 'Reset Picture Adjust', category: 'Adjustments', icon: <SlidersHorizontal className="w-3.5 h-3.5" />, trigger: onResetFilters },
    
    { id: 'bookmark', label: 'Save Bookmark', category: 'Features', icon: <Bookmark className="w-3.5 h-3.5" />, trigger: onAddBookmark },
    { id: 'pip', label: 'Floating Player', category: 'Features', icon: <Tv className="w-3.5 h-3.5" />, trigger: onTogglePiP },
    { id: 'screenshot', label: 'Take Screenshot', category: 'Features', icon: <Camera className="w-3.5 h-3.5" />, trigger: onScreenshot },
    { id: 'clearLoop', label: 'Reset Repeat Loop', category: 'Features', icon: <RefreshCw className="w-3.5 h-3.5" />, trigger: onClearLoop },
    { id: 'sidebar', label: 'Show / Hide Sidebar', category: 'Features', icon: <Eye className="w-3.5 h-3.5" />, trigger: onToggleSidebar }
  ];

  // Group by category
  const categories = ['Playback', 'Navigation', 'Audio', 'Adjustments', 'Features'];

  return (
    <div className="space-y-4 text-zinc-300">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 text-zinc-100">
          <Keyboard className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold font-display">Shortcut Controls</span>
        </div>
        <button
          onClick={onResetToDefault}
          type="button"
          className="text-[10px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 font-bold transition-all flex items-center gap-1.5 depth-button"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Keys</span>
        </button>
      </div>

      <p className="text-[10px] text-zinc-400 leading-normal">
        Customize keyboard hotkeys below. Click a action button to run it instantly, or click a key box to bind a new shortcut key.
      </p>

      {/* Categories List */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const catActions = actions.filter((act) => act.category === cat);
          return (
            <div key={cat} className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider pl-1">{cat}</h4>
              <div className="space-y-1 bg-white/[0.01] border border-white/5 rounded-2xl p-1.5">
                {catActions.map((act) => {
                  const currentKey = shortcutKeys[act.id] || 'None';
                  const isListening = listeningAction === act.id;

                  return (
                    <div 
                      key={act.id} 
                      className="flex items-center justify-between text-xs py-1.5 px-2 rounded-xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5"
                    >
                      {/* Shortcut Action Trigger Button */}
                      <button
                        onClick={act.trigger}
                        type="button"
                        className="flex items-center gap-2 text-zinc-300 hover:text-white font-medium focus:outline-none group text-left flex-1"
                        title={`Click to trigger ${act.label} immediately`}
                      >
                        <div className="p-1.5 bg-zinc-900/60 rounded-lg group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors border border-white/5">
                          {act.icon}
                        </div>
                        <span className="group-hover:translate-x-0.5 transition-transform duration-200">{act.label}</span>
                      </button>

                      {/* Custom Rebind Button */}
                      <button
                        onClick={() => setListeningAction(isListening ? null : act.id)}
                        type="button"
                        className={`px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold shadow-md transition-all border shrink-0 text-center min-w-[70px] ${
                          isListening 
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                            : 'bg-black/40 border-white/10 hover:bg-white/10 text-indigo-300 hover:text-indigo-200'
                        }`}
                        title="Click to customize key"
                      >
                        {isListening ? 'Press Key...' : currentKey}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
