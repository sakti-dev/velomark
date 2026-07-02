const mermaidStreamExample = `# Mermaid Streaming Test

All diagram types in one stream — test rendering during simulate stream.

## Flowchart

\`\`\`mermaid
flowchart TD
    A[Start] --> B{Condition}
    B -->|Yes| C[Execute]
    B -->|No| D[Skip]
    C --> E[End]
    D --> E
\`\`\`

## Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant S as Server
    participant D as Database
    U->>S: GET /api/data
    S->>D: Query
    D-->>S: Result
    S-->>U: 200 OK
\`\`\`

## State Diagram

\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: fetch
    Loading --> Success: ok
    Loading --> Error: fail
    Success --> [*]
    Error --> Idle: retry
\`\`\`

## Journey

\`\`\`mermaid
journey
    title User signup flow
    section Account
      Visit site: 5: User
      Click signup: 5: User
      Fill form: 3: User
    section Verify
      Check email: 5: System
      Click link: 4: User
    section Done
      Logged in: 5: User
\`\`\`

## Gantt

\`\`\`mermaid
gantt
    title Project timeline
    dateFormat YYYY-MM-DD
    section Design
      Spec: a1, 2024-01-01, 7d
      Mockups: a2, after a1, 10d
    section Build
      Frontend: b1, after a2, 14d
      Backend: b2, after a2, 14d
    section Ship
      QA: c1, after b1, 5d
      Deploy: c2, after c1, 2d
\`\`\`

## Pie

\`\`\`mermaid
pie title Browser market share
    "Chrome" : 65
    "Safari" : 18
    "Firefox" : 5
    "Edge" : 5
    "Other" : 7
\`\`\`

## Mindmap

\`\`\`mermaid
mindmap
  root((Velomark))
    Features
      Streaming
      Code highlighting
      Mermaid
      Math
    Tech
      SolidJS
      Tailwind
      Shiki
\`\`\`
`;

export default mermaidStreamExample;
