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
  Clock
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

// 1. Initial Sample Tracks (Public stable streams with CORS support)
const INITIAL_PLAYLIST: PlaylistItem[] = [
  {
    id: 'sample-video-1',
    name: 'Big Buck Bunny (Sintel Creator Studio)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'video',
    size: '10.5 MB',
    isSample: true,
  },
  {
    id: 'sample-video-2',
    name: 'Sintel - Cinematic Open Movie',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    type: 'video',
    size: '15.2 MB',
    isSample: true,
  },
  {
    id: 'sample-video-3',
    name: 'Tears of Steel (Sci-Fi VFX)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    type: 'video',
    size: '24.1 MB',
    isSample: true,
  },
  {
    id: 'sample-video-4',
    name: 'Elephant\'s Dream (Retro CGI)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    type: 'video',
    size: '12.8 MB',
    isSample: true,
  },
  {
    id: 'sample-audio-1',
    name: 'Vibrant Electro Waves (Acoustic)',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    type: 'audio',
    size: '6.2 MB',
    isSample: true,
  },
  {
    id: 'sample-audio-2',
    name: 'Lo-Fi Chill Hop Beats',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    type: 'audio',
    size: '5.8 MB',
    isSample: true,
  }
];

// 2. Mock subtitles matching sample-video-1 and sample-video-2
const SAMPLE_SUBTITLES: { [trackId: string]: { start: number; end: number; text: string }[] } = {
  'sample-video-1': [
    { start: 1, end: 4, text: "Welcome to Big Buck Bunny!" },
    { start: 5, end: 9, text: "This is a popular open-source film used for media testing." },
    { start: 10, end: 14, text: "You can adjust subtitle delays, colors, and sizes below!" },
    { start: 15, end: 19, text: "Try dragging and dropping your own local media files." },
    { start: 20, end: 24, text: "Use the Web Audio Equalizer to boost frequencies." },
    { start: 25, end: 29, text: "Adjust Brightness, Blur, or Sepia in real-time." },
    { start: 30, end: 35, text: "Enjoy this feature-packed, VLC-style media player!" }
  ],
  'sample-video-2': [
    { start: 1, end: 4, text: "Sintel - Open movie project by Blender Foundation." },
    { start: 5, end: 8, text: "Demonstrating clean audio and cinematic gradients." },
    { start: 9, end: 13, text: "Tag moments in the 'Bookmarks' panel to jump to them later." },
    { start: 14, end: 18, text: "Click the Camera icon to capture a frame snapshot!" },
    { start: 19, end: 24, text: "Use standard hotkeys like 'Space', '[', ']', and 'Arrows'!" }
  ]
};

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
  const [currentTrackId, setCurrentTrackId] = useState<string>('sample-video-1');
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
  const [subtitleTrackName, setSubtitleTrackName] = useState<string>('Default Built-in');

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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* 1. Header Toolbar */}
      <header className="px-4 py-2.5 bg-[#09090b] border-b border-white/10 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          {/* Logo */}
          <div className="bg-indigo-600 p-1.5 rounded-md text-white shadow-sm">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-semibold tracking-tight text-zinc-100">
              Video Player
            </h1>
            <p className="text-[10px] text-zinc-400">Play video and audio files.</p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowShortcutsHelp(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px] text-zinc-300 hover:text-white transition-all font-medium border border-white/5"
            title="Shortcuts Guide"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Shortcuts</span>
          </button>
        </div>
      </header>

      {/* 2. Main Content Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-53px)]">
        
        {/* Left Side: Video Canvas Container (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col bg-[#09090b] overflow-y-auto p-3 space-y-3 custom-scrollbar">
          
          {/* Video Stage Frame */}
          <div
            ref={containerRef}
            onDragOver={handlePlayerDragOver}
            onDragLeave={handlePlayerDragLeave}
            onDrop={handlePlayerDrop}
            className={`relative flex-1 bg-black rounded-lg overflow-hidden border flex flex-col justify-between shadow-xl transition-all ${
              playerDragging ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-white/10'
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
              {currentTrack.type === 'video' ? (
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
              )}

              {/* Subtitles Overlay */}
              {activeSubtitleText && (
                <div
                  className="absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded text-center font-medium max-w-[85%] pointer-events-none z-20 select-none shadow-md backdrop-blur-sm transition-all"
                  style={{
                    backgroundColor: settings.subtitleBg,
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
            <div className="bg-zinc-950/95 p-3 flex flex-col gap-2.5 z-20 border-t border-white/10">
              
              {/* Timeline Slider with progress labels */}
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono font-semibold text-zinc-400 w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleTimelineChange}
                  className="flex-1 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                />

                <span className="text-[10px] font-mono font-semibold text-zinc-400 w-10 text-left">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Control Buttons row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                
                {/* 1. Main Transport Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={playPreviousTrack}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    title="Previous"
                  >
                    <SkipBack className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={() => seek(-5)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all"
                    title="Back 5s"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow hover:scale-105 active:scale-95 transition-all"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>

                  <button
                    onClick={() => seek(5)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all"
                    title="Forward 5s"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={playNextTrack}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    title="Next"
                  >
                    <SkipForward className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={handleStop}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    title="Stop"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                </div>

                {/* 2. Volume controls (0% to 200%) */}
                <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 px-2 py-1 rounded">
                  <button
                    onClick={toggleMute}
                    className="text-zinc-400 hover:text-white transition-colors"
                    title="Mute"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : volume > 1.2 ? (
                      <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                    ) : volume > 0.5 ? (
                      <Volume2 className="w-3.5 h-3.5" />
                    ) : (
                      <Volume1 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className={`w-16 sm:w-20 h-1 rounded appearance-none cursor-pointer bg-zinc-800 ${
                      volume > 1.0 ? 'accent-rose-500' : 'accent-indigo-500'
                    }`}
                  />
                  <span className={`text-[9px] font-mono font-bold tracking-tight w-7 text-right ${volume > 1.0 ? 'text-rose-400' : 'text-zinc-300'}`}>
                    {Math.round(volume * 100)}%
                  </span>
                </div>

                {/* 3. Utility Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={takeScreenshot}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    title="Screenshot"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>

                  {document.pictureInPictureEnabled && (
                    <button
                      onClick={togglePiP}
                      className={`p-1.5 rounded transition-colors ${
                        isPiPActive ? 'bg-indigo-600/20 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                      title="PiP"
                    >
                      <Tv className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    title="Fullscreen"
                  >
                    {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* Player Metadata Stats Box */}
          <div className="p-2.5 bg-[#121214]/60 border border-white/10 rounded-lg flex flex-wrap gap-3 items-center justify-between shadow">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              <div className="min-w-0">
                <span className="text-[9px] font-semibold text-zinc-500">Now Playing</span>
                <p className="text-xs font-medium text-zinc-200 truncate">{currentTrack.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[9px] text-zinc-500 block">Speed</span>
                <span className="text-xs font-mono text-indigo-400">{settings.speed.toFixed(2)}x</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 block">Aspect</span>
                <span className="text-xs font-mono text-zinc-300 capitalize">{settings.aspectRatio}</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 block">Subtitles</span>
                <span className="text-xs font-mono text-zinc-300 truncate max-w-[100px] block text-right">{subtitleTrackName}</span>
              </div>
            </div>
          </div>

          {/* Subtitles & Aspect Settings Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#121214]/40 p-3 rounded-lg border border-white/10">
            {/* Playback speed, loops, ratio options */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-medium">Speed</span>
                  <select
                    value={settings.speed}
                    onChange={(e) => setSettings((p) => ({ ...p, speed: parseFloat(e.target.value) }))}
                    className="w-full bg-zinc-950 border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.50x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1.00x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.50x</option>
                    <option value="2">2.00x</option>
                    <option value="4">4.00x</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-medium">Aspect Ratio</span>
                  <select
                    value={settings.aspectRatio}
                    onChange={(e) => setSettings((p) => ({ ...p, aspectRatio: e.target.value as AspectRatioType }))}
                    className="w-full bg-zinc-950 border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="fit">Fit Container</option>
                    <option value="fill">Fill Canvas</option>
                    <option value="stretch">Stretch</option>
                    <option value="16:9">Lock 16:9</option>
                    <option value="4:3">Lock 4:3</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-medium">Loop</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSettings((p) => ({ ...p, loop: p.loop === 'one' ? 'none' : 'one' }))}
                      className={`flex-1 py-1 px-1.5 border rounded text-[11px] transition-colors ${
                        settings.loop === 'one'
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                          : 'bg-zinc-950 border-white/10 hover:bg-zinc-800 text-zinc-400'
                      }`}
                      title="Loop Track"
                    >
                      <RefreshCw className="w-3 h-3 mx-auto" />
                    </button>
                    <button
                      onClick={() => setSettings((p) => ({ ...p, shuffle: !p.shuffle }))}
                      className={`flex-1 py-1 px-1.5 border rounded text-[11px] transition-colors ${
                        settings.shuffle
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                          : 'bg-zinc-950 border-white/10 hover:bg-zinc-800 text-zinc-400'
                      }`}
                      title="Shuffle"
                    >
                      <Shuffle className="w-3 h-3 mx-auto" />
                    </button>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-medium">Clear</span>
                  <button
                    onClick={() => setVideoFilters(DEFAULT_FILTERS)}
                    className="w-full bg-zinc-950 hover:bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Subtitle custom tracks uploader and delay config */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Subtitles</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-medium">Text Color</span>
                  <select
                    value={settings.subtitleColor}
                    onChange={(e) => setSettings((p) => ({ ...p, subtitleColor: e.target.value }))}
                    className="w-full bg-zinc-950 border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="#fde047">Yellow</option>
                    <option value="#ffffff">White</option>
                    <option value="#4ade80">Green</option>
                    <option value="#38bdf8">Blue</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-medium">Text Size</span>
                  <select
                    value={settings.subtitleSize}
                    onChange={(e) => setSettings((p) => ({ ...p, subtitleSize: e.target.value as any }))}
                    className="w-full bg-zinc-950 border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="xlarge">Extra Large</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-medium">Delay</span>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="0.0s"
                      value={settings.subtitleDelay}
                      onChange={(e) => setSettings((p) => ({ ...p, subtitleDelay: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-medium">File</span>
                  <button
                    onClick={handleSubtitleUploadClick}
                    className="w-full bg-zinc-950 hover:bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-300 transition-colors flex items-center justify-center gap-1 truncate"
                  >
                    <FolderOpen className="w-3 h-3 shrink-0" />
                    <span className="truncate">Load file</span>
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
          </div>

        </div>

        {/* Right Side: Tabbed Config Utilities (4 Cols) */}
        <div className="lg:col-span-4 bg-[#09090b] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col h-full overflow-hidden">
          {/* Tab Selection Header */}
          <div className="p-1.5 bg-[#121214] border-b border-white/10 flex gap-1 select-none overflow-x-auto shrink-0 custom-scrollbar">
            <button
              onClick={() => setActiveTab('playlist')}
              className={`flex-1 py-1 px-2.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                activeTab === 'playlist' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Playlist</span>
            </button>

            <button
              onClick={() => setActiveTab('equalizer')}
              className={`flex-1 py-1 px-2.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                activeTab === 'equalizer' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Equalizer</span>
            </button>

            <button
              onClick={() => setActiveTab('effects')}
              className={`flex-1 py-1 px-2.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                activeTab === 'effects' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Effects</span>
            </button>

            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex-1 py-1 px-2.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                activeTab === 'bookmarks' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BookmarkIcon className="w-3.5 h-3.5" />
              <span>Bookmarks</span>
            </button>
          </div>

          {/* Dynamic Tab Body */}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-[#09090b]">
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
                  if (id === currentTrackId && updated.length > 0) {
                    const nextId = updated[Math.min(index, updated.length - 1)].id;
                    setCurrentTrackId(nextId);
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

      </main>

      {/* Keyboard Shortcuts Help Overlay */}
      {showShortcutsHelp && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />
      )}
    </div>
  );
}
