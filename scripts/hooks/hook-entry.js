#!/usr/bin/env node
'use strict';

/**
 * Standalone entry point for ECC plugin hooks.
 * Replaces the ~1000-2400 character inline `node -e "..."` bootstrap
 * that was embedded in every hook command in hooks.json.
 *
 * This fixes Windows Git Bash (MSYS2) crashes caused by exceeding
 * the command-line length limit (add_item errno 1).
 *
 * Usage (Pattern A - PreToolUse/PostToolUse/etc.):
 *   node hook-entry.js node scripts/hooks/<target>.js <profile>
 *
 * Usage (Pattern B - Stop/SessionEnd):
 *   node hook-entry.js
 *   (reads hook id and script path from stdin or environment)
 */

const fs = require('fs');
const path = require('path');

/**
 * Resolve ECC plugin root directory.
 * Checks CLAUDE_PLUGIN_ROOT env, then ~/.claude, then known plugin locations.
 */
function resolvePluginRoot() {
  var envRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (envRoot && envRoot.trim()) {
    var trimmed = envRoot.trim();
    if (fs.existsSync(path.join(trimmed, 'scripts', 'lib', 'utils.js'))) {
      return trimmed;
    }
  }

  var home = require('os').homedir();
  var claudeDir = path.join(home, '.claude');
  var relCheck = path.join('scripts', 'lib', 'utils.js');

  // Direct check
  if (fs.existsSync(path.join(claudeDir, relCheck))) return claudeDir;

  // Known plugin locations
  var candidates = [['ecc'], ['ecc@ecc'], ['marketplaces', 'ecc'], ['everything-claude-code'], ['everything-claude-code@everything-claude-code'], ['marketplaces', 'everything-claude-code']];
  for (var i = 0; i < candidates.length; i++) {
    var parts = candidates[i];
    var p = path.join.apply(path, [claudeDir, 'plugins'].concat(parts));
    if (fs.existsSync(path.join(p, relCheck))) return p;
  }

  // Cache search
  try {
    var slugs = ['ecc', 'everything-claude-code'];
    for (var si = 0; si < slugs.length; si++) {
      var cacheBase = path.join(claudeDir, 'plugins', 'cache', slugs[si]);
      var orgs = fs.readdirSync(cacheBase, { withFileTypes: true });
      for (var oi = 0; oi < orgs.length; oi++) {
        if (!orgs[oi].isDirectory()) continue;
        var vers = fs.readdirSync(path.join(cacheBase, orgs[oi].name), { withFileTypes: true });
        for (var vi = 0; vi < vers.length; vi++) {
          if (!vers[vi].isDirectory()) continue;
          var candidate = path.join(cacheBase, orgs[oi].name, vers[vi].name);
          if (fs.existsSync(path.join(candidate, relCheck))) return candidate;
        }
      }
    }
  } catch (_e) {
    /* ignore */
  }

  return claudeDir;
}

var root = resolvePluginRoot();
var bootstrapScript = path.join(root, 'scripts', 'hooks', 'plugin-hook-bootstrap.js');

if (!fs.existsSync(bootstrapScript)) {
  process.stderr.write('[hook-entry] WARNING: could not find plugin-hook-bootstrap.js; skipping hook\n');
  try {
    var raw = fs.readFileSync(0, 'utf8');
    process.stdout.write(raw);
  } catch (_e) {
    /* ignore */
  }
  process.exit(0);
}

process.env.CLAUDE_PLUGIN_ROOT = root;
process.argv.splice(1, 0, bootstrapScript);
require(bootstrapScript);
