> **This is a personal fork of [Happy](https://github.com/slopus/happy) - the open source mobile and web client for Claude Code.**
>
> All credit goes to the original authors at [happy.engineering](https://happy.engineering). I've made some tweaks for my own self-hosted setup, but my changes are too fragmented to submit as a proper PR upstream. If you're looking for the official version, please visit [github.com/slopus/happy](https://github.com/slopus/happy).
>
> **Fork Changes:**
> - Changed webapp URL to `happy.reily.app` for self-hosted deployment
> - Voice recording improvements (press-and-hold, auto-send)
> - iOS fixes (Enter key handling, scroll selection, session sorting)
> - Android voice recording fixes for OpenAI Whisper compatibility
> - Markdown rendering improvements (tables, code blocks, links)
> - Keyboard shortcuts for web app (see below)
> - Switched from yarn to bun

---

<div align="center"><img src="/logo.png" width="200" title="Happy Coder" alt="Happy Coder"/></div>

<h1 align="center">
  Mobile and Web Client for Claude Code & Codex
</h1>

<h4 align="center">
Use Claude Code or Codex from anywhere with end-to-end encryption.
</h4>

<div align="center">
  
[📱 **iOS App**](https://apps.apple.com/us/app/happy-claude-code-client/id6748571505) • [🤖 **Android App**](https://play.google.com/store/apps/details?id=com.ex3ndr.happy) • [🌐 **Web App**](https://happy.reily.app) • [🎥 **See a Demo**](https://youtu.be/GCS0OG9QMSE) • [⭐ **Star on GitHub**](https://github.com/slopus/happy) • [📚 **Documentation**](https://happy.engineering/docs/)

</div>

<img width="5178" height="2364" alt="github" src="https://github.com/user-attachments/assets/14d517e9-71a8-4fcb-98ae-9ebf9f7c149f" />


<h3 align="center">
Step 1: Download App
</h3>

<div align="center">
<a href="https://apps.apple.com/us/app/happy-claude-code-client/id6748571505"><img width="135" height="39" alt="appstore" src="https://github.com/user-attachments/assets/45e31a11-cf6b-40a2-a083-6dc8d1f01291" /></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://play.google.com/store/apps/details?id=com.ex3ndr.happy"><img width="135" height="39" alt="googleplay" src="https://github.com/user-attachments/assets/acbba639-858f-4c74-85c7-92a4096efbf5" /></a>
</div>

<h3 align="center">
Step 2: Install CLI on your computer
</h3>

```bash
npm install -g happy-coder
```

<h3 align="center">
Step 3: Start using `happy` instead of `claude` or `codex`
</h3>

```bash

# Instead of: claude
# Use: happy

happy

# Instead of: codex
# Use: happy codex

happy codex

```

## How does it work?

On your computer, run `happy` instead of `claude` or `happy codex` instead of `codex` to start your AI through our wrapper. When you want to control your coding agent from your phone, it restarts the session in remote mode. To switch back to your computer, just press any key on your keyboard.

## 🔥 Why Happy Coder?

- 📱 **Mobile access to Claude Code and Codex** - Check what your AI is building while away from your desk
- 🔔 **Push notifications** - Get alerted when Claude Code and Codex needs permission or encounters errors  
- ⚡ **Switch devices instantly** - Take control from phone or desktop with one keypress
- 🔐 **End-to-end encrypted** - Your code never leaves your devices unencrypted
- 🛠️ **Open source** - Audit the code yourself. No telemetry, no tracking

## 📦 Project Components

- **[happy-cli](https://github.com/slopus/happy-cli)** - Command-line interface for Claude Code and Codex
- **[happy-server](https://github.com/slopus/happy-server)** - Backend server for encrypted sync
- **happy-coder** - This mobile client (you are here)

## 🏠 Who We Are

We're engineers scattered across Bay Area coffee shops and hacker houses, constantly checking how our AI coding agents are progressing on our pet projects during lunch breaks. Happy Coder was born from the frustration of not being able to peek at our AI coding tools building our side hustles while we're away from our keyboards. We believe the best tools come from scratching your own itch and sharing with the community.

## 📚 Documentation & Contributing

- **[Documentation Website](https://happy.engineering/docs/)** - Learn how to use Happy Coder effectively
- **[Edit docs at github.com/slopus/slopus.github.io](https://github.com/slopus/slopus.github.io)** - Help improve our documentation and guides

## Keyboard Shortcuts (Web Only)

Happy Coder includes keyboard shortcuts for power users on the web version.

### Global Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + Shift + O` | Create new session |
| `Cmd/Ctrl + Shift + A` | Archive current session |
| `Cmd/Ctrl + Backspace` | Delete current session |
| `Cmd/Ctrl + Shift + V` | Toggle voice recording |

### New Session Screen (`/new`)
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + P` | Open path selector |
| `Cmd/Ctrl + Shift + M` | Open machine selector |

### Path Selector
| Shortcut | Action |
|----------|--------|
| `Enter` | Confirm and select path |
| `Tab` | Autocomplete with first suggestion |

### Message Input
| Shortcut | Action |
|----------|--------|
| `Enter` | Send message (or `Shift + Enter` if configured) |
| `Shift + Enter` | New line (or send if configured) |
| `Shift + Tab` | Cycle permission mode |
| `Cmd/Ctrl + M` | Cycle model mode |
| `Arrow Up/Down` | Navigate autocomplete suggestions |
| `Tab` | Select autocomplete suggestion |
| `Escape` | Close suggestions / Abort current operation |

### Dialogs
| Shortcut | Action |
|----------|--------|
| `Enter` | Confirm / OK |
| `Escape` | Cancel / Close |

### Zen Mode (Tasks)
| Shortcut | Action |
|----------|--------|
| `T` | Open new task input (when not typing) |

## License

MIT License - see [LICENSE](LICENSE) for details.
