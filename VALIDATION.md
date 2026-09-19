# Validation record

Checked 19 September 2026 for the Night 1 release.

## Passed locally

- `npm test`: 36 passed, 0 failed. Covers the permission rule, tool parsing, host authentication, origin checks, enrollment, isolated sessions, quotas, in-flight results, malformed input, and persistence.
- `npm run smoke`: the real Node HTTP server served all routes. Eight teams joined, independent state was preserved, Round A opened without a pass, Round B denied without a pass and allowed with one, and sessions/counters survived a restart. Temporary mock state was removed after the test.
- Headless Google Chrome accessed the real local HTTP server using native cookies. Host login, code generation, participant enrollment, mock chat, round changes, and the defended refusal passed. Participant pages were checked at desktop width and 390px. No participant JavaScript errors occurred.
- The request-construction and response-parsing tests use fixtures. Mock mode makes no external model calls.

## Still needed on the deployment

Docker build and volume permissions, Coolify proxy/TLS, final-domain cookie/origin behavior, live OpenAI access and latency, provider capacity, and the venue network. The local machine has no running Docker daemon. Optional GitHub Actions were deferred because the publishing login lacks workflow scope. The optional Next.js adapter has not been installed or built.

Follow [DEPLOY.md](DEPLOY.md) for the hosted rehearsal. Health confirms the running process and selected provider; it does not confirm model access. A successful live jailbreak has not been recorded or promised.

The app is a teaching exercise with an intentionally vulnerable rule in Round A. Local tests do not establish production security or an exact provider bill. The store requires one process and one replica.
