import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Sliders,
  Settings,
  SlidersHorizontal,
  Bookmark as BookmarkIcon,
  HelpCircle,
  FolderOpen,
  Camera,
  PlayCircle,
  RotateCcw,
  RefreshCw,
  Shuffle,
  FileText,
  Plus,
  Trash2,
  Tv,
  Keyboard,
  Info,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import {
  PlaylistItem,
  Bookmark,
  VideoFilters,
  AspectRatioType,
  PlaybackSettings,
  EQ_BANDS,
  EQ_PRESETS
} from './types';

import PlaylistComponent from './components/PlaylistComponent';
import EqualizerComponent from './components/EqualizerComponent';
import VideoFiltersComponent from './components/VideoFiltersComponent';
import BookmarksComponent from './components/BookmarksComponent';
import AudioVisualizerComponent from './components/AudioVisualizerComponent';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';

// 1. Initial Sample Tracks
const INITIAL_PLAYLIST: PlaylistItem[] = [];

// 2. Mock subtitles
const SAMPLE_SUBTITLES: { [trackId: string]: { start: number; end: number; text: string }[] } = {};

const DEFAULT_FILTERS: VideoFilters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
  blur: 0,
  invert: 0,
  sepia: 0,
};

export default function App() {
  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);

  // --- Audio Context Graph Refs ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const preampNodeRef = useRef<GainNode | null>(null);
  const filterNodesRef = useRef<BiquadFilterNode[]>([]);
  const boostGainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);

  // --- States ---
  const [playlist, setPlaylist] = useState<PlaylistItem[]>(INITIAL_PLAYLIST);
  const [currentTrackId, setCurrentTrackId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8); // 0.0 to 2.0 (VLC supports 200% volume!)
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  
  // Tabs for control settings panels on the right side
  const [activeTab, setActiveTab] = useState<'playlist' | 'equalizer' | 'effects' | 'bookmarks'>('playlist');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [analyserActive, setAnalyserActive] = useState<AnalyserNode | null>(null);

  // Equalizer states
  const [eqEnabled, setEqEnabled] = useState(false);
  const [eqGains, setEqGains] = useState<number[]>(new Array(10).fill(0));
  const [preamp, setPreamp] = useState<number>(0);

  // Video adjustments
  const [videoFilters, setVideoFilters] = useState<VideoFilters>(DEFAULT_FILTERS);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // Subtitles
  const [currentSubtitles, setCurrentSubtitles] = useState<{ start: number; end: number; text: string }[]>([]);
  const [subtitleTrackName, setSubtitleTrackName] = useState<string>('No subtitles loaded');

  // Playback settings
  const [settings, setSettings] = useState<PlaybackSettings>({
    speed: 1.0,
    aspectRatio: 'fit',
    subtitleSize: 'medium',
    subtitleColor: '#fde047', // Yellow
    subtitleBg: 'rgba(0,0,0,0.7)',
    subtitleDelay: 0,
    audioDelay: 0,
    loop: 'none',
    shuffle: false,
  });

  const [lastVolume, setLastVolume] = useState(0.8);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [showSettingsSection, setShowSettingsSection] = useState(true);
  const [showSubtitlesSection, setShowSubtitlesSection] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const currentTrack = playlist.find((t) => t.id === currentTrackId) || playlist[0];

  // Load default subs for sample tracks on track change
  useEffect(() => {
    if (currentTrackId && SAMPLE_SUBTITLES[currentTrackId]) {
      setCurrentSubtitles(SAMPLE_SUBTITLES[currentTrackId]);
      setSubtitleTrackName('Built-in Subtitles');
    } else {
      setCurrentSubtitles([]);
      setSubtitleTrackName('No subtitles loaded');
    }
    // Clear bookmarks on track change, or keep them? Let's clear them for clarity
    setBookmarks([]);
  }, [currentTrackId]);

  // Autoplay next track when finished
  const handleEnded = () => {
    if (settings.loop === 'one') {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    } else {
      playNextTrack();
    }
  };

  const playNextTrack = () => {
    if (playlist.length === 0) return;
    let nextIndex = 0;
    if (settings.shuffle) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      const currentIndex = playlist.findIndex((t) => t.id === currentTrackId);
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    setCurrentTrackId(playlist[nextIndex].id);
    setIsPlaying(true);
  };

  const playPreviousTrack = () => {
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex((t) => t.id === currentTrackId);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = playlist.length - 1;
    setCurrentTrackId(playlist[prevIndex].id);
    setIsPlaying(true);
  };

  // --- Web Audio Equalizer Initialization & Sync ---
  const initAudioGraph = (mediaElement: HTMLMediaElement) => {
    if (audioContextRef.current) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const context = new AudioCtxClass();
      audioContextRef.current = context;

      // Create Media Source
      const source = context.createMediaElementSource(mediaElement);
      sourceNodeRef.current = source;

      // Preamp Gain Node
      const preampNode = context.createGain();
      preampNodeRef.current = preampNode;

      // 10 Biquad Filters
      const filters: BiquadFilterNode[] = [];
      let lastNode: AudioNode = preampNode;

      EQ_BANDS.forEach((freq) => {
        const filter = context.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.0;
        filter.gain.value = 0; // Flat initially
        filters.push(filter);

        lastNode.connect(filter);
        lastNode = filter;
      });
      filterNodesRef.current = filters;

      // Volume Boost Node
      const boostGainNode = context.createGain();
      boostGainNode.gain.value = 1.0;
      boostGainNodeRef.current = boostGainNode;
      lastNode.connect(boostGainNode);
      lastNode = boostGainNode;

      // Analyser Node
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyserNodeRef.current = analyser;
      lastNode.connect(analyser);

      // Connect to Output Speakers
      analyser.connect(context.destination);

      // State update
      setAnalyserActive(analyser);

      // Apply any already-loaded EQ settings
      updateAudioFiltersGains();
    } catch (err) {
      console.warn("Web Audio API not fully available or CORS issue blocked graph setup:", err);
    }
  };

  // Update Audio Nodes when react states change
  const updateAudioFiltersGains = () => {
    if (!audioContextRef.current) return;

    // Preamp (dB to factor conversion: 10^(dB/20))
    if (preampNodeRef.current) {
      const preampFactor = eqEnabled ? Math.pow(10, preamp / 20) : 1.0;
      preampNodeRef.current.gain.setValueAtTime(preampFactor, audioContextRef.current.currentTime);
    }

    // 10 Bands
    filterNodesRef.current.forEach((filter, index) => {
      const gainVal = eqEnabled ? (eqGains[index] || 0) : 0;
      filter.gain.setValueAtTime(gainVal, audioContextRef.current.currentTime);
    });

    // Boost Gain (> 100% volume)
    if (boostGainNodeRef.current) {
      // If volume is > 1.0, we use boost node, otherwise 1.0
      const currentVolFactor = volume > 1.0 ? volume : 1.0;
      boostGainNodeRef.current.gain.setValueAtTime(
        isMuted ? 0 : currentVolFactor,
        audioContextRef.current.currentTime
      );
    }
  };

  // Sync Equalizer state
  useEffect(() => {
    updateAudioFiltersGains();
  }, [eqEnabled, eqGains, preamp, volume, isMuted]);

  // Handle Play/Pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    // Initialize Web Audio API on first play gesture
    if (video) {
      initAudioGraph(video);
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn("Playback interrupted:", e);
      });
    }
  };

  const handleStop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Handle Seek Forward / Backward
  const seek = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  // Timeline Progress Slider
  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTime = parseFloat(e.target.value);
    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  // Native volume update (0 to 1)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Native volume only goes 0 to 1
    video.volume = isMuted ? 0 : Math.min(1.0, volume);
  }, [volume, isMuted]);

  // Volume slider handler
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(lastVolume);
    } else {
      setLastVolume(volume);
      setIsMuted(true);
    }
  };

  // --- Filter String Generation ---
  const getFilterStyleString = () => {
    return `brightness(${videoFilters.brightness}%) contrast(${videoFilters.contrast}%) saturate(${videoFilters.saturate}%) hue-rotate(${videoFilters.hueRotate}deg) blur(${videoFilters.blur}px) invert(${videoFilters.invert}%) sepia(${videoFilters.sepia}%)`;
  };

  // --- Aspect Ratio Style Mapping ---
  const getAspectRatioClasses = () => {
    switch (settings.aspectRatio) {
      case 'fill':
        return 'w-full h-full object-cover';
      case 'stretch':
        return 'w-full h-full object-fill';
      case '16:9':
        return 'aspect-video w-full h-auto object-contain';
      case '4:3':
        return 'aspect-[4/3] w-full h-auto object-contain';
      case 'fit':
      default:
        return 'w-full h-full object-contain';
    }
  };

  // --- Bookmarks management ---
  const handleAddBookmark = (time: number, noteText: string) => {
    const newBookmark: Bookmark = {
      id: Math.random().toString(36).substr(2, 9),
      time,
      note: noteText,
    };
    setBookmarks((prev) => [...prev, newBookmark]);
  };

  const handleDeleteBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  // --- Screenshot/Snapshot current frame ---
  const takeScreenshot = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the current video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Export to PNG
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `VLC_Player_Frame_${Math.floor(currentTime)}.png`;
        link.click();
      }
    } catch (e) {
      console.error("Screenshot capture failed. Usually due to cross-origin video sources on the canvas.", e);
      alert("Oops! Screenshot blocked. Browsers protect cross-origin videos. Try dragging and dropping a local file to enjoy full frame captures.");
    }
  };

  // --- Picture in Picture Toggle ---
  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else {
        await video.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (e) {
      console.warn("Failed to enter Picture-in-Picture mode", e);
    }
  };

  // --- Fullscreen Toggle ---
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Sync fullscreen change event (e.g. if user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- Subtitle Parser & Loader ---
  const handleSubtitleUploadClick = () => {
    subtitleInputRef.current?.click();
  };

  const handleSubtitleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const cues = parseSubtitles(text);
      if (cues.length > 0) {
        setCurrentSubtitles(cues);
        setSubtitleTrackName(file.name);
      } else {
        alert("Failed to parse subtitle cues. Please ensure the file is a valid .srt or .vtt file.");
      }
    };
    reader.readAsText(file);
  };

  const parseSubtitles = (text: string): { start: number; end: number; text: string }[] => {
    const lines = text.split(/\r?\n/);
    const cues: { start: number; end: number; text: string }[] = [];
    
    let currentCue: Partial<{ start: number; end: number; text: string }> = {};
    let textBuffer: string[] = [];
    
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.trim().replace(',', '.').split(':');
      if (parts.length === 0) return 0;
      
      let hrs = 0, mins = 0, secsWithMs = '';
      if (parts.length === 3) {
        hrs = parseInt(parts[0]) || 0;
        mins = parseInt(parts[1]) || 0;
        secsWithMs = parts[2];
      } else if (parts.length === 2) {
        mins = parseInt(parts[0]) || 0;
        secsWithMs = parts[1];
      } else {
        secsWithMs = parts[0];
      }
      
      const secsParts = secsWithMs.split('.');
      const secs = parseInt(secsParts[0]) || 0;
      const ms = parseInt(secsParts[1]) || 0;
      
      return hrs * 3600 + mins * 60 + secs + ms / 1000;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('-->')) {
        const parts = line.split('-->');
        currentCue.start = parseTime(parts[0]);
        currentCue.end = parseTime(parts[1]);
      } else if (line === '') {
        if (currentCue.start !== undefined && currentCue.end !== undefined && textBuffer.length > 0) {
          currentCue.text = textBuffer.join(' ');
          cues.push(currentCue as { start: number; end: number; text: string });
        }
        currentCue = {};
        textBuffer = [];
      } else if (isNaN(Number(line)) && line.toLowerCase() !== 'webvtt') {
        textBuffer.push(line);
      }
    }
    
    if (currentCue.start !== undefined && currentCue.end !== undefined && textBuffer.length > 0) {
      currentCue.text = textBuffer.join(' ');
      cues.push(currentCue as { start: number; end: number; text: string });
    }
    
    return cues;
  };

  // Get active subtitle cue
  const getActiveSubtitleText = (): string => {
    const delayedTime = currentTime - settings.subtitleDelay;
    const activeCue = currentSubtitles.find((cue) => delayedTime >= cue.start && delayedTime <= cue.end);
    return activeCue ? activeCue.text : '';
  };

  const activeSubtitleText = getActiveSubtitleText();

  // --- Keyboard Shortcuts Manager ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if user is focusing an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (e.key) {
        case ' ': // Space key
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(-5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((prev) => Math.min(2.0, prev + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((prev) => Math.max(0.0, prev - 0.1));
          break;
        default:
          break;
      }

      switch (key) {
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 's':
          e.preventDefault();
          handleStop();
          break;
        case '[':
          e.preventDefault();
          setSettings((prev) => ({ ...prev, speed: Math.max(0.25, prev.speed - 0.25) }));
          break;
        case ']':
          e.preventDefault();
          setSettings((prev) => ({ ...prev, speed: Math.min(4.0, prev.speed + 0.25) }));
          break;
        case 'n':
          e.preventDefault();
          playNextTrack();
          break;
        case 'p':
          e.preventDefault();
          playPreviousTrack();
          break;
        case 'b':
          e.preventDefault();
          handleAddBookmark(currentTime, `Hotkey Tagged @ ${Math.floor(currentTime)}s`);
          break;
        case 'backspace':
          e.preventDefault();
          setVideoFilters(DEFAULT_FILTERS);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, volume, isMuted, currentTrackId, playlist, settings]);

  // Sync playback speed rate on the video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = settings.speed;
    }
  }, [settings.speed, currentTrackId]);

  // Time formatter helpers
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // --- Drag and drop file to main player zone ---
  const [playerDragging, setPlayerDragging] = useState(false);

  const handlePlayerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setPlayerDragging(true);
  };

  const handlePlayerDragLeave = () => {
    setPlayerDragging(false);
  };

  const handlePlayerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPlayerDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('audio/') ? 'audio' : 'video';
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      
      const newTrack: PlaylistItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        url,
        type,
        size: `${sizeMB} MB`,
      };

      setPlaylist((prev) => [newTrack, ...prev]);
      setCurrentTrackId(newTrack.id);
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#060608] text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white overflow-hidden">
      {/* Dynamic Ambient Fluid Backdrops */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none opacity-50">
        <div className="bg-gradient-to-tr from-indigo-600/25 to-violet-600/25 blur-[130px] rounded-full w-[45vw] h-[45vw] absolute -top-[10%] -left-[10%] fluid-bg-1" />
        <div className="bg-gradient-to-tr from-fuchsia-600/15 to-pink-600/15 blur-[140px] rounded-full w-[50vw] h-[50vw] absolute top-[30%] -right-[15%] fluid-bg-2" />
        <div className="bg-gradient-to-tr from-cyan-600/25 to-emerald-600/15 blur-[120px] rounded-full w-[40vw] h-[40vw] absolute -bottom-[10%] left-[15%] fluid-bg-3" />
      </div>

      {/* 1. Main Content Grid */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-screen p-4 lg:p-5 gap-4 lg:gap-5">
        
        {/* Left Side: Video Canvas Container */}
        <div className={`${sidebarCollapsed ? 'lg:col-span-12' : 'lg:col-span-8'} flex flex-col overflow-y-auto p-1.5 space-y-4 custom-scrollbar`}>
          
          {/* Top Bar: Now Playing, Stats & Toggles */}
          <div className="glass-thick p-3 md:p-3.5 rounded-2xl md:rounded-3xl flex flex-col sm:flex-row gap-3.5 items-center justify-between shadow-2xl border border-white/10 hover:border-white/15 transition-all duration-300">
            {/* Now Playing info */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto min-w-0">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 shrink-0">
                <PlayCircle className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block">Now Playing</span>
                <p className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">{currentTrack ? currentTrack.name : 'No file loaded'}</p>
              </div>
            </div>

            {/* Quick stats with simple symbol icons */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
              <div className="flex items-center gap-3 text-xs font-medium text-zinc-300">
                {/* Speed Info */}
                <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-xl" title="Playback speed">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-bold text-zinc-300 font-mono">{settings.speed.toFixed(2)}x</span>
                </div>

                {/* Aspect Info */}
                <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-xl" title="Aspect ratio">
                  <Maximize className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-bold text-zinc-300 capitalize">{settings.aspectRatio}</span>
                </div>

                {/* Subtitles Info */}
                <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-xl max-w-[150px]" title="Subtitles loaded">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-bold text-zinc-300 truncate">{subtitleTrackName}</span>
                </div>
              </div>

              {/* Toggles bar */}
              <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-white/10 pt-2.5 sm:pt-0 pl-0 sm:pl-3 w-full sm:w-auto justify-end">
                {/* Keyboard Shortcuts button */}
                <button
                  onClick={() => setShowShortcutsHelp(true)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all"
                  title="Keyboard Shortcuts"
                >
                  <Keyboard className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-white/10 mx-0.5 hidden sm:block" />

                {/* Sidebar toggle button */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={`p-2 rounded-xl border font-bold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 ${
                    !sidebarCollapsed
                      ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'
                      : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                  title={!sidebarCollapsed ? "Hide Sidebar" : "Show Sidebar"}
                >
                  <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
                </button>

                {/* Settings toggle button */}
                <button
                  onClick={() => setShowSettingsSection(!showSettingsSection)}
                  className={`p-2 rounded-xl border font-bold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 ${
                    showSettingsSection
                      ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'
                      : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                  title={showSettingsSection ? "Hide Settings" : "Show Settings"}
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Subtitles toggle button */}
                <button
                  onClick={() => setShowSubtitlesSection(!showSubtitlesSection)}
                  className={`p-2 rounded-xl border font-bold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 ${
                    showSubtitlesSection
                      ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'
                      : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                  title={showSubtitlesSection ? "Hide Subtitles" : "Show Subtitles"}
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Video Stage Frame */}
          <div
            ref={containerRef}
            onDragOver={handlePlayerDragOver}
            onDragLeave={handlePlayerDragLeave}
            onDrop={handlePlayerDrop}
            className={`relative flex-1 bg-black/40 backdrop-blur-xl rounded-2xl md:rounded-3xl overflow-hidden border flex flex-col justify-between shadow-2xl transition-all duration-300 ${
              playerDragging 
                ? 'border-indigo-400 ring-4 ring-indigo-500/20' 
                : 'border-white/10 hover:border-white/15'
            }`}
            style={{ minHeight: '380px' }}
          >
            {/* Overlay feedback for dropping files */}
            {playerDragging && (
              <div className="absolute inset-0 bg-indigo-600/20 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center pointer-events-none border-2 border-dashed border-indigo-500 m-2 rounded-md">
                <FolderOpen className="w-10 h-10 text-indigo-400 animate-bounce mb-2" />
                <p className="text-xs font-semibold text-white">Drop video or audio file here</p>
                <p className="text-[10px] text-indigo-300 mt-1">Plays MP4, WebM, MP3, and WAV</p>
              </div>
            )}

            {/* Video or Audio Visualizer Stage */}
            <div className="relative flex-1 flex items-center justify-center bg-zinc-950 overflow-hidden">
              {currentTrack ? (
                currentTrack.type === 'video' ? (
                  <video
                    ref={videoRef}
                    src={currentTrack.url}
                    onClick={togglePlay}
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                      }
                    }}
                    onDurationChange={() => {
                      if (videoRef.current) {
                        setDuration(videoRef.current.duration);
                      }
                    }}
                    onEnded={handleEnded}
                    className={`${getAspectRatioClasses()} transition-all`}
                    style={{ filter: getFilterStyleString() }}
                    crossOrigin="anonymous"
                    playsInline
                  />
                ) : (
                  <div className="w-full h-full min-h-[280px]">
                    {/* Standard Video element for handling Audio stream behind the scenes */}
                    <video
                      ref={videoRef}
                      src={currentTrack.url}
                      onTimeUpdate={() => {
                        if (videoRef.current) {
                          setCurrentTime(videoRef.current.currentTime);
                        }
                      }}
                      onDurationChange={() => {
                        if (videoRef.current) {
                          setDuration(videoRef.current.duration);
                        }
                      }}
                      onEnded={handleEnded}
                      className="hidden"
                      crossOrigin="anonymous"
                    />
                    {/* Interactive audio visualizer */}
                    <AudioVisualizerComponent
                      analyser={analyserActive}
                      isPlaying={isPlaying}
                      isAudioOnly={true}
                    />
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-400 space-y-3 max-w-xs mx-auto">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                    <Tv className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">No media loaded</h3>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    Drag and drop your own video or audio files here, enter a link, or open the playlist to choose a file.
                  </p>
                </div>
              )}

              {/* Subtitles Overlay */}
              {activeSubtitleText && (
                <div
                  className="absolute bottom-12 left-1/2 -translate-x-1/2 px-5 py-2 rounded-2xl text-center font-medium max-w-[85%] pointer-events-none z-20 select-none shadow-xl bg-black/60 backdrop-blur-md border border-white/10 transition-all"
                  style={{
                    color: settings.subtitleColor,
                    fontSize:
                      settings.subtitleSize === 'small'
                        ? '13px'
                        : settings.subtitleSize === 'medium'
                        ? '16px'
                        : settings.subtitleSize === 'large'
                        ? '20px'
                        : '25px',
                  }}
                >
                  {activeSubtitleText}
                </div>
              )}
            </div>

            {/* Customized Media Player Control Bar */}
            <div className="bg-black/30 backdrop-blur-2xl p-5 flex flex-col gap-4 z-20 border-t border-white/10">
              
              {/* Timeline Slider with progress labels */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono font-medium text-zinc-300 w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleTimelineChange}
                  className="flex-1 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                />

                <span className="text-[10px] font-mono font-medium text-zinc-300 w-10 text-left">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Control Buttons row */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* 1. Volume controls (0% to 200%) - now on the left */}
                <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-2xl shadow-inner w-full md:w-auto justify-between md:justify-start">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={toggleMute}
                      className="text-zinc-300 hover:text-white transition-colors shrink-0"
                      title="Mute"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : volume > 1.2 ? (
                        <Volume2 className="w-4 h-4 text-rose-400 animate-pulse" />
                      ) : volume > 0.5 ? (
                        <Volume2 className="w-4 h-4" />
                      ) : (
                        <Volume1 className="w-4 h-4" />
                      )}
                    </button>

                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 md:w-28 h-1.5 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                  <span className={`text-[10px] font-mono font-bold tracking-tight w-8 text-right shrink-0 ${volume > 1.0 ? 'text-rose-400' : 'text-zinc-300'}`}>
                    {Math.round(volume * 100)}%
                  </span>
                </div>

                {/* 2. Main Transport Controls - now in the center */}
                <div className="flex items-center gap-2 justify-center w-full md:w-auto">
                  <button
                    onClick={playPreviousTrack}
                    className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-250 hover:scale-110 active:scale-95"
                    title="Previous"
                  >
                    <SkipBack className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    onClick={() => seek(-5)}
                    className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-250 hover:scale-110 active:scale-95"
                    title="Back 5s"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="p-3.5 glass-primary rounded-2xl hover:scale-110 active:scale-95 transition-all duration-200"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={() => seek(5)}
                    className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-250 hover:scale-110 active:scale-95"
                    title="Forward 5s"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={playNextTrack}
                    className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-250 hover:scale-110 active:scale-95"
                    title="Next"
                  >
                    <SkipForward className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    onClick={handleStop}
                    className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-250 hover:scale-110 active:scale-95"
                    title="Stop"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>

                {/* 3. Utility Actions - now on the right */}
                <div className="flex items-center gap-1.5 w-full md:w-auto justify-center md:justify-end">
                  <button
                    onClick={takeScreenshot}
                    className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-250 hover:scale-110 active:scale-95"
                    title="Screenshot"
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  {document.pictureInPictureEnabled && (
                    <button
                      onClick={togglePiP}
                      className={`p-2 rounded-xl transition-all duration-250 hover:scale-110 active:scale-95 ${
                        isPiPActive ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                      }`}
                      title="PiP"
                    >
                      <Tv className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={toggleFullscreen}
                    className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-250 hover:scale-110 active:scale-95"
                    title="Fullscreen"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* Subtitles & Aspect Settings Bar */}
          {(showSettingsSection || showSubtitlesSection) && (
            <div className={`glass-thick grid grid-cols-1 ${
              showSettingsSection && showSubtitlesSection ? 'md:grid-cols-2' : ''
            } gap-6 p-5.5 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl`}>
              {/* Playback speed, loops, ratio options */}
              {showSettingsSection && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider font-display">
                    <Settings className="w-3.5 h-3.5" />
                    <span>Playback Settings</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Playback Speed</span>
                      </span>
                      <select
                        value={settings.speed}
                        onChange={(e) => setSettings((p) => ({ ...p, speed: parseFloat(e.target.value) }))}
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer hover:bg-white/[0.04]"
                      >
                        <option value="0.25">0.25x (Slow)</option>
                        <option value="0.5">0.50x</option>
                        <option value="0.75">0.75x</option>
                        <option value="1">1.00x (Normal)</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.50x</option>
                        <option value="2">2.00x</option>
                        <option value="4">4.00x (Fast)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                        <Maximize className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Aspect Ratio</span>
                      </span>
                      <select
                        value={settings.aspectRatio}
                        onChange={(e) => setSettings((p) => ({ ...p, aspectRatio: e.target.value as AspectRatioType }))}
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer hover:bg-white/[0.04]"
                      >
                        <option value="fit">Fit Container</option>
                        <option value="fill">Fill Canvas</option>
                        <option value="stretch">Stretch</option>
                        <option value="16:9">Lock 16:9</option>
                        <option value="4:3">Lock 4:3</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Repeat & Mix</span>
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSettings((p) => ({ ...p, loop: p.loop === 'one' ? 'none' : 'one' }))}
                          className={`flex-1 py-1.5 px-2 border rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 ${
                            settings.loop === 'one'
                              ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 shadow-md shadow-indigo-500/10'
                              : 'bg-zinc-900/60 border-white/10 hover:bg-white/[0.05] text-zinc-300'
                          }`}
                          title="Repeat Current File"
                        >
                          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                          <span>Repeat</span>
                        </button>
                        <button
                          onClick={() => setSettings((p) => ({ ...p, shuffle: !p.shuffle }))}
                          className={`flex-1 py-1.5 px-2 border rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 ${
                            settings.shuffle
                              ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 shadow-md shadow-indigo-500/10'
                              : 'bg-zinc-900/60 border-white/10 hover:bg-white/[0.05] text-zinc-300'
                          }`}
                          title="Mix playlist randomly"
                        >
                          <Shuffle className="w-3.5 h-3.5 shrink-0" />
                          <span>Mix</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Filter Adjustments</span>
                      </span>
                      <button
                        onClick={() => setVideoFilters(DEFAULT_FILTERS)}
                        className="w-full bg-zinc-900/60 hover:bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 font-bold"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Reset Filters</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtitle custom tracks uploader and delay config */}
              {showSubtitlesSection && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider font-display">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Subtitle Customizer</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>
                        <span>Subtitle Color</span>
                      </span>
                      <select
                        value={settings.subtitleColor}
                        onChange={(e) => setSettings((p) => ({ ...p, subtitleColor: e.target.value }))}
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer hover:bg-white/[0.04]"
                      >
                        <option value="#fde047">Yellow</option>
                        <option value="#ffffff">White</option>
                        <option value="#4ade80">Green</option>
                        <option value="#38bdf8">Blue</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Subtitle Size</span>
                      </span>
                      <select
                        value={settings.subtitleSize}
                        onChange={(e) => setSettings((p) => ({ ...p, subtitleSize: e.target.value as any }))}
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer hover:bg-white/[0.04]"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                        <option value="xlarge">Extra Large</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Delay Offset</span>
                      </span>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="0.0s"
                        value={settings.subtitleDelay}
                        onChange={(e) => setSettings((p) => ({ ...p, subtitleDelay: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono transition-all hover:bg-white/[0.04]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                        <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Upload Subtitles</span>
                      </span>
                      <button
                        onClick={handleSubtitleUploadClick}
                        className="w-full bg-zinc-900/60 hover:bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 truncate font-bold"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">Open .srt / .vtt</span>
                      </button>
                      <input
                        type="file"
                        ref={subtitleInputRef}
                        onChange={handleSubtitleFileChange}
                        accept=".srt,.vtt"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Side: Tabbed Config Utilities (4 Cols) */}
        {!sidebarCollapsed && (
          <div className="lg:col-span-4 glass-thick rounded-2xl md:rounded-3xl overflow-hidden flex flex-col h-full shadow-2xl">
            {/* Tab Selection Header */}
            <div className="p-2.5 bg-black/30 border-b border-white/10 flex gap-1.5 select-none overflow-x-auto shrink-0 custom-scrollbar items-center">
              <button
                onClick={() => setActiveTab('playlist')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 ${
                  activeTab === 'playlist' ? 'glass-primary text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Playlist</span>
              </button>

              <button
                onClick={() => setActiveTab('equalizer')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 ${
                  activeTab === 'equalizer' ? 'glass-primary text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Equalizer</span>
              </button>

              <button
                onClick={() => setActiveTab('effects')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 ${
                  activeTab === 'effects' ? 'glass-primary text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Effects</span>
              </button>

              <button
                onClick={() => setActiveTab('bookmarks')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 ${
                  activeTab === 'bookmarks' ? 'glass-primary text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <BookmarkIcon className="w-3.5 h-3.5" />
                <span>Bookmarks</span>
              </button>

              {/* Panel Collapse Toggle */}
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all ml-1 shrink-0"
                title="Hide sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Dynamic Tab Body */}
            <div className="flex-1 overflow-y-auto p-4.5 custom-scrollbar bg-transparent">
              {activeTab === 'playlist' && (
                <PlaylistComponent
                  playlist={playlist}
                  currentTrackId={currentTrackId}
                  onSelectTrack={(id) => {
                    setCurrentTrackId(id);
                    setIsPlaying(true);
                  }}
                  onAddTrack={(track) => {
                    const newTrack: PlaylistItem = {
                      id: Math.random().toString(36).substr(2, 9),
                      ...track,
                    };
                    setPlaylist((prev) => [newTrack, ...prev]);
                    setCurrentTrackId(newTrack.id);
                    setIsPlaying(true);
                  }}
                  onRemoveTrack={(id) => {
                    const index = playlist.findIndex((t) => t.id === id);
                    const updated = playlist.filter((t) => t.id !== id);
                    setPlaylist(updated);
                    
                    // If removed track is currently playing, switch track
                    if (id === currentTrackId) {
                      if (updated.length > 0) {
                        const nextId = updated[Math.min(index, updated.length - 1)].id;
                        setCurrentTrackId(nextId);
                      } else {
                        setCurrentTrackId('');
                        setIsPlaying(false);
                        setCurrentTime(0);
                        setDuration(0);
                      }
                    }
                  }}
                />
              )}

              {activeTab === 'equalizer' && (
                <EqualizerComponent
                  eqEnabled={eqEnabled}
                  onToggleEq={setEqEnabled}
                  eqGains={eqGains}
                  onGainChange={(bandIndex, val) => {
                    setEqGains((prev) => {
                      const copy = [...prev];
                      copy[bandIndex] = val;
                      return copy;
                    });
                  }}
                  preamp={preamp}
                  onPreampChange={setPreamp}
                />
              )}

              {activeTab === 'effects' && (
                <VideoFiltersComponent
                  filters={videoFilters}
                  onChangeFilters={(updated) => {
                    setVideoFilters((prev) => ({ ...prev, ...updated }));
                  }}
                  onResetFilters={() => setVideoFilters(DEFAULT_FILTERS)}
                />
              )}

              {activeTab === 'bookmarks' && (
                <BookmarksComponent
                  bookmarks={bookmarks}
                  currentTime={currentTime}
                  onAddBookmark={handleAddBookmark}
                  onDeleteBookmark={handleDeleteBookmark}
                  onSeekTo={(time) => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = time;
                      setCurrentTime(time);
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}

      </main>

      {/* Keyboard Shortcuts Help Overlay */}
      {showShortcutsHelp && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />
      )}
    </div>
  );
}
