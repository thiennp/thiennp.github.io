# 🚀 Deployment Guide

This site is deployed on **GitHub Pages only** (no Vercel or other external hosting).

## 📋 Prerequisites

- Git installed
- GitHub account

## 🌐 GitHub Pages Deployment

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Update site"
   git push origin master
   ```

2. **Enable GitHub Pages** (if not already):
   - Go to **Settings** → **Pages**
   - Under "Build and deployment", choose **Deploy from a branch**
   - Branch: **master** (or **main**), folder: **/(root)**
   - Save

3. **Access your site**:
   - **https://thiennp.github.io**
   - Guardz MCP: https://thiennp.github.io/guardz-mcp.html

Updates usually appear within a few minutes after pushing to the selected branch.

## 🖥️ Local development (optional)

To run the API server locally for development:

```bash
cd server
npm install
npm start
```

Then open http://localhost:3000/guardz-mcp.html. The web client uses the same origin on GitHub Pages and localhost when running the server locally.
