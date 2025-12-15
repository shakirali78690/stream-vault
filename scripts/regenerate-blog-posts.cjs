#!/usr/bin/env node

/**
 * Regenerate Blog Posts Script
 * Updates all existing blog posts with real data from TMDB API
 * 
 * Usage: node scripts/regenerate-blog-posts.cjs
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
        headers: { 'User-Agent': 'StreamVault/1.0', 'Accept': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req.on('error', (err) => {
        if (attempt < retries) {
          setTimeout(() => makeRequest(attempt + 1), 1000 * attempt);
        } else { reject(err); }
      });
      req.on('timeout', () => {
        req.destroy();
        if (attempt < retries) { setTimeout(() => makeRequest(attempt + 1), 1000 * attempt); }
        else { reject(new Error('Timeout')); }
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

async function fetchMovieDetails(tmdbId) {
  const [movie, credits, reviews, keywords, videos] = await Promise.all([
    httpsGet(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`),
    httpsGet(`${TMDB_BASE_URL}/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`),
    httpsGet(`${TMDB_BASE_URL}/movie/${tmdbId}/reviews?api_key=${TMDB_API_KEY}&language=en-US`),
    httpsGet(`${TMDB_BASE_URL}/movie/${tmdbId}/keywords?api_key=${TMDB_API_KEY}`),
    httpsGet(`${TMDB_BASE_URL}/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=en-US`)
  ]);
  return { movie, credits, reviews, keywords, videos };
}

async function fetchShowDetails(tmdbId) {
  const [show, credits, reviews, keywords, videos] = await Promise.all([
    httpsGet(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`),
    httpsGet(`${TMDB_BASE_URL}/tv/${tmdbId}/credits?api_key=${TMDB_API_KEY}`),
    httpsGet(`${TMDB_BASE_URL}/tv/${tmdbId}/reviews?api_key=${TMDB_API_KEY}&language=en-US`),
    httpsGet(`${TMDB_BASE_URL}/tv/${tmdbId}/keywords?api_key=${TMDB_API_KEY}`),
    httpsGet(`${TMDB_BASE_URL}/tv/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=en-US`)
  ]);
  return { show, credits, reviews, keywords, videos };
}

function generateMovieBlogPost(localMovie, tmdbData) {
  const { movie, credits, reviews, keywords, videos } = tmdbData;
  
  const genre1 = localMovie.genres?.split(',')[0]?.trim() || 'Drama';
  const genre2 = localMovie.genres?.split(',')[1]?.trim() || '';
  const castList = localMovie.cast?.split(',').map(c => c.trim()) || [];
  const lead1 = castList[0] || 'the lead actor';
  const lead2 = castList[1] || 'the supporting cast';
  const director = localMovie.directors?.split(',')[0]?.trim() || credits.crew?.find(c => c.job === 'Director')?.name || 'the director';
  const hours = Math.floor((movie.runtime || localMovie.duration || 0) / 60);
  const mins = (movie.runtime || localMovie.duration || 0) % 60;
  const runtimeText = hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes` : `${movie.runtime || localMovie.duration || 0} minutes`;
  
  // Real TMDB data
  const budgetFormatted = movie.budget ? `$${(movie.budget / 1000000).toFixed(0)} Million` : 'Not disclosed';
  const revenueFormatted = movie.revenue ? `$${(movie.revenue / 1000000).toFixed(0)} Million` : 'Not available';
  const productionCompanies = movie.production_companies?.map(c => c.name).slice(0, 3).join(', ') || 'Various studios';
  const productionCountries = movie.production_countries?.map(c => c.name).join(', ') || 'USA';
  const tagline = movie.tagline || '';
  const voteCount = movie.vote_count || 0;
  const popularity = movie.popularity?.toFixed(0) || 0;
  
  const realReviews = reviews?.results?.slice(0, 3) || [];
  // Format reviews properly - show FULL content, no truncation
  const reviewExcerpts = realReviews.map(r => {
    const content = r.content.replace(/\r\n/g, '\n').trim();
    return `**${r.author}** writes:\n\n"${content}"`;
  }).join('\n\n---\n\n');
  
  const keywordList = keywords?.keywords?.slice(0, 10).map(k => k.name) || [];
  
  const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
  
  const writers = credits.crew?.filter(c => c.job === 'Writer' || c.job === 'Screenplay').slice(0, 3).map(w => w.name).join(', ') || '';
  const cinematographer = credits.crew?.find(c => c.job === 'Director of Photography')?.name || '';
  const composer = credits.crew?.find(c => c.job === 'Original Music Composer' || c.job === 'Music')?.name || '';
  
  const boxOfficeData = {
    budget: budgetFormatted,
    revenue: revenueFormatted,
    production_companies: productionCompanies,
    production_countries: productionCountries
  };
  
  return {
    id: `blog-${localMovie.slug}-${Date.now()}`,
    title: localMovie.title,
    slug: localMovie.slug,
    contentType: 'movie',
    contentId: localMovie.id,
    featuredImage: localMovie.backdropUrl || localMovie.posterUrl,
    excerpt: `${localMovie.title} is a gripping ${genre1.toLowerCase()}${genre2 ? ` ${genre2.toLowerCase()}` : ''} directed by ${director}, featuring ${lead1} in a stellar role. ${tagline ? `"${tagline}" - ` : ''}This comprehensive guide covers everything you need to know about the film.`,
    content: `${localMovie.title} marks an impressive ${genre1.toLowerCase()} experience, delivering one of the most ambitious films of ${localMovie.year}. ${tagline ? `With the tagline "${tagline}", the film sets its tone from the very beginning.\n\n` : ''}${movie.overview || localMovie.description}\n\nThe movie runs for ${runtimeText}, a runtime that allows the story to breathe and develop its complex web of characters and motivations.\n\nProduced by ${productionCompanies} in ${productionCountries}, the film had ${movie.budget ? `a budget of ${budgetFormatted}` : 'a substantial production budget'}${movie.revenue ? ` and has grossed ${revenueFormatted} worldwide` : ''}.\n\nWith an ensemble cast featuring ${castList.slice(0, 5).join(', ')}${castList.length > 5 ? ` and more` : ''} - the film delivers powerhouse performances across the board.\n\nThe film has been praised for its technical excellence, particularly its cinematography${cinematographer ? ` by ${cinematographer}` : ''} and direction by ${director}.${composer ? ` The score by ${composer} elevates every scene.` : ''}`,
    plotSummary: `${movie.overview || localMovie.description}\n\nThe story begins with a compelling premise that draws viewers into its world immediately. As the narrative unfolds, we follow the characters through a series of events that test their limits.\n\n${lead1}'s character serves as the emotional anchor of the story. The supporting characters, including those played by ${lead2}${castList[2] ? ` and ${castList[2]}` : ''}, add layers of complexity.\n\nThe film masterfully builds tension throughout its ${runtimeText} runtime.\n\n${keywordList.length > 0 ? `Key themes explored include: ${keywordList.slice(0, 5).join(', ')}.` : ''}`,
    review: `${localMovie.title} is a masterclass in ${genre1.toLowerCase()} filmmaking. ${director} proves their command over the genre with confident direction.\n\n${lead1} delivers a nuanced performance. The supporting cast is equally impressive.\n\nTechnically, the film is impressive. ${cinematographer ? `The cinematography by ${cinematographer} captures both intimate moments and grand spectacles.` : ''} ${composer ? `The score by ${composer} complements the visuals perfectly.` : ''}\n\n${realReviews.length > 0 ? `**What Critics Are Saying:**\n\n${reviewExcerpts}\n\n` : ''}With a TMDB rating of ${movie.vote_average?.toFixed(1) || localMovie.imdbRating}/10 based on ${voteCount.toLocaleString()} votes, audience reception has been ${parseFloat(movie.vote_average || localMovie.imdbRating) >= 7 ? 'overwhelmingly positive' : 'generally favorable'}.\n\nRating: ${movie.vote_average >= 8 ? '4.5/5 - A must-watch masterpiece' : movie.vote_average >= 7 ? '4/5 - Highly recommended' : '3.5/5 - Worth watching'}`,
    boxOffice: JSON.stringify(boxOfficeData),
    trivia: JSON.stringify([
      `${localMovie.title} was released on ${movie.release_date} and has a popularity score of ${popularity} on TMDB.`,
      `The film was produced by ${productionCompanies}.`,
      movie.budget ? `The production budget was ${budgetFormatted}.` : `The production budget was not publicly disclosed.`,
      movie.revenue ? `The film grossed ${revenueFormatted} at the worldwide box office.` : `Box office figures are not yet available.`,
      `${lead1} leads an ensemble cast of ${castList.length} credited actors.`,
      writers ? `The screenplay was written by ${writers}.` : `${director} also contributed to the screenplay.`,
      cinematographer ? `Cinematography was handled by ${cinematographer}.` : `The film features stunning cinematography.`,
      composer ? `The musical score was composed by ${composer}.` : `The film features an evocative musical score.`,
      `The film has received ${voteCount.toLocaleString()} ratings on TMDB with an average score of ${movie.vote_average?.toFixed(1)}/10.`,
      trailerUrl ? `Watch the official trailer: ${trailerUrl}` : `The film's trailer showcases its impressive visuals.`
    ]),
    behindTheScenes: `The making of ${localMovie.title} was an ambitious undertaking by ${productionCompanies}. ${director} assembled a talented team to bring this vision to life.\n\n${writers ? `The screenplay was crafted by ${writers}.` : ''}\n\n${lead1}'s preparation was notable on set. Their commitment elevated the entire production.\n\n${cinematographer ? `Director of Photography ${cinematographer} worked closely with ${director} to create the film's distinctive visual style.` : ''}\n\n${composer ? `Composer ${composer} created the film's memorable score.` : ''}\n\nThe film was shot in ${productionCountries}${movie.budget ? ` with a budget of ${budgetFormatted}` : ''}.`,
    awards: `${localMovie.title} has received recognition:\n\n• TMDB Rating: ${movie.vote_average?.toFixed(1)}/10 (${voteCount.toLocaleString()} votes)\n• Popularity Score: ${popularity}\n${parseFloat(movie.vote_average) >= 7.5 ? '• Critically acclaimed\n' : '• Positive reception\n'}• ${lead1} received praise for their performance\n• ${director} recognized for strong direction\n${cinematographer ? `• ${cinematographer} praised for cinematography\n` : ''}• Produced by ${productionCompanies}`,
    keywords: JSON.stringify(keywordList),
    author: 'StreamVault Editorial',
    published: true,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function generateShowBlogPost(localShow, tmdbData) {
  const { show, credits, reviews, keywords, videos } = tmdbData;
  
  const genre1 = localShow.genres?.split(',')[0]?.trim() || 'Drama';
  const genre2 = localShow.genres?.split(',')[1]?.trim() || '';
  const castList = localShow.cast?.split(',').map(c => c.trim()) || [];
  const lead1 = castList[0] || 'the lead actor';
  const lead2 = castList[1] || 'the supporting cast';
  const creator = localShow.creators?.split(',')[0]?.trim() || show.created_by?.[0]?.name || 'the showrunner';
  const seasonText = (show.number_of_seasons || localShow.totalSeasons) > 1 ? `${show.number_of_seasons || localShow.totalSeasons} seasons` : '1 season';
  
  // Real TMDB data
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
  
  const realReviews = reviews?.results?.slice(0, 3) || [];
  // Format reviews properly - show FULL content, no truncation
  const reviewExcerpts = realReviews.map(r => {
    const content = r.content.replace(/\r\n/g, '\n').trim();
    return `**${r.author}** writes:\n\n"${content}"`;
  }).join('\n\n---\n\n');
  
  const keywordList = keywords?.results?.slice(0, 10).map(k => k.name) || [];
  
  const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
  
  const execProducers = credits.crew?.filter(c => c.job === 'Executive Producer').slice(0, 3).map(w => w.name).join(', ') || '';
  const composers = credits.crew?.filter(c => c.job === 'Original Music Composer' || c.job === 'Music' || c.job === 'Composer').slice(0, 2).map(c => c.name).join(', ') || '';
  
  return {
    id: `blog-${localShow.slug}-${Date.now()}`,
    title: localShow.title,
    slug: localShow.slug,
    contentType: 'show',
    contentId: localShow.id,
    featuredImage: localShow.backdropUrl || localShow.posterUrl,
    excerpt: `${localShow.title} is a gripping ${genre1.toLowerCase()}${genre2 ? ` ${genre2.toLowerCase()}` : ''} series created by ${creator}, featuring ${lead1} in a stellar role. ${tagline ? `"${tagline}" - ` : ''}This comprehensive guide covers everything you need to know.`,
    content: `${localShow.title} marks an impressive ${genre1.toLowerCase()} experience, delivering one of the most ambitious series of ${localShow.year}. ${tagline ? `With the tagline "${tagline}", the series sets its tone from the very beginning.\n\n` : ''}${show.overview || localShow.description}\n\nSpanning ${seasonText} with ${totalEpisodes} episodes, the show allows its story to breathe and develop complex character arcs.\n\nProduced by ${productionCompanies} and airing on ${networks}, the series originated from ${productionCountries}. The show first aired on ${firstAirDate}${status === 'Ended' ? ` and concluded on ${lastAirDate}` : ` and is currently ${status.toLowerCase()}`}.\n\nWith an ensemble cast featuring ${castList.slice(0, 5).join(', ')}${castList.length > 5 ? ` and more` : ''} - the series delivers powerhouse performances.${composers ? ` The score by ${composers} elevates every scene.` : ''}`,
    plotSummary: `${show.overview || localShow.description}\n\nThe story begins with a compelling premise that draws viewers in immediately. As the narrative unfolds across ${seasonText} and ${totalEpisodes} episodes, we follow the characters through events that test their limits.\n\n${lead1}'s character serves as the emotional anchor. The supporting characters, including those played by ${lead2}${castList[2] ? ` and ${castList[2]}` : ''}, add layers of complexity.\n\n${keywordList.length > 0 ? `Key themes explored include: ${keywordList.slice(0, 5).join(', ')}.` : ''}`,
    review: `${localShow.title} is a masterclass in ${genre1.toLowerCase()} television. ${creator} proves their command over the medium with confident storytelling.\n\n${lead1} delivers a nuanced performance. The character development across the series is portrayed with remarkable subtlety.\n\nThe supporting cast is equally impressive. ${lead2}'s performance is a highlight.\n\nTechnically, the production is impressive. ${composers ? `The score by ${composers} complements the visuals perfectly.` : ''}\n\n${realReviews.length > 0 ? `**What Critics Are Saying:**\n\n${reviewExcerpts}\n\n` : ''}With a TMDB rating of ${show.vote_average?.toFixed(1) || localShow.imdbRating}/10 based on ${voteCount.toLocaleString()} votes, audience reception has been ${parseFloat(show.vote_average || localShow.imdbRating) >= 7 ? 'overwhelmingly positive' : 'generally favorable'}.\n\nRating: ${show.vote_average >= 8 ? '4.5/5 - A must-watch masterpiece' : show.vote_average >= 7 ? '4/5 - Highly recommended' : '3.5/5 - Worth watching'}`,
    boxOffice: null,
    trivia: JSON.stringify([
      `${localShow.title} first aired on ${firstAirDate} and has a popularity score of ${popularity} on TMDB.`,
      `The series is produced by ${productionCompanies} and airs on ${networks}.`,
      `The show spans ${show.number_of_seasons || localShow.totalSeasons} season${(show.number_of_seasons || localShow.totalSeasons) > 1 ? 's' : ''} with a total of ${totalEpisodes} episodes.`,
      `Current status: ${status}${status === 'Ended' ? ` (concluded on ${lastAirDate})` : ''}.`,
      `${lead1} leads an ensemble cast of ${castList.length} credited actors.`,
      creator !== 'the showrunner' ? `Created by ${creator}.` : `The show was developed by a talented creative team.`,
      execProducers ? `Executive produced by ${execProducers}.` : `The show features experienced executive producers.`,
      composers ? `The musical score was composed by ${composers}.` : `The series features an evocative musical score.`,
      `The show has received ${voteCount.toLocaleString()} ratings on TMDB with an average score of ${show.vote_average?.toFixed(1)}/10.`,
      trailerUrl ? `Watch the official trailer: ${trailerUrl}` : `The show's trailer showcases its impressive production values.`
    ]),
    behindTheScenes: `The making of ${localShow.title} was an ambitious undertaking spanning ${seasonText}. ${creator !== 'the showrunner' ? `Created by ${creator}, the` : 'The'} series was produced by ${productionCompanies} for ${networks}.\n\n${execProducers ? `Executive producers ${execProducers} oversaw the production, ensuring quality across all ${totalEpisodes} episodes.` : ''}\n\n${lead1}'s preparation was notable on set. Their commitment elevated the entire production.\n\nThe production originated from ${productionCountries}, bringing authentic perspectives to the storytelling.\n\n${composers ? `Composer ${composers} created the series' memorable score.` : ''}`,
    awards: `${localShow.title} has received recognition:\n\n• TMDB Rating: ${show.vote_average?.toFixed(1)}/10 (${voteCount.toLocaleString()} votes)\n• Popularity Score: ${popularity}\n• Status: ${status}\n• Network: ${networks}\n${parseFloat(show.vote_average) >= 7.5 ? '• Critically acclaimed\n' : '• Positive reception\n'}• ${lead1} received praise for their performance\n• ${creator !== 'the showrunner' ? `${creator} recognized for creating the series` : 'Creative team recognized'}\n${composers ? `• ${composers} recognized for the musical score\n` : ''}• Produced by ${productionCompanies}`,
    keywords: JSON.stringify(keywordList),
    author: 'StreamVault Editorial',
    published: true,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function main() {
  console.log('📝 Regenerating Blog Posts with Real TMDB Data');
  console.log('==============================================\n');
  
  if (!TMDB_API_KEY) {
    console.log('❌ Error: TMDB_API_KEY not found');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  const newBlogPosts = [];
  let updatedMovies = 0;
  let updatedShows = 0;
  let failedItems = [];
  
  // Process movies
  console.log(`🎬 Processing ${data.movies.length} movies...\n`);
  
  for (let i = 0; i < data.movies.length; i++) {
    const movie = data.movies[i];
    console.log(`[${i + 1}/${data.movies.length}] ${movie.title} (${movie.year})`);
    
    try {
      const tmdbResult = await searchTMDB(movie.title, 'movie', movie.year);
      
      if (!tmdbResult) {
        console.log(`   ⚠️ Not found on TMDB`);
        failedItems.push({ title: movie.title, type: 'movie' });
        await delay(300);
        continue;
      }
      
      await delay(300);
      const tmdbData = await fetchMovieDetails(tmdbResult.id);
      
      const blogPost = generateMovieBlogPost(movie, tmdbData);
      newBlogPosts.push(blogPost);
      updatedMovies++;
      console.log(`   ✅ Generated with real TMDB data`);
      
      await delay(500);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failedItems.push({ title: movie.title, type: 'movie' });
      await delay(300);
    }
  }
  
  // Process shows
  console.log(`\n📺 Processing ${data.shows.length} shows...\n`);
  
  for (let i = 0; i < data.shows.length; i++) {
    const show = data.shows[i];
    console.log(`[${i + 1}/${data.shows.length}] ${show.title} (${show.year})`);
    
    try {
      const tmdbResult = await searchTMDB(show.title, 'tv', show.year);
      
      if (!tmdbResult) {
        console.log(`   ⚠️ Not found on TMDB`);
        failedItems.push({ title: show.title, type: 'show' });
        await delay(300);
        continue;
      }
      
      await delay(300);
      const tmdbData = await fetchShowDetails(tmdbResult.id);
      
      const blogPost = generateShowBlogPost(show, tmdbData);
      newBlogPosts.push(blogPost);
      updatedShows++;
      console.log(`   ✅ Generated with real TMDB data`);
      
      await delay(500);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failedItems.push({ title: show.title, type: 'show' });
      await delay(300);
    }
  }
  
  // Replace all blog posts
  data.blogPosts = newBlogPosts;
  
  // Save
  console.log('\n💾 Saving data...');
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Movies processed: ${updatedMovies}/${data.movies.length}`);
  console.log(`   ✅ Shows processed: ${updatedShows}/${data.shows.length}`);
  console.log(`   📝 Total blog posts: ${newBlogPosts.length}`);
  
  if (failedItems.length > 0) {
    console.log(`\n   ⚠️ Failed items (${failedItems.length}):`);
    failedItems.slice(0, 10).forEach(item => console.log(`      - ${item.title} (${item.type})`));
    if (failedItems.length > 10) console.log(`      ... and ${failedItems.length - 10} more`);
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);
