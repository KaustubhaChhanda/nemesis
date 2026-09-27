import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Plus, Trash2, Play, RefreshCw, Clock, Layers, Network, Activity, Check, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    active:   'bg-emerald-50 text-emerald-700 border-emerald-100',
    inactive: 'bg-zinc-50 text-zinc-500 border-zinc-100',
    error:    'bg-zinc-100 text-zinc-700 border-zinc-200',
    pending:  'bg-blue-50 text-blue-700 border-blue-100',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${config[status] ?? config.inactive}`}>
      {status}
    </span>
  );
}

function AddSourceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', onion_url: '', type: 'forum', description: '', crawl_interval: 3600 });
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.createSource(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] });
      toast.success('Source registered successfully.');
      onClose();
      setForm({ name: '', onion_url: '', type: 'forum', description: '', crawl_interval: 3600 });
    },
    onError: (e: any) => toast.error(`Failed to add source: ${e.message}`),
  });

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white border border-zinc-100 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-zinc-900">Add Source</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors"><X size={18} /></button>
          </div>
          <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
            {[
              { label: 'Name', key: 'name', type: 'text', placeholder: 'Shadow Forum' },
              { label: 'Onion URL', key: 'onion_url', type: 'text', placeholder: 'http://example.onion' },
              { label: 'Description', key: 'description', type: 'text', placeholder: 'Optional description' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                  required={f.key !== 'description'}
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
              >
                {['forum', 'marketplace', 'paste', 'blog', 'other'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-semibold text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all">Cancel</button>
              <button type="submit" disabled={mutation.isPending} className="flex-1 py-2 text-sm font-semibold bg-zinc-950 text-white rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50">
                {mutation.isPending ? 'Adding…' : 'Add Source'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function SourcesPage() {
  const [addOpen, setAddOpen] = useState(false);
  const qc = useQueryClient();

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: () => api.getSources(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSource(id),
    onSuccess: () => {
      toast.success('Source deleted.');
      qc.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const crawlMutation = useMutation({
    mutationFn: (id: string) => api.startCrawl(id),
    onSuccess: () => {
      toast.info('Crawl job queued.');
      qc.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const seedMutation = useMutation({
    mutationFn: () => api.seedDefaultSources(),
    onSuccess: (r: any) => {
      toast.success(r.message || 'Sources seeded.');
      qc.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const crawlAllMutation = useMutation({
    mutationFn: () => api.crawlAll(),
    onSuccess: (r: any) => {
      toast.info(r.message || 'Crawl jobs started for all sources.');
      qc.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  return (
    <div className="space-y-6">
      <AddSourceModal open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">Sources</h1>
          <p className="text-sm text-zinc-400 mt-1">Monitored onion services and collection targets.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => crawlAllMutation.mutate()}
            disabled={crawlAllMutation.isPending || sources.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm"
          >
            <Play size={14} className={crawlAllMutation.isPending ? 'animate-spin' : ''} />
            {crawlAllMutation.isPending ? 'Queuing All…' : 'Crawl All'}
          </button>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={seedMutation.isPending ? 'animate-spin' : ''} />
            Seed Defaults
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-zinc-950 text-white rounded-xl hover:bg-zinc-800 transition-all shadow-sm"
          >
            <Plus size={14} />
            Add Source
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : sources.length === 0 ? (
          <EmptyState
            icon={<Globe size={22} />}
            title="No sources configured"
            description="Add onion sources or seed the defaults to begin crawling."
            action={
              <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-zinc-950 text-white rounded-xl hover:bg-zinc-800 transition-all">
                <Plus size={14} /> Add Source
              </button>
            }
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-50 bg-zinc-50/50">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Name</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Onion URL</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Type</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Last Crawled</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {sources.map((src: any) => (
                <motion.tr
                  key={src.source_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-zinc-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${src.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                      <span className="text-sm font-semibold text-zinc-900">{src.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-zinc-500 truncate max-w-[200px] block">{src.onion_address}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-md">{src.source_type}</span>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={src.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock size={11} />
                      {src.last_seen_at ? new Date(src.last_seen_at + (src.last_seen_at.endsWith('Z') ? '' : 'Z')).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => crawlMutation.mutate(src.source_id)}
                        disabled={crawlMutation.isPending}
                        title="Start crawl"
                        className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Play size={13} />
                      </button>
                      <button
                        onClick={() => {
                          toast(`Delete source "${src.name}"?`, {
                            action: {
                              label: 'Delete',
                              onClick: () => deleteMutation.mutate(src.source_id),
                            },
                          });
                        }}
                        title="Delete source"
                        className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
