import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  Activity, Globe, CheckCircle2, FileText, Users, Link2, AlertTriangle,
  Play, RefreshCw, Clock, ArrowRight, Cpu, Layers, Network, Radio, Check, Loader2, Zap
} from 'lucide-react';
import { api } from '@/api/client';
import { SkeletonCard } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { toast } from 'sonner';

// Animated number counter
function Counter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current || value === 0) { setCount(value); return; }
    ref.current = true;
    const start = performance.now();
    const step = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(step);
      else setCount(value);
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <>{count.toLocaleString()}</>;
}

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  index: number;
}

function KpiCard({ label, value, icon, index }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="bg-white border border-zinc-100 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-black tracking-tight text-zinc-950">
        <Counter value={value} />
      </p>
    </motion.div>
  );
}

function PipelineProgressWidget() {
  const queryClient = useQueryClient();
  const [isTriggering, setIsTriggering] = useState(false);

  const { data: crawlJobs = [] } = useQuery({
    queryKey: ['crawlJobs'],
    queryFn: () => api.getCrawlJobs(),
    refetchInterval: 5000,
  });

  const activeJob = crawlJobs.find((j: any) => j.status === 'running' || j.status === 'queued');
  const latestJob = crawlJobs[0];
  const isExecuting = !!activeJob || isTriggering;

  const handleTriggerCrawl = async () => {
    setIsTriggering(true);
    toast.info('Starting darknet ingestion pipeline across all configured sources...');
    try {
      await api.crawlAll();
      toast.success('Pipeline jobs successfully queued');
      queryClient.invalidateQueries({ queryKey: ['crawlJobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger pipeline');
    } finally {
      setTimeout(() => setIsTriggering(false), 4000);
    }
  };

  const stages = [
    {
      step: 1,
      name: 'Tor Ingestion',
      subtext: 'SOCKS5 Hidden Service Scraping',
      icon: <Globe size={14} />,
      isActive: isExecuting,
      isDone: !isExecuting && !!latestJob,
    },
    {
      step: 2,
      name: 'Semantic Parser',
      subtext: 'DOM Cleanup & XPath Hashing',
      icon: <Layers size={14} />,
      isActive: isExecuting,
      isDone: !isExecuting && !!latestJob,
    },
    {
      step: 3,
      name: 'AI Extraction',
      subtext: 'Live LLM & Heuristic Subtypes',
      icon: <Cpu size={14} />,
      isActive: isExecuting,
      isDone: !isExecuting && !!latestJob,
    },
    {
      step: 4,
      name: 'Correlation',
      subtext: 'Multi-Source Identity Resolution',
      icon: <Network size={14} />,
      isActive: isExecuting,
      isDone: !isExecuting && !!latestJob,
    },
    {
      step: 5,
      name: 'Neo4j Graph',
      subtext: 'Cryptographic Edge Synchronization',
      icon: <Radio size={14} />,
      isActive: isExecuting,
      isDone: !isExecuting && !!latestJob,
    },
    {
      step: 6,
      name: 'Deanonymization',
      subtext: 'Attribution & Forensic Action',
      icon: <CheckCircle2 size={14} />,
      isActive: isExecuting,
      isDone: !isExecuting && !!latestJob,
    },
  ];

  return (
    <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-xs space-y-5">
      {/* Widget Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center text-white shadow-xs">
            <Zap size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-950">Intelligence Ingestion Pipeline</h2>
              {isExecuting ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                  Processing Live Ingestion
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700">
                  <Check size={11} className="text-emerald-600" />
                  Pipeline Synchronized
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Continuous autonomous darknet crawler, deterministic parser, live LLM extraction, and Neo4j graph pipeline.
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerCrawl}
          disabled={isExecuting}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all shadow-xs ${
            isExecuting
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              : 'bg-zinc-950 text-white hover:bg-zinc-800 cursor-pointer active:scale-98'
          }`}
        >
          {isExecuting ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Pipeline Running...
            </>
          ) : (
            <>
              <Play size={13} className="fill-white" />
              Run Pipeline Crawl
            </>
          )}
        </button>
      </div>

      {/* Pipeline Stepper Visualization */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stages.map((st, idx) => (
          <div
            key={st.step}
            className={`relative p-3.5 rounded-xl border transition-all ${
              st.isActive
                ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300 shadow-xs'
                : st.isDone
                ? 'bg-zinc-50 border-zinc-200'
                : 'bg-white border-zinc-100 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                  st.isActive
                    ? 'bg-emerald-600 text-white'
                    : st.isDone
                    ? 'bg-zinc-950 text-white'
                    : 'bg-zinc-100 text-zinc-400'
                }`}
              >
                {st.icon}
              </div>
              <span className="text-[10px] font-mono text-zinc-400 font-medium">0{st.step}</span>
            </div>
            <div className="text-xs font-bold text-zinc-900 truncate">{st.name}</div>
            <div className="text-[10px] text-zinc-400 truncate mt-0.5">{st.subtext}</div>
            
            {/* Status chip */}
            <div className="mt-2.5 pt-2 border-t border-zinc-200/50 flex items-center justify-between text-[9px] font-mono">
              <span className="text-zinc-400">STATUS</span>
              {st.isActive ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-600 animate-pulse" />
                  ACTIVE
                </span>
              ) : st.isDone ? (
                <span className="text-zinc-700 font-bold flex items-center gap-0.5">
                  <Check size={9} className="text-emerald-600" /> READY
                </span>
              ) : (
                <span className="text-zinc-400">STANDBY</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Telemetry Strip */}
      <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200/70 rounded-xl px-4 py-2.5 text-xs text-zinc-500 font-mono flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Clock size={12} className="text-zinc-400" />
            Last Execution:{' '}
            <strong className="text-zinc-900">
              {latestJob?.started_at ? new Date(latestJob.started_at).toLocaleTimeString() : 'Recent Synchronized'}
            </strong>
          </span>
          <span className="hidden sm:inline text-zinc-300">|</span>
          <span className="hidden sm:inline">
            Status:{' '}
            <strong className="text-zinc-900">
              {latestJob?.status ? latestJob.status.toUpperCase() : 'SYNCHRONIZED'}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Tor SOCKS Proxy :9050
          </span>
          <span className="flex items-center gap-1 text-zinc-900">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
            Neo4j Bolt Engine :7687
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
    refetchInterval: 30000,
  });

  const { data: recentEvidence = [], isLoading: evLoading } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => api.getEvidence(5),
  });

  const kpis = [
    { label: 'Sources Monitored',       value: data?.sources_monitored ?? 0,           icon: <Globe size={15} /> },
    { label: 'Documents Collected',     value: data?.documents_collected ?? 0,         icon: <Activity size={15} /> },
    { label: 'Actor Clusters',          value: data?.actor_clusters ?? 0,              icon: <Users size={15} /> },
    { label: 'Entities Extracted',      value: data?.entities_extracted ?? 0,          icon: <Link2 size={15} /> },
    { label: 'High-Confidence Links',    value: data?.high_confidence_relationships ?? 0, icon: <CheckCircle2 size={15} /> },
    { label: 'Correlation Alerts',       value: Array.isArray(data?.recent_alerts) ? data.recent_alerts.length : (data?.recent_alerts ?? 0), icon: <AlertTriangle size={15} /> },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-950">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">Investigation overview live data from collection pipeline.</p>
      </div>

      {/* KPI grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi, i) => (
            <KpiCard key={kpi.label} {...kpi} index={i} />
          ))}
        </div>
      )}

      {/* Pipeline Progress Widget */}
      <PipelineProgressWidget />

      {/* Two-column layout: Recent Evidence + Source Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Evidence */}
        <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900">Recent Evidence</h2>
            <FileText size={15} className="text-zinc-300" />
          </div>
          {evLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-zinc-50 rounded-xl animate-pulse" />)}
            </div>
          ) : recentEvidence.length === 0 ? (
            <EmptyState
              icon={<FileText size={22} />}
              title="No evidence records yet"
              description="Evidence is compiled when corroborating observations link entities together."
            />
          ) : (
            <div className="divide-y divide-zinc-50">
              {recentEvidence.map((ev: any, i: number) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-6 py-4 flex items-start gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">
                      {ev.description || 'Correlated identifier match'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{ev.type}</span>
                      {ev.score && <ConfidenceBadge score={ev.score} />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Source Health */}
        <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900">Source Health</h2>
            <Globe size={15} className="text-zinc-300" />
          </div>
          <RecentSourcesWidget />
        </div>
      </div>
    </div>
  );
}

function RecentSourcesWidget() {
  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: () => api.getSources(),
  });

  if (isLoading) return (
    <div className="p-6 space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-12 bg-zinc-50 rounded-xl animate-pulse" />)}
    </div>
  );

  if (sources.length === 0) return (
    <EmptyState
      icon={<Globe size={22} />}
      title="No sources configured"
      description="Add onion sources to begin collection."
    />
  );

  return (
    <div className="divide-y divide-zinc-50">
      {sources.slice(0, 5).map((src: any, i: number) => (
        <motion.div
          key={src.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="px-6 py-4 flex items-center gap-3"
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${src.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">{src.name}</p>
            <p className="text-[10px] text-zinc-400 font-mono truncate">{src.onion_url}</p>
          </div>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
            src.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400'
          }`}>
            {src.status}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
