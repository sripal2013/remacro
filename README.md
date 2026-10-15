# ReMacro

**Record keystrokes once, replay them anywhere.** Sublime-style macro recording for VS Code.

VS Code has never had macro recording ([microsoft/vscode#4490](https://github.com/microsoft/vscode/issues/4490), open since 2016). ReMacro fills that gap: hit record, make your edits, stop, and replay the exact sequence with one command — or bind it to a key.

## Usage

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. **ReMacro: Start Recording** — a `● Recording macro` indicator appears in the status bar
3. Make your edits (typing, deletions, cursor moves)
4. **ReMacro: Stop Recording** — name the macro when prompted
5. **ReMacro: Play Last Macro** — or **ReMacro: Run Macro…** to pick from saved macros

Macros are stored relative to where your cursor was when recording started, so a macro recorded on line 5 replays correctly when your cursor is on line 50.

## Bind a macro to a key

ReMacro ships with no default keybindings (to avoid conflicts). Bind any macro in `keybindings.json`:

```json
{
	"key": "ctrl+shift+r",
	"command": "remacro.runMacro",
	"args": { "name": "quote-lines" }
}
```

Or bind the palette commands directly:

| Command | Suggested binding |
|---|---|
| `remacro.startRecording` | `ctrl+alt+r` |
| `remacro.stopRecording` | `ctrl+alt+s` |
| `remacro.playLastMacro` | `ctrl+alt+p` |

## Commands

| Command | Description |
|---|---|
| `remacro.startRecording` | Start recording edits and cursor moves |
| `remacro.stopRecording` | Stop and save the macro under a name |
| `remacro.playLastMacro` | Replay the most recently saved macro |
| `remacro.runMacro` | Pick a saved macro from a list (accepts `{ "name": "…" }` args) |
| `remacro.deleteMacro` | Delete a saved macro |

## Current limitations (v0.1)

- Replays into the active editor; recorded for single-cursor editing
- Multi-cursor edits are recorded as sequential single-cursor steps
- Commands executed during recording (e.g. "Format Document") are not captured — only text edits and cursor moves

See [docs/V1-PLAN.md](docs/V1-PLAN.md) for the roadmap.

## Development

```bash
npm install
npm run compile   # tsc, outputs to out/
npm run lint      # eslint
```

Press `F5` in VS Code to launch the Extension Development Host.

## License

MIT — see [LICENSE](LICENSE).
