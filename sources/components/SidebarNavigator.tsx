import { useAuth } from '@/auth/AuthContext';
import * as React from 'react';
import { Drawer } from 'expo-router/drawer';
import { useIsTablet } from '@/utils/responsive';
import { SidebarView } from './SidebarView';
import { useWindowDimensions, Platform } from 'react-native';
import { useLocalSetting } from '@/sync/storage';
import { SidebarToggleButton } from './SidebarToggleButton';
import { usePathname } from 'expo-router';

export const SidebarNavigator = React.memo(() => {
    const auth = useAuth();
    const isTablet = useIsTablet();
    const sidebarCollapsed = useLocalSetting('sidebarCollapsed');
    const isWeb = Platform.OS === 'web';
    const pathname = usePathname();

    // Check if we're on a screen where sidebar can be collapsed
    // Sidebar can collapse on: session detail view or new session screen
    const canCollapseSidebar = pathname.startsWith('/session/') || pathname.startsWith('/new');

    // On web tablet, respect the collapsed setting ONLY on screens that allow it
    // On other screens, always show sidebar so user can see the session list
    const effectiveCollapsed = isWeb && sidebarCollapsed && canCollapseSidebar;
    const showPermanentDrawer = auth.isAuthenticated && isTablet && !effectiveCollapsed;
    const { width: windowWidth } = useWindowDimensions();

    // Calculate drawer width only when needed
    const drawerWidth = React.useMemo(() => {
        if (!showPermanentDrawer) return 280; // Default width for hidden drawer
        return Math.min(Math.max(Math.floor(windowWidth * 0.3), 250), 360);
    }, [windowWidth, showPermanentDrawer]);

    const drawerNavigationOptions = React.useMemo(() => {
        if (!showPermanentDrawer) {
            // When drawer is hidden, use minimal configuration
            return {
                lazy: false,
                headerShown: false,
                drawerType: 'front' as const,
                swipeEnabled: false,
                drawerStyle: {
                    width: 0,
                    display: 'none' as const,
                },
            };
        }

        // When drawer is permanent
        return {
            lazy: false,
            headerShown: false,
            drawerType: 'permanent' as const,
            drawerStyle: {
                backgroundColor: 'white',
                borderRightWidth: 0,
                width: drawerWidth,
            },
            swipeEnabled: false,
            drawerActiveTintColor: 'transparent',
            drawerInactiveTintColor: 'transparent',
            drawerItemStyle: { display: 'none' as const },
            drawerLabelStyle: { display: 'none' as const },
        };
    }, [showPermanentDrawer, drawerWidth]);

    // Always render SidebarView but hide it when not needed
    const drawerContent = React.useCallback(
        () => <SidebarView />,
        []
    );

    // Show toggle button when sidebar is effectively collapsed
    const showToggleButton = auth.isAuthenticated && isTablet && isWeb && effectiveCollapsed;

    return (
        <>
            <Drawer
                screenOptions={drawerNavigationOptions}
                drawerContent={showPermanentDrawer ? drawerContent : undefined}
            />
            {showToggleButton && <SidebarToggleButton />}
        </>
    )
});