# v3.2 实现验收报告

> 实现人 + 自验收: Codex  
> 分支: `feat/v3.2-impl`  
> 基线: `docs/spec-v3.2.md`  
> 主题: `/arch-diagram` 集成 `fireworks-tech-graph`

## 结论

v3.2 增量已实现。实现范围只升级 `/arch-diagram` 出图能力,未修改任何 schema,未改动现有 subagent,未改动 v3.1 约束层产物。

## 实现清单

| 项目 | 实现 | 验收 |
|---|---|---|
| vendor 搬迁 | `vendor/fireworks-tech-graph/` 完整搬迁上游文件 | 文件集合与上游一致,仅 `SKILL.md` 改名为 `PROMPT.md` |
| 上游锁定 | `vendor/fireworks-tech-graph/VENDORED.md` 记录 SHA | `f841bf9b7277afb22db101c518b5d258c50d665b` |
| 许可证 | 保留上游 `LICENSE` | MIT 文件存在,未新增 `NOTICE` |
| 确定性调度器 | `engine/arch/diagram-dispatch.mjs` | 只做参数校验、依赖检查、Python 渲染、SVG 校验、PNG 转换、wiki 引用 |
| 调度器单测 | `engine/arch/__tests__/diagram-dispatch.test.mjs` | 覆盖显式 Mermaid 不调 Python、默认 SVG 调 Python、缺 cairosvg 精确报错 |
| Skill 改造 | `skills/arch-diagram/SKILL.md` | 三路调度: 默认 SVG、PNG、PlantUML、Mermaid 兼容/降级 |
| profile | 写入 5 套推荐组合 | `web`、`middleware`、`pipeline`、`agent`、`multi-repo` |
| 类型映射 | 写入 v3.1 语义类型到 fireworks 类型映射 | 6 个旧类型 + 8 个原生类型对用户可见 |
| 文档 | `README.md` / `README.zh.md` | 增加 `--format` 和 profile 推荐表 |
| 版本 | package 与插件 manifest | `3.2.0-rc1` |
| 脚本 | `package.json` | 新增 `arch:test` 与 `diagram:test`,并将 `arch:test` 接入 `test` |

## 确定性验收

| 命令 | 结果 | 摘要 |
|---|---|---|
| `git ls-remote https://github.com/yizhiyanhua-ai/fireworks-tech-graph HEAD` | exit 0 | 上游 HEAD 为 `f841bf9b7277afb22db101c518b5d258c50d665b` |
| 文件集合比较 | exit 0 | `FILE_SET_MATCHES_AFTER_SKILL_RENAME`,上游 48 个文件,vendor 去掉 `VENDORED.md` 后 48 个文件 |
| `rg -n "SKILL\\.md" vendor/fireworks-tech-graph --glob "!VENDORED.md"` | exit 1 | vendor 内部无旧 `SKILL.md` 引用 |
| `python3 vendor/fireworks-tech-graph/scripts/generate-from-template.py architecture /tmp/test.svg ...` | exit 0 | `✓ SVG generated: /tmp/test.svg`,Windows 实际路径 `D:\tmp\test.svg`,大小 2702 bytes |
| `pnpm arch:test` | exit 0 | 1 个测试文件,3 个测试通过 |
| `pnpm diagram:test` | exit 0 | 7 个 fixtures 全部生成 SVG+PNG,7 passed,0 failed |
| `npm run verify` | exit 0 | arch 单测 3 个、core 测试 661 个、dashboard 测试 42 个、core/dashboard build 全通过 |
| `git diff --name-only -- internal/schemas` | exit 0 | 无 schema diff |

## 运行环境说明

Windows 默认 `bash` 命中了 WSL 入口,该环境没有 `/bin/bash`;实测 `diagram:test` 时临时将 `D:\soft\Git\bin` 放到 PATH 前面,使用 Git Bash 执行上游脚本。  
Windows 默认 `python3` 命中了 Microsoft Store alias;`diagram-dispatch.mjs` 在设置 `ARCH_DIAGRAM_PYTHON` 时会给 `validate-svg.sh` 注入临时 `python3` wrapper,避免校验脚本误用系统 alias。
`cairosvg` 已安装到该 Python 环境,命令为:

```bash
D:\soft\anaconda\python.exe -m pip install cairosvg
```

## LLM 通道抽检

本会话按 `skills/arch-diagram/SKILL.md` 边界执行:由当前 LLM 产出 fireworks JSON,再交给确定性 `diagram-dispatch.mjs`。未把语义翻译写入 Node 或 Python。

| 场景 | 命令 | 结果 |
|---|---|---|
| `sequence --format=svg --style=6` | `node engine/arch/diagram-dispatch.mjs --format=svg --type=sequence --style=6 --arch-dir=<tmp> --spec-json=<sequence.json>` | exit 0,生成 `sequence-6.svg`,大小 3882 bytes,wiki 引用 `![sequence](assets/diagrams/sequence-6.svg)` |
| 默认 SVG | `node engine/arch/diagram-dispatch.mjs --type=architecture --style=6 --arch-dir=<tmp> --spec-json=<architecture.json>` | exit 0,未传 `--format` 时解析为 SVG,生成 `architecture-6.svg`,大小 3427 bytes,wiki 引用 `![architecture](assets/diagrams/architecture-6.svg)` |
| `architecture --format=png --profile=web` | `node engine/arch/diagram-dispatch.mjs --format=png --type=architecture --profile=web --arch-dir=<tmp> --spec-json=<architecture.json>` | exit 0,profile 解析为 `architecture` + style `6`,生成 `architecture-6.svg` 5021 bytes 与 `architecture-6.png` 63507 bytes,wiki 引用 `![architecture](assets/diagrams/architecture-6.png)` |
| Mermaid 兼容/降级路径 | `skills/arch-diagram/SKILL.md` 中 `format=mermaid` 保留 v3.1 原流程 | 未引入 Python 调用;单测覆盖 `format=mermaid` 不触发 Python |

## 文档验收

| 文件 | 验收 |
|---|---|
| `README.md` | `/arch-diagram` 段落说明 4 种 format、输出位置、5 套 profile、示例命令 |
| `README.zh.md` | 中文段落说明 4 种 format、输出位置、5 套 profile、示例命令 |
| `skills/arch-diagram/SKILL.md` | 写明默认 SVG、Mermaid 降级、SVG/PNG 复用 `PROMPT.md`、PlantUML 只输出 `.puml` |
| `vendor/fireworks-tech-graph/VENDORED.md` | 记录上游仓库、SHA、许可证和本地改名说明 |

## 铁律遵守

- LLM 推断只在 SKILL/当前 Claude 会话内发生。
- `diagram-dispatch.mjs` 不做语义到 JSON 翻译。
- 未修改 `internal/schemas/*.json`。
- vendor 中保留 LICENSE,未新增 NOTICE。
- 显式 `--format=svg|png` 时 Python/cairosvg 缺失直接报错。
- 未指定 `--format` 时默认走 SVG,失败后降级 Mermaid。
- v3.1 Mermaid 路径保留,作为显式兼容路径和默认失败后的降级路径。

## 已知边界

- PlantUML 路径按规格只产 `.puml` 源码,本轮不提供渲染服务。
- Windows 上若 PATH 优先命中 WSL `bash.exe` 或 Microsoft Store `python3.exe`,用户需要调整 PATH,否则会按缺依赖处理。
- fireworks 的 `test-output/` 由上游 `.gitignore` 忽略,不会纳入提交。
