# Infraestructura

## MVP (Junio – Agosto 2026)

| Servicio | Proveedor | Notas |
|---|---|---|
| Backend API + worker | Railway | 2 servicios (web + worker), región US East |
| Frontend | Vercel | Production + Preview por PR |
| Postgres | Neon | Branching para dev/preview; backup diario |
| Redis | Railway (Redis plugin) o Upstash | TTL para cachés, AOF para colas |
| Storage video | Cloudflare R2 | Bucket `hg-videos` + CDN propio |
| Email | Resend | Dominio `humangrowth.app` verificado (SPF, DKIM, DMARC) |
| DNS | Cloudflare | A/CNAME para api, app, cdn |
| Errores | Sentry | Proyectos separados backend/frontend |
| Analytics | PostHog Cloud | EU region |

## Subcarpetas
- `railway/` — `railway.json` + variables (sin secretos)
- `vercel/` — `vercel.json` + variables
- `neon/` — notas de branches y backups

## Migración Fase B (cuando ARR ≥ $300K)
AWS ECS Fargate + RDS Postgres + ElastiCache + CloudFront. Ver Technical Planning §2.3.
