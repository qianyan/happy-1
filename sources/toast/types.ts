/**
 * Toast notification types for user-visible feedback
 *
 * Toasts are non-blocking notifications that appear at the top of the screen
 * and automatically dismiss after a timeout (or can be manually dismissed).
 */

export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface ToastConfig {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    /** Auto-dismiss timeout in ms. 0 = no auto-dismiss. Default: 5000 for info/success, 0 for error/warning */
    duration?: number;
    /** Called when toast is dismissed (either manually or by timeout) */
    onDismiss?: () => void;
}

export interface ToastState {
    toasts: ToastConfig[];
}
