# Deploy StreamVault to Vercel

## ⚠️ Important Limitations

**Vercel Serverless Functions have limitations:**
- **10 second timeout** on free tier (hobby plan)
- **50MB deployment size limit**
- **Ephemeral file system** - data resets on every deployment
- **Cold starts** - first request may be slow

**For StreamVault, I recommend Render.com instead**, but if you want to use Vercel, follow these steps:

## Deployment Steps

### 1. Push Latest Changes to GitHub

```bash
cd C:/Users/yawar/Desktop/StreamVault

# Add all files including vercel.json
git add .
git commit -m "Add Vercel configuration"
git push origin main
```

### 2. Deploy to Vercel

**Option A: Using Vercel CLI (Recommended)**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: streamvault
# - Directory: ./
# - Override settings? No

# Deploy to production
vercel --prod
```

**Option B: Using Vercel Dashboard**

1. Go to https://vercel.com
2. Sign up/login with GitHub
3. Click "Add New..." → "Project"
4. Import your `yawarquil/streamvault` repository
5. Configure:
   - **Framework Preset**: Other
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`
6. Click "Deploy"

### 3. Environment Variables (Optional)

In Vercel dashboard → Settings → Environment Variables, add:
- `NODE_ENV`: `production`

### 4. Access Your App

Your app will be available at:
- `https://streamvault.vercel.app`
- Or a custom domain you configure

## ⚠️ Known Issues with Vercel

1. **Data Persistence**: 
   - Your `streamvault-data.json` will reset on every deployment
   - You'll need to use a database (MongoDB, PostgreSQL) for persistent data

2. **File Uploads**:
   - Admin panel file operations may not work due to read-only filesystem

3. **Timeout Issues**:
   - Large imports may timeout (10s limit on free tier)

## Recommended Alternative: Render.com

For a better experience with persistent data and no timeout issues:

1. Go to https://render.com
2. Sign up with GitHub
3. New → Web Service
4. Select `yawarquil/streamvault`
5. Click "Create Web Service"
6. Done! ✅

Render is better suited for full-stack Node.js apps like StreamVault.

## Troubleshooting

**Build fails:**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`

**API routes don't work:**
- Verify `vercel.json` routing configuration
- Check function logs in Vercel dashboard

**Data is lost:**
- This is expected on Vercel's serverless platform
- Consider migrating to a database or using Render.com
