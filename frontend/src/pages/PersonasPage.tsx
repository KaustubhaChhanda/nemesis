import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, RefreshCw, Search, ChevronRight, ChevronDown, FileText,
  Sparkles, Layers, ExternalLink, ArrowRight, CheckCircle2,
  Sliders, MessageSquare, ShoppingCart, GitCompare, HelpCircle, Eye,
  Clock, Globe, Calendar
} from 'lucide-react';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { EmptyState } from '@/components/EmptyState';

const MODEL_NAME = 'nemesis-hybrid-stylometry-v2';

export default function PersonasPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'matches' | 'profiles' | 'behavioral' | 'investigate'>('matches');
  const [selectedPersonaA, setSelectedPersonaA] = useState<string>('');
  const [selectedPersonaB, setSelectedPersonaB] = useState<string>('');
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Text investigation state
  const [investigateText, setInvestigateText] = useState<string>('');
  const [investigateResult, setInvestigateResult] = useState<any | null>(null);
  const [investigateLoading, setInvestigateLoading] = useState<boolean>(false);

  // Queries
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['stylometryProfiles'],
    queryFn: () => api.getStylometryProfiles(),
  });

  const { data: matches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ['stylometryMatches'],
    queryFn: () => api.getStylometryMatches(0.40),
  });

  const { data: behavioralProfiles = [], isLoading: loadingBehavioral } = useQuery({
    queryKey: ['behavioralProfiles'],
    queryFn: () => api.getBehavioralProfiles(),
  });

  const { data: behavioralMatches = [] } = useQuery({
    queryKey: ['behavioralMatches'],
    queryFn: () => api.getBehavioralMatches(),
  });

  // Rebuild mutation
  const rebuildMutation = useMutation({
    mutationFn: () => api.rebuildStylometry(),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['stylometryProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['stylometryMatches'] });
      toast.success(res?.message || 'Stylometric profiles rebuilt successfully.');
    },
    onError: (err: any) => {
      toast.error(`Rebuild failed: ${err.message}`);
    },
  });

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter((p: any) =>
      (p.persona_name || '').toLowerCase().includes(q)
    );
  }, [profiles, searchQuery]);

  // Derived metrics (strictly bold black numbers)
  const totalProfiles = profiles.length;
  const totalDocuments = useMemo(() => {
    return profiles.reduce((sum: number, p: any) => sum + (p.document_count || 0), 0);
  }, [profiles]);
  const strongMatchesCount = useMemo(() => {
    return matches.filter((m: any) => (m.overall_similarity || 0) >= 0.70).length;
  }, [matches]);

  // Handle text investigation
  const handleAnalyzeText = async () => {
    if (!investigateText.trim() || investigateText.trim().length < 15) {
      toast.error('Please enter at least 15 characters of darknet text.');
      return;
    }
    setInvestigateLoading(true);
    try {
      const res = await api.analyzeTextStylometry(investigateText, 5);
      setInvestigateResult(res);
      toast.success('Stylometric analysis completed.');
    } catch (err: any) {
      toast.error(`Analysis failed: ${err.message}`);
    } finally {
      setInvestigateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-zinc-950">
              AI-Enhanced Stylometric Persona Analysis
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Hybrid v2.1
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Correlating threat personas via traditional forensic stylometry and neural linguistic embeddings.
          </p>
        </div>

        {/* Action: Rebuild Profiles */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => rebuildMutation.mutate()}
            disabled={rebuildMutation.isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-950 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 active:scale-98 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={13} className={rebuildMutation.isPending ? 'animate-spin' : ''} />
            <span>{rebuildMutation.isPending ? 'Regenerating Profiles…' : 'Rebuild Profiles'}</span>
          </button>
        </div>
      </div>

      {/* Summary Metric Strip (Strictly bold neutral numbers) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Monitored Personas</span>
          <span className="text-lg font-bold text-zinc-950 mt-0.5 block">{totalProfiles}</span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Analyzed Documents</span>
          <span className="text-lg font-bold text-zinc-950 mt-0.5 block">{totalDocuments}</span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Corroborated Linkages</span>
          <span className="text-lg font-bold text-zinc-950 mt-0.5 block">{strongMatchesCount}</span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Neural Embedding</span>
          <span className="text-lg font-bold text-zinc-950 mt-0.5 block">128-D Dense</span>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'matches'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <GitCompare size={13} />
            <span>Persona Linkage Matches ({matches.length})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'profiles'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Brain size={13} />
            <span>Persona Profiles & Dossiers ({profiles.length})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('behavioral')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'behavioral'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            <span>Behavioral & Circadian ({behavioralProfiles.length})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('investigate')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'investigate'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} />
            <span>Investigate Text Sample</span>
          </span>
        </button>
      </div>

      {/* TAB 1: PERSONA LINKAGE MATCHES */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-600 flex items-start gap-2.5">
            <HelpCircle size={15} className="text-zinc-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-zinc-950">Probabilistic Persona Linkage:</span> Similarities represent
              corroborative evidence derived from character/word n-grams, function word frequency, punctuation patterns,
              syntactic transitions, and neural embeddings. These are calibrated leads to support investigation, not
              definitive identification.
            </div>
          </div>

          {loadingMatches ? (
            <div className="p-12 text-center text-zinc-400 text-xs">
              Evaluating stylometric similarity matrix…
            </div>
          ) : matches.length === 0 ? (
            <EmptyState
              icon={<Brain size={20} />}
              title="No stylometric matches computed"
              description="Click 'Rebuild Profiles' to run feature extraction and compute pairwise persona linkages."
            />
          ) : (
            <div className="space-y-3">
              {matches.map((m: any, idx: number) => {
                const scores = m.component_scores || {};
                const overallPct = Math.round((m.overall_similarity || 0) * 100);
                const tradPct = Math.round((m.traditional_similarity || 0) * 100);
                const embPct = Math.round((m.embedding_similarity || 0) * 100);

                return (
                  <motion.div
                    key={m.comparison_id || idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(idx * 0.03, 0.3) }}
                    className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-2xs hover:border-zinc-300 transition-all space-y-4"
                  >
                    {/* Top Row: Entities & Overall Fusion Score */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-bold font-mono">
                            {m.source_name}
                          </span>
                          <span className="text-zinc-400 text-xs font-semibold">⟷</span>
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-bold font-mono">
                            {m.target_name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded">
                          Stylistic Linkage
                        </span>
                      </div>

                      {/* Right: Confidence Badge & Fusion Score */}
                      <div className="flex items-center gap-3">
                        <ConfidenceBadge score={m.confidence_score} />
                        <div className="text-right">
                          <span className="text-sm font-bold text-zinc-950">{overallPct}% Fusion</span>
                          <span className="text-[10px] text-zinc-400 block font-mono">
                            Trad: {tradPct}% • Emb: {embPct}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Component Breakdown Bars */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-1">
                      {/* 1. Char N-grams */}
                      <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-2.5 space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                          Char N-grams
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-zinc-950">
                            {Math.round((scores.character_ngrams || 0) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-zinc-800 h-full rounded-full"
                            style={{ width: `${Math.round((scores.character_ngrams || 0) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* 2. Word N-grams */}
                      <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-2.5 space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                          Word N-grams
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-zinc-950">
                            {Math.round((scores.word_ngrams || 0) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-zinc-800 h-full rounded-full"
                            style={{ width: `${Math.round((scores.word_ngrams || 0) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* 3. Function Words */}
                      <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-2.5 space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                          Function Words
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-zinc-950">
                            {Math.round((scores.function_words || 0) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full"
                            style={{ width: `${Math.round((scores.function_words || 0) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* 4. Punctuation */}
                      <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-2.5 space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                          Punctuation
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-zinc-950">
                            {Math.round((scores.punctuation_habits || 0) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-zinc-800 h-full rounded-full"
                            style={{ width: `${Math.round((scores.punctuation_habits || 0) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* 5. Syntax / POS */}
                      <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-2.5 space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                          Syntax & POS
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-zinc-950">
                            {Math.round((scores.syntactic_structure || 0) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-600 h-full rounded-full"
                            style={{ width: `${Math.round((scores.syntactic_structure || 0) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* 6. Neural Embedding */}
                      <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-2.5 space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                          AI Embedding
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-zinc-950">
                            {Math.round((scores.neural_embedding || 0) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${Math.round((scores.neural_embedding || 0) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Forensic Evidence Summary */}
                    {m.evidence_summary && (
                      <div className="text-xs text-zinc-700 bg-zinc-50/80 border border-zinc-100 rounded-xl p-3 leading-relaxed">
                        <span className="font-bold text-zinc-950">Forensic Assessment: </span>
                        {m.evidence_summary}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PERSONA PROFILES & EVIDENCE DOSSIERS */}
      {activeTab === 'profiles' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search threat actor personas…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 shadow-2xs"
            />
          </div>

          {loadingProfiles ? (
            <div className="p-12 text-center text-zinc-400 text-xs">
              Loading stylometric persona profiles…
            </div>
          ) : filteredProfiles.length === 0 ? (
            <EmptyState
              icon={<Brain size={20} />}
              title="No persona profiles found"
              description="Click 'Rebuild Profiles' to generate stylometric profiles across monitored actors."
            />
          ) : (
            <div className="space-y-3">
              {filteredProfiles.map((p: any) => {
                const isExpanded = expandedProfileId === p.profile_id;
                const summary = p.feature_vector?.summary || {};
                const funcs = p.aggregated_profile?.top_function_words || [];
                const refs = p.source_references || [];

                return (
                  <div
                    key={p.profile_id}
                    className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs transition-all"
                  >
                    {/* Profile Header Row */}
                    <div
                      onClick={() => setExpandedProfileId(isExpanded ? null : p.profile_id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 flex-shrink-0">
                          <Brain size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-zinc-950">{p.persona_name}</h3>
                            <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                              {p.document_count} posts/listings
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 font-mono mt-0.5">
                            {p.word_count} total words • {p.character_count} chars • Model: {p.model_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Top Markers:</span>
                          {funcs.slice(0, 4).map((fw: string) => (
                            <span key={fw} className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-900 px-1.5 py-0.5 rounded">
                              {fw}
                            </span>
                          ))}
                        </div>
                        <div className="text-zinc-400">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Profile Details & Document Evidence Drawer */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-zinc-100 bg-zinc-50/40 p-5 space-y-5"
                        >
                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white border border-zinc-200 rounded-xl p-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                                Vocabulary Richness (TTR)
                              </span>
                              <span className="text-base font-bold text-zinc-950 mt-0.5 block">
                                {summary.vocabulary_richness != null ? `${Math.round(summary.vocabulary_richness * 100)}%` : '—'}
                              </span>
                            </div>

                            <div className="bg-white border border-zinc-200 rounded-xl p-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                                Avg Sentence Length
                              </span>
                              <span className="text-base font-bold text-zinc-950 mt-0.5 block">
                                {summary.avg_sentence_length != null ? `${summary.avg_sentence_length} words` : '—'}
                              </span>
                            </div>

                            <div className="bg-white border border-zinc-200 rounded-xl p-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                                Punctuation Density
                              </span>
                              <span className="text-base font-bold text-zinc-950 mt-0.5 block">
                                {summary.punctuation_density != null ? `${Math.round(summary.punctuation_density * 100)}%` : '—'}
                              </span>
                            </div>

                            <div className="bg-white border border-zinc-200 rounded-xl p-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                                Hapax Legomena Ratio
                              </span>
                              <span className="text-base font-bold text-zinc-950 mt-0.5 block">
                                {summary.hapax_ratio != null ? `${Math.round(summary.hapax_ratio * 100)}%` : '—'}
                              </span>
                            </div>
                          </div>

                          {/* Function Words Spectrum */}
                          <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2">
                            <h4 className="text-xs font-bold text-zinc-950">
                              Habitual Closed-Class Function Words
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {funcs.map((w: string) => (
                                <span
                                  key={w}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-900 text-xs font-mono font-bold"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>{w}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Source Documents & Text Evidence Retention */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-zinc-950">
                                Underlying Source Corpus ({refs.length} References)
                              </h4>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                Retained for Forensic Audit
                              </span>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
                              {refs.map((r: any, rIdx: number) => (
                                <div
                                  key={r.block_id || rIdx}
                                  className="bg-white border border-zinc-200 rounded-xl p-3 text-xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between text-[11px] text-zinc-500 border-b border-zinc-100 pb-1.5">
                                    <span className="font-mono font-semibold truncate max-w-[300px]">
                                      {r.url}
                                    </span>
                                    {r.xpath && (
                                      <span className="font-mono text-zinc-400 truncate max-w-[200px]" title={r.xpath}>
                                        {r.xpath}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-zinc-700 font-sans italic leading-relaxed select-text">
                                    "{r.text_excerpt}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BEHAVIORAL & CIRCADIAN PROFILING */}
      {activeTab === 'behavioral' && (
        <div className="space-y-6">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-600 flex items-start gap-2.5">
            <Clock size={15} className="text-zinc-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-zinc-950">Circadian Rhythm & Operational Temporal Profiling:</span> Evaluates
              temporal timestamps across collected posts, listings, and events to calculate the actor's 24-hour UTC activity
              curve, active operational window, day-of-week habits, and estimated real-world timezone.
            </div>
          </div>

          {/* Synchronicity & Cross-Persona Overlap */}
          {behavioralMatches.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                  <GitCompare size={14} className="text-zinc-600" />
                  <span>Circadian Synchronicity & Cross-Persona Overlap</span>
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  {behavioralMatches.length} correlated pairings
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {behavioralMatches.map((m: any, idx: number) => (
                  <div key={idx} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-zinc-950 font-mono">
                        {m.actor_a} <span className="text-zinc-400 font-normal">↔</span> {m.actor_b}
                      </div>
                      <ConfidenceBadge score={m.confidence ?? 0.75} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-zinc-200">
                      <div>
                        <span className="text-zinc-400 block text-[10px] uppercase font-bold">Circadian Overlap</span>
                        <span className="font-bold text-zinc-950">{Math.round((m.circadian_overlap || 0) * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[10px] uppercase font-bold">Timezone Congruence</span>
                        <span className="font-bold text-zinc-950">{m.timezone_congruence || 'High'}</span>
                      </div>
                    </div>
                    {m.shared_window && (
                      <div className="text-[10px] font-mono text-zinc-500 pt-0.5">
                        Shared Operating Window: <span className="text-zinc-800 font-semibold">{m.shared_window}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual Behavioral Dossiers */}
          {loadingBehavioral ? (
            <div className="p-12 text-center text-zinc-400 text-xs">
              Loading circadian behavioral profiles…
            </div>
          ) : behavioralProfiles.length === 0 ? (
            <EmptyState
              icon={<Clock size={20} />}
              title="No behavioral profiles generated"
              description="Behavioral profiles are derived from timestamped entity mentions and semantic blocks during intelligence correlation."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {behavioralProfiles.map((p: any) => {
                const dist24 = p.circadian_distribution_24h || Array(24).fill(0);
                const maxHourVal = Math.max(...dist24, 1);
                const days = p.day_of_week_distribution || {};
                const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

                return (
                  <div
                    key={p.actor_id || p.handle}
                    className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-2xs space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-zinc-950 font-mono">
                            {p.actor_name || p.handle || 'Threat Actor'}
                          </h3>
                          {p.platform && (
                            <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-[10px] font-mono font-semibold text-zinc-600">
                              @{p.platform}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 mt-0.5 block">
                          Based on {p.total_events || 0} observed timestamped activities
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Est. Timezone</span>
                          <span className="text-xs font-bold text-zinc-950 font-mono">
                            {p.estimated_timezone || 'UTC+00:00 (Coordinated Universal)'}
                          </span>
                        </div>
                        {p.timezone_confidence != null && (
                          <ConfidenceBadge score={p.timezone_confidence} />
                        )}
                      </div>
                    </div>

                    {/* Operational Summary Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          Active Operating Window (UTC)
                        </span>
                        <span className="text-sm font-bold text-zinc-950 font-mono mt-0.5 block">
                          {p.operating_window_utc || 'Undetermined'}
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-0.5 block">
                          Peak activity concentration window in 24-hour UTC
                        </span>
                      </div>

                      <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          Deanonymization Origin Likelihood
                        </span>
                        <span className="text-sm font-bold text-zinc-950 mt-0.5 block">
                          {p.estimated_timezone?.split('(')[1]?.replace(')', '') || 'Global Coverage'}
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-0.5 block">
                          Correlated geographic region based on circadian daylight hours
                        </span>
                      </div>
                    </div>

                    {/* 24-Hour Circadian UTC Histogram */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-950">24-Hour UTC Activity Curve</span>
                        <span className="text-[10px] text-zinc-400 font-mono">Hours 00:00 to 23:00 UTC</span>
                      </div>

                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                        <div className="flex items-end gap-1 h-24 pt-2">
                          {dist24.map((cnt: number, h: number) => {
                            const pct = Math.max((cnt / maxHourVal) * 100, cnt > 0 ? 8 : 3);
                            const hourStr = h < 10 ? `0${h}` : `${h}`;
                            const isPeak = cnt === maxHourVal && cnt > 0;

                            return (
                              <div
                                key={h}
                                className="flex-1 flex flex-col items-center h-full justify-end group relative"
                              >
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                  <div className="bg-zinc-950 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                    {hourStr}:00 UTC — {cnt} event{cnt === 1 ? '' : 's'}
                                  </div>
                                </div>
                                <div
                                  style={{ height: `${pct}%` }}
                                  className={`w-full rounded-t transition-all ${
                                    isPeak
                                      ? 'bg-zinc-950'
                                      : cnt > 0
                                      ? 'bg-zinc-700 hover:bg-zinc-950'
                                      : 'bg-zinc-200'
                                  }`}
                                />
                              </div>
                            );
                          })}
                        </div>
                        {/* Hour ticks */}
                        <div className="flex justify-between text-[9px] font-mono text-zinc-400 mt-2 border-t border-zinc-200 pt-1">
                          <span>00:00</span>
                          <span>04:00</span>
                          <span>08:00</span>
                          <span>12:00</span>
                          <span>16:00</span>
                          <span>20:00</span>
                          <span>23:00</span>
                        </div>
                      </div>
                    </div>

                    {/* Day-of-Week Distribution Strip */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-zinc-950 block">Weekly Distribution</span>
                      <div className="grid grid-cols-7 gap-1.5 text-center">
                        {dayOrder.map((day) => {
                          const count = days[day] || 0;
                          return (
                            <div
                              key={day}
                              className="bg-zinc-50 border border-zinc-200 rounded-lg py-2 px-1 text-center"
                            >
                              <span className="text-[10px] font-bold text-zinc-500 uppercase block font-mono">
                                {day}
                              </span>
                              <span className="text-xs font-bold text-zinc-950 font-mono mt-0.5 block">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INVESTIGATE TEXT SAMPLE */}
      {activeTab === 'investigate' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-zinc-950">Investigate Intercepted Text Sample</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Paste raw forum comments, market communications, or seized pastes to extract traditional stylometric
              features and generate neural embeddings, ranking suspected darknet threat actors.
            </p>
          </div>

          <div className="space-y-2">
            <textarea
              rows={5}
              placeholder="Paste intercepted dark-web post or communication text here (minimum 15 characters)…"
              value={investigateText}
              onChange={(e) => setInvestigateText(e.target.value)}
              className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-950 transition-all leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-mono">
                {investigateText.trim().split(/\s+/).filter(Boolean).length} words • {investigateText.length} characters
              </span>
              <button
                onClick={handleAnalyzeText}
                disabled={investigateLoading || investigateText.trim().length < 15}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 active:scale-98 transition-all shadow-xs disabled:opacity-50"
              >
                <Sparkles size={13} className={investigateLoading ? 'animate-spin' : ''} />
                <span>{investigateLoading ? 'Analyzing Text…' : 'Classify Against Personas'}</span>
              </button>
            </div>
          </div>

          {/* Investigation Results */}
          {investigateResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4 border-t border-zinc-100 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-950">Ranked Suspected Personas</h3>
                <span className="text-xs font-semibold text-zinc-500">
                  Model: {MODEL_NAME} ({investigateResult.embedding_dim}-D Embeddings)
                </span>
              </div>

              <div className="space-y-2.5">
                {investigateResult.ranked_matches.map((m: any, mIdx: number) => {
                  const overallPct = Math.round((m.overall_similarity || 0) * 100);
                  const tradPct = Math.round((m.traditional_similarity || 0) * 100);
                  const embPct = Math.round((m.embedding_similarity || 0) * 100);
                  const scores = m.component_scores || {};

                  return (
                    <div
                      key={m.entity_id || mIdx}
                      className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-zinc-400 font-mono">#{mIdx + 1}</span>
                          <span className="text-xs font-bold text-zinc-950 font-mono">{m.persona_name}</span>
                          <ConfidenceBadge score={m.confidence_score} />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-zinc-950">{overallPct}% Match</span>
                          <span className="text-[10px] text-zinc-400 block font-mono">
                            Traditional: {tradPct}% • Embedding: {embPct}%
                          </span>
                        </div>
                      </div>

                      {/* Component Chips */}
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className="px-2 py-1 rounded bg-white border border-zinc-200 text-zinc-800 font-mono">
                          Char N-grams: <strong className="text-zinc-950">{Math.round((scores.character_ngrams || 0) * 100)}%</strong>
                        </span>
                        <span className="px-2 py-1 rounded bg-white border border-zinc-200 text-zinc-800 font-mono">
                          Word N-grams: <strong className="text-zinc-950">{Math.round((scores.word_ngrams || 0) * 100)}%</strong>
                        </span>
                        <span className="px-2 py-1 rounded bg-white border border-zinc-200 text-zinc-800 font-mono">
                          Function Words: <strong className="text-zinc-950">{Math.round((scores.function_words || 0) * 100)}%</strong>
                        </span>
                        <span className="px-2 py-1 rounded bg-white border border-zinc-200 text-zinc-800 font-mono">
                          Punctuation: <strong className="text-zinc-950">{Math.round((scores.punctuation_habits || 0) * 100)}%</strong>
                        </span>
                        <span className="px-2 py-1 rounded bg-white border border-zinc-200 text-zinc-800 font-mono">
                          Syntax / POS: <strong className="text-zinc-950">{Math.round((scores.syntactic_structure || 0) * 100)}%</strong>
                        </span>
                        <span className="px-2 py-1 rounded bg-white border border-zinc-200 text-zinc-800 font-mono">
                          AI Embedding: <strong className="text-zinc-950">{Math.round((scores.neural_embedding || 0) * 100)}%</strong>
                        </span>
                      </div>

                      {m.evidence_summary && (
                        <p className="text-xs text-zinc-600 italic">
                          {m.evidence_summary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
