import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Fingerprint, Users, FileText, Globe, CornerDownLeft, Sparkles } from 'lucide-react';
import { api } from '@/api/client';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  identifier: <Fingerprint size={16} />,
  actor:      <Users size={16} />,
  observation:<FileText size={16} />,
  page:       <Globe size={16} />,
};

const SUGGESTIONS = [
  { label: 'Alias',    query: 'shadowfox' },
  { label: 'Wallet',   query: 'bc1q9h5yjqk3' },
  { label: 'Domain',   query: 'secmail.pro' },
  { label: 'PGP',      query: '7A3F 9B2E' },
  { label: 'Vendor',   query: 'shadow_vendor' },
];

export default function DiscoverPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [submitted, setSubmitted] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); setSubmitted(q); }
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['discover', submitted],
    queryFn: () => api.discover(submitted),
    enabled: !!submitted,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSubmitted(query.trim());
      navigate(`/discover?q=${encodeURIComponent(query.trim())}`, { replace: true });
    }
  };

  const handleChip = (q: string) => {
    setQuery(q); setSubmitted(q);
    navigate(`/discover?q=${encodeURIComponent(q)}`, { replace: true });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-950">Discover</h1>
        <p className="text-sm text-zinc-400 mt-1">Natural-language and entity search across all extracted intelligence.</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch}>
        <div className="flex items-center gap-3 p-2 bg-white border-2 border-zinc-200 rounded-2xl focus-within:border-zinc-900 transition-all shadow-sm">
          <Search size={18} className="text-zinc-400 ml-2 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Search alias, wallet, PGP, domain, or natural language query…'
            className="flex-1 text-sm text-zinc-900 bg-transparent border-none focus:outline-none placeholder-zinc-400"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-950 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-40 shadow-sm"
          >
            Search <CornerDownLeft size={13} />
          </button>
        </div>
      </form>

      {/* Suggestion chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          <Sparkles size={12} /> Suggested:
        </span>
        {SUGGESTIONS.map(s => (
          <button
            key={s.query}
            onClick={() => handleChip(s.query)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-100 rounded-lg text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 hover:shadow-sm transition-all"
          >
            <span className="text-zinc-400 text-[10px] uppercase font-bold">{s.label}:</span>
            <span className="font-mono">{s.query}</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-zinc-100 border-t-zinc-900 rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-zinc-700">Searching intelligence records…</p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {data && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <p className="text-sm font-semibold text-zinc-500">
              Found <span className="text-zinc-900">{data.total ?? data.results?.length ?? 0}</span> results for "{submitted}"
            </p>
            {data.results?.length ? (
              <div className="space-y-3">
                {data.results.map((r: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex gap-4 p-5 bg-white border border-zinc-100 rounded-2xl hover:border-zinc-200 hover:shadow-sm transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 flex-shrink-0">
                      {TYPE_ICONS[r.type] ?? <FileText size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded">{r.type}</span>
                        {r.relevance != null && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">{Math.round(r.relevance * 100)}% match</span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900">{r.title}</h3>
                      {r.value && <code className="text-xs font-mono text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded mt-1 inline-block select-all">{r.value}</code>}
                      {r.snippet && <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{r.snippet}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-zinc-100 rounded-2xl py-16 text-center">
                <Search size={28} className="mx-auto text-zinc-200 mb-3" />
                <p className="text-sm font-bold text-zinc-700">No results for "{submitted}"</p>
                <p className="text-xs text-zinc-400 mt-1">Run a crawl to collect more intelligence.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty landing */}
      {!submitted && !isLoading && (
        <div className="bg-white border border-zinc-100 rounded-2xl py-20 text-center">
          <Search size={36} className="mx-auto text-zinc-200 mb-4" />
          <h2 className="text-base font-bold text-zinc-700">Search collected intelligence</h2>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-sm mx-auto">
            Query forum posts, vendor listings, leak pastes, wallets, and PGP fingerprints.
          </p>
        </div>
      )}
    </div>
  );
}
