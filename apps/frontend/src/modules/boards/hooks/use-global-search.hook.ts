import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/modules/auth/context/auth.context';
import { search, type SearchResult } from '@/modules/boards/api/boards.api';

const DEBOUNCE_MS = 300;
const EMPTY_RESULT: SearchResult = { boards: [], cards: [] };

export type UseGlobalSearchStatus = 'idle' | 'loading' | 'ready';

export type UseGlobalSearchResult = {
  query: string;
  setQuery: (query: string) => void;
  result: SearchResult;
  status: UseGlobalSearchStatus;
};

/**
 * Busca global (`023`) com debounce de 300ms e cancelamento da requisição obsoleta —
 * reaproveitada pela tela `/search` e pelo command palette (`⌘K`), sem duplicar a chamada
 * a `GET /search` (ver `design.md`).
 */
export function useGlobalSearch(): UseGlobalSearchResult {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult>(EMPTY_RESULT);
  const [status, setStatus] = useState<UseGlobalSearchStatus>('idle');
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();

    if (!token || trimmed.length < 2) {
      requestIdRef.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(EMPTY_RESULT);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    const currentRequestId = ++requestIdRef.current;

    const timer = setTimeout(() => {
      search(token, trimmed)
        .then((data) => {
          if (requestIdRef.current !== currentRequestId) return;
          setResult(data);
          setStatus('ready');
        })
        .catch(() => {
          if (requestIdRef.current !== currentRequestId) return;
          setResult(EMPTY_RESULT);
          setStatus('ready');
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [token, query]);

  return { query, setQuery, result, status };
}
