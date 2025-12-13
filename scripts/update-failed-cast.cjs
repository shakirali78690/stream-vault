#!/usr/bin/env node

/**
 * Update Failed Cast Data Script
 * Only updates shows/movies that have missing or incomplete cast data
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

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
          console.log(`   ⚠️ Retrying (${attempt + 1}/${retries})...`);
          setTimeout(() => makeRequest(attempt + 1), 1000 * attempt);
        } else {
          reject(err);
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        if (attempt < retries) {
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

function needsCastUpdate(item) {
  // Check if castDetails is missing, empty, or has less than 5 members
  if (!item.castDetails) return true;
  
  try {
    const details = JSON.parse(item.castDetails);
    if (!Array.isArray(details) || details.length < 5) return true;
  } catch {
    return true;
  }
  
  return false;
}

async function main() {
  console.log('🎬 StreamVault Failed Cast Data Updater');
  console.log('========================================\n');
  
  if (!TMDB_API_KEY) {
    console.log('❌ Error: TMDB_API_KEY not found');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  // Find items needing updates
  const showsToUpdate = data.shows.filter(needsCastUpdate);
  const moviesToUpdate = data.movies.filter(needsCastUpdate);
  
  console.log(`📊 Found items needing cast updates:`);
  console.log(`   - Shows: ${showsToUpdate.length}/${data.shows.length}`);
  console.log(`   - Movies: ${moviesToUpdate.length}/${data.movies.length}`);
  
  if (showsToUpdate.length === 0 && moviesToUpdate.length === 0) {
    console.log('\n✅ All items have complete cast data!');
    return;
  }
  
  let updatedShows = 0;
  let updatedMovies = 0;
  
  // Update shows
  if (showsToUpdate.length > 0) {
    console.log(`\n📺 Updating ${showsToUpdate.length} shows...\n`);
    
    for (let i = 0; i < showsToUpdate.length; i++) {
      const show = showsToUpdate[i];
      const idx = data.shows.findIndex(s => s.id === show.id);
      
      console.log(`[${i + 1}/${showsToUpdate.length}] ${show.title} (${show.year})`);
      
      try {
        const tmdbShow = await searchTMDB(show.title, 'tv', show.year);
        
        if (!tmdbShow) {
          console.log(`   ⚠️ Not found on TMDB`);
          await delay(300);
          continue;
        }
        
        await delay(300);
        const credits = await getCredits(tmdbShow.id, 'tv');
        
        if (credits.cast && credits.cast.length > 0) {
          const castNames = credits.cast.map(c => c.name).join(', ');
          const castDetails = credits.cast.map(c => ({
            name: c.name,
            character: c.character,
            profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
          }));
          
          data.shows[idx].cast = castNames;
          data.shows[idx].castDetails = JSON.stringify(castDetails);
          
          console.log(`   ✅ Updated with ${credits.cast.length} cast members`);
          updatedShows++;
        }
        
        await delay(500);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        await delay(500);
      }
    }
  }
  
  // Update movies
  if (moviesToUpdate.length > 0) {
    console.log(`\n🎬 Updating ${moviesToUpdate.length} movies...\n`);
    
    for (let i = 0; i < moviesToUpdate.length; i++) {
      const movie = moviesToUpdate[i];
      const idx = data.movies.findIndex(m => m.id === movie.id);
      
      console.log(`[${i + 1}/${moviesToUpdate.length}] ${movie.title} (${movie.year})`);
      
      try {
        const tmdbMovie = await searchTMDB(movie.title, 'movie', movie.year);
        
        if (!tmdbMovie) {
          console.log(`   ⚠️ Not found on TMDB`);
          await delay(300);
          continue;
        }
        
        await delay(300);
        const credits = await getCredits(tmdbMovie.id, 'movie');
        
        if (credits.cast && credits.cast.length > 0) {
          const castNames = credits.cast.map(c => c.name).join(', ');
          const castDetails = credits.cast.map(c => ({
            name: c.name,
            character: c.character,
            profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
          }));
          
          data.movies[idx].cast = castNames;
          data.movies[idx].castDetails = JSON.stringify(castDetails);
          
          console.log(`   ✅ Updated with ${credits.cast.length} cast members`);
          updatedMovies++;
        }
        
        await delay(500);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        await delay(500);
      }
    }
  }
  
  // Save
  console.log('\n💾 Saving data...');
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Shows updated: ${updatedShows}/${showsToUpdate.length}`);
  console.log(`   ✅ Movies updated: ${updatedMovies}/${moviesToUpdate.length}`);
  console.log('\n✅ Done!');
}

main().catch(console.error);
