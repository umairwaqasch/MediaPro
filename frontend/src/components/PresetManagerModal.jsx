import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  X,
  Search,
  Plus,
  Zap,
  Trash2,
  Download,
  Upload,
  Star,
  Check,
  Tag,
  Maximize2,
  Crop,
  Minimize2,
  Palette,
  Volume2,
  Film,
  Sparkles,
  Scan,
  ShieldCheck,
  Sliders,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const PRESET_ICONS = {
  Maximize2: Maximize2,
  Crop: Crop,
  Minimize2: Minimize2,
  Palette: Palette,
  Volume2: Volume2,
  Film: Film,
  Sparkles: Sparkles,
  Scan: Scan,
  ShieldCheck: ShieldCheck,
  Sliders: Sliders,
  Zap: Zap,
};

export default function PresetManagerModal({
  isOpen,
  onClose,
  activeStudioMode = 'video',
  onApplyPreset,
  currentStudioParams,
}) {
  const toast = useToast();
  const [presets, setPresets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(activeStudioMode); // 'video' | 'image'
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Favorites in localStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('vp_preset_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Create form state
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState('Custom');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [newPresetTags, setNewPresetTags] = useState('');

  // Fetch presets from backend
  const fetchPresets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/mediapro/api/presets?type=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        setPresets(data.presets || []);
      }
    } catch (err) {
      console.error('Failed to fetch presets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(activeStudioMode);
    }
  }, [isOpen, activeStudioMode]);

  useEffect(() => {
    if (isOpen) {
      fetchPresets();
    }
  }, [isOpen, activeTab]);

  const toggleFavorite = (presetId, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = prev.includes(presetId)
        ? prev.filter((id) => id !== presetId)
        : [...prev, presetId];
      try {
        localStorage.setItem('vp_preset_favorites', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleApply = (preset) => {
    if (onApplyPreset) {
      onApplyPreset(preset);
      toast.success(`Preset "${preset.name}" applied!`);
      onClose();
    }
  };

  const handleCreatePreset = async (e) => {
    e.preventDefault();
    if (!newPresetName.trim()) {
      toast.error('Please provide a preset name');
      return;
    }

    const payload = {
      name: newPresetName.trim(),
      type: activeTab,
      category: newPresetCategory.trim() || 'Custom',
      description: newPresetDesc.trim(),
      icon: 'Sliders',
      tags: newPresetTags.split(',').map((t) => t.trim()).filter(Boolean),
      params: currentStudioParams || {},
    };

    try {
      const res = await fetch('/mediapro/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(`Custom preset "${payload.name}" saved!`);
        setIsCreating(false);
        setNewPresetName('');
        setNewPresetDesc('');
        setNewPresetTags('');
        fetchPresets();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(`Failed to save preset: ${err.detail || 'Server error'}`);
      }
    } catch (err) {
      toast.error(`Error saving preset: ${err.message}`);
    }
  };

  const handleDeletePreset = async (presetId, presetName, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/mediapro/api/presets/${presetId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Preset "${presetName}" deleted`);
        fetchPresets();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(`Cannot delete preset: ${err.detail || 'Server error'}`);
      }
    } catch (err) {
      toast.error(`Failed to delete preset: ${err.message}`);
    }
  };

  const handleExportPresetsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(presets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mediapro_${activeTab}_presets.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${presets.length} presets as JSON`);
  };

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set(['All', 'Favorites']);
    presets.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [presets]);

  // Filtered Presets
  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      if (activeCategory === 'Favorites' && !favorites.includes(p.id)) return false;
      if (activeCategory !== 'All' && activeCategory !== 'Favorites' && p.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = p.name.toLowerCase().includes(q);
        const inDesc = (p.description || '').toLowerCase().includes(q);
        const inTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
        return inName || inDesc || inTags;
      }
      return true;
    });
  }, [presets, activeCategory, searchQuery, favorites]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9992] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] text-zinc-900 dark:text-zinc-100 transition-colors">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-500">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Export Preset Manager & Recipes</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                1-click load production-ready export configurations or save custom workflow recipes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-zinc-200/70 dark:bg-zinc-900 p-0.5 rounded-xl text-xs font-bold border border-zinc-300 dark:border-zinc-800">
              <button
                onClick={() => {
                  setActiveTab('video');
                  setIsCreating(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'video'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Video Presets
              </button>
              <button
                onClick={() => {
                  setActiveTab('image');
                  setIsCreating(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'image'
                    ? 'bg-cyan-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Image Presets
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search + Category Pills + Actions */}
        {!isCreating && (
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    activeCategory === cat
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {cat === 'Favorites' ? `★ Favorites (${favorites.length})` : cat}
                </button>
              ))}
            </div>

            {/* Search & Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative w-48 sm:w-60">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                onClick={() => setIsCreating(true)}
                className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                title="Save current studio parameters as a new recipe"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Preset</span>
              </button>

              <button
                onClick={handleExportPresetsJSON}
                className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition"
                title="Export presets as JSON"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* Create Preset View */}
          {isCreating ? (
            <form onSubmit={handleCreatePreset} className="max-w-lg mx-auto space-y-4 py-4">
              <div className="text-center space-y-1 mb-4">
                <h3 className="text-base font-bold">Save Current Parameters as Preset</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Snapshots all active tool parameters in {activeTab === 'video' ? 'Video' : 'Image'} Studio into a reusable recipe.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Preset Name</label>
                <input
                  type="text"
                  placeholder="e.g. 4K Cinema Master 24fps"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-brand-500"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Social, Grading"
                    value={newPresetCategory}
                    onChange={(e) => setNewPresetCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. 4K, YouTube, Pro"
                    value={newPresetTags}
                    onChange={(e) => setNewPresetTags(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Optional notes or intended use case..."
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20"
                >
                  Save Preset
                </button>
              </div>
            </form>
          ) : (
            /* Preset Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredPresets.map((preset) => {
                const IconComponent = PRESET_ICONS[preset.icon] || Sliders;
                const isFav = favorites.includes(preset.id);

                return (
                  <div
                    key={preset.id}
                    className="group relative p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/80 shadow-sm hover:shadow-md hover:border-brand-500/50 dark:hover:border-brand-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-500">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-brand-500 transition">
                              {preset.name}
                            </h4>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                              {preset.category || 'Preset'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => toggleFavorite(preset.id, e)}
                            className={`p-1.5 rounded-lg transition ${
                              isFav
                                ? 'text-amber-500 hover:text-amber-600'
                                : 'text-zinc-300 dark:text-zinc-600 hover:text-amber-500'
                            }`}
                            title={isFav ? 'Remove from favorites' : 'Star favorite'}
                          >
                            <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                          </button>

                          {!preset.is_builtin && (
                            <button
                              onClick={(e) => handleDeletePreset(preset.id, preset.name, e)}
                              className="p-1.5 rounded-lg text-zinc-300 dark:text-zinc-600 hover:text-rose-500 transition"
                              title="Delete custom preset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
                        {preset.description || 'Custom parameter recipe'}
                      </p>

                      {/* Tags */}
                      {preset.tags && preset.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {preset.tags.map((tag, ti) => (
                            <span
                              key={ti}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={() => handleApply(preset)}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-500 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98 group/btn"
                    >
                      <span>Load Recipe</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!isCreating && filteredPresets.length === 0 && (
            <div className="text-center py-16 text-zinc-400 text-xs">
              No presets found for "{searchQuery || activeCategory}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between text-xs text-zinc-500">
          <span>{presets.length} presets available in {activeTab === 'video' ? 'Video' : 'Image'} library</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
