# Deploy StreamVault to Railway.app

## Why Railway?
- ✅ **No cold starts** - app stays active
- ✅ **$5 free credit/month** (enough for small projects)
- ✅ **Fast deployments** (2-3 minutes)
- ✅ **Persistent storage** - your data stays
- ✅ **Auto-deploy from GitHub**
- ✅ **Super easy setup**

## Quick Deploy (Easiest Method)

### Option 1: One-Click Deploy

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose `yawarquil/streamvault`
6. Click "Deploy Now"
7. Done! ✅

Railway will:
- Auto-detect Node.js
- Install dependencies
- Build your app
- Deploy it
- Give you a URL like `streamvault-production.up.railway.app`

### Option 2: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project (or create new)
railway init

# Deploy
railway up

# Open your app
railway open
```

## Configuration

Railway auto-detects everything, but you can customize:

### Environment Variables
In Railway dashboard → Variables, add:
- `NODE_ENV`: `production`
- `PORT`: Railway sets this automatically

### Custom Domain (Optional)
1. Go to Settings → Domains
2. Click "Generate Domain" for free `.railway.app` domain
3. Or add your custom domain

## Monitoring

- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: See CPU, memory, network usage
- **Deployments**: Track all deployments and rollback if needed

## Pricing

- **Free**: $5 credit/month (renews monthly)
- **Hobby**: $5/month for more resources
- **Pro**: $20/month for production apps

Your StreamVault app should use ~$3-4/month on free tier.

## Troubleshooting

**Build fails:**
- Check build logs in Railway dashboard
- Ensure `package.json` has all dependencies

**App crashes:**
- Check deployment logs
- Verify `npm start` works locally

**Out of credit:**
- Upgrade to Hobby plan ($5/month)
- Or optimize resource usage

## Next Steps

1. Push your code to GitHub (if not already)
2. Deploy to Railway using Option 1 above
3. Get your live URL
4. Login to admin at `/admin/login`
5. Start streaming! 🎬

## Admin Access

- URL: `https://your-app.railway.app/admin/login`
- Username: `admin`
- Password: `streamvault2024`

**Remember to change these credentials in production!**
