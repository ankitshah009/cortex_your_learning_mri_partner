# EverOS environment variables (frontend)

Add these to `frontend/.env` (see `.env.example`) to enable real EverOS memory:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_EVEROS_API_KEY` | Yes (to enable) | EverOS Cloud API key (Bearer token). Get one at https://everos.evermind.ai/dashboard. When unset, memory calls stay on the seeded mock. |
| `VITE_EVEROS_USER_ID` | No | Student/user id for memory scoping. Defaults to `demo_student`. |
| `VITE_EVEROS_BASE_URL` | No | API base URL. Defaults to `https://api.evermind.ai`. |

Example:

```bash
VITE_EVEROS_API_KEY=your-api-key-here
VITE_EVEROS_USER_ID=student_001
```

Behavior: when the key is set, `recordLearningSession` POSTs to
`POST /api/v1/memories` and `getMemoryEvidence` queries
`POST /api/v1/memories/search` (3s timeout). Any failure silently falls back
to the mock implementations so the demo can never break.
