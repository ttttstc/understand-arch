# Refiner Loop

评审失败时最多自动修正两次。第三次必须把失败原因、证据路径、建议动作展示给用户,并提供 retry、manual fix、override、abort 四种选择。

Override 后 `state.yaml.status` 标记为 `degraded`。

