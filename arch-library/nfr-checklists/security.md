# Security NFR Checklist

> 工程级核查清单,**不是合规专家手册**。`arch-options` / `arch-review` 用来判断设计是否触线。

## 度量(security 难量化但仍要尝试)

- **漏洞修复时间** SLO(critical < 24h / high < 7d / medium < 30d)
- **依赖更新延迟**(高危 CVE 暴露窗口)
- **secret rotation 频率**(< 90d 常见目标)
- **认证失败 / 异常登录 alert 率**
- **依赖第三方供应链 SBOM 覆盖率**

## 威胁建模(STRIDE 速记)

每个组件 / 数据流走一遍:

| 威胁 | 例子 |
|---|---|
| Spoofing | 伪造身份(无 / 弱认证) |
| Tampering | 篡改数据(无完整性校验) |
| Repudiation | 否认操作(无审计) |
| Information disclosure | 数据泄露(明文存 / 错日志 / 错权限) |
| Denial of service | DoS(无限流) |
| Elevation of privilege | 越权(权限粒度不够 / IDOR) |

不要"覆盖所有"— 选高价值资产 + 真实威胁场景做即可。

## OWASP Top 10(Web / API 系统必看)

2026 仍然有效的高频问题(按现实出现频率排,不严格 OWASP 顺序):

1. **越权 / IDOR**: 直接访问对象 ID 无权限检查 — 最常见严重 bug
2. **身份认证薄弱**: 弱密码 / 无 MFA / token 永久 / session 漏洞
3. **注入(SQL / NoSQL / command / template)**: 仍未死,新框架照样翻车
4. **配置错误**: 默认凭据 / 公开 admin / 公开 bucket / 公开数据库
5. **敏感数据暴露**: 不加密传输 / 不加密静态 / 错日志 / 错 telemetry
6. **依赖漏洞**: 长期不升 npm / Maven / pip 依赖
7. **跨站脚本 XSS**: SPA + dangerouslySetInnerHTML / template 不转义
8. **不安全反序列化**: pickle / 老 Java 反序列化 / YAML.load
9. **日志监控缺失**: 出事看不见 → 不能响应 → 数据被偷光才知道
10. **服务器端请求伪造 SSRF**: 接受用户 URL 直访问内网 / metadata service

## 关键设计原则

### 最小权限

每个进程 / 服务 / 用户 / token / IAM role 只给最小必要权限。挂了限制爆炸半径。

### 深度防御

不要"加了 WAF 就行了"。多层防御:
- 网络层(VPC / 安全组 / NACL)
- 应用层(WAF)
- 代码层(参数校验 / output encoding)
- 数据层(加密)

### 零信任

内网不可信。每跳都验 token,即使在 VPC 内。
- 服务到服务 mTLS
- 用户到服务 JWT + 短过期
- 每个请求都验,不能"网关验过了下游就信"

### Secret 管理

- 永不 commit 到 git(git-secrets / detect-secrets / trufflehog 扫)
- 永不出现在日志 / metrics / trace label
- 永不写进 docker image / k8s ConfigMap(用 Secret + 加密 etcd / external secret store)
- 必须可 rotate(短周期更好)

## 数据保护

- **传输加密**:TLS 1.3 默认;内部服务间 mTLS
- **静态加密**:DB / blob / backup 全加密;key 在 KMS / HSM
- **PII 字段级加密**:特别敏感的(身份证 / 银行卡)即使 DB 加密也独立 envelope-encrypt
- **退役数据销毁**:有真实流程(不只是 `DROP TABLE`)

## 审计与可追溯

- 每个**特权操作**(create user / change role / export data)有日志
- 日志要 tamper-evident(append-only / 哈希链 / 异地)
- 日志保留周期满足合规(GDPR / SOX / HIPAA 各有要求)
- 日志读取本身被审计(谁看了 access log)

## 第三方 / 供应链

- 依赖列表 SBOM 化(syft / cyclonedx)
- 高危 CVE 自动告警(GitHub Dependabot / Snyk / Trivy)
- 第三方服务接入有安全 review(SOC 2 / ISO 27001 / 自审清单)
- supply chain 攻击(typosquatting / 包劫持)防御:lockfile + integrity hash + 私镜像源

## 合规边界(典型)

- **GDPR**:用户数据可被删除 / 导出;data subject rights
- **PCI-DSS**:支付卡数据隔离 + 审计 + 加密
- **HIPAA**:医疗数据 PHI 加密 + 审计 + BAA
- **SOX**:财务相关变更需要双人审批
- **国内 个保法 / 数据安全法**:数据出境评估 / 关键信息基础设施

合规细节请咨询专业法务/安全 — 本清单只是提示边界存在。

## 反模式

- **"内网够安全了"**:零信任时代,内网也是攻击面
- **secret in code / log / image**:扫一次几乎都能扫出来
- **过度宽松 IAM**:`s3:*` on `*` resource → 一个 token 泄露就完
- **依赖永不升**:CVE 列表越长,迁移成本越高 → 高优先级
- **没有 incident response**:出事现编流程
- **加密就是加密** — 不验证密钥管理、rotation、HSM,加密效果 = 0
- **WAF 一招鲜**:绕 WAF 的姿势天天有,深度防御才是路

## 决策辅助清单(给 arch-options / arch-review)

- [ ] 威胁建模做了吗?选了哪些高价值资产?
- [ ] Auth / Authz 设计清楚?service-to-service?user-to-service?
- [ ] secret 怎么管理?rotation 频率?
- [ ] 数据分类清楚?哪些是 PII?如何加密?
- [ ] 审计日志覆盖特权操作?谁能改谁能读?
- [ ] 依赖 CVE 监控 + 升级 SLO?
- [ ] 合规边界识别?(GDPR / PCI / HIPAA / 国内)
- [ ] Incident response 流程演练过?

## 参考

- OWASP Top 10 / OWASP ASVS / OWASP Cheat Sheet Series
- "Designing Data-Intensive Applications" — Kleppmann (security 散在各章)
- NIST Cybersecurity Framework
- Google "BeyondCorp" 零信任架构白皮书
