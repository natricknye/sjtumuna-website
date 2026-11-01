# SJTUMUNC 2026 Website

Source code for the 2026 Shanghai Jiao Tong University Nanyang Model United Nations conference website.

## What is included

Static front-end source: HTML, CSS and JavaScript
Cloudflare Pages Functions read-only delegate API (`_worker.js`)
CloudBase PostgreSQL schema and function source in `backend/`
Deployment and environment examples with placeholders

## What is deliberately excluded

- The production CloudBase database and every delegate record
- Names, delegate numbers, schools, payment information or any participant data
- Real event PDFs, videos, QR-group images and certificates
- SJTU / association logos and seals
- Maps, photographs, music, fonts and star-map assets
- Internal operations notes and QA logs

The site source references an `assets/` directory, but only a placeholder README is included. Supply your own authorized assets if you want a runnable local preview.

## Stack

`Static HTML/CSS/JS → Cloudflare Pages → Cloudflare Pages Functions → CloudBase PostgreSQL`

The browser never receives a database service key. The production Function reads a secret from Cloudflare and returns only the record matching the name and delegate number supplied at sign-in.

## Local development

```bash
# from the repository root
python -m http.server 8402
# open http://127.0.0.1:8402/mun-site-v78/
```

The page scripts expect event assets under `mun-site-v78/assets/`, which are not part of this repository.

## Configuration

Copy `mun-site-v78/cloudbase-config.example.js` to `mun-site-v78/cloudbase-config.js` and fill in your own public project values. Never place a service/API key in a browser file.

For the Pages Function, configure the following Cloudflare Pages secrets/variables:

```text
CLOUDBASE_API_KEY=...
CLOUDBASE_ENV_ID=...
```

Replace `YOUR_CLOUDBASE_ENV_ID` in `mun-site-v78/_worker.js` with the environment ID you use for deployment, or adapt the Function to read it from `env`.

Database setup is described by `backend/schema.sql`, `backend/schema-seat-details.sql` and `backend/schema-minimal.sql`. Never commit a real roster or `.env` file.

## Privacy

This repository intentionally contains no delegate or participant data. For the live system, the database is kept private and is queried only through a server-side read-only proxy. Do not add real rosters, phone numbers, payment information, internal screenshots or exported PDFs to a public fork.

## License

Code is released under the MIT License. See `LICENSE`.

Content, trademarks, event documents and third-party assets are **not** covered by that license; see `CONTENT-NOTICE.md`.
