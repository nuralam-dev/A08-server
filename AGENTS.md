# Repository Guidelines

## Project Structure & Module Organization

This repository is a small Node.js API using Express and MongoDB. `index.js` is the ES module entry point and contains middleware, database connection logic, route handlers, and server startup. It connects to the `A08` database and its `facilities` collection. `package.json` declares dependencies and scripts; `package-lock.json` records dependency versions. No dedicated test, asset, or build directories currently exist.

The API exposes `GET /`, `GET /facilities`, and `POST /facilities`. `GET /facilities/:id` currently returns a placeholder message rather than a database record. Preserve that distinction when documenting or changing behavior.

## Build, Test, and Development Commands

- `npm ci`: Install dependencies from the committed lockfile.
- `node index.js`: Start the server on port `4000`; requires a working MongoDB connection.
- `node --watch index.js`: Restart the server automatically during development on Node.js versions supporting watch mode.
- `node --check index.js`: Check JavaScript syntax without starting the server.
- `npm test`: Currently runs a placeholder that exits with an error. No automated test suite is configured.

There are no build, lint, or formatting scripts.

## Coding Style & Naming Conventions

Use ES module `import` and `export` syntax. Follow the prevailing style: two-space indentation, double-quoted strings, and semicolons. Use camelCase for variables and functions, and descriptive collection names such as `facilitiesCollection`. Keep route paths consistent with the existing plural `/facilities` convention. No formatter or linter is configured; keep changes focused and avoid unrelated reformatting.

## Testing Guidelines

No testing framework, test naming convention, or coverage threshold is established. For API changes, check syntax and manually exercise affected endpoints against a development database. Verify response bodies, database effects, and invalid-input behavior. Use disposable records when testing writes. If adding automated tests, document their location and configure a working `npm test` script.

## Commit & Pull Request Guidelines

Existing commits use short, informal descriptions such as `facilities api done`; no enforced commit format is evident. Write concise, action-oriented subjects describing the change. Pull requests should describe affected routes, configuration changes, verification performed, and any remaining limitations. Link related issues when available.

## Security & Configuration

Set `MONGODB_URI` in a local `.env` file, loaded through `dotenv/config`. `.env` and `node_modules` are ignored by Git. Never commit database credentials or log connection strings. Use a development database for local verification, and validate request bodies before persisting user input.
