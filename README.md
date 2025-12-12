# Path of Exile 2 Campaign Walkthrough (Acts 1–3)

This repository hosts a single static `index.html` file that contains the interactive campaign guide. No build tools or package installation is required: you can open the file directly in a browser or publish it with GitHub Pages.

## Quick start

1. **Clone or download** this repository.
2. Open `index.html` in your browser. All features (checklists, filters, import/export, sharing, etc.) run client-side with local storage.

## Publishing on GitHub Pages

1. Commit `index.html` (and this README) to your GitHub repository's **default branch** (often `main`).
2. In your repository settings, enable **GitHub Pages** for the default branch (root directory).
3. Visit the published URL (usually `https://<your-username>.github.io/<repo-name>/`).
4. When you push updates to `index.html`, Pages will automatically serve the latest version.

## Updating the guide

- Edit `index.html` directly to adjust content or styling.
- Commit and push your changes; GitHub Pages will redeploy automatically.
- If you receive a new `index.html` patch, replace the existing file and commit the change.

## Local development tips

- Use a local web server (e.g., `python -m http.server 8000`) if you want clean URLs or to test shareable links.
- Progress, notes, and profiles are stored in your browser's **local storage**; clearing site data resets them.
- To sanity-check the page after pulling changes, start a local server, open `http://localhost:8000`, and confirm you can toggle build filters, switch profiles, and import/export progress without console errors.

## Troubleshooting

- If checkboxes or notes do not persist, confirm your browser allows local storage for the page.
- For sharing read-only progress links, ensure you are serving the file over HTTP(s) rather than `file://` so the URL parameters work correctly.

