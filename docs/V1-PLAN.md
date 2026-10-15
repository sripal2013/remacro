# ReMacro — V1 Plan

## Vision

The macro recorder VS Code never shipped. Record once, replay forever, bind to a key.
Target user: every developer doing repetitive structured edits — which is everyone,
several times a day.

## Why this one

- **Documented demand**: microsoft/vscode#4490 ("Macro recording") — 1,228 👍, 276 comments,
  open since 2016. The demand is quantified by strangers, not asserted by us.
- **Verified gap**: the `geddski.macros` author publicly declined to add recording;
  `tshino/vscode-kb-macro` records commands, not keystrokes, with poor discoverability.
- **Instant 10x**: record → replay → keybind in 60 seconds. Fast aha → fast adoption →
  fast evidence (installs, stars, issues filed by strangers).
- **Original capability**, not a bug fix — the strongest shape for an
  original-contributions case.

## V1 scope (this scaffold — done)

- [x] Record text edits (`onDidChangeTextDocument`) and cursor moves
      (`onDidChangeTextEditorSelection`) as an ordered step list
- [x] Positions stored **relative to the record-start cursor**, so macros replay
      correctly wherever the cursor is
- [x] Named macros persisted in `globalState`; quick-pick run/delete
- [x] `remacro.runMacro` accepts `{ "name": "…" }` args → bindable in keybindings.json
- [x] Status-bar recording indicator (click to stop)
- [x] Headless smoke test: record + replay verified in a real VS Code instance

## V1.1 roadmap

1. **Macro library UI** — tree view in the Explorer side bar listing saved macros
   (run/rename/delete inline), instead of only the quick pick.
2. **Export / import** — macros as JSON files, shareable and version-controllable.
3. **Relative multi-cursor** — record multi-cursor edits as one parallel step.
4. **Command capture (opt-in)** — record a curated allowlist of editor commands
   (e.g. `editor.action.transformToUppercase`) as steps.
5. **Per-language scoping** — macros that only trigger for certain language IDs.

## Evidence strategy (ship → measure → corroborate)

1. **Publish**: `vsce publish` under publisher `sripal2013` (needs a one-time
   publisher setup + Personal Access Token).
2. **Announce where demand lives**: a single comment on microsoft/vscode#4490
   ("I built this — record/replay/bind, feedback welcome") + a r/vscode post.
   This is the highest-signal distribution channel: the exact 1,228 people
   who asked for it.
3. **Track weekly**: Marketplace installs, GitHub stars, issues opened by
   strangers (independent use = strongest corroboration), discussion replies.
4. **Corroboration targets**: a maintainer/user quote on the issue thread,
   a blog/YouTube mention, inclusion in an "awesome VS Code" list.
5. Keep a dated evidence log (install counts with screenshots) from day one —
   adjudicators weigh contemporaneous records over after-the-fact claims.

## Non-goals

- Cloud sync of macros (v2+, Settings Sync already covers globalState for free).
- Vim/Neovim parity — VS Code native behavior only.
- AI-assisted macro generation — out of scope; the value prop is deterministic replay.
