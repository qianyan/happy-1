import * as React from 'react';

/**
 * Context for sharing the session list search query across components.
 * This allows keyboard navigation (Alt+Up/Down) to respect the current search filter.
 */

interface SessionSearchContextValue {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const SessionSearchContext = React.createContext<SessionSearchContextValue>({
    searchQuery: '',
    setSearchQuery: () => {},
});

export function SessionSearchProvider({ children }: { children: React.ReactNode }) {
    const [searchQuery, setSearchQuery] = React.useState('');

    const value = React.useMemo(() => ({
        searchQuery,
        setSearchQuery,
    }), [searchQuery]);

    return (
        <SessionSearchContext.Provider value={value}>
            {children}
        </SessionSearchContext.Provider>
    );
}

export function useSessionSearch() {
    return React.useContext(SessionSearchContext);
}
