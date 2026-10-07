#!/usr/bin/env node
// Pair this Mac with the iPhone app: makes the private secret (once), installs the
// 10-second sweep, and registers a one-time code the phone types in.
// Usage: pair.mjs [--new]   (--new replaces the secret; already-paired phones stop seeing this Mac)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOME = os.homedir();
const DIR = process.env.CLAUDE_WIDGET_DIR || path.join(HOME, '.claude-widget');
const config = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIR, 'config.json'), 'utf8')); } catch { return {}; } })();
const RELAY = process.env.CLAUDE_WIDGET_RELAY || config.relay || 'https://claudewidget.emunasites.com';
const SECRET_FILE = path.join(DIR, 'secret');

fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
if (process.argv.includes('--new') || !fs.existsSync(SECRET_FILE)) {
  fs.writeFileSync(SECRET_FILE, crypto.randomBytes(32).toString('base64url'), { mode: 0o600 });
  fs.rmSync(path.join(DIR, 'last-sent'), { force: true });
}
const secret = fs.readFileSync(SECRET_FILE, 'utf8').trim();

// Stable copy of the reporter for launchd (the plugin folder moves on every plugin update).
const reporter = path.join(DIR, 'report.mjs');
fs.copyFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'report.mjs'), reporter);

const label = 'com.claudewidget.sweep';
const plist = path.join(HOME, 'Library', 'LaunchAgents', `${label}.plist`);
fs.mkdirSync(path.dirname(plist), { recursive: true });
fs.writeFileSync(plist, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key><array><string>${process.execPath}</string><string>${reporter}</string><string>sweep</string></array>
  <key>StartInterval</key><integer>10</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardErrorPath</key><string>${path.join(DIR, 'sweep.log')}</string>
</dict></plist>
`);
const domain = `gui/${os.userInfo().uid}`;
try { execFileSync('launchctl', ['bootout', domain, plist], { stdio: 'ignore' }); } catch { /* wasn't loaded */ }
execFileSync('launchctl', ['bootstrap', domain, plist]);

// No 0/O/1/I so it reads unambiguously off a screen.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = Array.from(crypto.randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join('');
const res = await fetch(`${RELAY}/api/pair`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
  body: JSON.stringify({ code }),
}).catch((e) => ({ ok: false, status: e.message }));
if (!res.ok) {
  console.log(`Couldn't reach the relay (${res.status}). The Mac side is installed; run /lights:pair again when online.`);
  process.exit(1);
}
console.log(`Pairing code: ${code.slice(0, 4)}-${code.slice(4)}

On your iPhone, open Session Lights and type this code. It works once and expires in 10 minutes.
Your sessions will show up live from then on.`);
