import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileBarChart2, Download, FileSpreadsheet, FileText, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

export default function ReportsPage() {
  const [title, setTitle] = useState('Nemesis Dark-Web Intelligence Dossier');
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeStylometry, setIncludeStylometry] = useState(true);
  const [includeBehavioral, setIncludeBehavioral] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await api.generateReport({ title, include_evidence: includeEvidence, include_timeline: includeTimeline, include_stylometry: includeStylometry, include_behavioral: includeBehavioral });
      setReport(data);
      toast.success('Dossier compiled successfully', {
        description: `Generated intel report with ${data.actors?.length ?? 0} actors and ${data.relationships?.length ?? 0} relationships.`
      });
    } catch (err: any) {
      toast.error('Failed to generate dossier', {
        description: err.message || 'An error occurred during report compilation.'
      });
    } finally { setLoading(false); }
  };

  const exportJSON = () => {
    if (!report) return;
    const filename = `nemesis_${new Date().toISOString().slice(0,10)}.json`;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
    a.click(); URL.revokeObjectURL(a.href);
    toast.success(`Exported JSON dossier (${filename})`);
  };

  const exportCSV = () => {
    if (!report) return;
    let csv = 'Type,ID,Label,Confidence,Status\n';
    (report.actors ?? []).forEach((a: any) => { csv += `Actor,${a.id},"${a.label ?? ''}",${a.confidence ?? ''},${a.status ?? ''}\n`; });
    (report.relationships ?? []).forEach((r: any) => { csv += `Relationship,${r.subject_id},${r.object_id},${r.score ?? ''},${r.type ?? ''}\n`; });
    const filename = `nemesis_${new Date().toISOString().slice(0,10)}.csv`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
    a.click(); URL.revokeObjectURL(a.href);
    toast.success(`Exported CSV dossier (${filename})`);
  };

  const exportMD = () => {
    if (!report) return;
    let md = `# ${report.title}\n\n**Generated:** ${report.generated_at}  \n**Analyst:** ${report.generated_by}\n\n## Summary\n\n- Actors: ${report.actors?.length ?? 0}\n- Relationships: ${report.relationships?.length ?? 0}\n- Evidence: ${report.evidence?.length ?? 0}\n- Timeline: ${report.timeline?.length ?? 0}\n`;
    const filename = `nemesis_${new Date().toISOString().slice(0,10)}.md`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
    a.click(); URL.revokeObjectURL(a.href);
    toast.success(`Exported Markdown dossier (${filename})`);
  };

  const MODULES = [
    { label: 'Evidence Chain', checked: includeEvidence, set: setIncludeEvidence },
    { label: 'Timeline Events', checked: includeTimeline, set: setIncludeTimeline },
    { label: 'Stylometric Profiling', checked: includeStylometry, set: setIncludeStylometry },
    { label: 'Behavioral Clusters', checked: includeBehavioral, set: setIncludeBehavioral },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-950">Export</h1>
        <p className="text-sm text-zinc-400 mt-1">Generate court-admissible intelligence packages with full chain-of-custody.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><FileBarChart2 size={15} /> Parameters</h2>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Report Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Forensic Modules</label>
            <div className="space-y-2">
              {MODULES.map(m => (
                <label key={m.label} className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-100 rounded-xl cursor-pointer hover:border-zinc-200 transition-all">
                  <input type="checkbox" checked={m.checked} onChange={e => m.set(e.target.checked)}
                    className="w-4 h-4 accent-zinc-950 cursor-pointer" />
                  <span className="text-xs font-semibold text-zinc-700">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-950 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? <><RefreshCw size={14} className="animate-spin" /> Compiling…</> : <><FileBarChart2 size={14} /> Generate Report</>}
          </button>
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-2 bg-white border border-zinc-100 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900">Dossier Preview</h2>
            {report && (
              <div className="flex items-center gap-2">
                <button onClick={exportMD} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-zinc-900 border border-zinc-200 rounded-lg focus:bg-zinc-950 focus:text-white active:bg-zinc-950 active:text-white transition-all"><FileText size={12} /> MD</button>
                <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-zinc-900 border border-zinc-200 rounded-lg focus:bg-zinc-950 focus:text-white active:bg-zinc-950 active:text-white transition-all"><FileSpreadsheet size={12} /> CSV</button>
                <button onClick={exportJSON} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-zinc-900 border border-zinc-200 rounded-lg focus:bg-zinc-950 focus:text-white active:bg-zinc-950 active:text-white transition-all"><Download size={12} /> JSON</button>
              </div>
            )}
          </div>

          {!report ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-100 rounded-2xl">
              <FileBarChart2 size={32} className="text-zinc-200 mb-3" />
              <p className="text-sm font-bold text-zinc-500">No report generated</p>
              <p className="text-xs text-zinc-400 mt-1">Configure parameters and generate to preview.</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Meta */}
              <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-xl">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">{report.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{new Date(report.generated_at).toLocaleString()} · {report.generated_by}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle2 size={13} /> Chain of Custody Verified
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Actors', value: report.actors?.length ?? 0 },
                  { label: 'Relationships', value: report.relationships?.length ?? 0 },
                  { label: 'Evidence', value: report.evidence?.length ?? 0 },
                  { label: 'Events', value: report.timeline?.length ?? 0 },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 bg-zinc-50 border border-zinc-100 rounded-xl">
                    <p className="text-2xl font-black text-zinc-950">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Actor list */}
              {report.actors?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Actor Profiles</h4>
                  {report.actors.slice(0, 6).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-100 rounded-xl">
                      <div>
                        <span className="text-sm font-bold text-zinc-900">{a.label}</span>
                        <span className="text-xs text-zinc-400 ml-2">({a.identifiers?.length ?? 0} identifiers)</span>
                      </div>
                      <ConfidenceBadge score={a.confidence ?? 0} />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
