# 测试覆盖缺口(Test Coverage Gaps)

> 约束层文件。声明"测试没覆盖但生产依赖"的盲区 —— 否则 AI 会把"测试绿"当成"绝对正确"。
> 来源:机器考古(高频依赖却无测试的节点)+ 访谈补"哪些生产依赖但没测"。
> 本文档默认中文,代码标识符保留英文。

## 缺口清单

### CON-NNN:{缺口标题}
- 约束:{该缺口的处理规则,如 "legacy_response 字段无测试覆盖,删除前必须确认无线上消费方"}
- 依据:{代码事实 / 测试体系观察}
- 证据等级:observed | inferred | confirmed | uncertain | conflicted
- 违反检测:{如 grep 检查该字段是否被删}
- 状态:proposed | confirmed | rejected | adjusted
- 来源:ai-mined | interview | human
- 备注:{}

---

示例(已确认):

### CON-050:老版 Android 响应兼容无测试覆盖
- 约束:legacy_response 字段无自动化测试覆盖,但老版 Android 4.x 客户端仍依赖;删除前必须查近 30 天客户端版本分布
- 依据:`web::field:legacy_response`;测试体系 0 覆盖
- 证据等级:confirmed
- 违反检测:`grep -r "legacy_response" src/ || echo "已删除-需告警"`
- 状态:confirmed
- 来源:interview
- 备注:受访人 张三;关联 SF-015
