# CupCalendar.xyz

Static MVP for CupCalendar.xyz, a 2026 FIFA World Cup information portal focused on schedule discovery, team profiles, venue guides, fan tools, and SEO-friendly `/2026/` content paths.

## SEO Architecture

- Canonical 2026 hub: `/2026/`
- Schedule: `/2026/schedule/`
- Teams: `/2026/teams/`
- Venues: `/2026/venues/`
- Tools: `/2026/tools/`
- Sitemap: `/2026/sitemap.xml`

Every core page title and H1 reinforces `2026 FIFA World Cup` to compensate for the domain not containing the year.

## Local Development

```bash
npm run build
npm run start
```

Then open `http://localhost:4173/2026/`.

## Deployment

The repository includes a GitHub Pages workflow that builds `dist/` and publishes it as a static artifact.
