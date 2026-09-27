import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export function TopBar() {
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.getMe(),
    staleTime: Infinity,
  });

  const username = me?.username ?? localStorage.getItem('nemesis_username') ?? '—';

  return (
    <header className="fixed top-0 left-[224px] right-0 h-14 bg-white border-b border-zinc-100 flex items-center justify-end px-6 z-20">
      <div className="inline-flex items-center justify-center px-3 h-8 bg-zinc-950 text-white rounded-lg shadow-xs leading-none">
        <span className="text-xs font-bold tracking-wide uppercase leading-none">{username}</span>
      </div>
    </header>
  );
}
