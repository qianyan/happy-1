import * as React from 'react';

/**
 * Context for sharing the session list search query across components.
 * This allows keyboard navigation (Alt+Up/Down) to respect the current search filter.
 * Also provides a focus callback so keyboard shortcuts can focus the search input.
 */

interface SessionSearchContextValue {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    /** Register a callback to focus the search input */
    registerFocusCallback: (callback: () => void) => void;
    /** Unregister the focus callback */
    unregisterFocusCallback: () => void;
    /** Focus the search input (calls the registered callback) */
    focusSearch: () => void;
}

const SessionSearchContext = React.createContext<SessionSearchContextValue>({
    searchQuery: '',
    setSearchQuery: () => {},
    registerFocusCallback: () => {},
    unregisterFocusCallback: () => {},
    focusSearch: () => {},
});

export function SessionSearchProvider({ children }: { children: React.ReactNode }) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const focusCallbackRef = React.useRef<(() => void) | null>(null);

    const registerFocusCallback = React.useCallback((callback: () => void) => {
        focusCallbackRef.current = callback;
    }, []);

    const unregisterFocusCallback = React.useCallback(() => {
        focusCallbackRef.current = null;
    }, []);

    const focusSearch = React.useCallback(() => {
        focusCallbackRef.current?.();
    }, []);

    const value = React.useMemo(() => ({
        searchQuery,
        setSearchQuery,
        registerFocusCallback,
        unregisterFocusCallback,
        focusSearch,
    }), [searchQuery, registerFocusCallback, unregisterFocusCallback, focusSearch]);

    return (
        <SessionSearchContext.Provider value={value}>
            {children}
        </SessionSearchContext.Provider>
    );
}

export function useSessionSearch() {
    return React.useContext(SessionSearchContext);
}
