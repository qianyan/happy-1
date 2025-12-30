# Changelog

## Version 6 - 2025-12-30

This update focuses on enhanced debugging capabilities, improved keyboard navigation, and better web experience with analytics and visual polish.

- Added keyboard shortcuts panel (⌘⇧?) showing all available shortcuts, accessible from Settings or keyboard
- Introduced debug transcript panel for developers to inspect session messages and thinking blocks
- Added unread message indicator (red dot) to session list for sessions with new messages
- Improved keyboard navigation: Alt+Up/Down now respects search filter, ⌘⇧F focuses search field
- Added OR search syntax support (e.g., "foo|bar") for filtering sessions
- Fixed markdown tables and link selectability on web for better content interaction
- Fixed scroll-to-bottom button icon color in dark mode
- Updated What's New and OTA Update banners to match grouped table view styling
- Added Umami analytics for web platform

## Version 5 - 2025-12-25

This update brings powerful keyboard shortcuts to the new session screen, making voice dictation and command access faster than ever. Power users can now leverage the same efficient workflow across all session screens.

- Added command palette keyboard shortcuts to new session screen for consistent keyboard navigation
- Enabled Cmd+Shift+V voice dictation toggle in new session creation for hands-free input
- Implemented Cmd+K command palette access from new session screen for quick action discovery
- Fixed scroll-to-bottom button position to 10px from bottom for better visibility
- Added cross-platform keyboard shortcuts (Cmd on Mac, Ctrl on Windows) for prev/next session navigation

## Version 4 - 2025-09-12

This release revolutionizes remote development with Codex integration and Daemon Mode, enabling instant AI assistance from anywhere. Start coding sessions with a single tap while maintaining complete control over your development environment.

- Introduced Codex support for advanced AI-powered code completion and generation capabilities.
- Implemented Daemon Mode as the new default, enabling instant remote session initiation without manual CLI startup.
- Added one-click session launch from mobile devices, automatically connecting to your development machine.
- Added ability to connect anthropic and gpt accounts to account

## Version 3 - 2025-08-29

This update introduces seamless GitHub integration, bringing your developer identity directly into Happy while maintaining our commitment to privacy and security.

- Added GitHub account connection through secure OAuth authentication flow
- Integrated profile synchronization displaying your GitHub avatar, name, and bio
- Implemented encrypted token storage on our backend for additional security protection
- Enhanced settings interface with personalized profile display when connected
- Added one-tap GitHub disconnect functionality with confirmation protection
- Improved account management with clear connection status indicators

## Version 2 - 2025-06-26

This update focuses on seamless device connectivity, visual refinements, and intelligent voice interactions for an enhanced user experience.

- Added QR code authentication for instant and secure device linking across platforms
- Introduced comprehensive dark theme with automatic system preference detection
- Improved voice assistant performance with faster response times and reduced latency
- Added visual indicators for modified files directly in the session list
- Implemented preferred language selection for voice assistant supporting 15+ languages

## Version 1 - 2025-05-12

Welcome to Happy - your secure, encrypted mobile companion for Claude Code. This inaugural release establishes the foundation for private, powerful AI interactions on the go.

- Implemented end-to-end encrypted session management ensuring complete privacy
- Integrated intelligent voice assistant with natural conversation capabilities
- Added experimental file manager with syntax highlighting and tree navigation
- Built seamless real-time synchronization across all your devices
- Established native support for iOS, Android, and responsive web interfaces