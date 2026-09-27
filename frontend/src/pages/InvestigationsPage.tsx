import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronRight, X, Link2, Clock, FileSearch, FileText, Target, Globe, Server, Copy, Check, AlertCircle } from 'lucide-react';
import { api } from '@/api/client';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { toast } from 'sonner';

function ActorDrawer({ actor, onClose }: { actor: any; onClose: () => void }) {
  const [tab, setTab] = useState<'attribution' | 'identifiers' | 'timeline' | 'evidence'>('attribution');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const { data: full } = useQuery({
    queryKey: ['actor', actor.id],
    queryFn: () => api.getActor(actor.id),
  });
  const { data: timeline = [] } = useQuery({
    queryKey: ['timeline', actor.id],
    queryFn: () => api.getTimeline(actor.id),
    enabled: tab === 'timeline',
  });
  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence', actor.id],
    queryFn: () => api.getEvidence(50, actor.id),
    enabled: tab === 'evidence',
  });
  const { data: attribution, isLoading: loadingAttribution } = useQuery({
    queryKey: ['actorDeanonymization', actor.id],
    queryFn: () => api.getActorDeanonymization(actor.id),
    enabled: tab === 'attribution',
  });

  const tabs = [
    { key: 'attribution', label: 'Attribution', icon: <Target size={12} /> },
    { key: 'identifiers', label: 'Identifiers', icon: <Link2 size={12} /> },
    { key: 'timeline',    label: 'Timeline',    icon: <Clock size={12} /> },
    { key: 'evidence',    label: 'Evidence',    icon: <FileSearch size={12} /> },
  ] as const;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-14 bottom-0 w-[440px] bg-white border-l border-zinc-100 z-40 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-zinc-50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-zinc-900">{actor.label || actor.id}</h2>
            <ConfidenceBadge score={actor.confidence ?? 0} />
          </div>
          <p className="text-xs text-zinc-400 font-mono">{actor.id}</p>
          <span className="inline-flex text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-md mt-1.5">{actor.status}</span>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors p-1"><X size={18} /></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 border-b border-zinc-50">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              tab === t.key ? 'border-zinc-950 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {tab === 'attribution' && (
          <div className="space-y-4">
            {loadingAttribution ? (
              <div className="p-8 text-center text-zinc-400 text-xs">
                Synthesizing deanonymization leads and telemetry...
              </div>
            ) : !attribution ? (
              <EmptyState icon={<Target size={18} />} title="No attribution data" description="Attribution telemetry is not yet synthesized for this actor." />
            ) : (
              <div className="space-y-4">
                {/* Feasibility & Score Card */}
                <div className="bg-zinc-950 text-white rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Deanonymization Likelihood
                    </span>
                    <span className="text-sm font-bold font-mono text-white">
                      {Math.round((attribution.deanonymization_score || 0) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-white h-full transition-all"
                      style={{ width: `${Math.round((attribution.deanonymization_score || 0) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-300">
                    <span>Status: <strong className="text-white">{attribution.attribution_level || 'Preliminary'}</strong></span>
                    <span className="font-mono text-[10px] text-zinc-400">{attribution.total_evidence || 0} Evidentiary Links</span>
                  </div>
                </div>

                {/* Summary Lead Narrative */}
                {attribution.actionable_attribution_summary && (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Forensic Lead Assessment
                    </span>
                    <p className="text-xs text-zinc-700 leading-relaxed">
                      {attribution.actionable_attribution_summary}
                    </p>
                  </div>
                )}

                {/* Clearnet Origin Telemetry */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Server size={12} className="text-zinc-600" />
                      Clearnet Origin Telemetry
                    </span>
                  </div>

                  {attribution.clearnet_telemetry?.ip_addresses?.length > 0 ? (
                    <div className="space-y-1.5">
                      {attribution.clearnet_telemetry.ip_addresses.map((ip: string, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-mono">
                          <span className="text-zinc-950 font-semibold">{ip}</span>
                          <button
                            onClick={() => copyToClipboard(ip, 'IP')}
                            className="text-zinc-400 hover:text-zinc-950 p-0.5 transition-colors"
                          >
                            {copiedText === ip ? <Check size={13} className="text-zinc-950" /> : <Copy size={13} />}
                          </button>
                        </div>
                      ))}
                      {attribution.clearnet_telemetry?.asns?.length > 0 && (
                        <div className="text-[11px] text-zinc-500 font-mono pt-1">
                          ASN: <span className="text-zinc-900 font-semibold">{attribution.clearnet_telemetry.asns.join(', ')}</span>
                        </div>
                      )}
                      {attribution.clearnet_telemetry?.open_ports?.length > 0 && (
                        <div className="text-[11px] text-zinc-500 font-mono">
                          Open Ports: <span className="text-zinc-900 font-semibold">{attribution.clearnet_telemetry.open_ports.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">No direct clearnet IPs unmasked yet.</p>
                  )}
                </div>

                {/* Contact Endpoints & Comms */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    Direct Contact Endpoints
                  </span>
                  <div className="space-y-1.5">
                    {attribution.contact_endpoints?.emails?.map((em: string, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-mono">
                        <span className="text-zinc-950">{em}</span>
                        <button
                          onClick={() => copyToClipboard(em, 'Email')}
                          className="text-zinc-400 hover:text-zinc-950 p-0.5"
                        >
                          {copiedText === em ? <Check size={13} className="text-zinc-950" /> : <Copy size={13} />}
                        </button>
                      </div>
                    ))}
                    {attribution.contact_endpoints?.telegram_handles?.map((tg: string, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-mono">
                        <span className="text-zinc-950">{tg}</span>
                        <button
                          onClick={() => copyToClipboard(tg, 'Telegram')}
                          className="text-zinc-400 hover:text-zinc-950 p-0.5"
                        >
                          {copiedText === tg ? <Check size={13} className="text-zinc-950" /> : <Copy size={13} />}
                        </button>
                      </div>
                    ))}
                    {!attribution.contact_endpoints?.emails?.length && !attribution.contact_endpoints?.telegram_handles?.length && (
                      <p className="text-xs text-zinc-400 italic">No direct email or messaging handles linked.</p>
                    )}
                  </div>
                </div>

                {/* Cryptocurrency Wallets */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    Financial Anchors & Wallets
                  </span>
                  <div className="space-y-2">
                    {attribution.cryptocurrency_wallets?.btc?.map((w: string, i: number) => (
                      <div key={i} className="flex items-start justify-between bg-white border border-zinc-200 rounded-lg p-2.5 text-xs font-mono gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="inline-block text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mb-1">
                            BTC Address
                          </span>
                          <p className="text-zinc-950 font-mono text-[11px] leading-relaxed break-all select-all font-medium">
                            {w}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(w, 'BTC Wallet')}
                          className="text-zinc-400 hover:text-zinc-950 p-1 shrink-0 rounded hover:bg-zinc-100 transition-colors"
                          title="Copy full Bitcoin address"
                        >
                          {copiedText === w ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>
                      </div>
                    ))}
                    {attribution.cryptocurrency_wallets?.xmr?.map((w: string, i: number) => (
                      <div key={i} className="flex items-start justify-between bg-white border border-zinc-200 rounded-lg p-2.5 text-xs font-mono gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="inline-block text-[10px] font-bold uppercase text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 mb-1">
                            XMR Address
                          </span>
                          <p className="text-zinc-950 font-mono text-[11px] leading-relaxed break-all select-all font-medium">
                            {w}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(w, 'XMR Wallet')}
                          className="text-zinc-400 hover:text-zinc-950 p-1 shrink-0 rounded hover:bg-zinc-100 transition-colors"
                          title="Copy full Monero address"
                        >
                          {copiedText === w ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>
                      </div>
                    ))}
                    {!attribution.cryptocurrency_wallets?.btc?.length && !attribution.cryptocurrency_wallets?.xmr?.length && (
                      <p className="text-xs text-zinc-400 italic">No cryptocurrency addresses identified.</p>
                    )}
                  </div>
                </div>

                {/* Law Enforcement Recommended Actions */}
                {attribution.recommended_law_enforcement_actions?.length > 0 && (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <AlertCircle size={12} className="text-zinc-600" />
                      Recommended Investigative Actions
                    </span>
                    <ul className="space-y-1.5">
                      {attribution.recommended_law_enforcement_actions.map((act: string, i: number) => (
                        <li key={i} className="text-xs text-zinc-700 flex items-start gap-2">
                          <span className="font-bold text-zinc-950 font-mono text-[11px] mt-0.5">#{i + 1}</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'identifiers' && (
          <div className="space-y-2">
            {full?.identifiers?.length ? full.identifiers.map((id: any) => {
              const val = id.normalized_value ?? id.display_value ?? '';
              return (
                <div key={id.id} className="bg-zinc-50 border border-zinc-100 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{id.type}</span>
                    <ConfidenceBadge score={id.confidence ?? 0} showPercent={false} />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-mono text-zinc-900 break-all select-all flex-1">{val}</p>
                    <button
                      onClick={() => copyToClipboard(val, id.type || 'Identifier')}
                      className="text-zinc-400 hover:text-zinc-950 p-1 shrink-0 rounded hover:bg-zinc-200/50 transition-colors"
                      title="Copy identifier"
                    >
                      {copiedText === val ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              );
            }) : (
              <EmptyState icon={<Link2 size={18} />} title="No identifiers" description="No identifiers associated with this actor yet." />
            )}
          </div>
        )}
        {tab === 'timeline' && (
          <div className="space-y-3">
            {timeline.length === 0 ? (
              <EmptyState icon={<Clock size={18} />} title="No timeline events" description="Timeline events appear as intelligence is collected." />
            ) : timeline.map((ev: any, i: number) => (
              <div key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-zinc-900 mt-1 flex-shrink-0" />
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-zinc-100 mt-1" />}
                </div>
                <div className="pb-3">
                  <p className="text-xs font-semibold text-zinc-900">{ev.description || ev.event_type}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{ev.event_time ? new Date(ev.event_time).toLocaleString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'evidence' && (
          <div className="space-y-2">
            {evidence.length === 0 ? (
              <EmptyState icon={<FileSearch size={18} />} title="No evidence" description="No evidence records available yet." />
            ) : evidence.map((ev: any) => (
              <div key={ev.id} className="bg-zinc-50 border border-zinc-100 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{ev.type}</span>
                  {ev.score && <ConfidenceBadge score={ev.score} />}
                </div>
                <p className="text-xs text-zinc-700">{ev.description || 'No description'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function InvestigationsPage() {
  const [selected, setSelected] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: actors = [], isLoading } = useQuery({
    queryKey: ['actorClusters', statusFilter],
    queryFn: () => api.getActorClusters(statusFilter || undefined),
  });

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">Investigations</h1>
          <p className="text-sm text-zinc-400 mt-1">Actor and persona profiles extracted from dark-web intelligence.</p>
        </div>
        {/* Status filter */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100/80 border border-zinc-200/80 rounded-xl">
          {['', 'confirmed', 'probable', 'unconfirmed'].map(s => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`relative px-3.5 py-1.5 text-xs font-semibold tracking-wider rounded-lg transition-colors z-10 ${
                  active ? 'text-zinc-950 font-bold' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="investigations-filter-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm border border-zinc-200/60 -z-10"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
                  />
                )}
                {s ? s.toUpperCase() : 'ALL'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={7} />
        ) : actors.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title="No actors identified"
            description="Actor clusters are created when observations are correlated across sources."
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-50 bg-zinc-50/50">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Actor</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Confidence</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Created</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {actors.map((actor: any) => (
                <tr
                  key={actor.id}
                  onClick={() => setSelected(actor)}
                  className="hover:bg-zinc-50/50 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{actor.name || actor.actor_cluster_id}</p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{actor.actor_cluster_id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-md">
                      {actor.status ? actor.status.toUpperCase() : 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <ConfidenceBadge score={actor.confidence ?? 0} />
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-400">
                    {actor.created_at ? new Date(actor.created_at + (actor.created_at.endsWith('Z') ? '' : 'Z')).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight size={14} className="text-zinc-300 group-hover:text-zinc-700 transition-colors ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer overlay */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/10 z-30"
              onClick={() => setSelected(null)}
            />
            <ActorDrawer actor={selected} onClose={() => setSelected(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
