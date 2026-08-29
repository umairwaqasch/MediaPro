import React, { useState } from 'react';
import {
  Keyboard,
  X,
  Search,
  Command,
  Play,
  RotateCcw,
  Sliders,
  Scissors,
  Layers,
  Sparkles,
} from 'lucide-react';

const SHORTCUT_CATEGORIES = [
  {
    name: 'History & Editing',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], desc: 'Undo last parameter or edit action' },
      { keys: ['Ctrl', 'Y'], desc: 'Redo previously undone action' },
      { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Alternative Redo shortcut' },
      { keys: ['Ctrl', 'S'], desc: 'Quick Apply / Process current tool' },
      { keys: ['Ctrl', 'H'], desc: 'Open Visual Action History Drawer' },
    ],
  },
  {
    name: 'Video Transport & Timeline',
    shortcuts: [
      { keys: ['Space'], desc: 'Play / Pause video playback' },
      { keys: ['I'], desc: 'Set In-Point (start trim) at playhead' },
      { keys: ['O'], desc: 'Set Out-Point (end trim) at playhead' },
      { keys: ['Ctrl', '←'], desc: 'Step playhead backward by 1 frame' },
      { keys: ['Ctrl', '→'], desc: 'Step playhead forward by 1 frame' },
    ],
  },
  {
    name: 'Workspace & Studio Modes',
    shortcuts: [
      { keys: ['Ctrl', '1'], desc: 'Switch to Video Studio mode' },
      { keys: ['Ctrl', '2'], desc: 'Switch to Image Studio mode' },
      { keys: ['Ctrl', 'T'], desc: 'Toggle Global Task & GPU Center' },
      { keys: ['M'], desc: 'Open Media & Output Library drawer' },
      { keys: ['Esc'], desc: 'Close any active modal, drawer, or dialog' },
      { keys: ['?'], desc: 'Open this Keyboard Shortcuts cheatsheet' },
    ],
  },
];

export default function HotkeyModal({ isOpen, onClose }) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredCategories = SHORTCUT_CATEGORIES.map((cat) => ({
    ...cat,
    shortcuts: cat.shortcuts.filter(
      (s) =>
        s.desc.toLowerCase().includes(search.toLowerCase()) ||
        s.keys.some((k) => k.toLowerCase().includes(search.toLowerCase()))
    ),
  })).filter((cat) => cat.shortcuts.length > 0);

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-zinc-900 dark:text-zinc-100 transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Keyboard Shortcuts Cheatsheet</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Speed up your editing workflow with professional hotkeys
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shortcuts (e.g. undo, trim, play)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {filteredCategories.map((category) => (
            <div key={category.name} className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {category.name}
              </h3>

              <div className="grid grid-cols-1 gap-2">
                {category.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                  >
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                      {shortcut.desc}
                    </span>

                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="px-2 py-1 text-[11px] font-mono font-bold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center py-10 text-zinc-400 text-xs">
              No shortcuts found matching "{search}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between text-xs text-zinc-500">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px] text-zinc-700 dark:text-zinc-300">?</kbd> anywhere to open this menu</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold text-xs transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
