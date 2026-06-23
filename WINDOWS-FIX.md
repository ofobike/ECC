# Windows 兼容性修复说明

> 本分支基于 [affaan-m/ECC](https://github.com/affaan-m/ECC) v2.0.0-rc.1，修复了 Windows 环境下的兼容性问题。

## 修复的问题

### 1. hooks.json 超长内联命令（28 个 hooks）

**问题：** 所有 hooks 使用 1000-2400 字符的 `node -e "..."` 内联命令，Git Bash (MSYS2) 超过命令行长度限制后崩溃。

**修复：** 创建 `scripts/hooks/hook-entry.js` 独立入口脚本，将全部 28 个 hooks 命令缩短至 70-160 字符。

| 阶段 | hooks 数量 | 修复前最长 | 修复后最长 |
|------|-----------|-----------|-----------|
| PreToolUse | 8 | 1138 字符 | 159 字符 |
| PostToolUse | 10 | 1136 字符 | 157 字符 |
| Stop | 6 | 2424 字符 | 112 字符 |
| 其他 | 4 | 2435 字符 | 126 字符 |

### 2. HOME 环境变量回退（12 个文件，15 处）

**问题：** `process.env.HOME || os.homedir()` 在 Windows 原生环境下缺少 `USERPROFILE` 回退。

**修复：** 统一改为 `process.env.HOME || process.env.USERPROFILE || os.homedir()`。

修复文件：
- `scripts/auto-update.js`
- `scripts/doctor.js`
- `scripts/install-apply.js`
- `scripts/list-installed.js`
- `scripts/repair.js`
- `scripts/uninstall.js`
- `scripts/status.js`
- `scripts/work-items.js`
- `scripts/sessions-cli.js`
- `scripts/lib/install-executor.js`
- `scripts/lib/install-lifecycle.js`
- `scripts/lib/state-store/index.js`

### 3. `/tmp` 回退路径

**问题：** `scripts/hooks/gateguard-fact-force.js` 在 HOME/USERPROFILE 未设置时回退到 `/tmp`（Windows 不存在）。

**修复：** 改为 `os.tmpdir()`。

### 4. XDG 路径兼容

**问题：** `scripts/lib/observer-sessions.js` 和 `scripts/lib/session-adapters/opencode.js` 使用 Linux XDG 路径 `~/.local/share/`。

**修复：** Windows 上使用 `%LOCALAPPDATA%`。

## 安装方式

### 从 Fork 安装（推荐）

```bash
# Claude Code 中执行
/plugin uninstall ecc@ecc

# 修改 ~/.claude/settings.json 中的 extraKnownMarketplaces.ecc：
# "url": "https://github.com/ofobike/ECC.git"

/plugin install ecc@ecc
```

### 直接更新已安装插件

```bash
cd ~/.claude/plugins/marketplaces/ecc
git remote set-url origin https://github.com/ofobike/ECC.git
git pull origin main

# 同步 hooks 配置
cp hooks/hooks.json ~/.claude/hooks/hooks.json
cp scripts/hooks/hook-entry.js ~/.claude/hooks/hook-entry.js
```

## 文件变更清单

```
A  scripts/hooks/hook-entry.js          # 新建：独立入口脚本
M  hooks/hooks.json                      # 28 个 hooks 命令缩短
M  scripts/hooks/gateguard-fact-force.js # /tmp → os.tmpdir()
M  scripts/lib/observer-sessions.js      # XDG → %LOCALAPPDATA%
M  scripts/lib/session-adapters/opencode.js # XDG → %LOCALAPPDATA%
M  scripts/auto-update.js                # HOME 回退修复
M  scripts/doctor.js                     # HOME 回退修复
M  scripts/install-apply.js              # HOME 回退修复
M  scripts/list-installed.js             # HOME 回退修复
M  scripts/repair.js                     # HOME 回退修复
M  scripts/uninstall.js                  # HOME 回退修复
M  scripts/status.js                     # HOME 回退修复
M  scripts/work-items.js                 # HOME 回退修复
M  scripts/sessions-cli.js               # HOME 回退修复
M  scripts/lib/install-executor.js       # HOME 回退修复
M  scripts/lib/install-lifecycle.js      # HOME 回退修复 (3处)
M  scripts/lib/state-store/index.js      # HOME 回退修复
```

## 未修复的已知问题

| 问题 | 原因 | 影响 |
|------|------|------|
| 32 个 .sh 文件 bash 专用 | 需要为每个写 .ps1 等价 | 开发工具链 |
| tmux 依赖 | 架构性问题，需重新设计 | worktree 编排 |
| 桌面通知 | Windows 原生不支持 | 仅 macOS/WSL |
| dev-server 阻止 | 依赖 tmux | Windows 上跳过 |

## 提交信息

```
fix: resolve Windows Git Bash compatibility issues

- Create hook-entry.js to replace 28 inline node -e bootstrap commands
- Fix HOME env var fallback: add process.env.USERPROFILE to 12 files
- Fix /tmp fallback in gateguard-fact-force.js: use os.tmpdir()
- Fix XDG paths: use %LOCALAPPDATA% on Windows
```
