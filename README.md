# Convince the Gatekeeper

An isolated HackManila teaching app. The model may request `open_gate`; the application owns the actual gate state. One vulnerable *toy authorization decision* is intentional. This app does not expose a terminal, browser tool, filesystem tool, or any production integration to the model.

## Start locally: no dependency installation

Use Node.js 22.9 or newer. From this directory:

```sh
npm run setup
npm test
npm start
```

Open `http://localhost:3000` and, privately, `http://localhost:3000/facilitator`. Read the generated `ADMIN_TOKEN` from `.env.local`; do not project or share it. Setup never overwrites an existing file. The default is **MOCK / REHEARSAL** and the round starts **paused**.

In the facilitator console, create enough team codes, download the private CSV, distribute one code per pair, and start Round A. One code is consumed by one browser; retain that browser's cookie. A replacement browser needs a fresh code. The admin token remains in browser memory, not local storage.

In mock mode, `/open` produces a scripted request. This is for rehearsing the application and authorization boundary, **not evidence of a live-model jailbreak**.

## Live OpenAI mode

Set these privately, then restart:

```dotenv
MODEL_PROVIDER=openai
OPENAI_API_KEY=YOUR_PRIVATE_KEY
OPENAI_MODEL=gpt-5-mini
```

The implementation uses the OpenAI Responses API with one strict `open_gate` function and no parallel tool calls. `OPENAI_MODEL` is configurable. GPT-5 mini is an example, not a claim about the newest or best model. Confirm your API project has access and an appropriate provider-side budget. There is no automatic retry or second completion: the model's requested action and the deterministic application result are shown separately.

Read [DEPLOY.md](DEPLOY.md), [HOST-GUIDE.md](HOST-GUIDE.md) and [VALIDATION.md](VALIDATION.md) before public use.

## Runtime options

**Fast path:** the dependency-free Node server, `Dockerfile` and `docker-compose.yml` are the default. Core behavior is tested without needing a package registry.

**Optional Next.js adapter:** `app/route.js`, `app/facilitator/route.js` and `app/api/[...path]/route.js` delegate to the same request handler. `npm run next:install`, then `npm run next:build` and `npm run next:start`. `Dockerfile.next` is provided for an optional container build. This adapter was **not installed or build-validated in the preparation environment**. Rehearse it on your machine before choosing it; use the Node fast path rather than delaying the workshop. Commit the resulting lockfile after a successful install/build if you choose Next. No `NEXT_PUBLIC_` secret is used.

## Layout

`lib/policy.mjs` is the small authorization function. `lib/app.mjs` handles sessions, quotas, admin and messages. `lib/model.mjs` isolates Responses API and mock behavior. `lib/store.mjs` persists counters and session state. `public/` contains the chat and facilitator UI. `tests/` exercises policy and request handling.

**One process and one replica only.** The JSON store is atomic per write in this process, not a shared transactional database. Do not horizontally scale it or run Node and Next simultaneously against the same data directory.

## Limits and data

Default limits are 12 turns per team per round, 8 concurrent model calls, 400 total model attempts and a $5 *estimated* application ceiling. Calls are reserved before dispatch; failures are not automatically retried; pending requests count. Hard request/output limits do not guarantee an exact dollar bill. Model prices, tokenization and interrupted calls can differ from estimates. Set OpenAI project limits too and keep the configured input/output prices consistent with the selected model.

Round changes and pauses invalidate pending action results but cannot recall an already-billed model request. Round resets do not reset global usage totals. An interrupted call is conservatively charged at its reserved estimate after restart. The UI shows spent estimates and held reservations separately.

Only synthetic data should be entered. The host can view/display selected transcripts. Team cookies, hashed one-time join codes, hashed session tokens, messages, outcomes and usage are stored in the data volume. Provider credentials remain environment-only. After the workshop, pause, purge team data, shut down the service and rotate/remove credentials. Purge retains global usage totals. Logs/transcript history are bounded.

## Public deployment boundary

HTTPS, correct `APP_ORIGIN`, a long private admin token and a private persistent volume are required. Cookie flags, response CSP, no-store, frame denial, strict accepted JSON fields, same-origin POST checks and per-session limits reduce accidental exposure; this workshop prototype has not undergone an independent penetration test. Do not reuse its minimal session system for a production product.

## References

OpenAI model: https://developers.openai.com/api/docs/models/gpt-5-mini
Function calling: https://developers.openai.com/api/docs/guides/function-calling
Next.js installation: https://nextjs.org/docs/app/getting-started/installation
Coolify Compose: https://coolify.io/docs/applications/builds/docker-compose
OWASP prompt injection: https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html
