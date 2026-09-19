# Deploy Gatekeeper to Coolify

Use the default Node runtime for this event. It serves the participant page, facilitator console, and API from one container. It needs no database service, npm install, or Next.js build.

## Coolify settings

Create an application from the private Git repository (use the Coolify GitHub App or a read-only deploy key), using the Docker Compose build pack.

| Setting | Value |
| --- | --- |
| Repository | `https://github.com/hackmanila/gatekeeper` |
| Branch | `main` |
| Base directory | `/` |
| Docker Compose location | `/docker-compose.yml` (relative to the base directory) |
| Service | `gatekeeper` |
| Service Domains field | `https://gate.apps.rnbks.com:3000` |
| Persistent volume | `gatekeeper_data` mounted at `/app/data` |
| Replicas | **1** |

The `:3000` suffix tells Coolify which internal port to proxy. Attendees use **https://gate.apps.rnbks.com** without a port. Set DNS for `gate.apps.rnbks.com` to the Coolify server, or confirm that the existing wildcard DNS covers it.

Save and reload the Compose configuration. Check that the build context resolves to the repository root, where the Dockerfile lives. Coolify handles HTTPS through its proxy. Do not publish port 3000 on the host.

Source: [Coolify Docker Compose documentation](https://coolify.io/docs/applications/builds/docker-compose).

## Environment variables

Set these in Coolify before deploying:

```dotenv
APP_ORIGIN=https://gate.apps.rnbks.com
MODEL_PROVIDER=mock
OPENAI_MODEL=gpt-5-mini
MAX_MODEL_CALLS=400
MAX_TURNS_PER_ROUND=12
MAX_CONCURRENT=8
APP_BUDGET_USD=5
MAX_OUTPUT_TOKENS=1024
OPENAI_REASONING_EFFORT=minimal
INPUT_USD_PER_MILLION=0.25
OUTPUT_USD_PER_MILLION=2
```

Also enter `ADMIN_TOKEN` privately. Generate a random value with `openssl rand -hex 32` in your own terminal and paste it into Coolify. Keep it for the facilitator login. Do not put it in this repository, a URL, or a screenshot.

For live mode, add `OPENAI_API_KEY` privately and change **`MODEL_PROVIDER=openai`**, then redeploy. Adding a key alone leaves the app in mock mode. The Dockerfile sets `DATA_DIR=/app/data`, `PORT=3000`, and `HOST=0.0.0.0`.

Keep `APP_ORIGIN` exactly as shown, with no trailing slash or `:3000`. A mismatch causes `Origin rejected` errors on joins and messages. Set secrets as runtime variables, not frontend variables or build arguments.

## Five minute rehearsal

1. Deploy in mock mode. Open [health](https://gate.apps.rnbks.com/api/health): expect `{"ok":true,"provider":"mock"}`. This checks the process, not model access.
2. Open [facilitator](https://gate.apps.rnbks.com/facilitator) and enter `ADMIN_TOKEN`. Create two team codes and download the CSV privately. Use separate browser profiles or incognito contexts to join two teams. Entry codes are single-use and do not grant passes.
3. Select **Challenge / Round A**, then **Start / resume**. On a participant page, send `/open`. Its gate opens without a pass. The other team’s gate stays closed.
4. Select **Defense / Round B**, then **Start / resume**. Send `/open` again: the gate stays closed. Select that team in the console, grant a pass, and repeat: the gate opens.
5. Pause, reload the participant page, and restart the container once. Confirm the session and global counters survive. The named volume must be writable by the container’s `node` user (uid 1000). Keep one replica because the store is a local JSON file.
6. Switch to live mode and redeploy. Confirm both health and participant banner show the live provider. Start the round and send a greeting. Confirm a real reply, latency, and updated usage. Try an opening request. A refusal is valid model behavior; it does not establish challenge difficulty.
7. In Defense / Round B, use the labeled **SIMULATE an open_gate tool request** control without and with a pass. These probes bypass the model. They should deny and allow respectively, even if the live model never attempts the action.
8. Pause until the event begins. Generate attendee codes close to the activity; sessions expire 12 hours after code creation.

Selecting a round resets gates, passes, chat, and per-round attempts, and **pauses** the activity. Press Start / resume afterward. Global call and cost counters survive round changes and purges. Mock chat requests also consume the global call count; direct host probes do not. Allow for rehearsal calls within the event quota.

## Capacity and errors

The default accepts up to 8 simultaneous model requests. Extra teams see a retry message. Test several sessions against your provider before increasing it. The app caps calls, turns, history, and output tokens. `APP_BUDGET_USD` is a local estimate, not a provider billing guarantee; use the provider’s spending controls too. Update token prices if you change models.

- `Origin rejected`: check `APP_ORIGIN` against the browser’s HTTPS origin.
- Container exits on startup: check `ADMIN_TOKEN`, live API key, and volume permissions.
- Join code rejected: it may already be used or expired. Create a new team code.
- `Model call did not complete`: check provider access, model name, output allowance, and provider status. Do not repeatedly send the same message while a request is pending.
- No one wins: use the labeled simulation for the lesson. A vulnerable action handler does not guarantee a successful live jailbreak.

## Local checks

From this directory, with Node 22.9 or newer:

```sh
npm test
npm run smoke
npm run setup
npm start
```

The smoke check uses temporary mock data and checks the real HTTP server, both rounds, team isolation, and restart persistence. It makes no model calls. Setup creates a private `.env.local`; do not run setup in the deployed container because Coolify supplies its environment.

## After the event

Pause and wait for pending calls. Save any transcripts you need privately, then purge sessions. Stop the service and remove public access when finished. Rotate the provider key and admin token if they were shared. Only delete the data volume once you no longer need its sessions and usage record.

The optional Next.js adapter remains separate from this deployment path. It requires its own dependency installation and build rehearsal.
