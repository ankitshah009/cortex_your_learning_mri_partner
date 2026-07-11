# EverOS Integration for Cortex

This document details the EverOS memory system integration for Cortex: Your Learning MRI Partner.

## What is EverOS?

EverOS is the **Memory Operating System for Agentic AI**. It provides:

- **Persistent memory** — Conversations are stored and organized across sessions
- **Semantic consolidation** — Raw messages are transformed into structured knowledge (MemCells → MemScenes)
- **Intelligent retrieval** — Reconstructive recollection finds relevant context, not just keyword matches
- **Biological inspiration** — Memory follows an engram lifecycle: Formation → Consolidation → Recollection

For details, see [https://docs.evermind.ai](https://docs.evermind.ai).

## Integration Architecture

```
┌──────────────────────────────┐
│  Cortex Tutor Agent          │
└──────────────┬───────────────┘
               │
               ├─ Recording interactions
               ├─ Retrieving learning context
               └─ Personalizing content
               │
┌──────────────▼───────────────┐
│  EverOSMemoryManager         │ (cortex/memory.py)
│  ├─ add_messages()           │
│  ├─ search()                 │
│  ├─ get_learning_context()   │
│  └─ record_learning_session()│
└──────────────┬───────────────┘
               │
┌──────────────▼──────────────────────────┐
│  EverOS Cloud SDK                        │
│  (everos-cloud)                          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  EverOS API (https://api.evermind.ai)   │
│  ├─ Memory consolidation                │
│  ├─ MemScene clustering                 │
│  ├─ Intelligent retrieval               │
│  └─ User profile synthesis              │
└──────────────────────────────────────────┘
```

## File Structure

```
cortex/
├── __init__.py                 # Package exports
├── config.py                   # EverOS client initialization
├── memory.py                   # EverOSMemoryManager class
examples/
├── everos_basic.py             # Basic usage example
EVEROS_SETUP.md                 # Quick start guide
EVEROS_INTEGRATION.md           # This file
requirements.txt                # Python dependencies
.env.example                    # Environment template
.gitignore                       # Git exclusions
```

## Core Classes

### `EverOSMemoryManager`

Main interface for memory operations.

```python
from cortex.memory import EverOSMemoryManager

# Initialize for a student
memory = EverOSMemoryManager(user_id="student_001")

# Record messages
memory.add_messages([
    Message(role="user", content="How do I solve x² + 5x + 6 = 0?"),
    Message(role="assistant", content="Let's factor..."),
])

# Retrieve context
context = memory.get_learning_context(topic="Quadratic Equations")

# Search
results = memory.search(
    query="student struggled with factoring",
    method=RetrievalMethod.HYBRID,
    top_k=5
)
```

**Key methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `add_messages(msgs, async_mode=True)` | Queue messages | Response dict |
| `flush()` | Force consolidation | Status dict |
| `search(query, method, memory_types, top_k)` | Query memories | Search results |
| `get_profile()` | Get student profile | Profile data |
| `get_episodes()` | Get conversation summaries | Episodes |
| `get_learning_context(topic)` | Get topic context | Combined context |
| `record_learning_session(topic, summary, score)` | Log session | Response dict |
| `delete_memory(memory_id)` | Remove memory | Response dict |

### `Message`

Represents a single message in a conversation.

```python
Message(
    role="user" | "assistant",
    content="The message text",
    timestamp=int(time.time() * 1000),  # Unix milliseconds
    sender_id="optional_id",  # For group chats
)
```

### Enums

**`MemoryType`** — Types of stored memories:
- `EPISODIC` — Conversation narratives
- `PROFILE` — Student attributes & preferences
- `FORESIGHT` — Time-bounded predictions
- `EVENTLOG` — Factual events with timestamps
- `AGENT_CASE` — Task trajectories (multi-agent)
- `AGENT_SKILL` — Learned generalizations

**`RetrievalMethod`** — Search strategies:
- `KEYWORD` — BM25 keyword search
- `VECTOR` — Semantic embedding search
- `HYBRID` — Combined keyword + vector with ranking
- `AGENTIC` — Let agent choose method

## Usage Patterns

### 1. Personalized Tutoring

```python
from cortex.memory import EverOSMemoryManager

class PersonalTutor:
    def __init__(self, student_id):
        self.memory = EverOSMemoryManager(user_id=student_id)
    
    def generate_lesson(self, topic):
        # Get learning context
        context = self.memory.get_learning_context(topic)
        
        # Extract profile to tailor explanation
        profile = context["profile"]
        episodes = context["episodes"]
        
        # Pass to LLM with context
        prompt = f"""
        Student profile: {profile}
        Past interactions: {episodes}
        
        Create a personalized lesson on {topic}.
        """
        return generate_response(prompt)
    
    def record_response(self, student_msg, tutor_msg):
        self.memory.add_messages([
            Message(role="user", content=student_msg),
            Message(role="assistant", content=tutor_msg),
        ])
```

### 2. Progress Tracking

```python
def track_progress(student_id, topic, quiz_score):
    memory = EverOSMemoryManager(user_id=student_id)
    
    # Record the quiz result
    memory.record_learning_session(
        topic=topic,
        summary=f"Completed {topic} quiz",
        score=quiz_score
    )
    
    # Get historical progress
    progress = memory.search(
        query=f"{topic} score history",
        method=RetrievalMethod.EVENTLOG,
        memory_types=[MemoryType.EVENTLOG],
    )
    
    return progress["eventlog"]
```

### 3. Group Learning (Future)

For group study sessions, use `group_id` instead of `user_id`:

```python
# EverOS Cloud API supports group memories
client = init_everos_client()
group_memories = client.v1.memories.group

response = group_memories.add(
    group_id="study_group_001",
    messages=[
        {"role": "user", "sender_id": "alice", "sender_name": "Alice", "content": "..."},
        {"role": "user", "sender_id": "bob", "sender_name": "Bob", "content": "..."},
    ]
)
```

## API Details

### Authentication

All requests use Bearer token authentication:

```
Authorization: Bearer <api_key>
```

The API key is loaded from `EVEROS_API_KEY` environment variable.

### Endpoints

**POST /api/v1/memories**
- Add messages for a user
- Supports async processing (default)
- Returns message count and status

**POST /api/v1/memories/flush**
- Trigger immediate consolidation
- Blocks until extraction completes

**POST /api/v1/memories/search**
- Search across memory types
- Supports keyword, vector, hybrid, agentic methods
- Returns episodes, profiles, agent memories

**POST /api/v1/memories/get**
- Retrieve memories by type
- Paginated results

**DELETE /api/v1/memories/{memory_id}**
- Remove a specific memory

## Memory Lifecycle

### 1. Episodic Trace Formation
Messages arrive and are segmented by semantic boundaries:
- "Dinner party" is one event (not second-by-second transcript)
- Student learns quadratic equations is one episode

### 2. Semantic Consolidation
The system:
1. **Clusters** — Groups related MemCells into MemScenes
2. **Synthesizes** — Merges redundancies, resolves contradictions
3. **Profiles** — Promotes key traits to global student profile

### 3. Reconstructive Recollection
On search:
1. **Intent analysis** — What does the query ask?
2. **Scene activation** — Load relevant MemScene
3. **Context synthesis** — Extract specific facts while filtering noise

## Example: End-to-End Flow

```python
from cortex.memory import (
    EverOSMemoryManager,
    Message,
    RetrievalMethod,
    MemoryType,
)

# 1. Initialize for student
memory = EverOSMemoryManager(user_id="alice_123")

# 2. Record learning session
messages = [
    Message(
        role="user",
        content="I don't understand why (x-2)(x+3) = x² + x - 6"
    ),
    Message(
        role="assistant",
        content="Let's expand: (x-2)(x+3) = x·x + x·3 - 2·x - 2·3 = x² + 3x - 2x - 6 = x² + x - 6"
    ),
]
memory.add_messages(messages)

# 3. Force consolidation
memory.flush()

# 4. Retrieve learning context
context = memory.get_learning_context(
    topic="Quadratic Equations",
    include_progress=True,
)
print("Profile:", context["profile"])
print("Episodes:", context["episodes"])
print("Progress:", context["progress"])

# 5. Search for specific information
results = memory.search(
    query="factoring FOIL method",
    method=RetrievalMethod.HYBRID,
    top_k=5,
)
print("Found episodes:", len(results["episodes"]))

# 6. Record session outcome
memory.record_learning_session(
    topic="Quadratic Equations - Factoring",
    summary="Student understood FOIL method after worked examples.",
    score=88.0,
)
```

## Configuration

### Environment Variables

```bash
# Required
EVEROS_API_KEY=b600baa8-4f5b-43f3-abbc-feef04830f71

# Optional
EVEROS_BASE_URL=https://api.evermind.ai  # Default API endpoint
```

### Setup File

Create `.env` from `.env.example`:

```bash
cp .env.example .env
# Edit .env and add your API key
```

Then in code:

```python
from cortex.config import load_everos_config
config = load_everos_config()
```

## Error Handling

### Common Errors

**`ValueError: EVEROS_API_KEY environment variable not set`**
```bash
export EVEROS_API_KEY="b600baa8-4f5b-43f3-abbc-feef04830f71"
```

**`ImportError: everos-cloud not installed`**
```bash
pip install -r requirements.txt
```

**No search results**
- Call `memory.flush()` to trigger consolidation
- Wait for async processing (usually < 1 second)
- Try broader queries

**Rate limit errors**
- Check quota at https://everos.evermind.ai/dashboard
- Reduce message batch size
- Implement exponential backoff

## Performance Considerations

### Async vs Sync

**Async (default):**
- Fast, returns immediately
- Good for high-throughput scenarios
- Memories available ~100-500ms later

**Sync:**
- Blocks until consolidation completes
- Ensures immediate queryability
- Use for time-sensitive operations

### Batch Imports

Import historical data efficiently:

```python
def batch_import(student_id, conversations, batch_size=500):
    memory = EverOSMemoryManager(user_id=student_id)
    
    for i in range(0, len(conversations), batch_size):
        batch = conversations[i:i+batch_size]
        memory.add_messages(batch)
        time.sleep(1)  # Rate limiting
    
    memory.flush()  # Force consolidation of all batches
```

### Memory Quota

Billed by MemCell count:
- 1 MemCell ≈ 10 raw messages
- Check usage: https://everos.evermind.ai/dashboard
- Contact: contact@evermind.ai

## Debugging

### Enable Verbose Logging

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Inspect Raw API Responses

```python
response = memory.memories.add(...)
print(response.data)
print(response.meta)
```

### Test Connectivity

```bash
curl -H "Authorization: Bearer $EVEROS_API_KEY" \
  https://api.evermind.ai/api/v1/memories/search \
  -d '{"filters":{"user_id":"test"},"query":"test"}'
```

## Next Steps

1. **Run the example**: `python examples/everos_basic.py`
2. **Integrate with your tutor**: Import `EverOSMemoryManager` in your agent code
3. **Set up batch import**: Import existing chat history
4. **Monitor on dashboard**: https://everos.evermind.ai
5. **Explore multimodal**: Store diagrams, documents, code

## Resources

- **Docs**: https://docs.evermind.ai
- **Dashboard**: https://everos.evermind.ai
- **GitHub**: https://github.com/EverMind-AI/EverOS
- **Discord**: https://discord.gg/geHdX4F24B
- **Research**: https://arxiv.org/pdf/2601.02163
- **Contact**: contact@evermind.ai

## Open Source Alternative

For self-hosted deployments:

```bash
pip install everos  # OSS package
everos init         # Generate config
everos server start # Start local server on :8000
```

The OSS version has the same memory pipeline as Cloud but requires local infrastructure.

## License & Attribution

EverOS is developed by EverMind AI. Integration code is part of Cortex project.

For licensing questions, contact contact@evermind.ai.
