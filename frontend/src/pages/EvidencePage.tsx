import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FileSearch, ChevronDown, ChevronRight, Layers, RefreshCw,
  Globe, Hash, FileCode, ArrowRight, Quote, Clock, Link2
} from 'lucide-react';
import { api } from '@/api/client';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

export default function EvidencePage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: evidence = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['evidence-full'],
    queryFn: () => api.getEvidence(100),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">Forensic Evidence Chain</h1>
          <p className="text-sm text-zinc-400 mt-1">Four-layer audit trail: Relationship → Evidence Package → Semantic Block Coordinates → Raw Page Source</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
          <SkeletonTable rows={5} />
        </div>
      ) : evidence.length === 0 ? (
        <div className="bg-white border border-zinc-100 rounded-2xl">
          <EmptyState
            icon={<FileSearch size={22} />}
            title="No evidence records compiled yet"
            description="Evidence packages are generated when corroborating observations (PGP keys, wallet addresses, styling) link entities together."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {evidence.map((ev: any, i: number) => (
            <motion.div
              key={ev.evidence_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-white border border-zinc-100 rounded-2xl overflow-hidden hover:border-zinc-200 transition-all shadow-sm"
            >
              {/* Header row */}
              <button
                onClick={() => setExpandedId(expandedId === ev.evidence_id ? null : ev.evidence_id)}
                className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-zinc-50/50 transition-colors cursor-pointer"
              >
                <div className="text-zinc-400">
                  {expandedId === ev.evidence_id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                      {ev.type || 'CORRELATION'}
                    </span>
                    {ev.relationship_type && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                        {ev.relationship_type}
                      </span>
                    )}
                    <span className="text-sm font-bold text-zinc-900 truncate">
                      {ev.description || 'Correlated identifier match'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-400 flex-wrap">
                    {ev.score != null && <><ConfidenceBadge score={ev.score} /><span>·</span></>}
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {ev.created_at ? new Date(ev.created_at).toLocaleString() : 'Recent'}
                    </span>
                    {ev.created_by && <><span>·</span><span>{ev.created_by}</span></>}
                    {ev.document?.title && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[240px] text-zinc-500 font-medium">Doc: {ev.document.title}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 bg-zinc-50 border border-zinc-100 px-2.5 py-1 rounded-lg ml-2 flex-shrink-0">
                    {ev.observations?.length ?? 0} obs
                  </span>
                </div>
              </button>

              {/* Expanded forensic dossier */}
              {expandedId === ev.evidence_id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-zinc-100 bg-zinc-50/40 px-6 py-5 space-y-5"
                >
                  {/* Entity Relationship Linkage */}
                  {ev.source_entity?.name && ev.target_entity?.name && (
                    <div className="bg-white border border-zinc-100 rounded-xl p-4 shadow-2xs">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2.5">
                        <Link2 size={12} />
                        Entity Correlation Link
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg">
                          <span className="text-[10px] font-bold uppercase text-zinc-400">{ev.source_entity.type}</span>
                          <span className="text-xs font-bold text-zinc-900">{ev.source_entity.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-400 text-xs font-mono font-bold">
                          <ArrowRight size={14} className="text-emerald-500" />
                          <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                            {ev.relationship_type || 'LINKED_TO'}
                          </span>
                          <ArrowRight size={14} className="text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg">
                          <span className="text-[10px] font-bold uppercase text-zinc-400">{ev.target_entity.type}</span>
                          <span className="text-xs font-bold text-zinc-900">{ev.target_entity.name}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Forensic Document & Coordinates Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Document Provenance */}
                    <div className="bg-white border border-zinc-100 rounded-xl p-4 shadow-2xs space-y-2.5">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        <Globe size={12} />
                        Document Provenance
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-zinc-400 block">Title</span>
                          <span className="font-semibold text-zinc-800">{ev.document?.title || 'Darknet Captured Page'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-zinc-400 block">Source URL</span>
                          <code className="text-[11px] font-mono text-zinc-700 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100 break-all select-all">
                            {ev.document?.url || '—'}
                          </code>
                        </div>
                        {ev.document?.retrieved_at && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-zinc-400 block">Ingested Timestamp</span>
                            <span className="text-zinc-600">{new Date(ev.document.retrieved_at).toUTCString()}</span>
                          </div>
                        )}
                        {ev.document?.content_hash && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-zinc-400 block">Document SHA-256</span>
                            <code className="text-[10px] font-mono text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100 break-all select-all">
                              {ev.document.content_hash}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Semantic Block Coordinates */}
                    <div className="bg-white border border-zinc-100 rounded-xl p-4 shadow-2xs space-y-2.5">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        <FileCode size={12} />
                        Forensic Coordinates
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-zinc-400 block">XPath Target</span>
                          <code className="text-[11px] font-mono text-zinc-700 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100 break-all select-all">
                            {ev.coordinates?.xpath || '/html/body/div[1]'}
                          </code>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-zinc-400 block">CSS Selector</span>
                          <code className="text-[11px] font-mono text-zinc-700 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100 break-all select-all">
                            {ev.coordinates?.css_selector || 'div.post-content'}
                          </code>
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-zinc-400 block">Block Type</span>
                            <span className="font-semibold text-zinc-800 uppercase text-[11px]">{ev.coordinates?.block_type || 'text'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-zinc-400 block">Char Offset Span</span>
                            <span className="font-mono text-zinc-600 text-xs">[{ev.coordinates?.char_start ?? 0} : {ev.coordinates?.char_end ?? '—'}]</span>
                          </div>
                        </div>
                        {ev.coordinates?.block_hash && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-zinc-400 block">Block SHA-256 Hash</span>
                            <code className="text-[10px] font-mono text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100 break-all select-all">
                              {ev.coordinates.block_hash}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Raw Text Excerpt (Chain of Custody) */}
                  {ev.raw_snippet && (
                    <div className="bg-white border border-zinc-100 rounded-xl p-4 shadow-2xs">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                        <Quote size={12} />
                        Forensic Source Text Excerpt
                      </div>
                      <div className="p-3 bg-zinc-950 text-zinc-200 rounded-lg text-xs font-mono whitespace-pre-wrap leading-relaxed border border-zinc-800 select-all max-h-48 overflow-y-auto">
                        {ev.raw_snippet}
                      </div>
                    </div>
                  )}

                  {/* Supporting Observations */}
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2.5">
                      <Layers size={12} />
                      Corroborating Observations ({ev.observations?.length ?? 0})
                    </div>
                    {ev.observations && ev.observations.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-zinc-100 bg-white shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50/50">
                              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Signal</th>
                              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Value</th>
                              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Context</th>
                              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Confidence</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50">
                            {ev.observations.map((obs: any) => (
                              <tr key={obs.id} className="hover:bg-zinc-50/50">
                                <td className="px-4 py-3">
                                  <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">{obs.type}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <code className="text-[11px] font-mono text-zinc-900 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded select-all">{obs.value}</code>
                                </td>
                                <td className="px-4 py-3 text-zinc-500 max-w-[240px] truncate">{obs.context || '—'}</td>
                                <td className="px-4 py-3">
                                  <ConfidenceBadge score={obs.confidence ?? 0.9} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-white border border-zinc-100 rounded-xl p-4 text-xs text-zinc-400">
                        No sub-observations mapped to this record.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
