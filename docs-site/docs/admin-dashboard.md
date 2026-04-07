---
id: admin-dashboard
title: Admin Dashboard
sidebar_label: Admin Dashboard
---

# Admin Dashboard

The admin dashboard at `/admin` lets you manage the **wine answers collection** — the curated reference data that powers the combobox inputs in the tasting creation form.

## Access

Navigate to `http://localhost:4321/admin` (local dev or Docker) or your deployed URL + `/admin`.

## Authentication

The dashboard is protected by a shared secret (`ADMIN_SECRET`). Enter the secret to log in. The secret is stored in `sessionStorage` and cleared when the tab closes.

- **Local dev / Docker**: `dev-secret-123` (set in `wine-answers-worker/.dev.vars` and `docker-compose.yml`)
- **Production**: set via the `ADMIN_SECRET` environment variable on the Wine Answers Worker

If the secret is invalid or expires, write operations return `401` and the dashboard redirects back to the login screen.

## Managing answers

### Viewing categories

After login you see five category tabs in a sidebar: **Color**, **Region**, **Grape Variety**, **Vintage Year**, **Wine Name**. Click a tab to see all answers in that category, along with a count badge.

### Adding an answer

Type a new value in the input field at the bottom of the category panel and click **Add**. The value is appended to the category and the list refreshes automatically. Duplicates are rejected by the worker.

### Deleting an answer

Hover over any answer to reveal the delete button (🗑️). Click it to remove the value from the category. The list refreshes automatically after deletion.

## How it works

The admin dashboard is a React island (`AdminApp`) hydrated on a static Astro page. It communicates directly with the **Wine Answers Worker** via REST API:

| Method | Endpoint | Auth required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/answers` | No | Fetch all categories and their values |
| `POST` | `/answers/:category` | Yes | Add a value to a category |
| `DELETE` | `/answers/:category/:value` | Yes | Remove a value from a category |

Write operations require the `Authorization: Bearer <secret>` header. Read operations are public.

For the architectural decision behind using Cloudflare KV for this data, see the [ADR: Wine Answers Storage](./adr-wine-answers-storage.md).
