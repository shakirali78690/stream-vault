#!/usr/bin/env node

/**
 * Add Movie Script
 * Fetches movie data from TMDB and adds it to streamvault-data.json
 * 
 * Usage: node scripts/add-movie.js
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function mapCertification(certifications) {
  const usRating = certifications?.results?.find(r => r.iso_3166_1 === 'US');
  if (usRating?.release_dates?.length) {
    const cert = usRating.release_dates.find(rd => rd.certification)?.certification;
    if (cert) return cert;
  }
  return 'NR';
}

function mapCategory(genres) {
  const genreMap = {
    'Action': 'action',
    'Thriller': 'action',
    'Drama': 'drama',
    'Romance': 'drama',
    'Comedy': 'comedy',
    'Horror': 'horror',
    'Mystery': 'horror',
    'Science Fiction': 'sci-fi',
    'Fantasy': 'sci-fi',
    'Crime': 'crime',
    'Adventure': 'adventure',
    'Animation': 'animation',
    'Documentary': 'documentary'
  };
  
  for (const genre of genres || []) {
    if (genreMap[genre.name]) {
      return genreMap[genre.name];
    }
  }
  return 'action';
}

async function fetchMovieData(movieId) {
  console.log(`\n📥 Fetching movie data from TMDB (ID: ${movieId})...`);
  
  const movieUrl = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`;
  const creditsUrl = `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;
  const releaseDatesUrl = `${TMDB_BASE_URL}/movie/${movieId}/release_dates?api_key=${TMDB_API_KEY}`;
  
  const [movie, credits, releaseDates] = await Promise.all([
    httpsGet(movieUrl),
    httpsGet(creditsUrl),
    httpsGet(releaseDatesUrl)
  ]);
  
  if (movie.success === false) {
    throw new Error(`Movie not found: ${movie.status_message}`);
  }
  
  return { movie, credits, releaseDates };
}

async function main() {
  console.log('🎬 StreamVault Movie Adder');
  console.log('==========================\n');
  
  if (!TMDB_API_KEY) {
    console.log('❌ Error: TMDB_API_KEY not found in .env file');
    console.log('   Make sure your .env file contains: TMDB_API_KEY=your_key_here');
    console.log('   Get your API key from: https://www.themoviedb.org/settings/api\n');
    rl.close();
    return;
  }
  
  try {
    // Get TMDB Movie ID
    const movieId = await question('Enter TMDB Movie ID: ');
    
    if (!movieId || isNaN(movieId)) {
      console.log('❌ Invalid movie ID');
      rl.close();
      return;
    }
    
    // Fetch movie data
    const { movie, credits, releaseDates } = await fetchMovieData(movieId);
    
    console.log(`\n✅ Found: ${movie.title} (${movie.release_date?.split('-')[0] || 'N/A'})`);
    console.log(`   Overview: ${movie.overview?.substring(0, 100)}...`);
    
    // Get Google Drive URL
    const googleDriveUrl = await question('\nEnter Google Drive URL (embed/preview format): ');
    
    if (!googleDriveUrl) {
      console.log('❌ Google Drive URL is required');
      rl.close();
      return;
    }
    
    // Ask for featured/trending
    const featured = (await question('Featured on homepage? (y/n): ')).toLowerCase() === 'y';
    const trending = (await question('Show in trending? (y/n): ')).toLowerCase() === 'y';
    
    // Build cast details
    const topCast = credits.cast?.slice(0, 10) || [];
    const castNames = topCast.map(c => c.name).join(', ');
    const castDetails = topCast.map(c => ({
      name: c.name,
      character: c.character,
      profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
    }));
    
    // Get directors
    const directors = credits.crew?.filter(c => c.job === 'Director').map(d => d.name).join(', ') || '';
    
    // Build movie object
    const newMovie = {
      id: generateUUID(),
      title: movie.title,
      slug: generateSlug(movie.title),
      description: movie.overview || '',
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : '',
      backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : '',
      year: parseInt(movie.release_date?.split('-')[0]) || new Date().getFullYear(),
      rating: mapCertification(releaseDates),
      imdbRating: movie.vote_average?.toFixed(1) || null,
      genres: movie.genres?.map(g => g.name).join(', ') || '',
      language: movie.original_language === 'en' ? 'English' : movie.spoken_languages?.[0]?.english_name || 'English',
      duration: movie.runtime || 0,
      cast: castNames,
      directors: directors,
      googleDriveUrl: googleDriveUrl,
      featured: featured,
      trending: trending,
      category: mapCategory(movie.genres),
      castDetails: JSON.stringify(castDetails)
    };
    
    // Load existing data
    console.log('\n📂 Loading existing data...');
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    // Check if movie already exists
    const exists = data.movies.some(m => m.slug === newMovie.slug);
    if (exists) {
      console.log(`⚠️  Movie "${newMovie.title}" already exists!`);
      const overwrite = (await question('Overwrite? (y/n): ')).toLowerCase() === 'y';
      if (!overwrite) {
        console.log('❌ Cancelled');
        rl.close();
        return;
      }
      data.movies = data.movies.filter(m => m.slug !== newMovie.slug);
    }
    
    // Add movie
    data.movies.push(newMovie);
    
    // Save data
    console.log('\n💾 Saving data...');
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    
    console.log('\n✅ Movie added successfully!');
    console.log(`   Title: ${newMovie.title}`);
    console.log(`   Slug: ${newMovie.slug}`);
    console.log(`   Year: ${newMovie.year}`);
    console.log(`   Genres: ${newMovie.genres}`);
    console.log(`   Duration: ${newMovie.duration} min`);
    console.log(`   Category: ${newMovie.category}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  
  rl.close();
}

main();
