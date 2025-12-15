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
  
  // Fetch sequentially to avoid connection issues
  console.log('   Fetching show details...');
  const show = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}&language=en-US`);
  
  if (show.success === false) {
    throw new Error(`Show not found: ${show.status_message}`);
  }
  
  await delay(300);
  console.log('   Fetching credits...');
  const credits = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/credits?api_key=${TMDB_API_KEY}`);
  
  await delay(300);
  console.log('   Fetching ratings...');
  const ratings = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/content_ratings?api_key=${TMDB_API_KEY}`);
  
  await delay(300);
  console.log('   Fetching reviews...');
  const reviews = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/reviews?api_key=${TMDB_API_KEY}&language=en-US`);
  
  await delay(300);
  console.log('   Fetching keywords...');
  const keywords = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/keywords?api_key=${TMDB_API_KEY}`);
  
  await delay(300);
  console.log('   Fetching external IDs...');
  const externalIds = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/external_ids?api_key=${TMDB_API_KEY}`);
  
  await delay(300);
  console.log('   Fetching videos (trailers)...');
  const videos = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/videos?api_key=${TMDB_API_KEY}&language=en-US`);
  
  return { show, credits, ratings, reviews, keywords, externalIds, videos };
}

async function fetchSeasonData(showId, seasonNumber) {
  const seasonUrl = `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`;
  return await httpsGet(seasonUrl);
}

async function fetchSeasonVideos(showId, seasonNumber) {
  const videosUrl = `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
  return await httpsGet(videosUrl);
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
    const { show, credits, ratings, reviews, keywords, externalIds, videos } = await fetchShowData(showId);
    
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
    
    // Collect episodes and season details for each season
    const episodes = [];
    const seasonDetailsList = [];
    
    for (const seasonNum of seasonsToAdd) {
      console.log(`\n📺 Season ${seasonNum}`);
      console.log('─'.repeat(40));
      
      const seasonData = await fetchSeasonData(showId, seasonNum);
      
      // Fetch season-specific videos/trailers
      let seasonVideos = { results: [] };
      try {
        await delay(200);
        seasonVideos = await fetchSeasonVideos(showId, seasonNum);
      } catch (err) {
        // Ignore errors fetching season videos
      }
      
      const seasonTrailer = seasonVideos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      
      // Add season details
      seasonDetailsList.push({
        seasonNumber: seasonNum,
        name: seasonData.name || `Season ${seasonNum}`,
        overview: seasonData.overview || '',
        airDate: seasonData.air_date || null,
        episodeCount: seasonData.episodes?.length || 0,
        posterPath: seasonData.poster_path ? `https://image.tmdb.org/t/p/w300${seasonData.poster_path}` : null,
        trailerKey: seasonTrailer?.key || null,
        trailerName: seasonTrailer?.name || null
      });
      
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
    
    // Generate detailed blog post with REAL data from TMDB
    const genre1 = newShow.genres?.split(',')[0]?.trim() || 'Drama';
    const genre2 = newShow.genres?.split(',')[1]?.trim() || '';
    const castList = newShow.cast?.split(',').map(c => c.trim()) || [];
    const lead1 = castList[0] || 'the lead actor';
    const lead2 = castList[1] || 'the supporting cast';
    const creator = newShow.creators?.split(',')[0]?.trim() || 'the showrunner';
    const seasonText = newShow.totalSeasons > 1 ? `${newShow.totalSeasons} seasons` : '1 season';
    
    // Get real data from TMDB
    const productionCompanies = show.production_companies?.map(c => c.name).slice(0, 3).join(', ') || 'Various studios';
    const productionCountries = show.production_countries?.map(c => c.name).join(', ') || show.origin_country?.join(', ') || 'USA';
    const networks = show.networks?.map(n => n.name).join(', ') || 'Streaming';
    const tagline = show.tagline || '';
    const voteCount = show.vote_count || 0;
    const popularity = show.popularity?.toFixed(0) || 0;
    const totalEpisodes = show.number_of_episodes || 0;
    const status = show.status || 'Ongoing';
    const firstAirDate = show.first_air_date || '';
    const lastAirDate = show.last_air_date || '';
    
    // Get real reviews from TMDB - show FULL content, no truncation
    const realReviews = reviews?.results?.slice(0, 3) || [];
    const reviewExcerpts = realReviews.map(r => {
      const content = r.content.replace(/\r\n/g, '\n').trim();
      return `**${r.author}** writes:\n\n"${content}"`;
    }).join('\n\n---\n\n');
    
    // Get keywords
    const keywordList = keywords?.results?.slice(0, 10).map(k => k.name) || [];
    
    // Get trailer
    const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
    
    // Get executive producers and other crew
    const execProducers = credits.crew?.filter(c => c.job === 'Executive Producer').slice(0, 3).map(w => w.name).join(', ') || '';
    const composers = credits.crew?.filter(c => c.job === 'Original Music Composer' || c.job === 'Music' || c.job === 'Composer').slice(0, 2).map(c => c.name).join(', ') || '';
    
    const blogPost = {
      id: `blog-${newShow.slug}-${Date.now()}`,
      title: newShow.title,
      slug: newShow.slug,
      contentType: 'show',
      contentId: newShow.id,
      featuredImage: newShow.backdropUrl || newShow.posterUrl,
      excerpt: `${newShow.title} is a gripping ${genre1.toLowerCase()}${genre2 ? ` ${genre2.toLowerCase()}` : ''} series created by ${creator}, featuring ${lead1} in a stellar role. ${tagline ? `"${tagline}" - ` : ''}This comprehensive guide covers everything you need to know about the show - from its intricate plot to behind-the-scenes secrets.`,
      content: `${newShow.title} marks an impressive ${genre1.toLowerCase()} experience, delivering one of the most ambitious series of ${newShow.year}. ${tagline ? `With the tagline "${tagline}", the series sets its tone from the very beginning.\n\n` : ''}${newShow.description}\n\nSpanning ${seasonText} with ${totalEpisodes} episodes, the show allows its story to breathe and develop complex character arcs and intricate plotlines. ${newShow.language !== 'English' ? `Produced primarily in ${newShow.language}, ${newShow.title} represents a bold creative choice that adds authenticity to its setting.` : ''}\n\nProduced by ${productionCompanies} and airing on ${networks}, the series originated from ${productionCountries}. The show first aired on ${firstAirDate}${status === 'Ended' ? ` and concluded on ${lastAirDate}` : ` and is currently ${status.toLowerCase()}`}.\n\nWith an ensemble cast featuring ${castList.slice(0, 5).join(', ')}${castList.length > 5 ? ` and more` : ''} - the series delivers powerhouse performances across the board. Each actor brings gravitas to their role, creating a tapestry of compelling characters that viewers become invested in.\n\nThe show has been praised for its technical excellence, particularly its production design, cinematography, and the vision of ${creator}.${composers ? ` The score by ${composers} elevates every scene.` : ''}`,
      plotSummary: `${newShow.description}\n\nThe story begins with a compelling premise that draws viewers into its world immediately. As the narrative unfolds across ${seasonText} and ${totalEpisodes} episodes, we follow the characters through a series of events that test their limits and reveal their true nature.\n\n${lead1}'s character serves as the emotional anchor of the story, navigating challenges that feel both personal and universal. The supporting characters, including those played by ${lead2}${castList[2] ? ` and ${castList[2]}` : ''}, add layers of complexity to the narrative.\n\nThe series masterfully builds tension throughout each episode, with storylines that interweave and pay off in satisfying ways. The stakes escalate naturally across seasons, keeping audiences invested in the long-term journey.\n\n${keywordList.length > 0 ? `Key themes explored include: ${keywordList.slice(0, 5).join(', ')}.` : ''}\n\nThemes of ${genre1.includes('Action') ? 'courage, sacrifice, and redemption' : genre1.includes('Drama') ? 'human connection, loss, and hope' : genre1.includes('Comedy') ? 'love, friendship, and self-discovery' : genre1.includes('Thriller') ? 'trust, deception, and survival' : genre1.includes('Horror') ? 'fear, survival, and the unknown' : 'life, relationships, and personal growth'} resonate throughout, making this more than just entertainment - it's a reflection on the human condition.`,
      review: `${newShow.title} is a masterclass in ${genre1.toLowerCase()} television. ${creator} proves their command over the medium with confident storytelling and a clear artistic vision. The series format is well-utilized, with tight pacing and constantly engaging narratives across ${seasonText}.\n\n${lead1} delivers what might be their most nuanced performance to date. The character development across the series is portrayed with remarkable subtlety.\n\nThe supporting cast is equally impressive. ${lead2}'s performance is a highlight, bringing genuine depth to every scene. ${castList[2] ? `${castList[2]} provides excellent support, ` : ''}creating a fully realized world.\n\nTechnically, the production is impressive. The cinematography captures both intimate moments and grand spectacles with equal skill. ${composers ? `The score by ${composers} complements the visuals perfectly, enhancing the emotional impact of key scenes.` : 'The score complements the visuals perfectly.'}\n\n${realReviews.length > 0 ? `**What Critics Are Saying:**\n\n${reviewExcerpts}\n\n` : ''}With a TMDB rating of ${newShow.imdbRating}/10 based on ${voteCount.toLocaleString()} votes, audience reception has been ${parseFloat(newShow.imdbRating) >= 7 ? 'overwhelmingly positive' : 'generally favorable'}.\n\nRating: ${newShow.imdbRating ? (parseFloat(newShow.imdbRating) >= 8 ? '4.5/5 - A must-watch masterpiece' : parseFloat(newShow.imdbRating) >= 7 ? '4/5 - Highly recommended' : '3.5/5 - Worth watching') : '4/5 - Recommended'}`,
      boxOffice: null,
      trivia: JSON.stringify([
        `${newShow.title} first aired on ${firstAirDate} and has a popularity score of ${popularity} on TMDB.`,
        `The series is produced by ${productionCompanies} and airs on ${networks}.`,
        `The show spans ${newShow.totalSeasons} season${newShow.totalSeasons > 1 ? 's' : ''} with a total of ${totalEpisodes} episodes.`,
        `Current status: ${status}${status === 'Ended' ? ` (concluded on ${lastAirDate})` : ''}.`,
        `${lead1} leads an ensemble cast of ${castList.length} credited actors.`,
        creator !== 'the showrunner' ? `Created by ${creator}.` : `The show was developed by a talented creative team.`,
        execProducers ? `Executive produced by ${execProducers}.` : `The show features experienced executive producers.`,
        composers ? `The musical score was composed by ${composers}.` : `The series features an evocative musical score.`,
        `The show has received ${voteCount.toLocaleString()} ratings on TMDB with an average score of ${newShow.imdbRating}/10.`,
        trailerUrl ? `Watch the official trailer: ${trailerUrl}` : `The show's trailer showcases its impressive production values.`
      ]),
      behindTheScenes: `The making of ${newShow.title} was an ambitious undertaking spanning ${seasonText}. ${creator !== 'the showrunner' ? `Created by ${creator}, the` : 'The'} series was produced by ${productionCompanies} for ${networks}.\n\n${execProducers ? `Executive producers ${execProducers} oversaw the production, ensuring quality across all ${totalEpisodes} episodes.` : 'The executive production team ensured quality across all episodes.'}\n\nPre-production involved extensive research and planning to ensure authenticity. The production team worked meticulously on every detail, from set design to costume choices.\n\n${lead1}'s preparation was notable on set. Their commitment to the role elevated the entire production, with co-stars reporting that this dedication inspired everyone's performance.\n\nThe production originated from ${productionCountries}, bringing authentic perspectives to the storytelling. Every department contributed to creating the immersive world audiences see on screen.\n\n${composers ? `Composer ${composers} created the series' memorable score, which enhances the emotional impact of key scenes.` : 'The musical score was carefully crafted to enhance the emotional journey.'}\n\nPost-production for each season involved careful editing, color grading, and sound design to create the polished final product.`,
      awards: `${newShow.title} has received recognition for its quality:\n\n• TMDB Rating: ${newShow.imdbRating}/10 (${voteCount.toLocaleString()} votes)\n• Popularity Score: ${popularity}\n• Status: ${status}\n• Network: ${networks}\n${parseFloat(newShow.imdbRating) >= 7.5 ? '• Critically acclaimed with high audience ratings\n' : '• Positive reception from audiences\n'}• ${lead1} received praise for their performance\n• ${creator !== 'the showrunner' ? `${creator} recognized for creating the series` : 'Creative team recognized for strong showrunning'}\n${composers ? `• ${composers} recognized for the musical score\n` : ''}• Produced by ${productionCompanies}`,
      keywords: JSON.stringify(keywordList),
      seasonDetails: JSON.stringify(seasonDetailsList),
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
