/**
 * Global toast notification manager
 *
 * Usage:
 *   import { Toast } from '@/toast';
 *   Toast.error('Something went wrong', 'Check your connection');
 *   Toast.success('Session started');
 *   Toast.warning('Machine offline');
 *   Toast.info('Syncing data...');
 */

import { ToastConfig, ToastType } from './types';

type ShowToastFn = (config: Omit<ToastConfig, 'id'>) => string;
type HideToastFn = (id: string) => void;

class ToastManagerClass {
    private showToastFn: ShowToastFn | null = null;
    private hideToastFn: HideToastFn | null = null;

    /**
     * Initialize the toast manager with provider functions
     * Called by ToastProvider on mount
     */
    setFunctions(showToast: ShowToastFn, hideToast: HideToastFn): void {
        this.showToastFn = showToast;
        this.hideToastFn = hideToast;
    }

    /**
     * Clear provider functions on unmount
     */
    clearFunctions(): void {
        this.showToastFn = null;
        this.hideToastFn = null;
    }

    private show(type: ToastType, title: string, message?: string, duration?: number): string {
        if (!this.showToastFn) {
            console.warn(`[Toast] ToastProvider not mounted. ${type}: ${title}${message ? ` - ${message}` : ''}`);
            return '';
        }

        return this.showToastFn({
            type,
            title,
            message,
            duration,
        });
    }

    /**
     * Show an error toast (does not auto-dismiss by default)
     */
    error(title: string, message?: string): string {
        return this.show('error', title, message, 0);
    }

    /**
     * Show a warning toast (does not auto-dismiss by default)
     */
    warning(title: string, message?: string): string {
        return this.show('warning', title, message, 0);
    }

    /**
     * Show a success toast (auto-dismisses after 4 seconds)
     */
    success(title: string, message?: string): string {
        return this.show('success', title, message, 4000);
    }

    /**
     * Show an info toast (auto-dismisses after 5 seconds)
     */
    info(title: string, message?: string): string {
        return this.show('info', title, message, 5000);
    }

    /**
     * Manually hide a toast by ID
     */
    hide(id: string): void {
        if (!this.hideToastFn) {
            console.warn('[Toast] ToastProvider not mounted');
            return;
        }
        this.hideToastFn(id);
    }
}

export const Toast = new ToastManagerClass();
