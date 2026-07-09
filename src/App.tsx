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
  ChevronRight,
  Sun,
  Timer
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
import ShortcutsManagerComponent from './components/ShortcutsManagerComponent';

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
  const [activeTab, setActiveTab] = useState<'playlist' | 'equalizer' | 'effects' | 'bookmarks' | 'shortcuts'>('playlist');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [analyserActive, setAnalyserActive] = useState<AnalyserNode | null>(null);

  // Hover states for collapsing Volume and Brightness
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [isBrightnessHovered, setIsBrightnessHovered] = useState(false);

  // Tap skip double-click indicators
  const [skipFeedback, setSkipFeedback] = useState<'left' | 'right' | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sleep Timer states
  const [sleepTime, setSleepTime] = useState<number>(0); // 0 means off, or 5, 15, 30, 60 minutes
  const [sleepCountdown, setSleepCountdown] = useState<number | null>(null); // counting down in seconds

  // A-B Loop State
  const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null; active: boolean }>({
    a: null,
    b: null,
    active: false,
  });

  // Customizable Hotkeys State
  const [shortcutKeys, setShortcutKeys] = useState<{ [actionId: string]: string }>({
    playPause: ' ',
    stop: 's',
    prevTrack: 'p',
    nextTrack: 'n',
    forward: 'ArrowRight',
    backward: 'ArrowLeft',
    volumeUp: 'ArrowUp',
    volumeDown: 'ArrowDown',
    speedUp: ']',
    speedDown: '[',
    resetVideo: 'backspace',
    bookmark: 'b',
    pip: 'v',
    screenshot: 'i',
    clearLoop: 'c'
  });

  // Sleep Timer Countdown effect
  useEffect(() => {
    if (sleepCountdown === null) return;
    if (sleepCountdown <= 0) {
      if (isPlaying) {
        // Pause playback
        const video = videoRef.current;
        if (video) {
          video.pause();
          setIsPlaying(false);
        }
      }
      setSleepCountdown(null);
      setSleepTime(0);
      return;
    }

    const timer = setTimeout(() => {
      setSleepCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [sleepCountdown, isPlaying]);

  const handleSetSleepTime = (minutes: number) => {
    setSleepTime(minutes);
    if (minutes > 0) {
      setSleepCountdown(minutes * 60);
    } else {
      setSleepCountdown(null);
    }
  };

  // Load saved progress on track change (Progress Auto-Save)
  useEffect(() => {
    if (!currentTrackId) return;

    const savedProgress = localStorage.getItem(`vlc_progress_${currentTrackId}`);
    if (savedProgress) {
      const savedTime = parseFloat(savedProgress);
      if (savedTime > 3) {
        // Automatically seek to saved progress
        const timer = setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = savedTime;
            setCurrentTime(savedTime);
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentTrackId]);

  // Save current progress periodically
  useEffect(() => {
    if (!currentTrackId || currentTime <= 2) return;
    localStorage.setItem(`vlc_progress_${currentTrackId}`, currentTime.toString());
  }, [currentTime, currentTrackId]);

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

  const cycleSpeed = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const currentIdx = speeds.indexOf(settings.speed);
    const nextIdx = currentIdx === -1 ? 2 : (currentIdx + 1) % speeds.length;
    setSettings((prev) => ({ ...prev, speed: speeds[nextIdx] }));
  };

  const cycleAspectRatio = () => {
    const ratios: AspectRatioType[] = ['fit', 'fill', 'stretch', '16:9', '4:3'];
    const currentIdx = ratios.indexOf(settings.aspectRatio);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % ratios.length;
    setSettings((prev) => ({ ...prev, aspectRatio: ratios[nextIdx] }));
  };

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

  // Handle video/audio time update and A-B Looping
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const time = video.currentTime;
    setCurrentTime(time);

    // If A-B loop is set and active, check boundaries
    if (abLoop.active && abLoop.a !== null && abLoop.b !== null) {
      if (time >= abLoop.b) {
        video.currentTime = abLoop.a;
        setCurrentTime(abLoop.a);
      }
    }
  };

  // Handle stage click: single click to play/pause, double click left/right to skip 10s
  const handleVideoStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = clickX / rect.width;

    if (e.detail === 2) {
      // Clear any pending single-click action
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      if (clickRatio < 0.5) {
        // Double-clicked on the left side
        seek(-10);
        setSkipFeedback('left');
        setTimeout(() => setSkipFeedback(null), 800);
      } else {
        // Double-clicked on the right side
        seek(10);
        setSkipFeedback('right');
        setTimeout(() => setSkipFeedback(null), 800);
      }
    } else if (e.detail === 1) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      clickTimeoutRef.current = setTimeout(() => {
        togglePlay();
        clickTimeoutRef.current = null;
      }, 250);
    }
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

      // Space key translates to readable label 'Space'
      const pressedKey = e.key === ' ' ? 'Space' : e.key;
      const pressedLower = pressedKey.toLowerCase();

      // Look up corresponding action from our custom mappings
      let triggeredAction: string | null = null;
      for (const [actionId, boundKey] of Object.entries(shortcutKeys)) {
        if (String(boundKey).toLowerCase() === pressedLower) {
          triggeredAction = actionId;
          break;
        }
      }

      if (!triggeredAction) return;

      e.preventDefault();

      switch (triggeredAction) {
        case 'playPause':
          togglePlay();
          break;
        case 'stop':
          handleStop();
          break;
        case 'prevTrack':
          playPreviousTrack();
          break;
        case 'nextTrack':
          playNextTrack();
          break;
        case 'forward':
          seek(5);
          break;
        case 'backward':
          seek(-5);
          break;
        case 'volumeUp':
          setVolume((prev) => Math.min(2.0, prev + 0.1));
          break;
        case 'volumeDown':
          setVolume((prev) => Math.max(0.0, prev - 0.1));
          break;
        case 'speedUp':
          setSettings((prev) => ({ ...prev, speed: Math.min(4.0, prev.speed + 0.25) }));
          break;
        case 'speedDown':
          setSettings((prev) => ({ ...prev, speed: Math.max(0.25, prev.speed - 0.25) }));
          break;
        case 'resetVideo':
          setVideoFilters(DEFAULT_FILTERS);
          break;
        case 'bookmark':
          handleAddBookmark(currentTime, `Hotkey Saved @ ${Math.floor(currentTime)}s`);
          break;
        case 'pip':
          togglePiP();
          break;
        case 'screenshot':
          takeScreenshot();
          break;
        case 'clearLoop':
          setAbLoop({ a: null, b: null, active: false });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, volume, isMuted, currentTrackId, playlist, settings, shortcutKeys]);

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
          
          {/* Top Bar: Now Playing & Toggles */}
          <div className="glass-thick depth-card p-3 md:p-3.5 rounded-2xl md:rounded-3xl flex flex-col sm:flex-row gap-3.5 items-center justify-between transition-all duration-300">
            {/* Now Playing info */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto min-w-0">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 shrink-0">
                <PlayCircle className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block font-sans">Now Playing</span>
                <p className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md font-sans">{currentTrack ? currentTrack.name : 'No file loaded'}</p>
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

          {/* Video Stage Frame */}
          <div
            ref={containerRef}
            onDragOver={handlePlayerDragOver}
            onDragLeave={handlePlayerDragLeave}
            onDrop={handlePlayerDrop}
            className={`relative flex-1 rounded-2xl md:rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-300 depth-card ${
              playerDragging 
                ? 'border-indigo-400 ring-4 ring-indigo-500/20' 
                : ''
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
              {/* Invisible Click Overlay for Double Click Skip and Single Click Pause */}
              {currentTrack && (
                <div 
                  onClick={handleVideoStageClick}
                  className="absolute inset-0 z-10 cursor-pointer"
                  title="Double click left/right to skip 10s. Single click to Play/Pause."
                />
              )}

              {/* Skip Visual Feedback Overlay */}
              <AnimatePresence>
                {skipFeedback === 'left' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-16 top-1/2 -translate-y-1/2 bg-black/75 backdrop-blur-md border border-white/10 p-5 rounded-full flex flex-col items-center justify-center text-white pointer-events-none z-30 shadow-2xl shadow-black/80"
                  >
                    <ChevronLeft className="w-6 h-6 text-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-bold font-mono tracking-wider mt-1">-10s</span>
                  </motion.div>
                )}
                {skipFeedback === 'right' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-16 top-1/2 -translate-y-1/2 bg-black/75 backdrop-blur-md border border-white/10 p-5 rounded-full flex flex-col items-center justify-center text-white pointer-events-none z-30 shadow-2xl shadow-black/80"
                  >
                    <ChevronRight className="w-6 h-6 text-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-bold font-mono tracking-wider mt-1">+10s</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {currentTrack ? (
                currentTrack.type === 'video' ? (
                  <video
                    ref={videoRef}
                    src={currentTrack.url}
                    onTimeUpdate={handleTimeUpdate}
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
                      onTimeUpdate={handleTimeUpdate}
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
              <div className="w-full grid grid-cols-1 lg:grid-cols-3 items-center gap-4 relative">
                
                {/* 1. Volume & Brightness controls & Quick Stats - now on the left */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-start lg:justify-self-start select-none">
                  
                  {/* Collapsible Volume Button (expands on hover) */}
                  <div 
                    onMouseEnter={() => setIsVolumeHovered(true)}
                    onMouseLeave={() => setIsVolumeHovered(false)}
                    className="flex items-center bg-white/[0.03] border border-white/10 p-1.5 rounded-2xl shadow-inner shrink-0 transition-all duration-300 h-10 overflow-hidden depth-card"
                  >
                    <button
                      onClick={toggleMute}
                      className="text-zinc-300 hover:text-white transition-colors shrink-0 p-1.5 hover:bg-white/[0.05] rounded-xl"
                      title="Mute Volume"
                      type="button"
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
                    
                    <div className={`flex items-center transition-all duration-300 ease-in-out ${isVolumeHovered ? 'w-24 opacity-100 ml-1.5 gap-2' : 'w-0 opacity-0 ml-0 overflow-hidden'}`}>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-14 h-1 bg-white/10 rounded-full appearance-none cursor-pointer shrink-0"
                      />
                      <span className={`text-[9px] font-mono font-bold tracking-tight shrink-0 w-8 text-right ${volume > 1.0 ? 'text-rose-400' : 'text-zinc-300'}`}>
                        {Math.round(volume * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Collapsible Brightness Button (expands on hover) */}
                  <div 
                    onMouseEnter={() => setIsBrightnessHovered(true)}
                    onMouseLeave={() => setIsBrightnessHovered(false)}
                    className="flex items-center bg-white/[0.03] border border-white/10 p-1.5 rounded-2xl shadow-inner shrink-0 transition-all duration-300 h-10 overflow-hidden depth-card"
                  >
                    <button
                      onClick={() => setVideoFilters((prev) => ({ ...prev, brightness: prev.brightness === 100 ? 50 : 100 }))}
                      className="text-zinc-300 hover:text-white transition-colors shrink-0 p-1.5 hover:bg-white/[0.05] rounded-xl"
                      title="Screen Brightness"
                      type="button"
                    >
                      <Sun className="w-4 h-4 text-amber-400" />
                    </button>
                    
                    <div className={`flex items-center transition-all duration-300 ease-in-out ${isBrightnessHovered ? 'w-24 opacity-100 ml-1.5 gap-2' : 'w-0 opacity-0 ml-0 overflow-hidden'}`}>
                      <input
                        type="range"
                        min="20"
                        max="200"
                        step="5"
                        value={videoFilters.brightness}
                        onChange={(e) => setVideoFilters((prev) => ({ ...prev, brightness: parseInt(e.target.value) }))}
                        className="w-14 h-1 bg-white/10 rounded-full appearance-none cursor-pointer shrink-0"
                      />
                      <span className="text-[9px] font-mono font-bold tracking-tight text-zinc-300 shrink-0 w-8 text-right">
                        {videoFilters.brightness}%
                      </span>
                    </div>
                  </div>

                  {/* Playback Stats Badges (Fully functional buttons with hover labels) */}
                  <div className="flex items-center gap-1.5">
                    {/* Speed Button */}
                    <button
                      onClick={cycleSpeed}
                      type="button"
                      className="group relative flex items-center justify-center bg-white/[0.04] border border-white/12 p-2 rounded-xl text-zinc-300 hover:text-white transition-all duration-300 shadow-md depth-button h-10 w-10 hover:w-20 overflow-hidden"
                      title="Set Playback Speed"
                    >
                      <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="w-0 overflow-hidden group-hover:w-auto group-hover:ml-1.5 text-[10px] font-bold font-mono leading-none opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
                        {settings.speed.toFixed(2)}x
                      </span>
                    </button>

                    {/* Aspect Ratio Button */}
                    <button
                      onClick={cycleAspectRatio}
                      type="button"
                      className="group relative flex items-center justify-center bg-white/[0.04] border border-white/12 p-2 rounded-xl text-zinc-300 hover:text-white transition-all duration-300 shadow-md depth-button h-10 w-10 hover:w-24 overflow-hidden"
                      title="Aspect Ratio Fit"
                    >
                      <Maximize className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="w-0 overflow-hidden group-hover:w-auto group-hover:ml-1.5 text-[10px] font-bold capitalize leading-none opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
                        {settings.aspectRatio}
                      </span>
                    </button>

                    {/* Subtitle Loaded Button */}
                    <button
                      onClick={handleSubtitleUploadClick}
                      type="button"
                      className="group relative flex items-center justify-center bg-white/[0.04] border border-white/12 p-2 rounded-xl text-zinc-300 hover:text-white transition-all duration-300 shadow-md depth-button h-10 w-10 hover:w-28 overflow-hidden"
                      title="Load Subtitles File"
                    >
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="w-0 overflow-hidden group-hover:w-auto group-hover:ml-1.5 text-[10px] font-bold truncate leading-none opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
                        {subtitleTrackName === 'No subtitles loaded' ? 'Load Subs' : subtitleTrackName}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. Main Transport Controls - now at the absolute center always */}
                <div className="flex items-center gap-2 justify-center w-full lg:justify-self-center lg:mx-auto">
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
                <div className="flex items-center gap-1.5 w-full justify-center lg:justify-end lg:justify-self-end">
                  
                  {/* A-B Loop Button */}
                  <button
                    onClick={() => {
                      if (abLoop.a === null) {
                        setAbLoop({ a: currentTime, b: null, active: false });
                      } else if (abLoop.b === null) {
                        if (currentTime > abLoop.a) {
                          setAbLoop({ a: abLoop.a, b: currentTime, active: true });
                        } else {
                          setAbLoop({ a: currentTime, b: null, active: false });
                        }
                      } else {
                        setAbLoop({ a: null, b: null, active: false });
                      }
                    }}
                    className={`p-2 rounded-xl transition-all duration-250 hover:scale-110 active:scale-95 flex items-center justify-center gap-1 border text-[10px] font-bold ${
                      abLoop.active 
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40' 
                        : abLoop.a !== null 
                        ? 'bg-amber-600/20 text-amber-300 border-amber-500/30 animate-pulse' 
                        : 'text-zinc-300 hover:text-white hover:bg-white/[0.06] border-transparent'
                    }`}
                    title={abLoop.active ? "A-B Loop Active. Click to Reset Loop" : abLoop.a !== null ? `A set at ${formatTime(abLoop.a)}. Click again to set End B` : "Set A-B Repeat Loop"}
                    type="button"
                  >
                    <span className="font-sans">A⇄B</span>
                    {abLoop.a !== null && (
                      <span className="text-[8px] font-mono font-bold">
                        {abLoop.active ? 'On' : 'A'}
                      </span>
                    )}
                  </button>

                  {/* Sleep Timer Preset Selector Button */}
                  <button
                    onClick={() => handleSetSleepTime(sleepTime === 0 ? 15 : sleepTime === 15 ? 30 : sleepTime === 30 ? 60 : 0)}
                    className={`p-2 rounded-xl transition-all duration-250 hover:scale-110 active:scale-95 flex items-center justify-center gap-1 border ${
                      sleepTime > 0 ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 font-bold' : 'text-zinc-300 hover:text-white hover:bg-white/[0.06] border-transparent'
                    }`}
                    title="Sleep Timer: auto-pauses when expires. Click to cycle (15m, 30m, 60m, off)"
                    type="button"
                  >
                    <Timer className="w-4 h-4" />
                    {sleepTime > 0 && (
                      <span className="text-[9px] font-mono font-bold">
                        {sleepCountdown !== null ? `${Math.ceil(sleepCountdown / 60)}m` : `${sleepTime}m`}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={takeScreenshot}
                    className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-250 hover:scale-110 active:scale-95"
                    title="Screenshot"
                    type="button"
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
            <div className={`glass-thick depth-card grid grid-cols-1 ${
              showSettingsSection && showSubtitlesSection ? 'md:grid-cols-2' : ''
            } gap-6 p-5.5 rounded-2xl md:rounded-3xl`}>
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
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer hover:bg-white/[0.04] depth-input"
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
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer hover:bg-white/[0.04] depth-input"
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
                          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 depth-button ${
                            settings.loop === 'one'
                              ? 'bg-indigo-600/30 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/20'
                              : 'text-zinc-300'
                          }`}
                          title="Repeat Current File"
                        >
                          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                          <span>Repeat</span>
                        </button>
                        <button
                          onClick={() => setSettings((p) => ({ ...p, shuffle: !p.shuffle }))}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 depth-button ${
                            settings.shuffle
                              ? 'bg-indigo-600/30 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/20'
                              : 'text-zinc-300'
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
                        className="w-full rounded-xl px-3 py-2 text-xs text-zinc-200 transition-all flex items-center justify-center gap-1.5 font-bold depth-button"
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
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer hover:bg-white/[0.04] depth-input"
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
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer hover:bg-white/[0.04] depth-input"
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
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono transition-all hover:bg-white/[0.04] depth-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                        <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Upload Subtitles</span>
                      </span>
                      <button
                        onClick={handleSubtitleUploadClick}
                        className="w-full rounded-xl px-3 py-2 text-xs text-zinc-200 transition-all flex items-center justify-center gap-1.5 truncate font-bold depth-button"
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
          <div className="lg:col-span-4 glass-thick depth-card rounded-2xl md:rounded-3xl overflow-hidden flex flex-col h-full shadow-2xl">
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
