import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, Globe, FileCheck, Wifi, RefreshCw, AlertTriangle,
  Search, ExternalLink, Copy, Check, Info, Radio, Layers, Network, Eye, X
} from 'lucide-react';
import { api } from '@/api/client';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  onion_service: <Globe size={13} className="text-zinc-800" />,
  domain:        <Globe size={13} className="text-zinc-800" />,
  ip_address:    <Wifi size={13} className="text-zinc-800" />,
  certificate:   <FileCheck size={13} className="text-zinc-800" />,
  port:          <Server size={13} className="text-zinc-800" />,
  asn:           <Network size={13} className="text-zinc-800" />,
};

const FILTER_OPTIONS = [
  { label: 'ALL', value: '' },
  { label: 'ONION SERVICES', value: 'onion_service' },
  { label: 'CLEARNET DOMAINS', value: 'domain' },
  { label: 'IP ADDRESSES', value: 'ip_address' },
  { label: 'CERTIFICATES', value: 'certificate' },
  { label: 'MISCONFIGURATIONS', value: 'leak' },
];

export default function InfrastructurePage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Fetch infrastructure list
  const { data: infra = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['infrastructure', filter],
    queryFn: () => api.getInfrastructure(filter || undefined),
  });

  // Analyze Infrastructure Mutation
  const analyzeMutation = useMutation({
    mutationFn: () => api.analyzeInfrastructure(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['infrastructure'] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedValue(text);
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const handleInspect = (item: any) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  // Compute stats
  const totalAssets = infra.length;
  const totalLeaks = infra.reduce((acc: number, item: any) => acc + (item.leaks?.length || 0), 0);
  const totalHypotheses = infra.reduce((acc: number, item: any) => acc + (item.correlation_hypotheses?.length || 0), 0);
  const enrichedCount = infra.filter((item: any) => item.metadata && Object.keys(item.metadata).length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 flex items-center gap-2.5">
            <Radio size={24} className="text-zinc-950 animate-pulse" />
            Infrastructure Analysis & Origin Correlation
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            HTTP/TLS fingerprinting, Apache mod_status leak detection, crt.sh Certificate Transparency logs, and Shodan candidate origin hypotheses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Radio size={15} className={analyzeMutation.isPending ? 'animate-spin' : ''} />
            {analyzeMutation.isPending ? 'Scanning Darknet…' : 'Analyze Infrastructure'}
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all shadow-sm"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Monitored Assets</span>
            <Layers size={16} className="text-zinc-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-zinc-950">{totalAssets}</div>
          <div className="mt-1 text-[11px] text-zinc-400">Onion, clearnet, IPs & certs</div>
        </div>

        <div className="p-4 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Origin Hypotheses</span>
            <Network size={16} className="text-zinc-700" />
          </div>
          <div className="mt-2 text-2xl font-black text-zinc-950">{totalHypotheses}</div>
          <div className="mt-1 text-[11px] text-zinc-400">Candidate clearnet origins</div>
        </div>

        <div className="p-4 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Misconfigurations</span>
            <AlertTriangle size={16} className="text-zinc-700" />
          </div>
          <div className="mt-2 text-2xl font-black text-zinc-950">{totalLeaks}</div>
          <div className="mt-1 text-[11px] text-zinc-400">mod_status, banners & certs</div>
        </div>

        <div className="p-4 bg-white border border-zinc-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">CT & Shodan Enriched</span>
            <FileCheck size={16} className="text-zinc-700" />
          </div>
          <div className="mt-2 text-2xl font-black text-zinc-950">{enrichedCount}</div>
          <div className="mt-1 text-[11px] text-zinc-400">crt.sh logs & Shodan ports</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-zinc-200/80 rounded-xl w-fit shadow-xs">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tracking-wider rounded-lg transition-all',
              filter === opt.value
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            )}
          >
            {opt.value && TYPE_ICONS[opt.value]}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Infrastructure Table */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : infra.length === 0 ? (
          <EmptyState
            icon={<Server size={24} className="text-zinc-400" />}
            title="No infrastructure indicators recorded"
            description="Run 'Analyze Infrastructure' to probe discovered onion services for active leaks, server status pages, and Shodan correlations."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/75">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Asset Type</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Identifier / Value</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Detected Leaks / Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">ASN & Hosting Org</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Open Ports & Services</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Origin Hypotheses</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {infra.map((item: any, i: number) => {
                  const leaks = item.leaks || [];
                  const ports = item.open_ports || [];
                  const hypotheses = item.correlation_hypotheses || [];
                  const meta = item.metadata || {};
                  const banner = meta.http_probe?.server_banner || meta.banners?.['80'] || meta.banners?.['443'];

                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-zinc-50/70 transition-colors"
                    >
                      {/* Type */}
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-600 bg-zinc-100/80 px-2 py-0.5 rounded-md">
                          {TYPE_ICONS[item.type] || <Layers size={12} />}
                          {item.type?.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="px-5 py-3.5 max-w-[280px]">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-mono font-semibold text-zinc-900 truncate select-all bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200/60">
                            {item.value}
                          </code>
                          <button
                            onClick={() => handleCopy(item.value)}
                            className="text-zinc-400 hover:text-zinc-700 p-1"
                            title="Copy value"
                          >
                            {copiedValue === item.value ? <Check size={12} className="text-zinc-950" /> : <Copy size={12} />}
                          </button>
                        </div>
                        {banner && (
                          <div className="text-[10px] text-zinc-400 mt-1 font-mono truncate max-w-[260px]">
                            {banner}
                          </div>
                        )}
                      </td>

                      {/* Leaks */}
                      <td className="px-5 py-3.5">
                        {leaks.length > 0 ? (
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-zinc-950 block">
                              {leaks.length} Misconfiguration{leaks.length === 1 ? '' : 's'}
                            </span>
                            <div className="text-[11px] text-zinc-500 font-mono truncate max-w-[220px]" title={leaks.map((l: any) => l.description || l.type).join('; ')}>
                              {leaks.map((l: any) => l.type?.replace(/_/g, ' ')).join(' • ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 font-medium">None detected</span>
                        )}
                      </td>

                      {/* ASN & Org */}
                      <td className="px-5 py-3.5">
                        {item.asn || item.hosting_org ? (
                          <div className="space-y-0.5">
                            {item.asn && (
                              <div className="text-xs font-mono font-bold text-zinc-800">{item.asn}</div>
                            )}
                            {item.hosting_org && (
                              <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">{item.hosting_org}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Open Ports */}
                      <td className="px-5 py-3.5">
                        {ports.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {ports.slice(0, 4).map((p: number) => (
                              <span
                                key={p}
                                className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 px-1.5 py-0.2 rounded"
                              >
                                {p}
                              </span>
                            ))}
                            {ports.length > 4 && (
                              <span className="text-[10px] text-zinc-400 font-mono">+{ports.length - 4}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Origin Hypotheses */}
                      <td className="px-5 py-3.5">
                        {hypotheses.length > 0 ? (
                          <div className="space-y-1">
                            {hypotheses.map((hyp: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-zinc-950 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded">
                                  {hyp.ip}
                                </span>
                                <ConfidenceBadge score={hyp.confidence} className="text-[9px] px-1.5 py-0.2" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleInspect(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg hover:bg-zinc-100 transition-colors"
                        >
                          <Eye size={12} />
                          Dossier
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Forensic Intelligence Dossier Modal */}
      <AnimatePresence>
        {detailModalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-zinc-200 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white border border-zinc-200 rounded-xl shadow-xs">
                    {TYPE_ICONS[selectedItem.type] || <Server size={18} />}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                      <span>{selectedItem.value}</span>
                    </h2>
                    <div className="text-xs text-zinc-400 capitalize">
                      {selectedItem.type?.replace('_', ' ')} • Detected {new Date(selectedItem.first_seen_at || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Origin Hypotheses Section */}
                {selectedItem.correlation_hypotheses?.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                      <Network size={16} className="text-zinc-800" />
                      Candidate Origin Hypotheses
                    </div>
                    <div className="space-y-2.5">
                      {selectedItem.correlation_hypotheses.map((hyp: any, idx: number) => (
                        <div key={idx} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-black text-zinc-950">{hyp.ip}</span>
                              <span className="text-xs font-semibold text-zinc-600">
                                {hyp.asn} {hyp.org && `• ${hyp.org}`}
                              </span>
                            </div>
                            <ConfidenceBadge score={hyp.confidence} className="text-[9px] px-1.5 py-0.2" />
                          </div>
                          <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                            {hyp.hypothesis}
                          </p>
                          {hyp.signals?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {hyp.signals.map((sig: string, sIdx: number) => (
                                <span key={sIdx} className="text-[10px] font-bold bg-white border border-zinc-200 text-zinc-800 px-2 py-0.5 rounded">
                                  ✓ {sig}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Leaks Section */}
                {selectedItem.leaks?.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                      <AlertTriangle size={16} className="text-zinc-700" />
                      Active Misconfigurations Detected
                    </div>
                    <div className="space-y-2">
                      {selectedItem.leaks.map((lk: any, idx: number) => (
                        <div key={idx} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-start gap-3">
                          <Info size={16} className="text-zinc-700 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                                {lk.type?.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] font-mono bg-white px-1.5 py-0.2 rounded border border-zinc-200 text-zinc-800">
                                {lk.value}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-600">{lk.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Fingerprints */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                    <Server size={16} className="text-zinc-800" />
                    Technical Fingerprints & Probe Data
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Server Banner</div>
                      <div className="text-xs font-mono font-semibold text-zinc-800">
                        {selectedItem.metadata?.http_probe?.server_banner || selectedItem.metadata?.banners?.['80'] || 'None Detected'}
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Favicon MD5 Hash</div>
                      <div className="text-xs font-mono font-semibold text-zinc-800 truncate">
                        {selectedItem.metadata?.http_probe?.favicon_hash || 'None'}
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-1 col-span-full">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">JARM Fingerprint</div>
                      <div className="text-xs font-mono font-semibold text-zinc-800 select-all">
                        {selectedItem.metadata?.jarm || 'Not captured'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certificate Transparency (crt.sh) Section */}
                {selectedItem.metadata?.ct_logs?.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                      <FileCheck size={16} className="text-zinc-800" />
                      Certificate Transparency Logs (crt.sh)
                    </div>
                    <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-2 max-h-48 overflow-y-auto">
                      {selectedItem.metadata.ct_logs.map((ct: any, idx: number) => (
                        <div key={idx} className="text-xs border-b border-zinc-200/50 pb-2 last:border-b-0 space-y-0.5">
                          <div className="flex items-center justify-between font-mono font-bold text-zinc-800">
                            <span>Cert #{ct.id}</span>
                            <span className="text-[10px] text-zinc-400">{ct.not_before} → {ct.not_after}</span>
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono truncate">{ct.issuer_name}</div>
                          <div className="text-[10px] text-zinc-800 font-mono bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded w-fit">
                            SANs: {ct.name_value?.replace(/\n/g, ', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 flex justify-end">
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors shadow-xs"
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
