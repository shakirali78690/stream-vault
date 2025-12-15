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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchMovieData(movieId) {
  console.log(`\n📥 Fetching movie data from TMDB (ID: ${movieId})...`);
  
  // Fetch basic movie data
  console.log('   Fetching movie details...');
  const movie = await httpsGet(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`);
  
  if (movie.success === false) {
    throw new Error(`Movie not found: ${movie.status_message}`);
  }
  
  await delay(300);
  console.log('   Fetching credits...');
  const credits = await httpsGet(`${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`);
  
  await delay(300);
  console.log('   Fetching release dates...');
  const releaseDates = await httpsGet(`${TMDB_BASE_URL}/movie/${movieId}/release_dates?api_key=${TMDB_API_KEY}`);
  
  await delay(300);
  console.log('   Fetching reviews...');
  const reviews = await httpsGet(`${TMDB_BASE_URL}/movie/${movieId}/reviews?api_key=${TMDB_API_KEY}&language=en-US`);
  
  await delay(300);
  console.log('   Fetching keywords...');
  const keywords = await httpsGet(`${TMDB_BASE_URL}/movie/${movieId}/keywords?api_key=${TMDB_API_KEY}`);
  
  await delay(300);
  console.log('   Fetching external IDs...');
  const externalIds = await httpsGet(`${TMDB_BASE_URL}/movie/${movieId}/external_ids?api_key=${TMDB_API_KEY}`);
  
  await delay(300);
  console.log('   Fetching videos (trailers)...');
  const videos = await httpsGet(`${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`);
  
  return { movie, credits, releaseDates, reviews, keywords, externalIds, videos };
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
    const { movie, credits, releaseDates, reviews, keywords, externalIds, videos } = await fetchMovieData(movieId);
    
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
    
    // Generate detailed blog post with REAL data from TMDB
    const genre1 = newMovie.genres?.split(',')[0]?.trim() || 'Drama';
    const genre2 = newMovie.genres?.split(',')[1]?.trim() || '';
    const castList = newMovie.cast?.split(',').map(c => c.trim()) || [];
    const lead1 = castList[0] || 'the lead actor';
    const lead2 = castList[1] || 'the supporting cast';
    const director = newMovie.directors?.split(',')[0]?.trim() || 'the director';
    const hours = Math.floor(newMovie.duration / 60);
    const mins = newMovie.duration % 60;
    const runtimeText = hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes` : `${newMovie.duration} minutes`;
    
    // Get real data from TMDB
    const budgetFormatted = movie.budget ? `$${(movie.budget / 1000000).toFixed(0)} Million` : 'Not disclosed';
    const revenueFormatted = movie.revenue ? `$${(movie.revenue / 1000000).toFixed(0)} Million` : 'Not available';
    const productionCompanies = movie.production_companies?.map(c => c.name).slice(0, 3).join(', ') || 'Various studios';
    const productionCountries = movie.production_countries?.map(c => c.name).join(', ') || 'USA';
    const tagline = movie.tagline || '';
    const voteCount = movie.vote_count || 0;
    const popularity = movie.popularity?.toFixed(0) || 0;
    
    // Get real reviews from TMDB - show FULL content, no truncation
    const realReviews = reviews?.results?.slice(0, 3) || [];
    const reviewExcerpts = realReviews.map(r => {
      const content = r.content.replace(/\r\n/g, '\n').trim();
      return `**${r.author}** writes:\n\n"${content}"`;
    }).join('\n\n---\n\n');
    
    // Get keywords
    const keywordList = keywords?.keywords?.slice(0, 10).map(k => k.name) || [];
    
    // Get trailer
    const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
    
    // Get writers and other crew
    const writers = credits.crew?.filter(c => c.job === 'Writer' || c.job === 'Screenplay').slice(0, 3).map(w => w.name).join(', ') || '';
    const cinematographer = credits.crew?.find(c => c.job === 'Director of Photography')?.name || '';
    const composer = credits.crew?.find(c => c.job === 'Original Music Composer' || c.job === 'Music')?.name || '';
    const editor = credits.crew?.find(c => c.job === 'Editor')?.name || '';
    
    // Build real box office data
    const boxOfficeData = {
      budget: budgetFormatted,
      revenue: revenueFormatted,
      production_companies: productionCompanies,
      production_countries: productionCountries
    };
    
    const blogPost = {
      id: `blog-${newMovie.slug}-${Date.now()}`,
      title: newMovie.title,
      slug: newMovie.slug,
      contentType: 'movie',
      contentId: newMovie.id,
      featuredImage: newMovie.backdropUrl || newMovie.posterUrl,
      excerpt: `${newMovie.title} is a gripping ${genre1.toLowerCase()}${genre2 ? ` ${genre2.toLowerCase()}` : ''} directed by ${director}, featuring ${lead1} in a stellar role. ${tagline ? `"${tagline}" - ` : ''}This comprehensive guide covers everything you need to know about the film - from its intricate plot to behind-the-scenes secrets.`,
      content: `${newMovie.title} marks an impressive ${genre1.toLowerCase()} experience, delivering one of the most ambitious films of ${newMovie.year}. ${tagline ? `With the tagline "${tagline}", the film sets its tone from the very beginning.\n\n` : ''}${newMovie.description}\n\nThe movie runs for ${runtimeText}, a runtime that allows the story to breathe and develop its complex web of characters and motivations. ${newMovie.language !== 'English' ? `Shot primarily in ${newMovie.language}, ${newMovie.title} represents a bold creative choice that adds authenticity to its setting.` : ''}\n\nProduced by ${productionCompanies} in ${productionCountries}, the film had ${movie.budget ? `a budget of ${budgetFormatted}` : 'a substantial production budget'}${movie.revenue ? ` and has grossed ${revenueFormatted} worldwide` : ''}.\n\nWith an ensemble cast featuring ${castList.slice(0, 5).join(', ')}${castList.length > 5 ? ` and more` : ''} - the film delivers powerhouse performances across the board. Each actor brings gravitas to their role, creating a tapestry of compelling characters.\n\nThe film has been praised for its technical excellence, particularly its cinematography${cinematographer ? ` by ${cinematographer}` : ''} and direction by ${director}.${composer ? ` The score by ${composer} elevates every scene.` : ''}`,
      plotSummary: `${newMovie.description}\n\nThe story begins with a compelling premise that draws viewers into its world immediately. As the narrative unfolds, we follow the characters through a series of events that test their limits and reveal their true nature.\n\n${lead1}'s character serves as the emotional anchor of the story, navigating challenges that feel both personal and universal. The supporting characters, including those played by ${lead2}${castList[2] ? ` and ${castList[2]}` : ''}, add layers of complexity to the narrative.\n\nThe film masterfully builds tension throughout its ${runtimeText} runtime, with each scene contributing to the overall arc. The stakes escalate naturally, keeping audiences invested until the very end.\n\n${keywordList.length > 0 ? `Key themes explored include: ${keywordList.slice(0, 5).join(', ')}.` : ''}\n\nThemes of ${genre1.includes('Action') ? 'courage, sacrifice, and redemption' : genre1.includes('Drama') ? 'human connection, loss, and hope' : genre1.includes('Comedy') ? 'love, friendship, and self-discovery' : genre1.includes('Thriller') ? 'trust, deception, and survival' : genre1.includes('Horror') ? 'fear, survival, and the unknown' : 'life, relationships, and personal growth'} resonate throughout, making this more than just entertainment - it's a reflection on the human condition.`,
      review: `${newMovie.title} is a masterclass in ${genre1.toLowerCase()} filmmaking. ${director} proves their command over the genre with confident direction and a clear artistic vision. The film's ${runtimeText} runtime is well-utilized, with tight pacing and constantly engaging storytelling.\n\n${lead1} delivers what might be their most nuanced performance to date. The transformation and emotional range displayed is portrayed with remarkable subtlety.\n\nThe supporting cast is equally impressive. ${lead2}'s performance is a highlight, bringing genuine depth to every scene. ${castList[2] ? `${castList[2]} provides excellent support, ` : ''}creating a fully realized world.\n\nTechnically, the film is impressive. ${cinematographer ? `The cinematography by ${cinematographer} captures both intimate moments and grand spectacles with equal skill.` : 'The cinematography captures both intimate moments and grand spectacles with equal skill.'} ${composer ? `The score by ${composer} complements the visuals perfectly, enhancing the emotional impact of key scenes.` : 'The score complements the visuals perfectly.'}\n\n${realReviews.length > 0 ? `**What Critics Are Saying:**\n\n${reviewExcerpts}\n\n` : ''}With an IMDb/TMDB rating of ${newMovie.imdbRating}/10 based on ${voteCount.toLocaleString()} votes, audience reception has been ${parseFloat(newMovie.imdbRating) >= 7 ? 'overwhelmingly positive' : 'generally favorable'}.\n\nRating: ${newMovie.imdbRating ? (parseFloat(newMovie.imdbRating) >= 8 ? '4.5/5 - A must-watch masterpiece' : parseFloat(newMovie.imdbRating) >= 7 ? '4/5 - Highly recommended' : '3.5/5 - Worth watching') : '4/5 - Recommended'}`,
      boxOffice: JSON.stringify(boxOfficeData),
      trivia: JSON.stringify([
        `${newMovie.title} was released on ${movie.release_date} and has a popularity score of ${popularity} on TMDB.`,
        `The film was produced by ${productionCompanies}.`,
        movie.budget ? `The production budget was ${budgetFormatted}.` : `The production budget was not publicly disclosed.`,
        movie.revenue ? `The film grossed ${revenueFormatted} at the worldwide box office.` : `Box office figures are not yet available.`,
        `${lead1} leads an ensemble cast of ${castList.length} credited actors.`,
        writers ? `The screenplay was written by ${writers}.` : `${director} also contributed to the screenplay.`,
        cinematographer ? `Cinematography was handled by ${cinematographer}.` : `The film features stunning cinematography.`,
        composer ? `The musical score was composed by ${composer}.` : `The film features an evocative musical score.`,
        `The film has received ${voteCount.toLocaleString()} ratings on TMDB with an average score of ${newMovie.imdbRating}/10.`,
        trailerUrl ? `Watch the official trailer: ${trailerUrl}` : `The film's trailer showcases its impressive visuals and performances.`
      ]),
      behindTheScenes: `The making of ${newMovie.title} was an ambitious undertaking by ${productionCompanies}. ${director} assembled a talented team to bring this vision to life.\n\n${writers ? `The screenplay was crafted by ${writers}, who worked to create a compelling narrative.` : 'The screenplay went through careful development to achieve its final form.'}\n\nPre-production involved extensive research and planning to ensure authenticity. The production team worked meticulously on every detail, from set design to costume choices.\n\n${lead1}'s preparation was notable on set. Their commitment to the role elevated the entire production, with co-stars reporting that this dedication inspired everyone's performance.\n\n${cinematographer ? `Director of Photography ${cinematographer} worked closely with ${director} to create the film's distinctive visual style.` : 'The cinematography team worked to create a distinctive visual style.'}\n\n${composer ? `Composer ${composer} created the film's memorable score, which enhances the emotional impact of key scenes.` : 'The musical score was carefully crafted to enhance the emotional journey.'}\n\n${editor ? `Editor ${editor} shaped the final cut, ensuring tight pacing throughout the ${runtimeText} runtime.` : 'The editing process shaped the final cut with careful attention to pacing.'}\n\nThe film was shot in ${productionCountries}, with ${movie.budget ? `a budget of ${budgetFormatted}` : 'substantial resources'} dedicated to bringing the story to life.`,
      awards: `${newMovie.title} has received recognition for its quality:\n\n• TMDB Rating: ${newMovie.imdbRating}/10 (${voteCount.toLocaleString()} votes)\n• Popularity Score: ${popularity}\n${parseFloat(newMovie.imdbRating) >= 7.5 ? '• Critically acclaimed with high audience ratings\n' : '• Positive reception from audiences\n'}• ${lead1} received praise for their performance\n• ${director} recognized for strong direction\n${cinematographer ? `• ${cinematographer} praised for cinematography\n` : ''}${composer ? `• ${composer} recognized for the musical score\n` : ''}• Produced by ${productionCompanies}`,
      keywords: JSON.stringify(keywordList),
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
