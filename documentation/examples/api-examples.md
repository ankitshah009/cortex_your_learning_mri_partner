# API Examples

## Diagnose a learner response

```bash
curl -X POST http://localhost:3000/api/diagnose \
  -H 'Content-Type: application/json' \
  -d '{
    "problem_id": "avg-instant-speed-v1",
    "learner_response": "The car traveled 120 miles in two hours, so its speed was 60 mph. Therefore, after one hour, it was moving at 60 mph."
  }'
```

## Verify a misconception hypothesis

```bash
curl -X POST http://localhost:3000/api/verify \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "sess_123",
    "probe_response": "The average would still be 60 mph, but at the one-hour mark the speed would not have to be 60 mph."
  }'
```

## UI stage mapping

```ts
switch (session.stage) {
  case "collecting":
    return <ReasoningInput />;
  case "diagnosing":
    return <AnalysisLoading />;
  case "diagnosed":
    return <DiagnosisAndProbe />;
  case "verifying":
    return <VerificationLoading />;
  case "prescribed":
    return <Intervention />;
  default:
    return <RecoveryState />;
}
```
