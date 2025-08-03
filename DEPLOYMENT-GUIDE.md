# 🔧 Deployment Guide

## 🚀 Deploy API Backend

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd server
vercel --prod
```

### Option 2: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway up
```

### Option 3: Heroku
```bash
# Install Heroku CLI
# Deploy
heroku create guardz-mcp-api
git push heroku main
```

## 🌐 Deploy Web Interface

The web interface is already deployed on GitHub Pages:
- **URL**: https://thiennp.github.io/guardz-mcp.html
- **Status**: Live and functional

## 📊 Monitor Deployment

### Health Check
```bash
curl https://your-api-url.vercel.app/api/health
```

### Test API
```bash
curl -X POST https://your-api-url.vercel.app/api/guardz/generate-type-guards \
  -H "Content-Type: application/json" \
  -d '{"files":["interface User { name: string; age: number; }"]}'
```

## 🔧 Configuration

### Environment Variables
- `NODE_ENV`: production
- `PORT`: 3000 (or platform default)

### Dependencies
- Node.js 18+
- Express.js
- CORS
- Multer
- Guardz packages

## 📈 Monitoring

### Logs
- Vercel: Dashboard logs
- Railway: CLI logs
- Heroku: heroku logs --tail

### Metrics
- Response times
- Error rates
- Usage patterns
- API calls per day