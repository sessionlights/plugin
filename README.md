# Session Lights for Claude Code

A live view of your Claude Code chats on your iPhone, on the lock screen, in the Dynamic Island and in a home-screen widget. Each chat shows as one of:

- **Working**
- **Needs you:** a question, an approval, or something you have to do
- **Idle**

When you hit a usage limit, the widget shows Claude's "resets at…" time. Its switches let you pick which paused chats get "continue where you left off" when the limit resets.

## Install

In any Claude Code chat on your Mac:

```
/plugin marketplace add sessionlights/plugin
/plugin install lights@sessionlights
/lights:pair
```

Type the code it shows into the Session Lights iPhone app.

## Usage bars (optional)

The widget can show how much of your 5-hour and weekly limits you've used. Claude Code only gives those numbers to the status line, so point yours at Session Lights by adding this to `~/.claude/settings.json`:

```json
"statusLine": { "type": "command", "command": "node ~/.claude-widget/report.mjs statusline" }
```

It prints a short `Opus · 5h 34% · week 12%` line. Already have a status line? Put its command in `~/.claude-widget/config.json` as `{"statusLineCommand": "<your command>"}` and Session Lights shows yours instead. The bars can be switched off in the iPhone app. They need a Pro or Max plan.

## What it does on your Mac

- **Hooks:** a small script runs on Claude Code's own events (prompt sent, question asked, permission needed, turn finished, usage limit). It sends each chat's name, its state and a short line about what it's doing to the Session Lights relay.
- **"Needs you" check:** when a turn finishes, it asks Claude Haiku whether the last message needs you. This runs through your own `claude` login, so it uses your plan, not a shared key.
- **Background job:** a 10-second job clears out chats whose terminal was closed.
- **What's sent:** chat names, states and short lines only, plus the two usage percentages if you turned on the usage bars. Never transcripts, files or credentials.
- **Who can see it:** the data is stored under a hash of a random secret that only your Mac and your phone know, and it expires after a day without updates.
- **Hiding the short lines:** to send only names and states, put `{"hideLines": true}` in `~/.claude-widget/config.json`.
