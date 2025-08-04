# 🚀 Deployment Guide

This guide explains how to deploy the Guardz MCP API and web interface.

## 📋 Prerequisites

- Node.js 18+ installed
- Git installed
- Vercel account (for API deployment)
- GitHub account (for static hosting)

## 🌐 Frontend Deployment (GitHub Pages)

The web interface is automatically deployed to GitHub Pages when you push to the main branch.

### Steps:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add Guardz MCP web interface"
   git push origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages"
   - Select "Deploy from a branch"
   - Choose "main" branch
   - Save

3. **Access your site**:
   - Your site will be available at: `https://thiennp.github.io`
   - The Guardz MCP interface will be at: `https://thiennp.github.io/guardz-mcp.html`

## 🔧 Backend API Deployment (Vercel)

### Option 1: Deploy to Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Navigate to server directory**:
   ```bash
   cd thiennp.github.io/server
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new
   - Set project name (e.g., `guardz-mcp-api`)
   - Confirm deployment

5. **Update API URL**:
   - Update the `baseUrl` in `api/guardz-mcp.js` with your Vercel URL
   - Commit and push the changes

### Option 2: Deploy to Railway

1. **Create Railway account** at [railway.app](https://railway.app)

2. **Connect GitHub repository**:
   - Import your GitHub repository
   - Select the `server` directory

3. **Configure environment**:
   - Set `NODE_ENV=production`
   - Railway will automatically detect Node.js

4. **Deploy**:
   - Railway will automatically deploy on push to main

### Option 3: Deploy to Heroku

1. **Create Heroku account** at [heroku.com](https://heroku.com)

2. **Install Heroku CLI**:
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Windows
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

3. **Login to Heroku**:
   ```bash
   heroku login
   ```

4. **Create app**:
   ```bash
   cd thiennp.github.io/server
   heroku create guardz-mcp-api
   ```

5. **Deploy**:
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

## 🔄 Continuous Deployment

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd server
          npm install
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./server
```

## 🔧 Environment Variables

### Required for Production:

```bash
NODE_ENV=production
PORT=3000
```

### Optional:

```bash
CORS_ORIGIN=https://thiennp.github.io
MAX_FILE_SIZE=50mb
```

## 📊 Monitoring

### Health Check Endpoint

Your API will have a health check at:
```
GET https://your-api-domain.vercel.app/api/health
```

### Logs

- **Vercel**: View logs in the Vercel dashboard
- **Railway**: View logs in the Railway dashboard
- **Heroku**: `heroku logs --tail`

## 🔒 Security Considerations

1. **CORS**: Configure CORS to only allow your domain
2. **Rate Limiting**: Consider adding rate limiting for production
3. **File Size Limits**: Set appropriate file upload limits
4. **Input Validation**: Validate all user inputs
5. **Error Handling**: Don't expose sensitive information in errors

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Ensure CORS is properly configured
   - Check that your domain is in the allowed origins

2. **File Upload Issues**:
   - Check file size limits
   - Verify file types are allowed

3. **API Timeout**:
   - Increase timeout limits for large files
   - Consider chunked uploads for very large files

4. **Memory Issues**:
   - Monitor memory usage
   - Implement proper cleanup of temporary files

## 📞 Support

If you encounter issues:

1. Check the logs in your deployment platform
2. Verify environment variables are set correctly
3. Test locally first: `npm run dev`
4. Open an issue on GitHub with detailed error information

## 🎉 Success!

Once deployed, your Guardz MCP will be available at:
- **Web Interface**: `https://thiennp.github.io/guardz-mcp.html`
- **API**: `https://your-api-domain.vercel.app/api/guardz/*`

Users can now generate TypeScript type guards directly from their browser! 