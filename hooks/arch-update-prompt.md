# Architecture Freshness Prompt

当 hook 启用且检测到架构敏感文件变化时,提示用户运行 `/arch-onboard --refresh` 或 `/arch-audit --drift`。

hooks 默认关闭。只有 `state.yaml#hooks_enabled == true` 时才允许执行。

