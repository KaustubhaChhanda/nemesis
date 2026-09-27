import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Filter, Search, Users, ExternalLink, Network,
  FileText, ShoppingCart, MessageSquare, Key, Coins, GitFork, Server, Calendar
} from 'lucide-react';
import { api } from '@/api/client';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { EmptyState } from '@/components/EmptyState';

const CATEGORIES = [
  { key: 'all',            label: 'All Events',        dotColor: 'bg-zinc-400' },
  { key: 'forum',          label: 'Forum Posts',       dotColor: 'bg-amber-500' },
  { key: 'market',         label: 'Market Listings',   dotColor: 'bg-blue-500' },
  { key: 'security',       label: 'PGP Keys',          dotColor: 'bg-emerald-500' },
  { key: 'financial',      label: 'Crypto Wallets',    dotColor: 'bg-emerald-600' },
  { key: 'migration',      label: 'Persona Migration', dotColor: 'bg-purple-500' },
  { key: 'infrastructure', label: 'Origin Telemetry',  dotColor: 'bg-cyan-500' },
] as const;

function getEventIcon(category: string, eventType: string) {
  switch (category) {
    case 'forum':
      return <MessageSquare size={13} className="text-zinc-700" />;
    case 'market':
      return <ShoppingCart size={13} className="text-zinc-700" />;
    case 'security':
      return <Key size={13} className="text-zinc-700" />;
    case 'financial':
      return <Coins size={13} className="text-zinc-700" />;
    case 'migration':
      return <GitFork size={13} className="text-zinc-700" />;
    case 'infrastructure':
      return <Server size={13} className="text-zinc-700" />;
    default:
      return <FileText size={13} className="text-zinc-700" />;
  }
}

function getIndicatorPip(color: string) {
  switch (color) {
    case 'emerald':
      return 'bg-emerald-500 ring-emerald-100';
    case 'blue':
      return 'bg-blue-500 ring-blue-100';
    case 'amber':
      return 'bg-amber-500 ring-amber-100';
    case 'purple':
      return 'bg-purple-500 ring-purple-100';
    case 'cyan':
      return 'bg-cyan-500 ring-cyan-100';
    default:
      return 'bg-zinc-500 ring-zinc-100';
  }
}

export default function TimelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialActor = searchParams.get('actor_id') || '';

  const [selectedActor, setSelectedActor] = useState<string>(initialActor);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Date range filter state
  const [datePreset, setDatePreset] = useState<'all' | '24h' | '7d' | '30d' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const { effectiveStart, effectiveEnd } = useMemo(() => {
    const now = new Date();
    if (datePreset === '24h') {
      return { effectiveStart: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(), effectiveEnd: '' };
    }
    if (datePreset === '7d') {
      return { effectiveStart: new Date(now.getTime() - 7 * 86400 * 1000).toISOString(), effectiveEnd: '' };
    }
    if (datePreset === '30d') {
      return { effectiveStart: new Date(now.getTime() - 30 * 86400 * 1000).toISOString(), effectiveEnd: '' };
    }
    if (datePreset === 'custom') {
      return {
        effectiveStart: customStart ? new Date(customStart).toISOString() : '',
        effectiveEnd: customEnd ? new Date(customEnd + 'T23:59:59Z').toISOString() : '',
      };
    }
    return { effectiveStart: '', effectiveEnd: '' };
  }, [datePreset, customStart, customEnd]);

  // Fetch registered actors for the dropdown
  const { data: actors = [] } = useQuery({
    queryKey: ['actorClusters'],
    queryFn: () => api.getActorClusters(),
  });

  // Fetch timeline events with optional date filtering
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['timeline', selectedActor, effectiveStart, effectiveEnd],
    queryFn: () => api.getTimeline(selectedActor || undefined, undefined, effectiveStart || undefined, effectiveEnd || undefined),
  });

  // Client-side filtering for category & search keyword
  const filteredEvents = useMemo(() => {
    return events.filter((ev: any) => {
      // Category filter
      if (selectedCategory !== 'all' && (ev.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${ev.title || ''} ${ev.description || ''} ${ev.actor_name || ''} ${ev.handle || ''} ${ev.platform || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  // Derived metrics (strictly bold black numbers)
  const uniqueActors = useMemo(() => {
    const set = new Set(events.map((e: any) => e.actor_name).filter(Boolean));
    return Array.from(set);
  }, [events]);

  const uniquePlatforms = useMemo(() => {
    const set = new Set(events.map((e: any) => e.platform).filter(Boolean));
    return Array.from(set);
  }, [events]);

  const strongCount = useMemo(() => {
    return events.filter((e: any) => (e.confidence ?? 0) >= 0.85).length;
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">Actor Activity Timeline</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Chronological audit of forum posts, vendor listings, cryptographic PGP announcements, and persona migrations.
          </p>
        </div>

        {/* Actor Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
            Actor Focus:
          </label>
          <select
            value={selectedActor}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedActor(val);
              if (val) {
                setSearchParams({ actor_id: val });
              } else {
                setSearchParams({});
              }
            }}
            className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950 transition-all shadow-2xs"
          >
            <option value="">All Monitored Actors ({actors.length})</option>
            {actors.map((act: any) => (
              <option key={act.id} value={act.id}>
                {act.name || act.label || act.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Metric Strip (Strictly bold neutral numbers) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Total Events</span>
          <span className="text-lg font-bold text-zinc-950 mt-0.5 block">{events.length}</span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Active Personas</span>
          <span className="text-lg font-bold text-zinc-950 mt-0.5 block">{uniqueActors.length}</span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Platforms Monitored</span>
          <span className="text-lg font-bold text-zinc-950 mt-0.5 block">{uniquePlatforms.length}</span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Strong Corroborations</span>
          <span className="text-lg font-bold text-zinc-950 mt-0.5 block">{strongCount}</span>
        </div>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills with colored indicator pips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-0.5">
          {CATEGORIES.map(({ key, label, dotColor }) => {
            const isActive = selectedCategory === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : dotColor}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Keyword Search */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search activities, keywords…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-zinc-950"
          />
        </div>
      </div>

      {/* Date Range Query Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-zinc-500 font-bold uppercase tracking-wider text-[10px] mr-1">
            <Calendar size={13} className="text-zinc-600" />
            <span>Time Window:</span>
          </div>

          {[
            { key: 'all', label: 'All Time' },
            { key: '24h', label: 'Last 24h' },
            { key: '7d', label: 'Last 7 Days' },
            { key: '30d', label: 'Last 30 Days' },
            { key: 'custom', label: 'Custom Range' },
          ].map((preset) => {
            const isSel = datePreset === preset.key;
            return (
              <button
                key={preset.key}
                onClick={() => setDatePreset(preset.key as any)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  isSel
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-xs font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-xs font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>
            {(customStart || customEnd) && (
              <button
                onClick={() => {
                  setCustomStart('');
                  setCustomEnd('');
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 underline"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Timeline View */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-400 text-xs">
          Loading chronological intelligence timeline…
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={<Clock size={20} />}
          title="No timeline events recorded"
          description={
            selectedActor
              ? 'No activities recorded for this threat actor with the selected filters.'
              : 'Trigger a crawl of onion sources or run the correlation pipeline to generate chronological events.'
          }
        />
      ) : (
        <div className="relative pl-6 md:pl-8 border-l border-zinc-200 space-y-6 my-4">
          <AnimatePresence>
            {filteredEvents.map((ev: any, idx: number) => {
              const pipStyle = getIndicatorPip(ev.indicator_color || 'slate');
              const formattedDate = ev.timestamp
                ? new Date(ev.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Observed Date';
              const formattedTime = ev.timestamp
                ? new Date(ev.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <motion.div
                  key={ev.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.3) }}
                  className="relative group"
                >
                  {/* Timeline Indicator Pip */}
                  <div
                    className={`absolute -left-[31px] md:-left-[39px] top-4 w-3.5 h-3.5 rounded-full ring-4 ${pipStyle} transition-transform group-hover:scale-110`}
                  />

                  {/* Event Card */}
                  <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs hover:border-zinc-300 transition-all space-y-3">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Event Category Badge */}
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-800">
                          {getEventIcon(ev.category, ev.event_type)}
                          <span>{(ev.event_type || 'ACTIVITY').replace(/_/g, ' ')}</span>
                        </span>

                        {/* Platform Badge */}
                        <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded">
                          {ev.platform || 'Darknet'}
                        </span>

                        {/* Actor & Handle */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-bold text-zinc-950">{ev.actor_name || 'Actor'}</span>
                          {ev.handle && (
                            <span className="font-mono text-zinc-500 font-medium">({ev.handle})</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Timestamp & Confidence */}
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-bold text-zinc-950 block">{formattedDate}</span>
                          {formattedTime && (
                            <span className="text-[10px] text-zinc-400 font-mono block">{formattedTime}</span>
                          )}
                        </div>
                        {ev.confidence != null && (
                          <ConfidenceBadge score={ev.confidence} />
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-zinc-950">{ev.title}</h3>

                    {/* Description / Content Excerpt */}
                    {ev.description && (
                      <p className="text-xs text-zinc-700 bg-zinc-50/80 border border-zinc-100 rounded-xl p-3 leading-relaxed font-sans select-text">
                        {ev.description}
                      </p>
                    )}

                    {/* Footer / Context */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-3">
                        {ev.evidence_ref?.document_id && (
                          <span className="font-mono">Doc: {ev.evidence_ref.document_id.slice(0, 8)}…</span>
                        )}
                        {ev.evidence_ref?.xpath && (
                          <span className="font-mono truncate max-w-[200px]" title={ev.evidence_ref.xpath}>
                            XPath: {ev.evidence_ref.xpath}
                          </span>
                        )}
                      </div>

                      {ev.actor_id && (
                        <Link
                          to={`/graph?actor_id=${encodeURIComponent(ev.actor_id)}`}
                          className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-950 font-semibold transition-colors"
                        >
                          <Network size={12} />
                          <span>View in Graph</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
