#!/usr/bin/env node

/**
 * Add Show Script
 * Fetches TV show data from TMDB and adds it to streamvault-data.json
 * Prompts for episode Google Drive links
 * 
 * Usage: node scripts/add-show.js
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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

function mapContentRating(ratings) {
  const usRating = ratings?.results?.find(r => r.iso_3166_1 === 'US');
  if (usRating?.rating) {
    return usRating.rating;
  }
  return 'TV-14';
}

function mapCategory(genres) {
  const genreMap = {
    'Action & Adventure': 'action',
    'Action': 'action',
    'Thriller': 'action',
    'Drama': 'drama',
    'Romance': 'drama',
    'Comedy': 'comedy',
    'Horror': 'horror',
    'Mystery': 'horror',
    'Sci-Fi & Fantasy': 'sci-fi',
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
  return 'drama';
}

async function fetchShowData(showId) {
  console.log(`\n📥 Fetching show data from TMDB (ID: ${showId})...`);
  
  const showUrl = `${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}&language=en-US`;
  const creditsUrl = `${TMDB_BASE_URL}/tv/${showId}/credits?api_key=${TMDB_API_KEY}`;
  const ratingsUrl = `${TMDB_BASE_URL}/tv/${showId}/content_ratings?api_key=${TMDB_API_KEY}`;
  
  // Fetch sequentially to avoid connection issues
  console.log('   Fetching show details...');
  const show = await httpsGet(showUrl);
  
  if (show.success === false) {
    throw new Error(`Show not found: ${show.status_message}`);
  }
  
  await delay(500);
  console.log('   Fetching credits...');
  const credits = await httpsGet(creditsUrl);
  
  await delay(500);
  console.log('   Fetching ratings...');
  const ratings = await httpsGet(ratingsUrl);
  
  return { show, credits, ratings };
}

async function fetchSeasonData(showId, seasonNumber) {
  const seasonUrl = `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`;
  return await httpsGet(seasonUrl);
}

async function main() {
  console.log('📺 StreamVault Show Adder');
  console.log('=========================\n');
  
  if (!TMDB_API_KEY) {
    console.log('❌ Error: TMDB_API_KEY not found in .env file');
    console.log('   Make sure your .env file contains: TMDB_API_KEY=your_key_here');
    console.log('   Get your API key from: https://www.themoviedb.org/settings/api\n');
    rl.close();
    return;
  }
  
  try {
    // Get TMDB Show ID
    const showId = await question('Enter TMDB TV Show ID: ');
    
    if (!showId || isNaN(showId)) {
      console.log('❌ Invalid show ID');
      rl.close();
      return;
    }
    
    // Fetch show data
    const { show, credits, ratings } = await fetchShowData(showId);
    
    console.log(`\n✅ Found: ${show.name} (${show.first_air_date?.split('-')[0] || 'N/A'})`);
    console.log(`   Seasons: ${show.number_of_seasons}`);
    console.log(`   Episodes: ${show.number_of_episodes}`);
    console.log(`   Overview: ${show.overview?.substring(0, 100)}...`);
    
    // Ask which seasons to add
    const seasonsInput = await question(`\nWhich seasons to add? (1-${show.number_of_seasons}, comma-separated, or 'all'): `);
    
    let seasonsToAdd = [];
    if (seasonsInput.toLowerCase() === 'all') {
      seasonsToAdd = Array.from({ length: show.number_of_seasons }, (_, i) => i + 1);
    } else {
      seasonsToAdd = seasonsInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0 && n <= show.number_of_seasons);
    }
    
    if (seasonsToAdd.length === 0) {
      console.log('❌ No valid seasons selected');
      rl.close();
      return;
    }
    
    console.log(`\n📋 Will add seasons: ${seasonsToAdd.join(', ')}`);
    
    // Ask for featured/trending
    const featured = (await question('\nFeatured on homepage? (y/n): ')).toLowerCase() === 'y';
    const trending = (await question('Show in trending? (y/n): ')).toLowerCase() === 'y';
    
    // Build cast details - top 10 cast members
    const topCast = credits.cast?.slice(0, 10) || [];
    const castNames = topCast.map(c => c.name).join(', ');
    const castDetails = topCast.map(c => ({
      name: c.name,
      character: c.character,
      profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
    }));
    
    // Get creators
    const creators = show.created_by?.map(c => c.name).join(', ') || '';
    
    // Generate show ID
    const newShowId = generateUUID();
    
    // Build show object
    const newShow = {
      id: newShowId,
      title: show.name,
      slug: generateSlug(show.name),
      description: show.overview || '',
      posterUrl: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : '',
      backdropUrl: show.backdrop_path ? `https://image.tmdb.org/t/p/original${show.backdrop_path}` : '',
      year: parseInt(show.first_air_date?.split('-')[0]) || new Date().getFullYear(),
      rating: mapContentRating(ratings),
      imdbRating: show.vote_average?.toFixed(1) || null,
      genres: show.genres?.map(g => g.name).join(', ') || '',
      language: show.original_language === 'en' ? 'English' : show.spoken_languages?.[0]?.english_name || 'English',
      totalSeasons: show.number_of_seasons,
      cast: castNames,
      creators: creators,
      featured: featured,
      trending: trending,
      category: mapCategory(show.genres),
      castDetails: JSON.stringify(castDetails)
    };
    
    // Collect episodes for each season
    const episodes = [];
    
    for (const seasonNum of seasonsToAdd) {
      console.log(`\n📺 Season ${seasonNum}`);
      console.log('─'.repeat(40));
      
      const seasonData = await fetchSeasonData(showId, seasonNum);
      
      if (!seasonData.episodes || seasonData.episodes.length === 0) {
        console.log(`   No episodes found for season ${seasonNum}`);
        continue;
      }
      
      console.log(`   Found ${seasonData.episodes.length} episodes\n`);
      
      // Ask for episode links
      console.log('   Enter Google Drive URLs for each episode (or press Enter to skip):');
      
      for (const ep of seasonData.episodes) {
        const epNum = ep.episode_number;
        const epTitle = ep.name || `Episode ${epNum}`;
        
        const driveUrl = await question(`   S${seasonNum}E${epNum} - ${epTitle}: `);
        
        if (driveUrl && driveUrl.trim()) {
          episodes.push({
            id: generateUUID(),
            showId: newShowId,
            season: seasonNum,
            episodeNumber: epNum,
            title: epTitle,
            description: ep.overview || '',
            duration: ep.runtime || 45,
            thumbnailUrl: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : '',
            googleDriveUrl: driveUrl.trim(),
            videoUrl: null,
            airDate: ep.air_date || null
          });
        }
      }
    }
    
    if (episodes.length === 0) {
      console.log('\n⚠️  No episodes added. Show will be added without episodes.');
    }
    
    // Load existing data
    console.log('\n📂 Loading existing data...');
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    // Check if show already exists
    const existingShow = data.shows.find(s => s.slug === newShow.slug);
    if (existingShow) {
      console.log(`⚠️  Show "${newShow.title}" already exists!`);
      const overwrite = (await question('Overwrite show and add new episodes? (y/n): ')).toLowerCase() === 'y';
      if (!overwrite) {
        console.log('❌ Cancelled');
        rl.close();
        return;
      }
      // Remove existing show
      data.shows = data.shows.filter(s => s.slug !== newShow.slug);
      // Keep existing episodes for other seasons, remove episodes for seasons we're adding
      data.episodes = data.episodes.filter(e => {
        if (e.showId !== existingShow.id) return true;
        return !seasonsToAdd.includes(e.season);
      });
    }
    
    // Add show and episodes
    data.shows.push(newShow);
    data.episodes.push(...episodes);
    
    // Generate blog post
    const blogPost = {
      id: `blog-${newShow.slug}-${Date.now()}`,
      title: `${newShow.title} (${newShow.year}) - Complete Guide, Cast & Reviews`,
      slug: `${newShow.slug}-${newShow.year}-complete-guide`,
      contentType: 'show',
      contentId: newShow.id,
      featuredImage: newShow.backdropUrl || newShow.posterUrl,
      excerpt: `${newShow.title} (${newShow.year}) is a ${newShow.genres?.split(',')[0]?.trim() || 'captivating'} TV series that has captured audiences worldwide. This comprehensive guide covers everything you need to know - from plot details to behind-the-scenes insights.`,
      content: `${newShow.title} stands as one of the most captivating series of ${newShow.year}. Spanning ${newShow.totalSeasons} season${newShow.totalSeasons > 1 ? 's' : ''}, this ${newShow.genres?.split(',')[0]?.trim()?.toLowerCase() || ''} series delivers an unforgettable viewing experience.\n\n${newShow.description}\n\nThe show features an impressive ensemble cast including ${newShow.cast || 'talented performers'}, each bringing depth and authenticity to their roles.${newShow.creators ? ` Created by ${newShow.creators}, the production achieves a perfect balance of storytelling and visual spectacle.` : ''}`,
      plotSummary: `${newShow.title} takes viewers on an extraordinary journey through its compelling narrative.\n\n${newShow.description}\n\nThe story unfolds with masterful pacing, keeping audiences engaged from the first episode to the season finale.`,
      review: `${newShow.title} (${newShow.year}) delivers exactly what fans of ${newShow.genres || 'quality entertainment'} are looking for.${newShow.creators ? ` Creator ${newShow.creators.split(',')[0]?.trim()} demonstrates` : ' The creative team demonstrates'} a clear vision that translates beautifully to the screen.\n\nThe performances are uniformly excellent. ${newShow.cast ? newShow.cast.split(',').slice(0, 2).join(' and ') : 'The lead actors'} deliver standout performances that anchor the series emotionally.\n\n${newShow.imdbRating ? `With an IMDb rating of ${newShow.imdbRating}/10, audience reception has been overwhelmingly positive.` : 'Audience reception has been positive across the board.'}\n\n**Our Rating: ${newShow.imdbRating ? (parseFloat(newShow.imdbRating) >= 8 ? '5/5 - Masterpiece' : parseFloat(newShow.imdbRating) >= 7 ? '4/5 - Highly Recommended' : '3.5/5 - Worth Watching') : '4/5 - Recommended'}**`,
      boxOffice: null,
      trivia: `• ${newShow.title} was released in ${newShow.year} and quickly became a fan favorite in the ${newShow.genres?.split(',')[0]?.trim() || 'entertainment'} genre.\n• The series features ${newShow.cast ? newShow.cast.split(',').length : 'numerous'} talented cast members bringing the story to life.\n• ${newShow.creators ? `${newShow.creators.split(',')[0]?.trim()} brought their unique vision to this project.` : 'The creative team worked tirelessly to bring this vision to life.'}\n• The show has been praised for its compelling storytelling.`,
      behindTheScenes: `The making of ${newShow.title} involved months of preparation and dedication from the entire cast and crew.\n\n${newShow.creators ? `${newShow.creators.split(',')[0]?.trim()} approached this project with a clear artistic vision, working closely with the cast to achieve authentic performances.` : 'The creative team approached this project with dedication and passion.'}\n\n${newShow.cast ? `Lead actors ${newShow.cast.split(',').slice(0, 2).join(' and ')} underwent extensive preparation for their roles.` : 'The cast underwent extensive preparation for their roles.'}`,
      awards: `${newShow.title} has received recognition for its quality and impact:\n\n• ${newShow.imdbRating && parseFloat(newShow.imdbRating) >= 7.5 ? 'Critically acclaimed with high audience ratings' : 'Positive reception from audiences'}\n• Praised for quality production\n• ${newShow.cast ? `${newShow.cast.split(',')[0]?.trim()} received particular praise for their performance` : 'The ensemble cast received praise for their performances'}`,
      author: 'StreamVault Editorial',
      published: true,
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!data.blogPosts) data.blogPosts = [];
    // Remove existing blog post for this show if any
    data.blogPosts = data.blogPosts.filter(b => b.contentId !== newShow.id && !b.slug.includes(newShow.slug));
    data.blogPosts.push(blogPost);
    
    // Save data
    console.log('\n💾 Saving data...');
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    
    console.log('\n✅ Show added successfully!');
    console.log(`   Title: ${newShow.title}`);
    console.log(`   Slug: ${newShow.slug}`);
    console.log(`   Year: ${newShow.year}`);
    console.log(`   Seasons: ${newShow.totalSeasons}`);
    console.log(`   Genres: ${newShow.genres}`);
    console.log(`   Category: ${newShow.category}`);
    console.log(`   Episodes added: ${episodes.length}`);
    console.log(`   Blog post: Created`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  
  rl.close();
}

main();
