# 03 Interfaces

本页主题:接口与契约
事实来源:repo graph / cross-repo graph / rules / ADR / CR。

## 事实清单
暂无。

## 说明
当前 graph 没有提供该类节点。若项目实际存在此类事实,请重新运行 arch-analyze 或补充对应 subagent 推断结果。

## 已知局限

本页只呈现 graph 中已识别的 endpoint/schema 节点;缺失项必须回写 graph 或 known_unknowns。
如果代码中存在动态路由、运行时注册、外部 API 网关或未被解析器覆盖的协议,这里可能低估接口数量。
任何没有 evidence_refs 的接口判断都不能作为架构决策依据。
