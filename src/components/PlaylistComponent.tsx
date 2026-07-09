import React, { useRef, useState } from 'react';
import { PlaylistItem } from '../types';
import { Play, Plus, Trash2, Video, Music, Link, FileVideo, Upload } from 'lucide-react';

interface PlaylistComponentProps {
  playlist: PlaylistItem[];
  currentTrackId: string | null;
  onSelectTrack: (trackId: string) => void;
  onAddTrack: (track: Omit<PlaylistItem, 'id'>) => void;
  onRemoveTrack: (trackId: string) => void;
}

export default function PlaylistComponent({
  playlist,
  currentTrackId,
  onSelectTrack,
  onAddTrack,
  onRemoveTrack,
}: PlaylistComponentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file: File) => {
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('audio/') ? 'audio' : 'video';
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        onAddTrack({
          name: file.name,
          url,
          type,
          size: `${sizeMB} MB`,
        });
      });
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const url = urlInput.trim();
    // basic guess for type, defaults to video
    const isAudio = url.match(/\.(mp3|wav|ogg|aac|flac|m4a)(\?.*)?$/i);
    const type = isAudio ? 'audio' : 'video';
    const name = url.split('/').pop()?.split('?')[0] || 'Web Stream';

    onAddTrack({
      name,
      url,
      type,
      size: 'Web URL',
    });
    setUrlInput('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach((file: File) => {
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('audio/') ? 'audio' : 'video';
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        onAddTrack({
          name: file.name,
          url,
          type,
          size: `${sizeMB} MB`,
        });
      });
    }
  };

  return (
    <div id="playlist-container" className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Playlist Header */}
      <div className="p-3 border-b border-white/10 bg-black/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <FileVideo className="w-4 h-4 text-indigo-400" />
          <h2 className="font-bold text-zinc-100 tracking-tight text-xs font-display">Playlist</h2>
        </div>
        <span className="text-[10px] bg-white/5 border border-white/10 text-zinc-300 px-2 py-0.5 rounded-md font-semibold font-mono">
          {playlist.length} {playlist.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mx-3 my-3 p-3 border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-inner ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/10'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
        }`}
      >
        <Upload className="w-4 h-4 text-indigo-400 mb-1" />
        <p className="text-[10px] text-zinc-200 font-bold text-center leading-none">
          Drag & drop files here
        </p>
        <p className="text-[9px] text-zinc-400 text-center mt-1 leading-none">
          or click to select files
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="video/*,audio/*"
          multiple
          className="hidden"
        />
      </div>

      {/* URL Input */}
      <form onSubmit={handleAddUrl} className="px-3 pb-3 border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Enter video or audio URL..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-black/40 text-[11px] text-zinc-200 pl-8 pr-2.5 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all depth-input"
            />
          </div>
          <button
            type="submit"
            className="glass-primary text-white p-2 rounded-xl hover:scale-105 active:scale-95 transition-all shrink-0 depth-button"
            title="Load URL"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Playlist List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar min-h-[180px]">
        {playlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-500 p-2">
            <Video className="w-6 h-6 opacity-25 mb-1 text-indigo-400" />
            <p className="text-[11px] text-center font-medium">The playlist is empty</p>
          </div>
        ) : (
          playlist.map((track) => {
            const isActive = track.id === currentTrackId;
            return (
              <div
                key={track.id}
                id={`playlist-item-${track.id}`}
                className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/25 border-indigo-500/40 text-white shadow-lg shadow-indigo-500/10'
                    : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.02] hover:border-white/[0.06] text-zinc-300'
                }`}
                onClick={() => onSelectTrack(track.id)}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`p-1.5 rounded-lg border transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white border-white/20' 
                      : 'bg-white/5 text-zinc-400 border-white/10'
                  }`}>
                    {track.type === 'video' ? (
                      <Video className="w-3 h-3" />
                    ) : (
                      <Music className="w-3 h-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-bold truncate leading-none ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                      {track.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {track.size && (
                        <span className="text-[9px] text-zinc-400 font-semibold font-mono">
                          {track.size}
                        </span>
                      )}
                      {track.isSample && (
                        <span className="text-[8px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-1 py-0.2 rounded font-semibold tracking-wide">
                          Sample
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                  <button
                    className="p-1.5 text-zinc-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                    title="Play"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTrack(track.id);
                    }}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <button
                    className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTrack(track.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
