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
    <div id="playlist-container" className="flex flex-col h-full bg-[#09090b] border border-white/10 rounded-lg overflow-hidden shadow-xl">
      {/* Playlist Header */}
      <div className="p-2.5 border-b border-white/10 bg-[#121214] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <FileVideo className="w-4 h-4 text-indigo-400" />
          <h2 className="font-medium text-zinc-100 tracking-tight text-xs">Playlist</h2>
        </div>
        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium">
          {playlist.length} {playlist.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mx-2 my-2 p-2 border border-dashed rounded flex flex-col items-center justify-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/5'
            : 'border-white/5 hover:border-white/10 hover:bg-white/5'
        }`}
      >
        <Upload className="w-4 h-4 text-zinc-400 mb-0.5" />
        <p className="text-[10px] text-zinc-300 font-medium text-center leading-none">
          Drag & drop files here
        </p>
        <p className="text-[9px] text-zinc-500 text-center mt-0.5 leading-none">
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
      <form onSubmit={handleAddUrl} className="px-2 pb-2 border-b border-white/5">
        <div className="flex gap-1">
          <div className="relative flex-1">
            <Link className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Enter video or audio URL..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-zinc-950 text-[11px] text-zinc-200 pl-6 pr-2 py-1.5 rounded border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded transition-colors shrink-0"
            title="Load URL"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Playlist List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar min-h-[180px]">
        {playlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-500 p-2">
            <Video className="w-6 h-6 opacity-20 mb-1" />
            <p className="text-[11px] text-center">The playlist is empty</p>
          </div>
        ) : (
          playlist.map((track) => {
            const isActive = track.id === currentTrackId;
            return (
              <div
                key={track.id}
                id={`playlist-item-${track.id}`}
                className={`group flex items-center justify-between p-2 rounded border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                    : 'bg-[#121214]/40 hover:bg-zinc-800/60 border-transparent text-zinc-300'
                }`}
                onClick={() => onSelectTrack(track.id)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`p-1 rounded ${isActive ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    {track.type === 'video' ? (
                      <Video className="w-3 h-3" />
                    ) : (
                      <Music className="w-3 h-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium truncate leading-none">
                      {track.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {track.size && (
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {track.size}
                        </span>
                      )}
                      {track.isSample && (
                        <span className="text-[8px] bg-emerald-950/60 text-emerald-400 px-1 py-0.2 rounded font-semibold tracking-wide">
                          Sample
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-700/50 transition-colors"
                    title="Play"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTrack(track.id);
                    }}
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                  <button
                    className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTrack(track.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
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
