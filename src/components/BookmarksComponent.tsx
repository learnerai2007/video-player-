import React, { useState } from 'react';
import { Bookmark } from '../types';
import { Bookmark as BookmarkIcon, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';

interface BookmarksComponentProps {
  bookmarks: Bookmark[];
  currentTime: number;
  onAddBookmark: (time: number, note: string) => void;
  onDeleteBookmark: (id: string) => void;
  onSeekTo: (time: number) => void;
}

export default function BookmarksComponent({
  bookmarks,
  currentTime,
  onAddBookmark,
  onDeleteBookmark,
  onSeekTo,
}: BookmarksComponentProps) {
  const [note, setNote] = useState('');

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${hrs > 0 ? `${pad(hrs)}:` : ''}${pad(mins)}:${pad(secs)}.${pad(ms)}`;
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNote = note.trim() || `Bookmark @ ${formatTime(currentTime)}`;
    onAddBookmark(currentTime, finalNote);
    setNote('');
  };

  // Sort bookmarks by chronological order
  const sortedBookmarks = [...bookmarks].sort((a, b) => a.time - b.time);

  return (
    <div id="bookmarks-container" className="bg-[#09090b] border border-white/10 rounded-lg p-3 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <div className="flex items-center gap-1.5">
          <BookmarkIcon className="w-4 h-4 text-indigo-400" />
          <h2 className="font-medium text-zinc-100 text-xs tracking-tight">Bookmarks</h2>
        </div>
        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
          {formatTime(currentTime)}
        </span>
      </div>

      {/* Add Bookmark form */}
      <form onSubmit={handleAdd} className="flex gap-1 mb-3">
        <input
          type="text"
          placeholder="Enter a note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1 bg-zinc-950 text-[11px] text-zinc-200 px-2 py-1.5 rounded border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] px-2.5 py-1.5 rounded font-medium flex items-center gap-1 shrink-0 transition-colors"
          title="Add Bookmark"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto p-0.5 space-y-1.5 custom-scrollbar min-h-[140px]">
        {sortedBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 text-zinc-500 p-2">
            <BookmarkIcon className="w-6 h-6 opacity-20 mb-1" />
            <p className="text-[11px] text-center">No bookmarks yet</p>
            <p className="text-[9px] text-zinc-600 text-center mt-0.5">
              Add moments to easily jump back to them
            </p>
          </div>
        ) : (
          sortedBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="group flex items-center justify-between bg-zinc-950/40 hover:bg-zinc-950 border border-white/5 hover:border-white/10 p-2 rounded transition-all"
            >
              <button
                type="button"
                onClick={() => onSeekTo(bookmark.time)}
                className="flex items-start gap-1.5 text-left min-w-0 flex-1 group/btn"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0 group-hover/btn:text-indigo-300" />
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[10px] font-semibold text-indigo-400 hover:underline block leading-none mb-0.5">
                    {formatTime(bookmark.time)}
                  </span>
                  <p className="text-[11px] text-zinc-300 truncate leading-tight group-hover/btn:text-zinc-100">
                    {bookmark.note}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onDeleteBookmark(bookmark.id)}
                className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-2.5 bg-zinc-950/20 p-1.5 rounded border border-white/5">
        <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        <span>Click a bookmark to play from that moment.</span>
      </div>
    </div>
  );
}
