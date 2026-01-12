import { useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';
import { getDeviceType } from '@/utils/responsive';
import { isRunningOnMac } from '@/utils/platform';
import { useLocalSetting } from '@/sync/storage';

// Multiplier for expanded width when sidebar is collapsed
const SIDEBAR_COLLAPSED_MULTIPLIER = 1.5;

// Calculate max width based on device type
function getMaxWidth(): number {
    const deviceType = getDeviceType();

    // For phones, use the max dimension (width or height)
    if (deviceType === 'phone' && Platform.OS !== 'web') {
        const { width, height } = Dimensions.get('window');
        return Math.max(width, height);
    }

    if (isRunningOnMac()) {
        return Number.POSITIVE_INFINITY;
    }

    // For tablets and web, use 700px
    return 800;
}

// Calculate max width based on device type
function getMaxLayoutWidth(): number {
    const deviceType = getDeviceType();

    // For phones, use the max dimension (width or height)
    if (deviceType === 'phone' && Platform.OS !== 'web') {
        const { width, height } = Dimensions.get('window');
        return Math.max(width, height);
    }

    if (isRunningOnMac()) {
        return 1400;
    }

    // For tablets and web, use 700px
    return 800;
}

export const layout = {
    maxWidth: getMaxLayoutWidth(),
    headerMaxWidth: getMaxWidth()
}

/**
 * Hook that returns responsive max width based on sidebar collapsed state.
 * When sidebar is collapsed on web, returns 1.5x the normal width.
 * When wideContentView is enabled, returns '100%'.
 */
export function useResponsiveMaxWidth(): number | '100%' {
    const wideContentView = useLocalSetting('wideContentView');
    const sidebarCollapsed = useLocalSetting('sidebarCollapsed');

    return useMemo(() => {
        if (wideContentView) {
            return '100%';
        }
        if (Platform.OS === 'web' && sidebarCollapsed) {
            return Math.round(layout.maxWidth * SIDEBAR_COLLAPSED_MULTIPLIER);
        }
        return layout.maxWidth;
    }, [wideContentView, sidebarCollapsed]);
}

/**
 * Hook that returns responsive header max width based on sidebar collapsed state.
 * When sidebar is collapsed on web, returns 1.5x the normal width.
 */
export function useResponsiveHeaderMaxWidth(): number {
    const sidebarCollapsed = useLocalSetting('sidebarCollapsed');

    return useMemo(() => {
        if (Platform.OS === 'web' && sidebarCollapsed) {
            // For header, use the content maxWidth expanded, not headerMaxWidth
            // This keeps header aligned with content
            return Math.round(layout.maxWidth * SIDEBAR_COLLAPSED_MULTIPLIER);
        }
        return layout.headerMaxWidth;
    }, [sidebarCollapsed]);
}