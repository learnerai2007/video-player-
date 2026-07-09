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
    <div id="bookmarks-container" className="bg-transparent flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-1.5">
          <BookmarkIcon className="w-4 h-4 text-indigo-400" />
          <h2 className="font-bold text-zinc-100 text-xs tracking-tight font-display">Bookmarks</h2>
        </div>
        <span className="text-[10px] bg-white/5 border border-white/10 text-zinc-300 px-2 py-0.5 rounded-md font-semibold font-mono">
          {formatTime(currentTime)}
        </span>
      </div>

      {/* Add Bookmark form */}
      <form onSubmit={handleAdd} className="flex gap-1.5 mb-3.5">
        <input
          type="text"
          placeholder="Enter a note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1 bg-black/40 text-[11px] text-zinc-200 px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
        />
        <button
          type="submit"
          className="glass-primary text-white text-[11px] px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1 shrink-0 transition-all hover:scale-105 active:scale-95"
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
            <BookmarkIcon className="w-6 h-6 opacity-25 mb-1.5 text-indigo-400" />
            <p className="text-[11px] text-center font-medium">No bookmarks yet</p>
            <p className="text-[9px] text-zinc-400 text-center mt-1">
              Add moments to easily jump back to them
            </p>
          </div>
        ) : (
          sortedBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="group flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.02] hover:border-white/10 p-2.5 rounded-xl transition-all duration-300"
            >
              <button
                type="button"
                onClick={() => onSeekTo(bookmark.time)}
                className="flex items-start gap-1.5 text-left min-w-0 flex-1 group/btn"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0 group-hover/btn:text-indigo-300" />
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[10px] font-bold text-indigo-400 group-hover/btn:underline block leading-none mb-1">
                    {formatTime(bookmark.time)}
                  </span>
                  <p className="text-[11px] text-zinc-200 truncate leading-tight group-hover/btn:text-white">
                    {bookmark.note}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onDeleteBookmark(bookmark.id)}
                className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Info footer */}
      <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-3 bg-black/20 p-2.5 rounded-xl border border-white/10">
        <AlertCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>Click a bookmark to play from that moment.</span>
      </div>
    </div>
  );
}
