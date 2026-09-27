/**
 * Nemesis API Client
 * Centralized HTTP client for all backend communication.
 */

const API_BASE = '/api';

function formatError(detail: unknown, fallback: string): string {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const loc = Array.isArray(item.loc) ? item.loc.filter((l: any) => l !== 'body').join('.') : '';
          const msg = item.msg || JSON.stringify(item);
          return loc ? `${loc}: ${msg}` : msg;
        }
        return String(item);
      })
      .join('; ');
  }
  if (typeof detail === 'object') {
    return (detail as any).message || (detail as any).msg || (detail as any).detail || JSON.stringify(detail);
  }
  return String(detail);
}

class NemesisAPI {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('nemesis_token');
  }

  private headers(): HeadersInit {
    const h: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...this.headers(), ...options?.headers },
    });
    if (res.status === 401) {
      if (path !== '/auth/login') {
        this.logout();
        window.location.href = '/login';
      }
      const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
      throw new Error(formatError(err?.detail, 'Invalid username or password'));
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(formatError(err?.detail, res.statusText || 'Request failed'));
    }
    return res.json();
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('nemesis_token', token);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('nemesis_token');
    localStorage.removeItem('nemesis_username');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Auth
  login(username: string, password: string) {
    return this.request<{ access_token: string; username: string; role: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  getMe() {
    return this.request<{ id: string; username: string; role: string }>('/auth/me');
  }

  // Dashboard
  getDashboard() {
    return this.request<any>('/dashboard');
  }

  // Sources
  getSources(status?: string) {
    const q = status ? `?status=${status}` : '';
    return this.request<any[]>(`/sources${q}`);
  }

  getSource(id: string) {
    return this.request<any>(`/sources/${id}`);
  }

  createSource(data: any) {
    return this.request<any>('/sources', { method: 'POST', body: JSON.stringify(data) });
  }

  updateSource(id: string, data: any) {
    return this.request<any>(`/sources/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  deleteSource(id: string) {
    return this.request<any>(`/sources/${id}`, { method: 'DELETE' });
  }

  seedDefaultSources() {
    return this.request<any>('/sources/seed-defaults', { method: 'POST' });
  }

  // Crawl
  startCrawl(sourceId: string) {
    return this.request<any>('/crawl/start', {
      method: 'POST',
      body: JSON.stringify({ source_id: sourceId }),
    });
  }

  getCrawlJobs(sourceId?: string) {
    const q = sourceId ? `?source_id=${sourceId}` : '';
    return this.request<any[]>(`/crawl/jobs${q}`);
  }

  // Pages
  getPages(sourceId?: string, limit = 50) {
    const params = new URLSearchParams();
    if (sourceId) params.set('source_id', sourceId);
    params.set('limit', String(limit));
    return this.request<any[]>(`/pages?${params}`);
  }

  getPage(id: string) {
    return this.request<any>(`/pages/${id}`);
  }

  // Observations
  getObservations(pageId?: string, type?: string) {
    const params = new URLSearchParams();
    if (pageId) params.set('page_id', pageId);
    if (type) params.set('obs_type', type);
    return this.request<any[]>(`/observations?${params}`);
  }

  // Identifiers
  getIdentifiers(type?: string, search?: string) {
    const params = new URLSearchParams();
    if (type) params.set('id_type', type);
    if (search) params.set('search', search);
    return this.request<any[]>(`/identifiers?${params}`);
  }

  // Actor Clusters
  getActorClusters(status?: string) {
    const q = status ? `?status=${status}` : '';
    return this.request<any[]>(`/actor-clusters${q}`);
  }

  getActor(id: string) {
    return this.request<any>(`/actors/${id}`); // Legacy for now
  }

  // Evidence
  getEvidence(limit = 50, actorId?: string) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (actorId) params.set('actor_id', actorId);
    return this.request<any[]>(`/evidence?${params}`);
  }

  getEvidenceDetail(id: string) {
    return this.request<any>(`/evidence/${id}`);
  }

  // Relationships
  getRelationships(minScore = 0) {
    return this.request<any[]>(`/relationships?min_score=${minScore}`);
  }

  // Graph
  getGraph(actorId?: string, depth = 2) {
    const params = new URLSearchParams();
    if (actorId) params.set('actor_id', actorId);
    params.set('depth', String(depth));
    return this.request<any>(`/graph?${params}`);
  }

  // Stylometry
  getStylometryProfiles() {
    return this.request<any[]>('/stylometry/profiles');
  }

  getStylometryProfile(id: string) {
    return this.request<any>(`/stylometry/profiles/${id}`);
  }

  getStylometryMatches(minSimilarity = 0.40) {
    return this.request<any[]>(`/stylometry/matches?min_similarity=${minSimilarity}`);
  }

  compareStylometry(actorA: string, actorB: string) {
    const params = new URLSearchParams({ actor_a: actorA, actor_b: actorB });
    return this.request<any>(`/stylometry/compare?${params}`);
  }

  analyzeTextStylometry(text: string, topK = 5) {
    return this.request<any>('/stylometry/analyze-text', {
      method: 'POST',
      body: JSON.stringify({ text, top_k: topK }),
    });
  }

  rebuildStylometry() {
    return this.request<any>('/stylometry/rebuild', {
      method: 'POST',
    });
  }

  // Persona Migrations
  getPersonaMigrations() {
    return this.request<any[]>('/personas/migrations');
  }

  // Behavioral
  getBehavioralProfiles() {
    return this.request<any[]>('/behavioral/profiles');
  }

  getBehavioralMatches() {
    return this.request<any[]>('/behavioral/matches');
  }

  // Actor Deanonymization & Attribution
  getActorDeanonymization(actorId: string) {
    return this.request<any>(`/actors/${actorId}/deanonymization`);
  }

  // Infrastructure
  getInfrastructure(type?: string) {
    const q = type ? `?infra_type=${type}` : '';
    return this.request<any[]>(`/infrastructure${q}`);
  }

  analyzeInfrastructure(entityId?: string) {
    const body = entityId ? JSON.stringify({ entity_id: entityId }) : undefined;
    return this.request<any>('/infrastructure/analyze', {
      method: 'POST',
      body,
    });
  }

  getInfrastructureDetail(id: string) {
    return this.request<any>(`/infrastructure/${id}`);
  }

  // Timeline
  getTimeline(actorId?: string, eventType?: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (actorId) params.set('actor_id', actorId);
    if (eventType) params.set('event_type', eventType);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    return this.request<any[]>(`/timeline?${params}`);
  }

  // Pipeline
  runCorrelation() {
    return this.request<any>('/pipeline/correlate', { method: 'POST' });
  }

  // Discovery
  discover(query: string) {
    return this.request<any>('/discover', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  // Reports
  generateReport(params: any) {
    return this.request<any>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Onion addresses
  getOnionAddresses() {
    return this.request<Record<string, string>>('/onion-addresses');
  }

  // Health
  getHealth() {
    return this.request<any>('/health');
  }
  // Autonomous Mode
  getAutonomousMode() {
    return this.request<any>('/settings/autonomous');
  }

  toggleAutonomousMode(enabled: boolean) {
    return this.request<any>('/settings/autonomous', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  // Reset Database & Clear Graph
  resetDatabase() {
    return this.request<any>('/settings/reset-database', { method: 'POST' });
  }

  // Crawl All Sources
  crawlAll() {
    return this.request<any>('/crawl/crawl-all', { method: 'POST' });
  }
}

export const api = new NemesisAPI();
