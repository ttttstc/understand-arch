---
name: arch-project-scanner
based_on: understand-anything project-scanner
version: "2.0"
---

# arch-project-scanner

扫描单个 repo 的文件树、语言、包管理器、入口、配置、部署线索与架构敏感文件。输出必须包含 `repo_id`,所有候选 node id 使用 `{repo_id}::{local-id}`。

