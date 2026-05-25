# Mermaid Templates

> 用途：先用这些最小骨架出图，再根据 `specs` 或 CR 事实填充节点和连线。

## 1. Context

```mermaid
flowchart LR
    User["{Primary User}"]
    System["{System Name}"]
    ExternalA["{External System A}"]
    ExternalB["{External System B}"]

    User -->|"{Key Interaction}"| System
    System -->|"{API / Event / Message}"| ExternalA
    ExternalB -->|"{Inbound Dependency}"| System
```

## 2. Container

```mermaid
flowchart TB
    Client["{Client / Entry Point}"]
    ServiceA["{Service A}"]
    ServiceB["{Service B}"]
    Store["{Primary Data Store}"]
    Queue["{Queue / Event Bus}"]

    Client --> ServiceA
    ServiceA --> ServiceB
    ServiceA --> Store
    ServiceB --> Queue
```

## 3. Sequence

```mermaid
sequenceDiagram
    participant U as {Actor}
    participant A as {Caller}
    participant B as {Callee}
    participant D as {Data Store / Bus}

    U->>A: {Request / Trigger}
    A->>B: {Call / Event}
    B->>D: {Read / Write / Publish}
    D-->>B: {Ack / Data}
    B-->>A: {Result}
    A-->>U: {Outcome}
```

## 4. Data Flow

```mermaid
flowchart LR
    Source["{Source System}"]
    Processor["{Processing Component}"]
    Store["{Owned Data Store}"]
    Consumer["{Downstream Consumer}"]

    Source -->|"{Inbound Data}"| Processor
    Processor -->|"{Validated / Transformed Data}"| Store
    Store -->|"{Read Model / Event}"| Consumer
```

## 5. Deployment

```mermaid
flowchart TB
    subgraph Edge["{Edge / Public Zone}"]
        Gateway["{Gateway / LB}"]
    end

    subgraph App["{Application Zone}"]
        AppA["{App Unit A}"]
        AppB["{App Unit B}"]
    end

    subgraph Data["{Data Zone}"]
        DB["{Primary DB}"]
        Cache["{Cache / Queue}"]
    end

    Gateway --> AppA
    Gateway --> AppB
    AppA --> DB
    AppB --> Cache
```

## 使用规则

- 节点名称必须与 `specs` / CR 中的命名一致。
- 每张图只表达一种主视角，不要把 context 和 deployment 混在一起。
- 如果 source 不足，宁可删掉节点并标注 `known unknowns`，不要脑补。
