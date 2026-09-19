# Validation record / 19 September 2026

## Executed in preparation

- `node --test tests/*.test.mjs`: **36 passed, 0 failed**. Includes policy, strict function parsing, admin authorization, same-origin POST enforcement, one-time codes, session isolation, quotas, cost reservations, paused/in-flight behavior, malformed input and persistence.
- Dependency-free Node server started and served its real HTTP API. Health, admin, session, joining and chat flows exercised.
- Chromium rendered the participant desktop/mobile and facilitator UI. The real Node handler was used for MOCK open, backend refusal and server-granted legitimate open; mobile at 390px had no horizontal overflow.
- Raw provider response parsing and request construction tested with fixtures. Mock mode makes no provider calls.

## Important environment limitation

Chromium blocks local/file navigation here. For visual/interaction tests, the unchanged HTML/CSS/JS was inlined and fetch was bridged to the actual running Node server through Python HTTP requests with isolated cookie jars. This is not an end-to-end test of native browser cookie handling, delivery headers, TLS, Coolify or the final domain. These remain host checks.

## Not executed

No live OpenAI request, provider capacity test, npm install/Next.js build, Docker build, Coolify deployment, external penetration test or venue-network test. The preparation environment could not reach the package registry. The dependency-free Node runtime is the tested path; Next.js is an optional unbuilt adapter. Run DEPLOY.md before using the hosted activity.

## Limits of the result

Passing application tests is not a security certification. The intentionally vulnerable prompt-only rule is confined to an isolated toy gate. Request/output quotas are real checks; dollar accounting is estimated and needs provider-side budget controls. A successful jailbreak is model-dependent and not promised.
