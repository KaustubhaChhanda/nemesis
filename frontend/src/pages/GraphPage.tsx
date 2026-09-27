import { useCallback, useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  Panel,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Network, Maximize2, Minimize2, Lock, Unlock, Copy, Check, X,
  Users, AtSign, Key, Coins, Globe, Server, Layers, FileCheck, Clock
} from 'lucide-react';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

function getEdgeProperties(relType: string, confidence: number | null | undefined) {
  const norm = (relType || '').toUpperCase().replace(/ /g, '_');
  let color = '#71717a';

  if (norm.includes('PGP') || norm.includes('CERTIFICATE')) {
    color = '#059669'; // Emerald
  } else if (norm.includes('WALLET')) {
    color = '#10b981'; // Emerald
  } else if (norm === 'SAME_AS' || norm.includes('MIGRAT')) {
    color = '#d97706'; // Amber
  } else if (norm.includes('TRUST') || norm.includes('VOUCH') || norm.includes('ENDORSE')) {
    color = '#f59e0b'; // Amber-Gold
  } else if (norm.includes('OPERATES') || norm.includes('POSTED') || norm.includes('HANDLE')) {
    color = '#2563eb'; // Blue
  } else if (norm.includes('HOSTED') || norm.includes('RESOLVES')) {
    color = '#0891b2'; // Cyan
  }

  const cleanType = norm.replace(/_/g, ' ');
  let certainty = 'Probable';
  if (confidence != null) {
    if (confidence >= 0.85) certainty = 'Strong';
    else if (confidence >= 0.70) certainty = 'Probable';
    else certainty = 'Candidate';
  }

  const percent = confidence != null ? `${Math.round(confidence * 100)}%` : '';
  const label = percent ? `${cleanType} • ${certainty} (${percent})` : cleanType;

  return { color, certainty, percent, label };
}

const NODE_CONFIG: Record<string, { bg: string; border: string; text: string; badgeBg: string; badgeText: string }> = {
  Actor:        { bg: '#09090b', border: '#18181b', text: '#ffffff', badgeBg: '#27272a', badgeText: '#ffffff' },
  Persona:      { bg: '#18181b', border: '#27272a', text: '#ffffff', badgeBg: '#3f3f46', badgeText: '#a1a1aa' },
  Handle:       { bg: '#ffffff', border: '#cbd5e1', text: '#09090b', badgeBg: '#f1f5f9', badgeText: '#475569' },
  Email:        { bg: '#f8fafc', border: '#cbd5e1', text: '#0f172a', badgeBg: '#f1f5f9', badgeText: '#334155' },
  PGPKey:       { bg: '#f8fafc', border: '#cbd5e1', text: '#0f172a', badgeBg: '#f1f5f9', badgeText: '#334155' },
  Wallet:       { bg: '#f8fafc', border: '#cbd5e1', text: '#0f172a', badgeBg: '#f1f5f9', badgeText: '#334155' },
  OnionService: { bg: '#f8fafc', border: '#94a3b8', text: '#0f172a', badgeBg: '#e2e8f0', badgeText: '#1e293b' },
  Domain:       { bg: '#f8fafc', border: '#94a3b8', text: '#0f172a', badgeBg: '#e2e8f0', badgeText: '#1e293b' },
  IPAddress:    { bg: '#f8fafc', border: '#94a3b8', text: '#0f172a', badgeBg: '#e2e8f0', badgeText: '#1e293b' },
  IP:           { bg: '#f8fafc', border: '#94a3b8', text: '#0f172a', badgeBg: '#e2e8f0', badgeText: '#1e293b' },
  Marketplace:  { bg: '#f4f4f5', border: '#d4d4d8', text: '#18181b', badgeBg: '#e4e4e7', badgeText: '#27272a' },
  Forum:        { bg: '#f8fafc', border: '#94a3b8', text: '#1e293b', badgeBg: '#e2e8f0', badgeText: '#334155' },
  Certificate:  { bg: '#f8fafc', border: '#94a3b8', text: '#0f172a', badgeBg: '#e2e8f0', badgeText: '#1e293b' },
};

function getNodeIcon(type: string) {
  switch (type) {
    case 'Actor':
    case 'Persona':
      return <Users size={12} className="text-zinc-300" />;
    case 'Handle':
      return <AtSign size={12} className="text-zinc-600" />;
    case 'PGPKey':
      return <Key size={12} className="text-zinc-600" />;
    case 'Wallet':
      return <Coins size={12} className="text-zinc-600" />;
    case 'OnionService':
    case 'Domain':
      return <Globe size={12} className="text-zinc-600" />;
    case 'Certificate':
      return <FileCheck size={12} className="text-zinc-600" />;
    case 'IP':
    case 'IPAddress':
      return <Server size={12} className="text-zinc-600" />;
    default:
      return <Layers size={12} className="text-zinc-600" />;
  }
}

function getNodeSubtitle(n: any): string {
  const p = n.properties || {};
  if (n.type === 'Actor' || n.type === 'Persona') {
    return p.category || (p.attribution_confidence ? `Conf: ${Math.round(p.attribution_confidence * 100)}%` : 'Threat Actor');
  }
  if (n.type === 'Handle') {
    return p.platform ? `@${p.platform}` : 'Online Handle';
  }
  if (n.type === 'PGPKey') {
    return p.fingerprint ? `Key: ${p.fingerprint.slice(0, 8)}…` : 'PGP Key';
  }
  if (n.type === 'Wallet') {
    return p.blockchain ? `${p.blockchain.toUpperCase()} Asset` : 'Crypto Wallet';
  }
  if (n.type === 'OnionService') {
    return 'Hidden Service';
  }
  if (n.type === 'Domain') {
    return 'Network Domain';
  }
  if (n.type === 'IPAddress' || n.type === 'IP') {
    return 'Observed IP';
  }
  if (n.type === 'Certificate') {
    return 'TLS Certificate';
  }
  return '';
}

function buildElements(graphData: any, minConfidence: number = 0.70): { nodes: Node[]; edges: Edge[] } {
  if (!graphData?.nodes || !graphData?.edges) return { nodes: [], edges: [] };

  // 1. Filter edges that satisfy the confidence threshold
  const validRawEdges = graphData.edges.filter((e: any) => {
    const conf = e.confidence ?? e.properties?.confidence ?? 0.8;
    return conf >= minConfidence;
  });

  // 2. Identify nodes that have active relationships (NO single/orphan nodes)
  const connectedNodeIds = new Set<string>();
  validRawEdges.forEach((e: any) => {
    if (e.source) connectedNodeIds.add(e.source);
    if (e.target) connectedNodeIds.add(e.target);
  });

  // 3. Keep ONLY nodes that have relationships satisfying the threshold
  const filteredRawNodes = graphData.nodes.filter((n: any) => connectedNodeIds.has(n.id));

  // Build adjacency lookup to identify which cluster/actor each node belongs to
  const nodeNeighbors = new Map<string, Set<string>>();
  validRawEdges.forEach((e: any) => {
    if (!nodeNeighbors.has(e.source)) nodeNeighbors.set(e.source, new Set());
    if (!nodeNeighbors.has(e.target)) nodeNeighbors.set(e.target, new Set());
    nodeNeighbors.get(e.source)!.add(e.target);
    nodeNeighbors.get(e.target)!.add(e.source);
  });

  // Separate actors vs. non-actor entities
  const actorNodes = filteredRawNodes.filter((n: any) => n.type === 'Actor' || n.type === 'Persona');
  const nonActorNodes = filteredRawNodes.filter((n: any) => n.type !== 'Actor' && n.type !== 'Persona');

  const cx = 750;
  const cy = 550;
  const nodePositions = new Map<string, { x: number; y: number }>();

  // If there are actors, organize the graph into spacious Actor Clusters
  const K = actorNodes.length;
  const actorRadius = K > 1 ? Math.max(480, K * 170) : 0;

  // 1. Position each Actor as a cluster hub
  actorNodes.forEach((actor: any, idx: number) => {
    if (K === 1) {
      nodePositions.set(actor.id, { x: cx, y: cy });
    } else {
      const angle = (idx / K) * 2 * Math.PI;
      nodePositions.set(actor.id, {
        x: cx + actorRadius * Math.cos(angle),
        y: cy + actorRadius * Math.sin(angle),
      });
    }
  });

  // 2. Position non-actor nodes near their connected actor(s)
  const sharedNodes: any[] = [];
  const actorMembers = new Map<string, any[]>();
  actorNodes.forEach((a: any) => actorMembers.set(a.id, []));

  nonActorNodes.forEach((n: any) => {
    const neighbors = nodeNeighbors.get(n.id) || new Set();
    const connectedActors = actorNodes.filter((a: any) => neighbors.has(a.id));
    
    // Also check 2-hop connections to actors (via handle)
    if (connectedActors.length === 0) {
      const twoHopActors = new Set<any>();
      neighbors.forEach((nbrId: string) => {
        const nbrNeighbors = nodeNeighbors.get(nbrId) || new Set();
        actorNodes.forEach((a: any) => {
          if (nbrNeighbors.has(a.id)) twoHopActors.add(a);
        });
      });
      if (twoHopActors.size === 1) {
        connectedActors.push(Array.from(twoHopActors)[0]);
      } else if (twoHopActors.size > 1) {
        sharedNodes.push(n);
        return;
      }
    }

    if (connectedActors.length === 1) {
      actorMembers.get(connectedActors[0].id)!.push(n);
    } else {
      sharedNodes.push(n);
    }
  });

  // For each actor cluster, arrange handles on an inner arc, and wallets/PGP on an outer arc
  actorNodes.forEach((actor: any) => {
    const aPos = nodePositions.get(actor.id) || { x: cx, y: cy };
    const members = actorMembers.get(actor.id) || [];
    if (members.length === 0) return;

    // Outward vector from canvas center to actor
    const outwardAngle = K > 1 ? Math.atan2(aPos.y - cy, aPos.x - cx) : 0;
    
    // Split into handles vs indicators
    const handles = members.filter((m: any) => m.type === 'Handle' || m.type === 'Email');
    const others = members.filter((m: any) => m.type !== 'Handle' && m.type !== 'Email');

    // Place handles at distance ~200px fanning outward
    const hCount = handles.length;
    handles.forEach((h: any, hIdx: number) => {
      const spread = Math.min(Math.PI * 1.2, Math.max(0.6, hCount * 0.45));
      const hAngle = outwardAngle + (hCount > 1 ? (hIdx / (hCount - 1) - 0.5) * spread : 0);
      nodePositions.set(h.id, {
        x: aPos.x + 200 * Math.cos(hAngle),
        y: aPos.y + 200 * Math.sin(hAngle),
      });
    });

    // Place indicators (wallets, PGP, etc.) further out at distance ~360px
    const oCount = others.length;
    others.forEach((o: any, oIdx: number) => {
      const spread = Math.min(Math.PI * 1.4, Math.max(0.7, oCount * 0.4));
      const oAngle = outwardAngle + (oCount > 1 ? (oIdx / (oCount - 1) - 0.5) * spread : 0);
      nodePositions.set(o.id, {
        x: aPos.x + 360 * Math.cos(oAngle),
        y: aPos.y + 360 * Math.sin(oAngle),
      });
    });
  });

  // Position shared infrastructure (Marketplaces, Forums, etc.) in the center hub
  const sCount = sharedNodes.length;
  sharedNodes.forEach((s: any, sIdx: number) => {
    const sAngle = (sIdx / Math.max(1, sCount)) * 2 * Math.PI;
    const sRadius = Math.min(260, Math.max(130, sCount * 35));
    nodePositions.set(s.id, {
      x: cx + sRadius * Math.cos(sAngle),
      y: cy + sRadius * Math.sin(sAngle),
    });
  });

  // 3. Collision Resolution & Relaxation Pass (40 iterations)
  // Ensures every single node card has at least 185px clearance from all other cards!
  const nodeIds = filteredRawNodes.map((n: any) => n.id);
  const minDist = 185; // Clearance distance between node centers

  for (let iter = 0; iter < 40; iter++) {
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const idA = nodeIds[i];
        const idB = nodeIds[j];
        const posA = nodePositions.get(idA);
        const posB = nodePositions.get(idB);
        if (!posA || !posB) continue;

        let dx = posB.x - posA.x;
        let dy = posB.y - posA.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          if (dist < 1) {
            dx = (Math.random() - 0.5) * 4;
            dy = (Math.random() - 0.5) * 4;
            dist = Math.sqrt(dx * dx + dy * dy) || 1;
          }
          const push = (minDist - dist) / 2;
          const pushX = (dx / dist) * push;
          const pushY = (dy / dist) * push;

          const isActorA = idA.startsWith('Actor') || actorNodes.some((a: any) => a.id === idA);
          const isActorB = idB.startsWith('Actor') || actorNodes.some((a: any) => a.id === idB);

          const weightA = isActorA ? 0.3 : 0.7;
          const weightB = isActorB ? 0.3 : 0.7;

          posA.x -= pushX * weightA;
          posA.y -= pushY * weightA;
          posB.x += pushX * weightB;
          posB.y += pushY * weightB;
        }
      }
    }
  }

  // 4. Construct ReactFlow Node Objects with relaxed coordinates
  const nodes: Node[] = filteredRawNodes.map((n: any) => {
    const pos = nodePositions.get(n.id) || { x: cx, y: cy };
    const config = NODE_CONFIG[n.type] ?? NODE_CONFIG.Handle;
    const subtitle = getNodeSubtitle(n);
    const isActor = n.type === 'Actor' || n.type === 'Persona';

    return {
      id: n.id,
      position: { x: Math.round(pos.x), y: Math.round(pos.y) },
      data: {
        raw: n,
        label: (
          <div className="flex flex-col items-center justify-center p-1.5 text-center select-none w-full">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="flex-shrink-0">{getNodeIcon(n.type)}</span>
              <span
                className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: config.badgeBg, color: config.badgeText }}
              >
                {n.type}
              </span>
            </div>
            <div className="text-[11px] font-bold truncate max-w-[130px]" title={n.label || n.id}>
              {n.label || n.id}
            </div>
            {subtitle && (
              <div className="text-[9px] font-medium opacity-75 mt-0.5 truncate max-w-[125px]">
                {subtitle}
              </div>
            )}
          </div>
        ),
      },
      style: {
        background: config.bg,
        border: isActor ? '2px solid #09090b' : `1.5px solid ${config.border}`,
        color: config.text,
        borderRadius: '14px',
        padding: '6px 10px',
        fontSize: 11,
        minWidth: 140,
        boxShadow: isActor ? '0 4px 14px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      },
    };
  });

  const isLargeGraph = validRawEdges.length > 40;
  const edges: Edge[] = validRawEdges.map((e: any) => {
    const relType = e.type ?? e.relationship ?? 'LINKED_TO';
    const conf = e.confidence ?? e.properties?.confidence;
    const { color, label } = getEdgeProperties(relType, conf);
    const isOrigin = relType === 'HOSTED_ON';
    const displayLabel = isLargeGraph ? relType.replace(/_/g, ' ') : label;

    return {
      id: e.id ?? `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      label: displayLabel,
      type: 'bezier',
      animated: isOrigin,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: color,
      },
      style: {
        stroke: color,
        strokeWidth: isOrigin ? 2.5 : 1.8,
        strokeDasharray: isOrigin ? '5,5' : undefined,
        opacity: 0.95,
      },
      labelStyle: { fontSize: 8, fill: '#09090b', fontWeight: 800, letterSpacing: '0.04em' },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.98, stroke: color, strokeWidth: 1.2 },
      labelBgPadding: [6, 4],
      labelBgBorderRadius: 5,
      data: {
        ...e,
        relationshipType: relType,
        confidence: conf,
      },
    };
  });

  return { nodes, edges };
}

export default function GraphPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [actorFilter, setActorFilter] = useState('');
  const [minConfidence, setMinConfidence] = useState<number>(0.70);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [copiedId, setCopiedId] = useState(false);

  const { data: graphData, isLoading } = useQuery({
    queryKey: ['graph', actorFilter],
    queryFn: () => api.getGraph(actorFilter || undefined),
  });

  const { data: actors = [] } = useQuery({
    queryKey: ['actorClusters'],
    queryFn: () => api.getActorClusters(),
  });

  useEffect(() => {
    const { nodes: n, edges: e } = buildElements(graphData, minConfidence);
    setNodes(n);
    setEdges(e);
  }, [graphData, minConfidence]);

  // Handle true HTML5 fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
    }
  };

  const toggleLock = () => {
    const next = !isLocked;
    setIsLocked(next);
    if (next) {
      toast.info('Graph locked: Panning and node movement disabled.');
    } else {
      toast.info('Graph unlocked: Canvas panning and dragging enabled.');
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNode(node);
  };

  const copyNodeId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success('Entity ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const isEmpty = !isLoading && nodes.length === 0;

  // Compute connected edges for the selected node
  const selectedNodeEdges = selectedNode ? edges.filter(
    (e: any) => e.source === selectedNode.id || e.target === selectedNode.id
  ) : [];

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">Investigation Graph</h1>
          <p className="text-sm text-zinc-400 mt-1">Interactive entity graph synchronized from PostgreSQL to Neo4j.</p>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-white border border-zinc-100 rounded-2xl p-3 shadow-sm flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">Focus Actor</label>
          <select
            value={actorFilter}
            onChange={e => setActorFilter(e.target.value)}
            className="flex-1 text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
          >
            <option value="">All Actors & Relationships ({nodes.length} Connected Nodes)</option>
            {actors.map((a: any) => (
              <option key={a.id || a.actor_cluster_id} value={a.id || a.actor_cluster_id}>
                {a.name || a.label || a.actor_cluster_id}
              </option>
            ))}
          </select>
        </div>

        {/* Confidence Threshold Filter (Only nodes with relationships satisfying threshold shown) */}
        <div className="flex items-center gap-2.5 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 whitespace-nowrap">
            Confidence: <span className="text-zinc-950 font-black">{Math.round(minConfidence * 100)}%</span>
          </label>
          <input
            type="range"
            min="0.50"
            max="0.90"
            step="0.05"
            value={minConfidence}
            onChange={e => setMinConfidence(parseFloat(e.target.value))}
            className="w-20 accent-zinc-950 cursor-pointer h-1.5 bg-zinc-200 rounded-lg"
            title={`Filter relationships by confidence: ${Math.round(minConfidence * 100)}%`}
          />
          <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
            {[
              { label: '≥50%', val: 0.50 },
              { label: '≥70%', val: 0.70 },
              { label: '≥85%', val: 0.85 },
            ].map(b => (
              <button
                key={b.val}
                type="button"
                onClick={() => setMinConfidence(b.val)}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all ${
                  Math.abs(minConfidence - b.val) < 0.01
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Lock / Unlock Toggle */}
          <button
            onClick={toggleLock}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              isLocked
                ? 'bg-zinc-950 text-white border-zinc-900 shadow-sm'
                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
            }`}
            title={isLocked ? 'Graph is locked: Canvas and nodes cannot be moved' : 'Graph is unlocked: Drag and pan freely'}
          >
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg hover:bg-zinc-100 transition-all shadow-2xs"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Native Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Graph canvas */}
      <div
        ref={containerRef}
        id="graph-container"
        className={`bg-white border border-zinc-100 overflow-hidden relative ${
          isFullscreen ? 'w-full h-full rounded-none border-none p-0' : 'rounded-2xl shadow-sm'
        }`}
        style={isFullscreen ? { height: '100vh', width: '100vw' } : { height: '70vh' }}
      >
        {isEmpty ? (
          <EmptyState
            icon={<Network size={28} />}
            title="No graph data available"
            description="Run a crawl and correlation pipeline to populate the investigation graph."
          />
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodesDraggable={!isLocked}
            nodesConnectable={!isLocked}
            elementsSelectable={!isLocked}
            panOnDrag={!isLocked}
            panOnScroll={false}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={!isLocked}
            preventScrolling={true}
            fitView
            minZoom={0.05}
            maxZoom={2.5}
            fitViewOptions={{ padding: 0.25, minZoom: 0.05, maxZoom: 1.2 }}
            attributionPosition="bottom-right"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e4e4e7" />
            <Controls
              showZoom={true}
              showFitView={false}
              showInteractive={false}
              className="!border-zinc-200 !shadow-sm !bg-white !rounded-xl overflow-hidden"
            />
            <MiniMap
              nodeColor={n => (n.style?.background as string) ?? '#f4f4f5'}
              maskColor="rgba(248,248,248,0.7)"
              className="!border-zinc-200 !shadow-sm !bg-white !rounded-xl overflow-hidden"
            />

            {/* Legend */}
            <Panel position="top-right">
              <div className="bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-xl p-3 shadow-md text-[10px] space-y-1.5">
                <p className="font-bold text-zinc-400 uppercase tracking-widest text-[9px] mb-2">Entity Legend</p>
                {Object.entries(NODE_CONFIG).slice(0, 7).map(([type, c]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ background: c.bg, border: `1.5px solid ${c.border}` }} />
                    <span className="font-semibold text-zinc-700">{type}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </ReactFlow>
        )}

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute right-4 top-4 bottom-4 w-96 bg-white/95 backdrop-blur-md border border-zinc-200 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-zinc-100 flex items-start justify-between bg-zinc-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800">
                  {getNodeIcon(selectedNode.data?.raw?.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-white">
                      {selectedNode.data?.raw?.type}
                    </span>
                    {selectedNode.data?.raw?.properties?.attribution_confidence != null && (
                      <ConfidenceBadge score={selectedNode.data.raw.properties.attribution_confidence} />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 mt-1 truncate max-w-[220px]">
                    {selectedNode.data?.raw?.label || selectedNode.id}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-zinc-400 hover:text-zinc-800 p-1 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Entity ID */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Entity ID</span>
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-lg">
                  <code className="text-[11px] font-mono text-zinc-700 flex-1 truncate select-all">{selectedNode.id}</code>
                  <button
                    onClick={() => copyNodeId(selectedNode.id)}
                    className="text-zinc-400 hover:text-zinc-700 transition-colors"
                    title="Copy Entity ID"
                  >
                    {copiedId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              {/* Entity Properties */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Properties</span>
                <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 space-y-2">
                  {Object.entries(selectedNode.data?.raw?.properties || {})
                    .filter(([k]) => !['entity_id', 'canonical_name', 'normalized_value'].includes(k))
                    .map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">{key.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-zinc-800 break-all text-right font-medium">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  {Object.keys(selectedNode.data?.raw?.properties || {}).length <= 3 && (
                    <div className="text-zinc-400 text-center py-1">Standard entity attributes recorded.</div>
                  )}
                </div>
              </div>

              {/* Connected Relationships */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Connected Links ({selectedNodeEdges.length})
                  </span>
                </div>
                {selectedNodeEdges.length === 0 ? (
                  <p className="text-zinc-400 text-center py-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    No active connections found for this node.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedNodeEdges.map((e: any) => {
                      const isOutgoing = e.source === selectedNode.id;
                      const otherId = isOutgoing ? e.target : e.source;
                      const otherNode = nodes.find(n => n.id === otherId);
                      const otherLabel = otherNode?.data?.raw?.label || otherId;
                      const relType = e.data?.relationshipType || e.data?.type || e.data?.relationship || 'LINKED';
                      const conf = e.data?.confidence ?? e.data?.properties?.confidence;
                      const edgeProp = getEdgeProperties(relType, conf);

                      return (
                        <div
                          key={e.id}
                          className="bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 flex items-center justify-between gap-2 hover:border-zinc-200 transition-all"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">
                              {isOutgoing ? '→' : '←'}
                            </span>
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: edgeProp.color }}
                            />
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white text-zinc-900 border border-zinc-200">
                              {relType.replace(/_/g, ' ')}
                            </span>
                            <span className="font-bold text-zinc-900 truncate max-w-[120px]" title={otherLabel}>
                              {otherLabel}
                            </span>
                          </div>
                          {conf != null && (
                            <ConfidenceBadge score={conf} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex items-center gap-2">
              {selectedNode.data?.raw?.type === 'Actor' && (
                <>
                  <button
                    onClick={() => {
                      setActorFilter(selectedNode.id);
                      setSelectedNode(null);
                    }}
                    className="flex-1 py-1.5 px-3 text-xs font-semibold bg-zinc-950 text-white rounded-lg hover:bg-zinc-800 transition-all shadow-2xs"
                  >
                    Focus on Actor
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/timeline?actor_id=${encodeURIComponent(selectedNode.id)}`);
                    }}
                    className="flex-1 py-1.5 px-3 text-xs font-semibold bg-white border border-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-50 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Clock size={13} className="text-zinc-600" />
                    <span>Timeline</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedNode(null)}
                className="py-1.5 px-3 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
