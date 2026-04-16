# 🔧 Deployment Guide

This site is deployed on **GitHub Pages only** (no Vercel or other external hosting).

## 🌐 Deploy to GitHub Pages

1. Push to the `master` branch:
   ```bash
   git add .
   git commit -m "Update site"
   git push origin master
   ```

2. In **Settings → Pages**, use **Deploy from a branch** with branch **master** and folder **/(root)**.

3. Site URL: **https://thiennp.github.io**
   - Guardz MCP: https://thiennp.github.io/guardz-mcp.html

## 🖥️ Local development

To run the API server locally:

```bash
cd server
npm install
npm start
```

Then open http://localhost:3000/guardz-mcp.html.

## 📊 Configuration

- Node.js 18+ for local server
- Express.js, CORS, Multer, Guardz packages (see `server/package.json`)
