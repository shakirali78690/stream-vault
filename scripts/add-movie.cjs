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
    
    // Build cast details - top 10 cast members
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
    
    // Generate blog post
    const blogPost = {
      id: `blog-${newMovie.slug}-${Date.now()}`,
      title: `${newMovie.title} (${newMovie.year}) - Complete Guide, Cast & Reviews`,
      slug: `${newMovie.slug}-${newMovie.year}-complete-guide`,
      contentType: 'movie',
      contentId: newMovie.id,
      featuredImage: newMovie.backdropUrl || newMovie.posterUrl,
      excerpt: `${newMovie.title} (${newMovie.year}) is a ${newMovie.genres?.split(',')[0]?.trim() || 'captivating'} movie that has captured audiences worldwide. This comprehensive guide covers everything you need to know - from plot details to behind-the-scenes insights.`,
      content: `${newMovie.title} stands as one of the most captivating films of ${newMovie.year}. With a runtime of ${newMovie.duration} minutes, this ${newMovie.genres?.split(',')[0]?.trim()?.toLowerCase() || ''} masterpiece delivers an unforgettable viewing experience.\n\n${newMovie.description}\n\nThe film features an impressive ensemble cast including ${newMovie.cast || 'talented performers'}, each bringing depth and authenticity to their roles.${newMovie.directors ? ` Under the direction of ${newMovie.directors}, the production achieves a perfect balance of storytelling and visual spectacle.` : ''}`,
      plotSummary: `${newMovie.title} takes viewers on an extraordinary journey through its compelling narrative.\n\n${newMovie.description}\n\nThe story unfolds with masterful pacing, keeping audiences engaged from the opening scene to the final credits.`,
      review: `${newMovie.title} (${newMovie.year}) delivers exactly what fans of ${newMovie.genres || 'quality entertainment'} are looking for.${newMovie.directors ? ` Director ${newMovie.directors.split(',')[0]?.trim()} demonstrates` : ' The creative team demonstrates'} a clear vision that translates beautifully to the screen.\n\nThe performances are uniformly excellent. ${newMovie.cast ? newMovie.cast.split(',').slice(0, 2).join(' and ') : 'The lead actors'} deliver standout performances that anchor the film emotionally.\n\n${newMovie.imdbRating ? `With an IMDb rating of ${newMovie.imdbRating}/10, audience reception has been overwhelmingly positive.` : 'Audience reception has been positive across the board.'}\n\n**Our Rating: ${newMovie.imdbRating ? (parseFloat(newMovie.imdbRating) >= 8 ? '5/5 - Masterpiece' : parseFloat(newMovie.imdbRating) >= 7 ? '4/5 - Highly Recommended' : '3.5/5 - Worth Watching') : '4/5 - Recommended'}**`,
      boxOffice: null,
      trivia: `• ${newMovie.title} was released in ${newMovie.year} and quickly became a fan favorite in the ${newMovie.genres?.split(',')[0]?.trim() || 'entertainment'} genre.\n• The film features ${newMovie.cast ? newMovie.cast.split(',').length : 'numerous'} talented cast members bringing the story to life.\n• ${newMovie.directors ? `${newMovie.directors.split(',')[0]?.trim()} brought their unique vision to this project.` : 'The creative team worked tirelessly to bring this vision to life.'}\n• The movie has been praised for its compelling storytelling.`,
      behindTheScenes: `The making of ${newMovie.title} involved months of preparation and dedication from the entire cast and crew.\n\n${newMovie.directors ? `${newMovie.directors.split(',')[0]?.trim()} approached this project with a clear artistic vision, working closely with the cast to achieve authentic performances.` : 'The creative team approached this project with dedication and passion.'}\n\n${newMovie.cast ? `Lead actors ${newMovie.cast.split(',').slice(0, 2).join(' and ')} underwent extensive preparation for their roles.` : 'The cast underwent extensive preparation for their roles.'}`,
      awards: `${newMovie.title} has received recognition for its quality and impact:\n\n• ${newMovie.imdbRating && parseFloat(newMovie.imdbRating) >= 7.5 ? 'Critically acclaimed with high audience ratings' : 'Positive reception from audiences'}\n• Praised for quality production\n• ${newMovie.cast ? `${newMovie.cast.split(',')[0]?.trim()} received particular praise for their performance` : 'The ensemble cast received praise for their performances'}`,
      author: 'StreamVault Editorial',
      published: true,
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!data.blogPosts) data.blogPosts = [];
    data.blogPosts.push(blogPost);
    
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
    console.log(`   Blog post: Created`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  
  rl.close();
}

main();
