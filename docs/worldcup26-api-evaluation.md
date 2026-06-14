# worldcup26.ir API Integration Evaluation

## Decision

CupCalendar can use `worldcup26.ir` as the zero-cost primary feed for 2026 World Cup match snapshots, group standings, teams, and stadiums. The project is a good fit for this static-site architecture because it does not require a browser-side API key and can be polled by a local script or GitHub Actions before rebuilding the site.

## Verified Endpoints

- `GET https://worldcup26.ir/get/games`
- `GET https://worldcup26.ir/get/groups`
- `GET https://worldcup26.ir/get/teams`
- `GET https://worldcup26.ir/get/stadiums`

The upstream repository documents the expected data set as 12 groups, 48 teams, 16 stadiums, and 104 matches. It also describes live data including scores, goal scorers, match status, elapsed time, and automatically updated group standings.

## Implementation In This Repo

- `scripts/sync-worldcup26.mjs` fetches the four endpoints and writes `data/api-snapshot.json`.
- By default, it is read-only with respect to the rendered site data.
- Set `APPLY_WORLDCUP26=1` to recalculate static group standings from the upstream game feed and update `data/site.json`.
- `WORLDCUP26_API_BASE` can point to a self-hosted fork, for example a Railway, Render, or Fly.io deployment.

Example:

```bash
node scripts/sync-worldcup26.mjs
APPLY_WORLDCUP26=1 node scripts/sync-worldcup26.mjs
WORLDCUP26_API_BASE=https://your-fork.example.com APPLY_WORLDCUP26=1 node scripts/sync-worldcup26.mjs
```

## Recommended Automation

1. Run `node scripts/sync-worldcup26.mjs` every 30 minutes during the tournament.
2. Review the generated `data/api-snapshot.json` shape after upstream changes.
3. Enable `APPLY_WORLDCUP26=1` once the mapping is stable.
4. Run `npm run build`.
5. Commit and deploy the generated static pages.

## Risk Notes

- Treat `worldcup26.ir` as a community source, not as a legal substitute for FIFA official data.
- Keep FIFA.com as the editorial verification source for venues, dates, and kickoff corrections.
- If production traffic depends on live scores, self-host the open-source API to reduce outage risk.
- Never call paid APIs from the browser. If a paid fallback is added later, store keys in GitHub Secrets or local environment variables.
