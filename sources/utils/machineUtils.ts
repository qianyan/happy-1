import type { Machine } from '@/sync/storageTypes';
import { storage } from '@/sync/storage';

/**
 * Determines if a machine should be considered online.
 *
 * A machine is considered online only if:
 * 1. The socket connection to the server is active (we have fresh data)
 * 2. The machine's active flag is true
 * 3. The daemon is not in shutting-down state
 *
 * If we're disconnected from the server, all machines show as offline
 * since we can't trust the cached state.
 */
export function isMachineOnline(machine: Machine): boolean {
    // If socket is disconnected, we can't trust machine state - show as offline
    const socketStatus = storage.getState().socketStatus;
    if (socketStatus !== 'connected') {
        return false;
    }

    // Check if daemon is in shutting-down state
    const metadata = machine.metadata as any;
    if (metadata?.daemonLastKnownStatus === 'shutting-down') {
        return false;
    }

    // Use the active flag
    return machine.active;
}

/**
 * Returns a status string for the machine that includes uncertainty.
 *
 * Returns:
 * - "online" if connected and machine is active
 * - "offline" if connected and machine is inactive
 * - "unknown" if we're disconnected from server (stale data)
 */
export function getMachineStatusText(machine: Machine): 'online' | 'offline' | 'unknown' {
    const socketStatus = storage.getState().socketStatus;
    if (socketStatus !== 'connected') {
        return 'unknown';
    }

    return isMachineOnline(machine) ? 'online' : 'offline';
}