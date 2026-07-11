# Cortex Integration Summary

**Date:** July 11, 2026  
**Project:** Cortex — Your Learning MRI Partner  
**Integrations:** EverOS + Butterbase MCP

---

## What Was Set Up

### 1. EverOS Memory Layer ✅

**Purpose:** Persistent, structured memory for personalized learning

**Components:**

- **`cortex/memory.py`** — `EverOSMemoryManager` class
  - `add_messages()` — Record conversations
  - `search()` — Intelligent retrieval (keyword, vector, hybrid, agentic)
  - `get_learning_context()` — Topic-specific personalization
  - `record_learning_session()` — Track progress & scores
  - `flush()` — Force memory consolidation

- **`cortex/config.py`** — Environment & client initialization
  - Loads `EVEROS_API_KEY` from environment
  - Initializes EverOS Cloud SDK client

- **Examples & Verification**
  - `examples/everos_basic.py` — Full usage walkthrough
  - `examples/verify_everos.py` — Integration test script

- **Documentation**
  - `EVEROS_SETUP.md` — Quick start (5-minute setup)
  - `EVEROS_INTEGRATION.md` — Architecture & API reference

### 2. Butterbase MCP Server ✅

**Purpose:** Additional AI capability via Model Context Protocol

**Configuration:**
- `.mcp.json` — Butterbase server setup
- URL: `https://api.butterbase.ai/mcp`
- Transport: HTTP with Bearer token auth
- Credentials stored in `.claude/settings.json`

### 3. Environment & Tooling ✅

**Files Created:**
```
cortex/
├── __init__.py
├── config.py                 # Config loading
├── memory.py                 # Memory manager
examples/
├── everos_basic.py           # Usage examples
├── verify_everos.py          # Integration tests
.env.example                  # Environment template
.gitignore                    # Git exclusions
.mcp.json                     # MCP server config
requirements.txt              # Dependencies (everos-cloud, python-dotenv)
EVEROS_SETUP.md              # Quick start guide
EVEROS_INTEGRATION.md        # Full documentation
INTEGRATION_SUMMARY.md       # This file
```

---

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Verify Setup

```bash
python examples/verify_everos.py
```

Expected output:
```
✅ Environment
✅ Dependencies
✅ Configuration
✅ Memory Manager
✅ API connectivity verified
🎉 All checks passed!
```

### 3. Run Basic Example

```bash
python examples/everos_basic.py
```

### 4. Next Steps

**To integrate with your tutor agent:**

```python
from cortex.memory import EverOSMemoryManager, Message

class MyTutorAgent:
    def __init__(self, student_id):
        self.memory = EverOSMemoryManager(user_id=student_id)
    
    def handle_student_message(self, msg):
        # Get learning context
        context = self.memory.get_learning_context(
            topic="Algebra"
        )
        
        # Use in your LLM prompt
        response = llm.generate(
            system=f"Student profile: {context['profile']}",
            user=msg
        )
        
        # Record interaction
        self.memory.add_messages([
            Message(role="user", content=msg),
            Message(role="assistant", content=response),
        ])
        
        return response
```

---

## Core Features

### Memory Management

| Feature | Description |
|---------|-------------|
| **Episodic Memory** | Conversation summaries capturing learning flow |
| **Profile Memory** | Student preferences, learning style, goals |
| **Progress Tracking** | Quiz scores, session outcomes, factual events |
| **Foresight** | Predicted readiness, upcoming deadlines |

### Retrieval Methods

| Method | When to Use |
|--------|------------|
| `keyword` | Factual lookups ("What's the API key?") |
| `vector` | Semantic search ("Topics of interest") |
| `hybrid` | Balanced keyword + vector ranking |
| `agentic` | Agent chooses based on query intent |

### API Endpoints

Wrapped by `EverOSMemoryManager`:

- `POST /api/v1/memories` — Add messages
- `POST /api/v1/memories/flush` — Consolidate
- `POST /api/v1/memories/search` — Query
- `POST /api/v1/memories/get` — Retrieve by type
- `DELETE /api/v1/memories/{id}` — Remove

---

## Configuration

### Environment Variables

**Required:**
```bash
export EVEROS_API_KEY="b600baa8-4f5b-43f3-abbc-feef04830f71"
```

**Optional:**
```bash
export EVEROS_BASE_URL="https://api.evermind.ai"  # Default
```

### .env File

```bash
# Copy template
cp .env.example .env

# Edit with your keys
# (Never commit .env to git)
```

### Claude Code Settings

API keys are pre-configured in `~/.claude/settings.json`:
```json
{
  "env": {
    "EVEROS_API_KEY": "b600baa8-4f5b-43f3-abbc-feef04830f71",
    "BUTTERBASE_API_KEY": "bb_sk_7d37358c3f57c5c6aec6776266c4f249047b74d1"
  }
}
```

---

## Architecture

```
┌─────────────────────────────────┐
│  Your AI Tutor Agent            │
│  (Claude, GPT, custom LLM)      │
└──────────────┬──────────────────┘
               │
               ├─ Recording: conversation messages
               ├─ Retrieving: learning context
               └─ Personalizing: content & pacing
               │
┌──────────────▼──────────────────┐
│  EverOSMemoryManager            │
│  cortex.memory.EverOSMemoryManager
└──────────────┬──────────────────┘
               │
               ├─ add_messages()
               ├─ search()
               ├─ get_learning_context()
               └─ record_learning_session()
               │
┌──────────────▼──────────────────────────┐
│  EverOS Cloud API                       │
│  https://api.evermind.ai                │
└──────────────┬──────────────────────────┘
               │
               ├─ Semantic consolidation (MemCells → MemScenes)
               ├─ Conflict resolution
               ├─ User profile synthesis
               └─ Intelligent retrieval
```

---

## Example Usage

### Record a Learning Session

```python
from cortex.memory import EverOSMemoryManager, Message

memory = EverOSMemoryManager(user_id="student_alice")

messages = [
    Message(role="user", content="How do I factor x² + 5x + 6?"),
    Message(role="assistant", content="Look for two numbers that multiply to 6 and add to 5..."),
]

memory.add_messages(messages)
memory.flush()  # Force consolidation
```

### Get Personalized Context

```python
context = memory.get_learning_context(topic="Quadratic Equations")

# context contains:
# - profile: learning style, preferences
# - episodes: past conversations about the topic
# - progress: quiz scores, session outcomes
```

### Search for Relevant Memories

```python
from cortex.memory import RetrievalMethod

results = memory.search(
    query="student struggled with factoring last week",
    method=RetrievalMethod.HYBRID,
    top_k=5,
)

# results contains episodes, profiles, agent cases, etc.
```

### Track Progress

```python
memory.record_learning_session(
    topic="Quadratic Equations - Factoring",
    summary="Completed 5 practice problems with 100% accuracy",
    score=95.0,
)
```

---

## Troubleshooting

### "EVEROS_API_KEY not set"

```bash
export EVEROS_API_KEY="b600baa8-4f5b-43f3-abbc-feef04830f71"
```

### "everos-cloud not installed"

```bash
pip install -r requirements.txt
```

### "No search results"

1. Ensure messages were added: `memory.add_messages(...)`
2. Consolidation not yet complete: `memory.flush()`
3. Wait ~100-500ms for async processing

### API Connectivity Issues

```bash
# Test API directly
curl -H "Authorization: Bearer $EVEROS_API_KEY" \
  https://api.evermind.ai/api/v1/memories/search \
  -d '{"filters":{"user_id":"test"},"query":"test"}'
```

---

## Billing & Quotas

EverOS Cloud pricing is based on **MemCell count**:
- Typical ratio: ~10 raw messages = 1 MemCell
- Check usage: https://everos.evermind.ai/dashboard
- Contact: contact@evermind.ai

---

## Resources

| Resource | URL |
|----------|-----|
| **Documentation** | https://docs.evermind.ai |
| **Dashboard** | https://everos.evermind.ai |
| **GitHub** | https://github.com/EverMind-AI/EverOS |
| **Discord** | https://discord.gg/geHdX4F24B |
| **Paper** | https://arxiv.org/pdf/2601.02163 |
| **Support** | contact@evermind.ai |

---

## Next Steps

### Short Term
- [ ] Run `python examples/verify_everos.py`
- [ ] Read `EVEROS_SETUP.md` for quick start
- [ ] Integrate `EverOSMemoryManager` into your agent

### Medium Term
- [ ] Set up batch import of existing chat history
- [ ] Enable multimodal memory (diagrams, documents)
- [ ] Implement personalized lesson generation
- [ ] Add progress dashboards

### Long Term
- [ ] Explore group learning memory
- [ ] Enable background reflection/consolidation
- [ ] Monitor memory patterns for insights
- [ ] Consider self-hosted OSS deployment

---

## Files Reference

```
cortex_your_learning_mri_partner/
├── cortex/                          # Main package
│   ├── __init__.py                  # Package exports
│   ├── config.py                    # EverOS client initialization
│   └── memory.py                    # EverOSMemoryManager
│
├── examples/                        # Usage examples
│   ├── everos_basic.py             # Full walkthrough
│   └── verify_everos.py            # Integration tests
│
├── .env.example                     # Environment template
├── .gitignore                       # Git exclusions
├── .mcp.json                        # Butterbase MCP config
├── requirements.txt                 # Python dependencies
│
├── EVEROS_SETUP.md                 # Quick start (5 min)
├── EVEROS_INTEGRATION.md           # Full documentation
└── INTEGRATION_SUMMARY.md          # This file
```

---

## Support

**Questions about EverOS?**
- Discord: https://discord.gg/geHdX4F24B
- Email: contact@evermind.ai
- Docs: https://docs.evermind.ai

**Questions about Cortex integration?**
- Check examples in `examples/`
- Review `EVEROS_INTEGRATION.md`
- Run `examples/verify_everos.py`

---

**Integration completed:** July 11, 2026  
**Status:** ✅ Ready for use
