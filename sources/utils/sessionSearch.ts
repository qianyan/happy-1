import type { Session } from '@/sync/storageTypes';
import { getSessionName, getSessionSubtitle } from '@/utils/sessionUtils';

/**
 * Checks if a session matches the search query.
 * Supports OR syntax with '|' separator (e.g., "foo|bar" matches sessions containing "foo" OR "bar").
 * Each term is matched against session name, subtitle, and machine host.
 */
export function sessionMatchesSearch(session: Session, searchQuery: string): boolean {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    if (!normalizedQuery) return true;

    const sessionName = getSessionName(session).toLowerCase();
    const sessionSubtitle = getSessionSubtitle(session).toLowerCase();
    const machineHost = session.metadata?.host?.toLowerCase() || '';

    // Split by '|' for OR logic
    const terms = normalizedQuery.split('|').map(t => t.trim()).filter(t => t.length > 0);

    // If no valid terms after splitting, match everything
    if (terms.length === 0) return true;

    // Match if ANY term matches (OR logic)
    return terms.some(term =>
        sessionName.includes(term) ||
        sessionSubtitle.includes(term) ||
        machineHost.includes(term)
    );
}
