# 🎬 StreamVault Content Scripts

Scripts for managing content in StreamVault using The Movie Database (TMDB) API.

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `add-movie.js` | Add a new movie from TMDB with Google Drive link |
| `add-show.js` | Add a new TV show from TMDB with episode links |
| `update-shows-from-tmdb.ts` | Update existing shows with TMDB data |

---

## 🎬 Add Movie Script

Add a movie to StreamVault by providing the TMDB movie ID and Google Drive URL.

### Usage

```bash
node scripts/add-movie.js
```

### What It Does

1. Prompts for TMDB Movie ID
2. Fetches all movie data from TMDB (title, description, cast, poster, etc.)
3. Prompts for Google Drive URL
4. Asks if movie should be featured/trending
5. Saves to `data/streamvault-data.json`

### Example

```
🎬 StreamVault Movie Adder
==========================

Enter TMDB Movie ID: 1218925

✅ Found: Chainsaw Man: The Movie - Reze Arc (2025)
   Overview: In a brutal war between devils, hunters...

Enter Google Drive URL (embed/preview format): https://drive.google.com/file/d/xxx/preview
Featured on homepage? (y/n): y
Show in trending? (y/n): y

💾 Saving data...

✅ Movie added successfully!
   Title: Chainsaw Man: The Movie - Reze Arc
   Slug: chainsaw-man-the-movie-reze-arc
   Year: 2025
   Genres: Animation, Action, Horror
   Duration: 120 min
```

---

## 📺 Add Show Script

Add a TV show to StreamVault with episode links.

### Usage

```bash
node scripts/add-show.js
```

### What It Does

1. Prompts for TMDB TV Show ID
2. Fetches all show data from TMDB
3. Asks which seasons to add
4. Prompts for Google Drive URL for each episode
5. Saves show and episodes to `data/streamvault-data.json`

### Example

```
📺 StreamVault Show Adder
=========================

Enter TMDB TV Show ID: 114410

✅ Found: Chainsaw Man (2022)
   Seasons: 1
   Episodes: 12

Which seasons to add? (1-1, comma-separated, or 'all'): 1

📺 Season 1
────────────────────────────────────
   Found 12 episodes

   Enter Google Drive URLs for each episode:
   S1E1 - Dog & Chainsaw: https://drive.google.com/file/d/xxx/preview
   S1E2 - Arrival in Tokyo: https://drive.google.com/file/d/yyy/preview
   ...

💾 Saving data...

✅ Show added successfully!
   Title: Chainsaw Man
   Episodes added: 12
```

---

## 🔄 TMDB Show Update Script

This script updates show information from The Movie Database (TMDB) API.

## 📋 What It Updates

The script updates **ONLY** these fields for each show:

- ✅ **Title** - Official show name from TMDB
- ✅ **Slug** - Auto-generated URL-friendly slug
- ✅ **Year** - First air date year
- ✅ **Category** - Mapped from genres (Action, Drama, Comedy, etc.)
- ✅ **Description** - Show overview from TMDB
- ✅ **Rating** - TV rating (TV-Y, TV-PG, TV-14, TV-MA, etc.)
- ✅ **IMDb Rating** - Vote average from TMDB
- ✅ **Total Seasons** - Number of seasons
- ✅ **Genres** - Comma-separated genre list
- ✅ **Language** - Original language
- ✅ **Cast** - Top 5 cast members

## ❌ What It Doesn't Touch

The script **DOES NOT** modify:

- ❌ Episodes (all episodes remain unchanged)
- ❌ Poster URL
- ❌ Backdrop URL
- ❌ Featured status
- ❌ Trending status
- ❌ Creators
- ❌ Any other fields

---

## 🚀 Setup

### 1. Get TMDB API Key

1. Go to: https://www.themoviedb.org/signup
2. Create a free account
3. Go to: https://www.themoviedb.org/settings/api
4. Request an API key (choose "Developer" option)
5. Copy your API key

### 2. Set Environment Variable

**Windows (PowerShell):**
```powershell
$env:TMDB_API_KEY="your_api_key_here"
```

**Windows (Command Prompt):**
```cmd
set TMDB_API_KEY=your_api_key_here
```

**Linux/Mac:**
```bash
export TMDB_API_KEY="your_api_key_here"
```

**Or create a `.env` file:**
```
TMDB_API_KEY=your_api_key_here
```

---

## 📖 Usage

### Update All Shows

```bash
npm run update-shows
```

This will:
1. Fetch all shows from your database
2. Search for each show on TMDB
3. Update show information
4. Display progress and results

### Example Output

```
🚀 Starting TMDB show update...

📊 Found 200 shows in database

🔍 Processing: Money Heist
✅ Updated: La casa de papel
   Slug: la-casa-de-papel
   Year: 2017
   Category: action
   Rating: TV-MA
   IMDb: 8.2
   Seasons: 5
   Genres: Crime, Drama
   Language: Spanish
   Cast: Álvaro Morte, Úrsula Corberó, Itziar Ituño, Pedro Alonso, Miguel Herrán

🔍 Processing: Breaking Bad
✅ Updated: Breaking Bad
   Slug: breaking-bad
   Year: 2008
   Category: drama
   Rating: TV-MA
   IMDb: 9.5
   Seasons: 5
   Genres: Drama, Crime
   Language: English
   Cast: Bryan Cranston, Aaron Paul, Anna Gunn, Betsy Brandt, RJ Mitte

✅ Update complete!
   Updated: 198 shows
   Failed: 2 shows
```

---

## 🎯 Features

### Smart Genre Mapping

The script automatically maps TMDB genres to your categories:

| TMDB Genres | Your Category |
|-------------|---------------|
| Action, Adventure | Action |
| Drama | Drama |
| Comedy | Comedy |
| Horror, Thriller | Horror |
| Romance | Romance |
| Sci-Fi, Science Fiction | Sci-Fi |
| Fantasy | Fantasy |
| Documentary | Documentary |
| Animation | Animation |

### Automatic Slug Generation

- Converts title to lowercase
- Replaces spaces with hyphens
- Removes special characters
- Example: "Money Heist" → "money-heist"

### Rating Conversion

Converts TMDB/MPAA ratings to TV ratings:

| TMDB Rating | TV Rating |
|-------------|-----------|
| TV-Y | TV-Y |
| TV-Y7 | TV-Y7 |
| TV-G, G | TV-G |
| TV-PG, PG | TV-PG |
| TV-14, PG-13 | TV-14 |
| TV-MA, R, NC-17 | TV-MA |

### Rate Limiting

- Automatically limits to 4 requests per second
- Prevents TMDB API rate limit errors
- Adds 250ms delay between requests

---

## ⚠️ Important Notes

### 1. Show Matching

The script searches TMDB by show title. If your show title doesn't match TMDB exactly, it might:
- Find the wrong show
- Not find the show at all

**Solution:** Manually update show titles in your database to match TMDB before running the script.

### 2. Episodes Are Safe

**Your episodes are completely safe!** The script only updates show metadata, not episodes.

### 3. Backup Recommended

Before running on production data, consider backing up your database:

```bash
# If using PostgreSQL
pg_dump your_database > backup.sql

# If using SQLite
cp your_database.db your_database.backup.db
```

### 4. API Limits

TMDB free tier limits:
- 40 requests per 10 seconds
- The script respects this with built-in rate limiting

---

## 🔧 Troubleshooting

### "Could not find show on TMDB"

**Cause:** Show title doesn't match TMDB database

**Solution:**
1. Search for the show manually on TMDB: https://www.themoviedb.org/
2. Update the show title in your database to match TMDB exactly
3. Run the script again

### "Failed to fetch TMDB show"

**Cause:** Network error or invalid API key

**Solution:**
1. Check your internet connection
2. Verify your TMDB API key is correct
3. Check TMDB API status: https://status.themoviedb.org/

### "Please set TMDB_API_KEY environment variable"

**Cause:** API key not set

**Solution:**
```bash
# Set the environment variable
export TMDB_API_KEY="your_api_key_here"

# Or add to .env file
echo "TMDB_API_KEY=your_api_key_here" >> .env
```

---

## 📝 Example Use Cases

### 1. Initial Setup

You have 200 shows with basic info, want to enrich with TMDB data:

```bash
npm run update-shows
```

### 2. Update After Adding New Shows

You added 10 new shows manually, want to fetch their TMDB data:

```bash
npm run update-shows
```

### 3. Refresh Existing Data

TMDB data changed (new seasons, updated ratings):

```bash
npm run update-shows
```

---

## 🎨 Customization

### Update Specific Shows Only

Edit `scripts/update-shows-from-tmdb.ts`:

```typescript
// Only update shows from a specific category
const allShows = await db.select()
  .from(shows)
  .where(eq(shows.category, 'action'));

// Only update shows added after a date
const allShows = await db.select()
  .from(shows)
  .where(gt(shows.createdAt, '2024-01-01'));
```

### Change Rate Limit

```typescript
// Change from 250ms to 500ms (2 requests per second)
await new Promise(resolve => setTimeout(resolve, 500));
```

### Add More Cast Members

```typescript
// Change from top 5 to top 10
cast = tmdbData.aggregate_credits.cast
  .sort((a, b) => b.total_episode_count - a.total_episode_count)
  .slice(0, 10)  // ← Change this number
  .map(c => c.name);
```

---

## 📚 Resources

- **TMDB API Docs:** https://developers.themoviedb.org/3
- **Get API Key:** https://www.themoviedb.org/settings/api
- **TMDB Status:** https://status.themoviedb.org/

---

## ✅ Summary

**Safe to run:** ✅ Won't delete episodes or other data  
**Requires:** TMDB API key (free)  
**Updates:** Show metadata only  
**Rate limited:** Yes (4 requests/second)  
**Backup recommended:** Yes (before first run)

**Happy updating! 🎉**
