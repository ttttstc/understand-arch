# 系统宪章(System Charter)

> 约束层文件。声明系统的使命、非目标与价值优先级。
> 来源:机器考古(ai-mined,proposed)/ 人脑访谈(interview)/ 人工(human)。
> 每条经人确认后状态升为 confirmed,成为 design 的硬约束。
> 本文档默认中文,代码标识符/路径/命令保留英文。

## 系统使命

<!-- 系统为什么存在、负责什么。AI 考古给初稿,人确认。 -->

- 示例:本系统负责企业客户订阅计费、发票生成、支付状态同步与欠费处理。

## 非目标(明确不做什么)

<!-- 关键:没有非目标,AI 会为"简洁"删掉它认为多余的逻辑。 -->

- 示例:不负责用户身份认证
- 示例:不直接保存完整银行卡信息

## 价值优先级(冲突时的取舍顺序)

<!-- 当两个目标冲突,谁优先。AI 据此判断能不能为性能牺牲正确性。 -->

1. 示例:金额正确性 高于 性能
2. 示例:审计可追溯性 高于 代码简洁性
3. 示例:向后兼容 高于 接口美观

---

## 条目元信息

每条宪章约束遵循约束条目结构(见 `internal/schemas/constraint.schema.json`):

```yaml
- id: CON-001
  title: 金额正确性高于性能
  category: system-charter
  constraint: 任何性能优化不得以牺牲金额计算正确性为代价
  basis: 访谈(财务负责人,2026-05)+ 历史事故 ADR-007
  evidence_level: confirmed        # 已确认/已观察/已推断/待定/有冲突
  violation_check: pnpm test billing-core:amount-accuracy
  status: proposed                  # proposed→confirmed/rejected/adjusted
  source: interview                 # ai-mined/interview/human
  note: 受访人 张三 2026-05-20;关联 ADR-007
```
