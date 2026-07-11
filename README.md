# Cortex — Your Learning MRI Partner

An AI-powered personalized learning platform with persistent memory, powered by **EverOS** and **Butterbase**.

![Status](https://img.shields.io/badge/status-ready-green?style=flat-square)
![Python](https://img.shields.io/badge/python-3.8%2B-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

## What is Cortex?

Cortex is a learning agent platform that:

- **Remembers** student interactions across sessions using EverOS persistent memory
- **Understands** individual learning styles, preferences, and progress
- **Adapts** teaching strategies based on consolidation of past interactions
- **Personalizes** content, pacing, and difficulty dynamically

Like an MRI that sees inside the learning process, Cortex provides deep insight into how each student learns.

## Key Features

### 🧠 Memory Operating System (EverOS)

- **Persistent memory** — Conversations stored and organized across sessions
- **Semantic consolidation** — Raw messages transformed into structured knowledge
- **Intelligent retrieval** — Find relevant context, not just keyword matches
- **7 memory types** — Episodic, profile, foresight, eventlog, agent cases/skills
- **4 retrieval methods** — Keyword, vector, hybrid, agentic

### 🔧 Integration-Ready

- **Butterbase MCP** — Additional AI capabilities via Model Context Protocol
- **Easy setup** — 5-minute integration with your agent
- **Cloud & self-hosted** — EverOS Cloud or open-source deployment options
- **Multimodal** — Support for text, images, documents, audio

### 📊 Developer-Friendly

- **Simple API** — `EverOSMemoryManager` wraps all complexity
- **Type hints** — Full Python type annotations
- **Examples** — Runnable walkthroughs
- **Verification** — Integration test script included
- **Documentation** — Comprehensive guides and API reference

## Quick Start

### 1️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

### 2️⃣ Verify Integration

```bash
python examples/verify_everos.py
```

### 3️⃣ Run Example

```bash
python examples/everos_basic.py
```

### 4️⃣ Integrate into Your Agent

```python
from cortex.memory import EverOSMemoryManager, Message

class MyTutorAgent:
    def __init__(self, student_id):
        self.memory = EverOSMemoryManager(user_id=student_id)
    
    def teach(self, topic, student_message):
        # Get learning context
        context = self.memory.get_learning_context(topic)
        
        # Generate personalized response
        response = llm.generate(
            system=f"Student profile: {context['profile']}",
            user=student_message
        )
        
        # Record interaction
        self.memory.add_messages([
            Message(role="user", content=student_message),
            Message(role="assistant", content=response),
        ])
        
        return response
```

## Documentation

| Document | Purpose |
|----------|---------|
| **[EVEROS_SETUP.md](EVEROS_SETUP.md)** | 5-minute quick start and core concepts |
| **[EVEROS_INTEGRATION.md](EVEROS_INTEGRATION.md)** | Full API reference and architecture |
| **[INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)** | Project overview and next steps |

## Project Structure

```
cortex/
├── __init__.py              # Package exports
├── config.py                # EverOS client initialization
└── memory.py                # EverOSMemoryManager class

examples/
├── everos_basic.py          # Full usage example
└── verify_everos.py         # Integration test

.env.example                 # Environment template
.gitignore                   # Git exclusions
.mcp.json                    # Butterbase MCP config
requirements.txt             # Dependencies
README.md                    # This file
```

## API Overview

### `EverOSMemoryManager`

```python
from cortex.memory import EverOSMemoryManager, Message, RetrievalMethod

# Initialize
memory = EverOSMemoryManager(user_id="student_001")

# Add messages
memory.add_messages([
    Message(role="user", content="How do I solve quadratic equations?"),
    Message(role="assistant", content="Let's start with factoring..."),
])

# Force consolidation
memory.flush()

# Get learning context
context = memory.get_learning_context(topic="Algebra")
# → {'profile': [...], 'episodes': [...], 'progress': [...]}

# Search
results = memory.search(
    query="student struggled with factoring",
    method=RetrievalMethod.HYBRID,
    top_k=5,
)

# Record session
memory.record_learning_session(
    topic="Quadratic Equations",
    summary="Mastered factoring method",
    score=95.0,
)
```

## Memory Types

| Type | Description |
|------|-------------|
| `episodic_memory` | Conversation summaries and learning interactions |
| `profile` | Student attributes, preferences, learning style |
| `foresight` | Time-bounded predictions and deadlines |
| `eventlog` | Quiz scores, timestamps, factual events |
| `agent_case` | Task approach and quality scores |
| `agent_skill` | Learned generalizations |

## Retrieval Methods

| Method | When to Use |
|--------|------------|
| `keyword` | Factual lookups ("What's the deadline?") |
| `vector` | Semantic search ("Topics of interest") |
| `hybrid` | Balanced keyword + vector ranking |
| `agentic` | Agent chooses method based on intent |

## Configuration

### Environment Variables

```bash
# Required
export EVEROS_API_KEY="b600baa8-4f5b-43f3-abbc-feef04830f71"

# Optional
export EVEROS_BASE_URL="https://api.evermind.ai"
```

### .env File

```bash
cp .env.example .env
# Edit .env with your keys
```

## Examples

### Personalized Lesson Generation

```python
from cortex.memory import EverOSMemoryManager

memory = EverOSMemoryManager(user_id="alice_123")
context = memory.get_learning_context(topic="Calculus")

# Use context to personalize content
if "visual_learner" in context["profile"]:
    lesson = generate_visual_lesson("Derivatives")
else:
    lesson = generate_textual_lesson("Derivatives")
```

### Progress Tracking

```python
memory.record_learning_session(
    topic="Calculus - Derivatives",
    summary="Completed 10 practice problems",
    score=88.0,
)

# Later: retrieve progress
progress = memory.search(
    query="derivative quiz scores",
    top_k=10,
)
```

### Group Learning (Future)

```python
# EverOS Cloud supports group memories
group_memories = client.v1.memories.group
group_memories.add(group_id="study_group_001", messages=[...])
```

## Troubleshooting

### "EVEROS_API_KEY not set"

```bash
export EVEROS_API_KEY="b600baa8-4f5b-43f3-abbc-feef04830f71"
echo 'export EVEROS_API_KEY="..."' >> ~/.zshrc
source ~/.zshrc
```

### "everos-cloud not installed"

```bash
pip install -r requirements.txt
```

### No search results

1. Call `memory.flush()` to trigger consolidation
2. Wait ~100-500ms for async processing
3. Try broader search queries

## Resources

- **[EverOS Docs](https://docs.evermind.ai)** — Complete API reference
- **[EverOS Dashboard](https://everos.evermind.ai)** — Monitor usage
- **[GitHub](https://github.com/EverMind-AI/EverOS)** — Open source
- **[Discord](https://discord.gg/geHdX4F24B)** — Community support
- **[Research Paper](https://arxiv.org/pdf/2601.02163)** — Technical details

## Open Source Alternative

For self-hosted deployments:

```bash
pip install everos          # OSS package
everos init                 # Generate config
everos server start         # Start on localhost:8000
```

## Billing

EverOS Cloud pricing based on **MemCell count**:
- Typical ratio: ~10 raw messages = 1 MemCell
- Check usage at https://everos.evermind.ai/dashboard
- Contact: contact@evermind.ai

## Next Steps

1. Run `python examples/verify_everos.py`
2. Run `python examples/everos_basic.py`
3. Read [EVEROS_SETUP.md](EVEROS_SETUP.md)
4. Integrate `EverOSMemoryManager` into your agent
5. Set up batch import of historical data
6. Monitor dashboard at https://everos.evermind.ai

## Support

**Questions about EverOS?**
- Discord: https://discord.gg/geHdX4F24B
- Email: contact@evermind.ai

**Questions about Cortex?**
- Check examples in `examples/`
- Read [EVEROS_INTEGRATION.md](EVEROS_INTEGRATION.md)
- Run `examples/verify_everos.py`

## Credits

Cortex integrates **EverOS** — the Memory Operating System for Agentic AI by EverMind AI.

## License

This integration is provided as-is for your learning platform. See individual components for their licenses.

---

**Ready to build personalized learning at scale?**

```bash
pip install -r requirements.txt && python examples/everos_basic.py
```
