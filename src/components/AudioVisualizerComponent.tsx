import React, { useRef, useEffect, useState } from 'react';
import { Radio, Music, Flame, Activity } from 'lucide-react';

interface AudioVisualizerComponentProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  isAudioOnly: boolean;
}

type VisualizerMode = 'bars' | 'wave' | 'ring';

export default function AudioVisualizerComponent({
  analyser,
  isPlaying,
  isAudioOnly,
}: AudioVisualizerComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<VisualizerMode>('bars');
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    let bufferLength = 128;
    let dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Clear with elegant dark transparent gradient tail for motion blur
      ctx.fillStyle = 'rgba(10, 10, 10, 0.25)';
      ctx.fillRect(0, 0, width, height);

      if (analyser) {
        analyser.fftSize = 256;
        bufferLength = analyser.frequencyBinCount;
        if (dataArray.length !== bufferLength) {
          dataArray = new Uint8Array(bufferLength);
        }

        if (mode === 'wave') {
          analyser.getByteTimeDomainData(dataArray);
        } else {
          analyser.getByteFrequencyData(dataArray);
        }
      } else {
        // Mock data when no analyser is available to keep the screen active and beautiful
        const time = Date.now() * 0.003;
        for (let i = 0; i < bufferLength; i++) {
          if (isPlaying) {
            if (mode === 'wave') {
              dataArray[i] = 128 + Math.sin(i * 0.15 + time) * 30 * Math.sin(i * 0.05 + time * 0.5);
            } else {
              dataArray[i] = Math.max(0, 40 + Math.sin(i * 0.2 + time) * 35 + Math.cos(i * 0.05 - time) * 15);
            }
          } else {
            dataArray[i] = mode === 'wave' ? 128 : 10;
          }
        }
      }

      if (mode === 'bars') {
        // Draw elegant equalizer bars
        const barWidth = (width / bufferLength) * 1.6;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height * 0.85;

          // Vibrant neon gradient
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, '#4f46e5'); // Indigo-600
          gradient.addColorStop(0.5, '#6366f1'); // Indigo-500
          gradient.addColorStop(1, '#a5b4fc'); // Indigo-300

          ctx.fillStyle = gradient;
          
          // Draw rounded bars
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth - 2, barHeight, [2, 2, 0, 0]);
          ctx.fill();

          x += barWidth;
        }
      } else if (mode === 'wave') {
        // Draw elegant oscilloscope wave
        ctx.lineWidth = 3;
        
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#6366f1'); // Indigo-500
        gradient.addColorStop(0.5, '#ec4899'); // Pink-500
        gradient.addColorStop(1, '#3b82f6'); // Blue-500
        ctx.strokeStyle = gradient;

        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else if (mode === 'ring') {
        // Draw circular audio responsive ring
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.22;

        // Draw multiple rings
        const levels = 3;
        for (let r = 0; r < levels; r++) {
          ctx.beginPath();
          ctx.lineWidth = r === 0 ? 3 : 1.5;
          
          const opacity = r === 0 ? 1 : 0.4 / r;
          ctx.strokeStyle = r === 0 
            ? 'rgba(99, 102, 241, ' + opacity + ')' // Indigo
            : r === 1 
              ? 'rgba(236, 72, 153, ' + opacity + ')' // Pink
              : 'rgba(59, 130, 246, ' + opacity + ')'; // Blue

          const numPoints = 64;
          for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const dataIndex = Math.floor((i / numPoints) * bufferLength);
            const value = dataArray[dataIndex] || 0;
            
            // scale the audio reactivity
            const offset = (value / 255) * baseRadius * 0.45 * (1 - r * 0.15);
            const radius = baseRadius + offset;

            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.closePath();
          ctx.stroke();
        }

        // Add subtle center pulse
        let avgValue = 0;
        for (let i = 0; i < bufferLength; i++) {
          avgValue += dataArray[i];
        }
        avgValue /= bufferLength;
        const pulseRatio = avgValue / 255;

        const innerGradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, baseRadius * 0.6);
        innerGradient.addColorStop(0, `rgba(99, 102, 241, ${0.15 + pulseRatio * 0.25})`);
        innerGradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [analyser, mode, isPlaying]);

  return (
    <div className="relative flex flex-col h-full bg-zinc-950 rounded-lg overflow-hidden border border-white/10 group">
      {/* Background visualizer when audio is playing */}
      <canvas ref={canvasRef} className="w-full h-full flex-1 block" />

      {/* Visualizer Floating Controls */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-[#09090b]/80 backdrop-blur-md px-2 py-1 rounded border border-white/10">
        <Activity className="w-3 h-3 text-indigo-400 animate-pulse shrink-0" />
        <span className="text-[10px] font-medium text-zinc-200 tracking-tight">Visualizer</span>
      </div>

      <div className="absolute top-2 right-2 flex gap-0.5 bg-[#09090b]/80 backdrop-blur-md p-0.5 rounded border border-white/10">
        <button
          onClick={() => setMode('bars')}
          className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-all ${
            mode === 'bars' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Bars
        </button>
        <button
          onClick={() => setMode('wave')}
          className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-all ${
            mode === 'wave' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Wave
        </button>
        <button
          onClick={() => setMode('ring')}
          className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-all ${
            mode === 'ring' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Ring
        </button>
      </div>

      {isAudioOnly && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent">
          <div className="bg-indigo-600/10 p-3 rounded-full border border-indigo-500/20 mb-2 animate-bounce">
            <Music className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-[11px] text-zinc-300 font-medium leading-none">Audio Mode</p>
          <span className="text-[9px] text-zinc-500 mt-1">Visualizer is running</span>
        </div>
      )}
    </div>
  );
}
