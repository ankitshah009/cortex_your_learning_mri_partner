# EverOS Integration Guide

## Overview

Cortex integrates **EverOS**, the Memory Operating System for AI agents, to provide persistent, structured memory for personalized learning. EverOS enables your AI tutors to:

- **Remember** learning history across sessions
- **Understand** individual learning styles and preferences
- **Adapt** content and pacing based on progress
- **Resolve** contradictions in student knowledge

See [EverOS docs](https://docs.evermind.ai) for the complete reference.

## Quick Start

### 1. Set Environment Variable

```bash
export EVEROS_API_KEY="b600baa8-4f5b-43f3-abbc-feef04830f71"
```

Add to your shell profile (~/.zshrc, ~/.bashrc) to persist:

```bash
echo 'export EVEROS_API_KEY="b600baa8-4f5b-43f3-abbc-feef04830f71"' >> ~/.zshrc
source ~/.zshrc
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `everos-cloud` — Cloud SDK for EverOS API
- `python-dotenv` — Environment variable management

### 3. Test the Integration

```bash
python examples/everos_basic.py
```

Expected output:
```
📚 Cortex Learning Memory Manager
Student ID: student_001
Session ID: session_1720694400

1️⃣  Recording learning conversation...
   Status: accumulated
   Messages queued: 4

2️⃣  Triggering memory consolidation...
   Status: extracted
...
```

## Core Concepts

### MemCell
The atomic unit of memory: a structured tuple (Episode, Atomic Facts, Foresight, Metadata).

- **Episode** — Narrative of what happened (learning interaction)
- **Atomic Facts** — Discrete statements ("Student understands derivatives")
- **Foresight** — Time-bounded predictions ("Will be ready for calculus by Friday")
- **Metadata** — Timestamps, confidence, source

### MemScene
A thematic cluster of related MemCells (e.g., "Quadratic Equations", "Python Loops").
Automatically maintained through semantic consolidation.

### Memory Lifecycle

1. **Episodic Trace Formation** — Messages are segmented into coherent events
2. **Semantic Consolidation** — MemCells are analyzed, linked, and organized into MemScenes
3. **Reconstructive Recollection** — On retrieval, relevant context is reconstructed intelligently

## Usage Patterns

### Pattern 1: Record Learning Conversations

```python
from cortex.memory import EverOSMemoryManager, Message

memory = EverOSMemoryManager(user_id="student_001")

# Add messages (queued for async processing by default)
messages = [
    Message(role="user", content="What's a derivative?"),
    Message(role="assistant", content="A derivative measures the rate of change..."),
]
memory.add_messages(messages)

# Force immediate consolidation
memory.flush()
```

### Pattern 2: Retrieve Learning Context

```python
# Get all context for a topic
context = memory.get_learning_context(
    topic="Calculus",
    include_progress=True,
)

# context contains:
# - profile: learning style, preferences
# - episodes: past interactions about calculus
# - progress: quiz scores, session outcomes
```

### Pattern 3: Search for Specific Information

```python
from cortex.memory import RetrievalMethod

# Hybrid search (keyword + vector)
results = memory.search(
    query="student struggled with chain rule last week",
    method=RetrievalMethod.HYBRID,
    top_k=5,
)

# Agentic retrieval (advanced: agent chooses retrieval strategy)
results = memory.search(
    query="did student complete homework on derivatives?",
    method=RetrievalMethod.AGENTIC,
)
```

### Pattern 4: Record Session Outcomes

```python
memory.record_learning_session(
    topic="Quadratic Equations - Factoring",
    summary="Student completed 5 practice problems, all correct.",
    score=95.0,
)
```

## Memory Types

| Type | Use Case |
|------|----------|
| `episodic_memory` | Conversation summaries, learning interactions |
| `profile` | Student preferences, learning style, goals |
| `eventlog` | Quiz scores, session timestamps, factual events |
| `foresight` | Predicted readiness, upcoming deadlines |
| `agent_case` | Task approach, quality scores (for multi-agent systems) |
| `agent_skill` | Skills learned across multiple sessions |

## Retrieval Methods

| Method | When to Use |
|--------|------------|
| `keyword` | Factual lookups ("What's the student's email?") |
| `vector` | Semantic search ("What topics interest the student?") |
| `hybrid` | Balanced search (keyword + vector with ranking) |
| `agentic` | Let the agent decide based on query intent |

## API Reference

### `EverOSMemoryManager`

**Initialization:**
```python
memory = EverOSMemoryManager(
    user_id="unique_student_id",
    session_id="optional_session_id",  # auto-generated if omitted
)
```

**Methods:**

| Method | Purpose |
|--------|---------|
| `add_messages(messages, async_mode=True)` | Queue messages for processing |
| `flush()` | Trigger immediate consolidation |
| `search(query, method, memory_types, top_k)` | Search memories |
| `get_profile()` | Retrieve consolidated student profile |
| `get_episodes(page, page_size)` | Paginate episodic memories |
| `get_learning_context(topic, include_progress)` | Get topic-specific context |
| `record_learning_session(topic, summary, score)` | Record session outcome |
| `delete_memory(memory_id)` | Remove a specific memory |

## Integration with Your AI Agent

### Example: Personalized Tutor

```python
from cortex.memory import EverOSMemoryManager, Message, RetrievalMethod

class PersonalizedTutor:
    def __init__(self, student_id: str):
        self.memory = EverOSMemoryManager(user_id=student_id)
        self.student_id = student_id

    def get_personalized_content(self, topic: str) -> str:
        # Retrieve learning context
        context = self.memory.get_learning_context(topic)
        
        # Use in system prompt
        profile = context.get("profile", [])
        past_struggles = context.get("episodes", [])
        
        # Tailor response based on profile
        if profile and "visual learner" in str(profile):
            return "Generate a diagram-based explanation"
        else:
            return "Generate a step-by-step explanation"

    def record_interaction(self, user_msg: str, assistant_msg: str):
        self.memory.add_messages([
            Message(role="user", content=user_msg),
            Message(role="assistant", content=assistant_msg),
        ])

# Usage
tutor = PersonalizedTutor(student_id="alice_123")
content = tutor.get_personalized_content("Calculus")
tutor.record_interaction("How do I find the derivative?", "...")
```

## Async vs Sync Processing

**Async (default):**
```python
memory.add_messages(messages)  # Returns immediately, processes in background
```
- ✅ Fast, doesn't block
- ✅ Better for high-throughput scenarios
- ❌ Memories not immediately queryable

**Sync:**
```python
memory.add_messages(messages, async_mode=False)  # Blocks until complete
```
- ✅ Memories immediately available
- ❌ Slower, blocks on extraction
- Use when you need to query right after recording

**Recommended pattern:** Add messages async, call `flush()` when you need to query.

## Troubleshooting

### "EVEROS_API_KEY environment variable not set"

```bash
export EVEROS_API_KEY="b600baa8-4f5b-43f3-abbc-feef04830f71"
```

### "everos-cloud not installed"

```bash
pip install -r requirements.txt
```

### No results from search

1. **Data not yet consolidated:** Call `memory.flush()` to force processing
2. **Query too specific:** Try broader keywords
3. **Wrong memory type:** Use `memory_types=[]` (all types) instead of filtering

### Rate Limiting

EverOS Cloud uses quota-based billing (per MemCell). Check your plan at https://everos.evermind.ai/dashboard.

## Dashboard & Monitoring

Monitor memory consolidation and usage:
- Dashboard: https://everos.evermind.ai
- API Keys: https://everos.evermind.ai/api-keys
- Support: contact@evermind.ai

## Next Steps

1. **Integrate with your tutor agent** — Use `get_learning_context()` in prompts
2. **Set up batch import** — Import existing chat history with `batch_import_personal()`
3. **Enable multimodal memory** — Store diagrams, worksheets, code samples
4. **Add reflection** — Enable background consolidation for larger datasets

## Open Source Alternative

For self-hosted deployments:

```bash
pip install everos  # OSS package
everos init
everos server start
```

See [Open Source Deployment](https://docs.evermind.ai#open-source-deployment) in the full docs.
