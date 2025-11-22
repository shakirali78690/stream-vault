# Push data to GitHub

Write-Host "Adding data file to Git..." -ForegroundColor Cyan

# Navigate to project directory
cd C:\Users\yawar\Desktop\StreamVault

# Add the data file specifically
git add data/streamvault-data.json

# Add the updated .gitignore
git add .gitignore

# Commit
git commit -m "Add show and episode data for deployment"

# Push to GitHub
git push origin main

Write-Host "`nData pushed to GitHub successfully!" -ForegroundColor Green
Write-Host "Now Render will deploy with all your shows and episodes!" -ForegroundColor Cyan
