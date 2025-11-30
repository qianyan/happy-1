import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';

// Separate MMKV instance for server config that persists across logouts
const serverConfigStorage = new MMKV({ id: 'server-config' });

const SERVER_KEY = 'custom-server-url';
const PRODUCTION_SERVER_URL = 'https://api.cluster-fluster.com';

// Default server port when running locally (used for local development)
// This can be overridden at runtime via URL hash parameter
const DEFAULT_LOCAL_SERVER_PORT = 3005;

/**
 * Get server port from URL hash parameter for runtime configuration.
 * This allows late-binding of ports without rebuilding:
 *   http://localhost:8081/#server=10001
 *   http://localhost:8081/?server=10001  (also supported)
 */
function getServerPortFromUrl(): number | null {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Check hash first (e.g., #server=10001)
        const hash = window.location.hash;
        if (hash) {
            const match = hash.match(/server=(\d+)/);
            if (match) {
                return parseInt(match[1], 10);
            }
        }
        // Also check search params (e.g., ?server=10001)
        const params = new URLSearchParams(window.location.search);
        const serverPort = params.get('server');
        if (serverPort) {
            return parseInt(serverPort, 10);
        }
    }
    return null;
}

/**
 * Auto-detect server URL for local/self-hosted development.
 *
 * Resolution order for web:
 * 1. If EXPO_PUBLIC_HAPPY_SERVER_URL is 'dynamic' - use webapp's host with DEFAULT_LOCAL_SERVER_PORT
 * 2. If hostname is localhost/127.0.0.1 - use local server (traditional dev mode)
 * 3. Otherwise - use production server
 *
 * The 'dynamic' mode is useful for self-hosted setups where the webapp and server
 * run on the same machine, accessed via external hostname (e.g., http://myserver.duckdns.org:8081)
 */
function getDefaultServerUrl(): string {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const envUrl = process.env.EXPO_PUBLIC_HAPPY_SERVER_URL;

        // Special 'dynamic' mode: use the webapp's host with the server port
        // This is useful for self-hosted setups accessed via external hostname
        if (envUrl === 'dynamic') {
            const portFromUrl = getServerPortFromUrl();
            const port = portFromUrl ?? DEFAULT_LOCAL_SERVER_PORT;
            // Use http:// for non-localhost hostnames (self-hosted typically doesn't have HTTPS)
            return `http://${hostname}:${port}`;
        }

        // Traditional localhost development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            const portFromUrl = getServerPortFromUrl();
            const port = portFromUrl ?? DEFAULT_LOCAL_SERVER_PORT;
            return `http://${hostname}:${port}`;
        }
    }
    return PRODUCTION_SERVER_URL;
}

export function getServerUrl(): string {
    // Check for runtime override first (highest priority for E2E testing)
    // This allows tests to specify the server port via URL hash without rebuilding
    const portFromUrl = getServerPortFromUrl();
    if (portFromUrl) {
        const hostname =
            typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        return `http://${hostname}:${portFromUrl}`;
    }

    const storedUrl = serverConfigStorage.getString(SERVER_KEY);
    const envUrl = process.env.EXPO_PUBLIC_HAPPY_SERVER_URL;
    const defaultUrl = getDefaultServerUrl();

    // Note: If envUrl is 'dynamic', getDefaultServerUrl() already handles it
    // and returns the dynamic URL, so we skip envUrl in that case
    const effectiveEnvUrl = envUrl === 'dynamic' ? undefined : envUrl;
    const finalUrl = storedUrl || effectiveEnvUrl || defaultUrl;

    // Debug logging to help diagnose server URL issues
    if (Platform.OS === 'web') {
        console.log('[ServerConfig] URL Resolution:');
        console.log('  - Stored in localStorage:', storedUrl || 'none');
        console.log('  - Environment variable:', envUrl || 'none');
        console.log('  - Auto-detected default:', defaultUrl);
        console.log('  - Final server URL:', finalUrl);
    }

    return finalUrl;
}

export function setServerUrl(url: string | null): void {
    if (url && url.trim()) {
        serverConfigStorage.set(SERVER_KEY, url.trim());
    } else {
        serverConfigStorage.delete(SERVER_KEY);
    }
}

export function isUsingCustomServer(): boolean {
    return getServerUrl() !== PRODUCTION_SERVER_URL && getServerUrl() !== getDefaultServerUrl();
}

export function getServerInfo(): { hostname: string; port?: number; isCustom: boolean } {
    const url = getServerUrl();
    const isCustom = isUsingCustomServer();
    
    try {
        const parsed = new URL(url);
        const port = parsed.port ? parseInt(parsed.port) : undefined;
        return {
            hostname: parsed.hostname,
            port,
            isCustom
        };
    } catch {
        // Fallback if URL parsing fails
        return {
            hostname: url,
            port: undefined,
            isCustom
        };
    }
}

export function validateServerUrl(url: string): { valid: boolean; error?: string } {
    if (!url || !url.trim()) {
        return { valid: false, error: 'Server URL cannot be empty' };
    }
    
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { valid: false, error: 'Server URL must use HTTP or HTTPS protocol' };
        }
        return { valid: true };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}