#!/usr/bin/env node

/**
 * Update Cast Data Script
 * Fetches full cast data from TMDB for all existing shows and movies
 * 
 * Usage: node scripts/update-cast-data.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpsGet(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const makeRequest = (attempt) => {
      const req = https.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'StreamVault/1.0',
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', (err) => {
        if (attempt < retries) {
          console.log(`   ⚠️ Connection error, retrying (${attempt + 1}/${retries})...`);
          setTimeout(() => makeRequest(attempt + 1), 1000 * attempt);
        } else {
          reject(err);
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        if (attempt < retries) {
          console.log(`   ⚠️ Timeout, retrying (${attempt + 1}/${retries})...`);
          setTimeout(() => makeRequest(attempt + 1), 1000 * attempt);
        } else {
          reject(new Error('Request timeout'));
        }
      });
    };
    
    makeRequest(1);
  });
}

async function searchTMDB(title, type, year) {
  const searchType = type === 'movie' ? 'movie' : 'tv';
  const url = `${TMDB_BASE_URL}/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
  const result = await httpsGet(url);
  return result.results?.[0] || null;
}

async function getCredits(tmdbId, type) {
  const searchType = type === 'movie' ? 'movie' : 'tv';
  const url = `${TMDB_BASE_URL}/${searchType}/${tmdbId}/credits?api_key=${TMDB_API_KEY}`;
  return await httpsGet(url);
}

async function main() {
  console.log('🎬 StreamVault Cast Data Updater');
  console.log('=================================\n');
  
  if (!TMDB_API_KEY) {
    console.log('❌ Error: TMDB_API_KEY not found in .env file');
    return;
  }
  
  // Load existing data
  console.log('📂 Loading existing data...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  let updatedShows = 0;
  let updatedMovies = 0;
  let failedShows = [];
  let failedMovies = [];
  
  // Update shows
  console.log(`\n📺 Updating ${data.shows.length} shows...\n`);
  
  for (let i = 0; i < data.shows.length; i++) {
    const show = data.shows[i];
    console.log(`[${i + 1}/${data.shows.length}] ${show.title} (${show.year})`);
    
    try {
      // Search for show on TMDB
      const tmdbShow = await searchTMDB(show.title, 'tv', show.year);
      
      if (!tmdbShow) {
        console.log(`   ⚠️ Not found on TMDB, skipping...`);
        failedShows.push(show.title);
        await delay(300);
        continue;
      }
      
      await delay(300);
      
      // Get credits
      const credits = await getCredits(tmdbShow.id, 'tv');
      
      if (credits.cast && credits.cast.length > 0) {
        const allCast = credits.cast;
        const castNames = allCast.map(c => c.name).join(', ');
        const castDetails = allCast.map(c => ({
          name: c.name,
          character: c.character,
          profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
        }));
        
        // Update show
        data.shows[i].cast = castNames;
        data.shows[i].castDetails = JSON.stringify(castDetails);
        
        console.log(`   ✅ Updated with ${allCast.length} cast members`);
        updatedShows++;
      } else {
        console.log(`   ⚠️ No cast data found`);
        failedShows.push(show.title);
      }
      
      await delay(500); // Rate limiting
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failedShows.push(show.title);
      await delay(500);
    }
  }
  
  // Update movies
  console.log(`\n🎬 Updating ${data.movies.length} movies...\n`);
  
  for (let i = 0; i < data.movies.length; i++) {
    const movie = data.movies[i];
    console.log(`[${i + 1}/${data.movies.length}] ${movie.title} (${movie.year})`);
    
    try {
      // Search for movie on TMDB
      const tmdbMovie = await searchTMDB(movie.title, 'movie', movie.year);
      
      if (!tmdbMovie) {
        console.log(`   ⚠️ Not found on TMDB, skipping...`);
        failedMovies.push(movie.title);
        await delay(300);
        continue;
      }
      
      await delay(300);
      
      // Get credits
      const credits = await getCredits(tmdbMovie.id, 'movie');
      
      if (credits.cast && credits.cast.length > 0) {
        const allCast = credits.cast;
        const castNames = allCast.map(c => c.name).join(', ');
        const castDetails = allCast.map(c => ({
          name: c.name,
          character: c.character,
          profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
        }));
        
        // Update movie
        data.movies[i].cast = castNames;
        data.movies[i].castDetails = JSON.stringify(castDetails);
        
        console.log(`   ✅ Updated with ${allCast.length} cast members`);
        updatedMovies++;
      } else {
        console.log(`   ⚠️ No cast data found`);
        failedMovies.push(movie.title);
      }
      
      await delay(500); // Rate limiting
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failedMovies.push(movie.title);
      await delay(500);
    }
  }
  
  // Save updated data
  console.log('\n💾 Saving updated data...');
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   ✅ Shows updated: ${updatedShows}/${data.shows.length}`);
  console.log(`   ✅ Movies updated: ${updatedMovies}/${data.movies.length}`);
  
  if (failedShows.length > 0) {
    console.log(`\n   ⚠️ Failed shows (${failedShows.length}):`);
    failedShows.forEach(s => console.log(`      - ${s}`));
  }
  
  if (failedMovies.length > 0) {
    console.log(`\n   ⚠️ Failed movies (${failedMovies.length}):`);
    failedMovies.forEach(m => console.log(`      - ${m}`));
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);
