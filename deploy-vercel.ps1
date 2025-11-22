# Deploy to Vercel

Write-Host "Preparing Vercel deployment..." -ForegroundColor Cyan

cd C:\Users\yawar\Desktop\StreamVault

# Add all changes
git add .

# Commit
git commit -m "Add Vercel configuration and data"

# Push to GitHub
git push origin main

Write-Host "`nCode pushed to GitHub!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Install Vercel CLI: npm install -g vercel" -ForegroundColor White
Write-Host "2. Login: vercel login" -ForegroundColor White
Write-Host "3. Deploy: vercel --prod" -ForegroundColor White
Write-Host "`nOr use Vercel dashboard at https://vercel.com" -ForegroundColor Yellow
