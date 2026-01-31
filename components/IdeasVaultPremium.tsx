import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../contexts/AppContext';

const IdeasVaultPremium: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { data, ideas, addIdea, removeIdea, handlePillarClick, setCurrentView } = useAppContext();

  const [isIdeaCreateOpen, setIsIdeaCreateOpen] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaTagsCsv, setIdeaTagsCsv] = useState('');
  const [ideaGoalId, setIdeaGoalId] = useState<number | 'none'>('none');

  const [ideaSearch, setIdeaSearch] = useState('');
  const [ideaFilterGoalId, setIdeaFilterGoalId] = useState<number | 'all'>('all');

  const pillarNameById = useMemo(() => {
    const map = new Map<number, string>();
    (data?.pillars ?? []).forEach((p) => map.set(p.id, p.name));
    return map;
  }, [data?.pillars]);

  const filteredIdeas = useMemo(() => {
    const list = Array.isArray(ideas) ? ideas : [];
    const search = ideaSearch.trim().toLowerCase();
    const goalFilter = ideaFilterGoalId;

    const sorted = [...list].sort((a: any, b: any) => {
      const aMs = new Date(a?.updatedAt ?? a?.createdAt ?? 0).getTime();
      const bMs = new Date(b?.updatedAt ?? b?.createdAt ?? 0).getTime();
      return (Number.isFinite(bMs) ? bMs : 0) - (Number.isFinite(aMs) ? aMs : 0);
    });

    return sorted.filter((idea: any) => {
      if (goalFilter !== 'all') {
        const gid = Number(idea?.goalId);
        if (!Number.isFinite(gid) || gid !== goalFilter) return false;
      }

      if (!search) return true;

      const title = String(idea?.title ?? '').toLowerCase();
      const desc = String(idea?.description ?? '').toLowerCase();
      const tags = Array.isArray(idea?.tags) ? idea.tags.join(' ').toLowerCase() : '';

      return title.includes(search) || desc.includes(search) || tags.includes(search);
    });
  }, [ideas, ideaFilterGoalId, ideaSearch]);

  const canAddIdea = ideaTitle.trim().length > 0;

  return (
    <div className="min-h-screen pb-32 pt-8 px-6">
      <motion.div
        className="widget-container-narrow mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={onBack} className="btn-premium btn-cyan mb-8">
          ← Wróć
        </button>

        <div className="flex items-center gap-4 mb-4">
          <span className="text-6xl">💡</span>
          <h1 className="text-6xl font-extrabold uppercase tracking-wider text-gradient-gold">
            Skarbiec pomysłów
          </h1>
        </div>
        <p className="text-sm text-gray-400 uppercase tracking-wider">
          /// Biblioteka pomysłów do planowania
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="widget-container-narrow mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="glass-card p-6" style={{ borderRadius: '16px' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                Szukaj
              </label>
              <input
                value={ideaSearch}
                onChange={(e) => setIdeaSearch(e.target.value.slice(0, 120))}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                placeholder="tytuł / opis / tagi…"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                Cel
              </label>
              <select
                value={ideaFilterGoalId}
                onChange={(e) => {
                  const v = e.target.value;
                  setIdeaFilterGoalId(v === 'all' ? 'all' : Number(v));
                }}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="all">all</option>
                {(data?.pillars ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Create form */}
      {isIdeaCreateOpen && (
        <motion.div
          className="widget-container-narrow mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="glass-card p-6" style={{ borderRadius: '16px' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                  Tytuł
                </label>
                <input
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value.slice(0, 120))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="np. mikro‑funkcja do Sprintu 3"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                  Cel (opcjonalnie)
                </label>
                <select
                  value={ideaGoalId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setIdeaGoalId(v === 'none' ? 'none' : Number(v));
                  }}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="none">brak</option>
                  {(data?.pillars ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                Opis (opcjonalnie)
              </label>
              <textarea
                value={ideaDescription}
                onChange={(e) => setIdeaDescription(e.target.value.slice(0, 2000))}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                placeholder="kontekst / po co / następny krok…"
                rows={3}
              />
            </div>

            <div className="mt-4">
              <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                Tagi (oddzielone przecinkami)
              </label>
              <input
                value={ideaTagsCsv}
                onChange={(e) => setIdeaTagsCsv(e.target.value.slice(0, 240))}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                placeholder="np. AI, UX, sprint, nagroda"
              />
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => {
                  setIsIdeaCreateOpen(false);
                  setIdeaTitle('');
                  setIdeaDescription('');
                  setIdeaTagsCsv('');
                  setIdeaGoalId('none');
                }}
                className="btn-premium btn-cyan"
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  const title = ideaTitle.trim();
                  if (!title) return;
                  const tags = ideaTagsCsv
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);

                  addIdea({
                    title,
                    description: ideaDescription.trim() || undefined,
                    goalId: ideaGoalId === 'none' ? undefined : ideaGoalId,
                    tags: tags.length > 0 ? tags : undefined,
                  });

                  setIdeaTitle('');
                  setIdeaDescription('');
                  setIdeaTagsCsv('');
                  setIdeaGoalId('none');
                  setIsIdeaCreateOpen(false);
                }}
                disabled={!canAddIdea}
                className="btn-premium btn-magenta disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Dodaj
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Create button */}
      {!isIdeaCreateOpen && (
        <motion.div
          className="widget-container-narrow mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <button onClick={() => setIsIdeaCreateOpen(true)} className="btn-premium btn-cyan w-full">
            ➕ New idea
          </button>
        </motion.div>
      )}

      {/* List */}
      <motion.div
        className="widget-container-narrow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {filteredIdeas.length === 0 ? (
          <div className="glass-card space-widget-lg text-center">
            <span className="text-6xl mb-4 block">🗃️</span>
            <p className="text-white text-xl mb-2">
              {ideaSearch.trim() || ideaFilterGoalId !== 'all'
                ? 'Brak pomysłów pasujących do filtrów'
                : 'Brak pomysłów'}
            </p>
            <p className="text-sm text-gray-400">
              {ideaSearch.trim() || ideaFilterGoalId !== 'all'
                ? 'Spróbuj zmienić wyszukiwanie lub filtry.'
                : 'Dodaj pierwszy pomysł, żeby zbudować bibliotekę planowania.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIdeas.slice(0, 50).map((idea: any) => {
              const goalLabel = idea.goalId ? pillarNameById.get(Number(idea.goalId)) : null;
              const tags: string[] = Array.isArray(idea.tags) ? idea.tags : [];
              return (
                <div
                  key={idea.id}
                  className="glass-card space-widget hover:border-neon-cyan/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-bold text-white break-words">{idea.title}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1 flex items-center gap-2">
                        {goalLabel ? (
                          <>
                            <span>Cel: {goalLabel}</span>
                            <button
                              onClick={() => {
                                handlePillarClick(Number(idea.goalId));
                                setCurrentView('pillar_detail');
                              }}
                              className="text-cyan-400 hover:text-cyan-300 underline text-xs"
                            >
                              Otwórz →
                            </button>
                          </>
                        ) : (
                          <span>Cel: brak</span>
                        )}{' '}
                        • {new Date(idea.updatedAt ?? idea.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => removeIdea(idea.id)}
                      className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 hover:bg-red-500/15 flex-shrink-0"
                    >
                      Usuń
                    </button>
                  </div>

                  {idea.description && (
                    <p className="text-sm text-gray-200 whitespace-pre-wrap break-words mb-3">
                      {idea.description}
                    </p>
                  )}

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.slice(0, 8).map((t) => (
                        <span
                          key={`${idea.id}_${t}`}
                          className="text-[11px] px-2 py-1 rounded border border-white/10 bg-white/5 text-gray-200"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredIdeas.length > 50 && (
              <p className="text-xs text-center text-gray-500 mt-4">
                Pokazuję pierwsze 50 z {filteredIdeas.length} pomysłów (użyj wyszukiwania/filtrów).
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default IdeasVaultPremium;
