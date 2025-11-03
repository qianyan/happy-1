import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';

// Separate MMKV instance for server config that persists across logouts
const serverConfigStorage = new MMKV({ id: 'server-config' });

const SERVER_KEY = 'custom-server-url';
const PRODUCTION_SERVER_URL = 'https://api.cluster-fluster.com';

// Auto-detect server URL for local development
// When running on web+localhost, default to local server for convenience
function getDefaultServerUrl(): string {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Use the same hostname that's serving the web client
            // This ensures browser can reach the server whether inside or outside container
            return `http://${hostname}:3005`;
        }
    }
    return PRODUCTION_SERVER_URL;
}

export function getServerUrl(): string {
    const storedUrl = serverConfigStorage.getString(SERVER_KEY);
    const envUrl = process.env.EXPO_PUBLIC_HAPPY_SERVER_URL;
    const defaultUrl = getDefaultServerUrl();

    const finalUrl = storedUrl || envUrl || defaultUrl;

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