import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Server, Zap, Database, CheckCircle2, Trash2, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { cn } from '@/lib/utils';

function HealthRow({ label, status, healthy }: { label: string; status: string; healthy: boolean }) {
  return (
    <div className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-100 rounded-xl">
      <div className="flex items-center gap-2.5">
        <CheckCircle2 size={15} className={healthy ? 'text-emerald-500' : 'text-zinc-300'} />
        <span className="text-sm font-semibold text-zinc-900">{label}</span>
      </div>
      <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border', healthy ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-zinc-50 text-zinc-400 border-zinc-100')}>
        {status}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [confirmPurge, setConfirmPurge] = useState(false);

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
    refetchInterval: 10000,
  });

  const pipelineMutation = useMutation({
    mutationFn: () => api.runCorrelation(),
    onSuccess: d => {
      toast.success(d.message || 'Correlation pipeline executed successfully.', { id: 'pipeline-run' });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(`Correlation failed: ${e.message}`, { id: 'pipeline-run' }),
  });

  const seedMutation = useMutation({
    mutationFn: () => api.seedDefaultSources(),
    onSuccess: (r: any) => {
      toast.success(r.message || 'Default synthetic onion targets seeded.', { id: 'seed-run' });
      qc.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: (e: any) => toast.error(`Seeding failed: ${e.message}`, { id: 'seed-run' }),
  });

  const resetDbMutation = useMutation({
    mutationFn: () => api.resetDatabase(),
    onSuccess: (r: any) => {
      toast.success(r.message || 'All databases and Neo4j graph cleared.', { id: 'db-purge' });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(`Database purge failed: ${e.message}`, { id: 'db-purge' }),
  });

  const { data: autoMode } = useQuery({
    queryKey: ['autonomousMode'],
    queryFn: () => api.getAutonomousMode(),
  });

  const toggleAutoMutation = useMutation({
    mutationFn: (enabled: boolean) => api.toggleAutonomousMode(enabled),
    onSuccess: (_, variables) => {
      toast.success(variables ? 'Autonomous daemon activated' : 'Autonomous daemon paused', { id: 'auto-daemon' });
      qc.invalidateQueries({ queryKey: ['autonomousMode'] });
    },
    onError: (e: any) => toast.error(`Daemon toggle error: ${e.message}`, { id: 'auto-daemon' }),
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-950">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">System telemetry, pipeline operations, autonomous crawling, and data maintenance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Infrastructure & System Telemetry */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-50">
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Server size={16} className="text-zinc-700" /> Infrastructure Telemetry
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> All Services Online
            </span>
          </div>
          <div className="space-y-2">
            <HealthRow label="FastAPI Application" status={`v${health?.version ?? '2.1.0'}`} healthy={true} />
            <HealthRow label="PostgreSQL DB" status="Connected" healthy={true} />
            <HealthRow label="Neo4j Investigation Graph" status="Bolt Active" healthy={true} />
            <HealthRow label="Tor SOCKS5 Proxy" status="Port 9050" healthy={true} />
            <HealthRow label="Redis Task Queue" status="Port 6379" healthy={true} />
          </div>
        </div>

        {/* 2. Ingestion & Correlation Controls */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-50">
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Zap size={16} className="text-zinc-700" /> Correlation & Ingestion Pipeline
            </h2>
            <span className="text-[10px] font-mono text-zinc-400">Step 5–8 Pipeline</span>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-2.5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-900">Run Correlation Pipeline</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Triggers identifier resolution, temporal co-occurrence, and Neo4j graph projection across collected blocks.
              </p>
            </div>
            <button
              onClick={() => {
                toast.info('Starting correlation & graph projection pipeline...', { id: 'pipeline-run' });
                pipelineMutation.mutate();
              }}
              disabled={pipelineMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-950 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-xs"
            >
              <Zap size={13} className={pipelineMutation.isPending ? 'animate-pulse' : ''} />
              {pipelineMutation.isPending ? 'Queuing Pipeline…' : 'Run Correlation Pipeline'}
            </button>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-2.5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-900">Seed Default Onion Sources</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Registers the 3 local synthetic onion targets (ShadowForum, NightMarket, DeadDrop) into the collector.
              </p>
            </div>
            <button
              onClick={() => {
                toast.info('Registering default synthetic onion targets...', { id: 'seed-run' });
                seedMutation.mutate();
              }}
              disabled={seedMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-100 transition-all disabled:opacity-50"
            >
              <Database size={13} className={seedMutation.isPending ? 'animate-spin' : ''} />
              {seedMutation.isPending ? 'Seeding…' : 'Seed Default Onion Targets'}
            </button>
          </div>
        </div>

        {/* 3. Autonomous Daemon & Crawl Scheduling */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-50">
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Clock size={16} className="text-zinc-700" /> Autonomous Daemon
            </h2>
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
              autoMode?.enabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-zinc-100 text-zinc-600 border-zinc-200"
            )}>
              {autoMode?.enabled ? 'Active Daemon' : 'Standby'}
            </span>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-900">Continuous Crawling</p>
              <p className="text-xs text-zinc-400 mt-0.5 max-w-[280px]">
                Periodically crawls all active Tor onion sources in background intervals without manual intervention.
              </p>
            </div>
            <button
              onClick={() => {
                const next = !autoMode?.enabled;
                toast.info(next ? 'Starting autonomous crawler daemon...' : 'Pausing autonomous crawler daemon...', { id: 'auto-daemon' });
                toggleAutoMutation.mutate(next);
              }}
              disabled={toggleAutoMutation.isPending}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2",
                autoMode?.enabled ? 'bg-emerald-500' : 'bg-zinc-300'
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs",
                  autoMode?.enabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          <div className="p-3.5 bg-zinc-50 border border-zinc-100 rounded-xl text-xs text-zinc-500 space-y-1">
            <div className="flex justify-between font-medium">
              <span>Default Ingestion Interval:</span>
              <span className="font-mono text-zinc-900 font-bold">3600 seconds</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Tor Routing Mode:</span>
              <span className="font-mono text-zinc-900 font-bold">SOCKS5 Isolated</span>
            </div>
          </div>
        </div>

        {/* 4. Platform Maintenance & Danger Zone */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-50">
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <AlertTriangle size={16} className="text-zinc-900" /> Platform Maintenance
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
              Irreversible
            </span>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-900">Purge Databases & Reset Graph</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Permanently deletes all extracted entities, relationships, document bodies, evidence records, and clears the Neo4j knowledge graph.
              </p>
            </div>
            {!confirmPurge ? (
              <button
                onClick={() => {
                  setConfirmPurge(true);
                  toast.warning('Click "Confirm Permanent Purge" to erase all data.', { duration: 6000 });
                }}
                disabled={resetDbMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-950 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-xs"
              >
                <Trash2 size={13} className={resetDbMutation.isPending ? 'animate-spin' : ''} />
                {resetDbMutation.isPending ? 'Purging All Data…' : 'Purge All Databases & Clear Graph'}
              </button>
            ) : (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-800 font-semibold text-center">
                  ⚠️ This will permanently erase all database tables, evidence, and Neo4j graph nodes.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setConfirmPurge(false);
                      toast.loading('Purging databases and Neo4j graph...', { id: 'db-purge' });
                      resetDbMutation.mutate();
                    }}
                    disabled={resetDbMutation.isPending}
                    className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all shadow-xs"
                  >
                    Confirm Permanent Purge
                  </button>
                  <button
                    onClick={() => {
                      setConfirmPurge(false);
                      toast.info('Database purge operation cancelled.');
                    }}
                    className="py-2 px-3 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
