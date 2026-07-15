# Deploy Runbook (Render)

This app is: a **Next.js frontend** (public) + a **FastAPI `crewai-service`** (private)
+ **Postgres** + **Redis**. The `render.yaml` blueprint wires all four together.

---

## 0. Git history hygiene (optional — no longer a blocker)

An old E2B API key and a SQLite DB (`db/custom.db`) were committed and still
exist in the GitHub history (`codewithswamitech/askmeanything`, commit `4a20db9`
and earlier). E2B has been **removed from the project entirely** and the key was
**rotated**, so the historical copy is a dead credential — not a security risk.

Purging history is now purely optional cleanup (e.g. to drop the old
`db/custom.db` research data from the public repo). It is **destructive**: it
rewrites every commit SHA and requires a force-push, so coordinate with anyone
else on the repo and back up first.

```bash
# backup
git clone --mirror https://github.com/codewithswamitech/askmeanything.git ../askmeanything-backup.git

# from a FRESH clone of the repo:
pip install git-filter-repo
git filter-repo --path db/custom.db --invert-paths

# re-add origin (filter-repo drops it) and force-push
git remote add origin https://github.com/codewithswamitech/askmeanything.git
git push --force --all
git push --force --tags
```

---

## 1. Create the services

Push `render.yaml`, `Dockerfile.web`, and `Dockerfile.crewai`, then in Render:
**New → Blueprint → pick this repo.** It creates the DB, Redis, backend, and
frontend.

## 2. Set the secret env vars (dashboard → each service → Environment)

`SECRET_KEY` is auto-generated. `DATABASE_URL` / `REDIS_URL` / `CREWAI_SERVICE_URL`
are wired automatically. You must set the `sync: false` ones:

**crewai-service:**
| Var | Value |
|---|---|
| `AUTH_EMAIL` | login email, e.g. `admin@askmeanything.ai` |
| `AUTH_PASSWORD` | a strong password (login is refused until this is set) |
| `CORS_ORIGINS` | the frontend's public URL, e.g. `https://frontend-xxxx.onrender.com` |
| `AZURE_OPENAI_ENDPOINT` | your Azure endpoint |
| `AZURE_OPENAI_API_KEY` | your Azure key |
| `AZURE_OPENAI_DEPLOYMENT` | e.g. `gpt-4o-mini` |
| `TAVILY_API_KEY` | your Tavily key |

> Not using Azure? Remove the `AZURE_OPENAI_*` vars and set `LLM_BASE_URL` /
> `LLM_API_KEY` / `LLM_MODEL` to your OpenAI-compatible endpoint instead. In that
> case you also need to deploy `azure-proxy.ts` as its own service (with
> `PROXY_SHARED_SECRET` set) — the direct-Azure path avoids it.

## 3. Deploy order

DB + Redis provision first (automatic), then `crewai-service`, then `frontend`.
Tables are created on backend startup; the auth user is created on first login.

## 4. Verify

- `https://<frontend>/login` loads.
- Log in with `AUTH_EMAIL` / `AUTH_PASSWORD` → lands on the dashboard.
- An unauthenticated `GET https://<frontend>/api/agent/history` returns **401**.

---

## Notes / known limitations

- **Free tier:** private services (`pserv`) need a paid instance. To stay on
  free, change `crewai-service` to `type: web` and set the frontend's
  `CREWAI_SERVICE_URL` to the backend's public `https://…onrender.com` URL. The
  backend is auth-gated either way.
- **Auth token** is stored in `localStorage` (XSS-exfiltratable). Acceptable for
  launch; httpOnly cookies are the future hardening.
- **Rate limiting** is in-memory (per instance) — it won't share limits across
  multiple instances.
- Add an **HSTS** header once you confirm HTTPS is working end-to-end.
- Single shared admin account — there is no multi-user isolation by design.
