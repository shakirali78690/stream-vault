require('dotenv').config();
const fs = require('fs');
const https = require('https');
const path = require('path');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

// Specific items to fix with their real TMDB IDs
const ITEMS_TO_FIX = {
  movies: [
    { title: 'Drishyam', tmdbId: 352173 }
  ],
  shows: [
    { title: 'Secrets of a Nympho', tmdbId: 212217 },
    { title: 'College Romance', tmdbId: 84150 },
    { title: 'Dayaat Mahrous', tmdbId: 278842 },
    { title: 'Physics Wallah', tmdbId: 216268 },
    { title: 'Lover or Stranger (Hindi Dubbed)', tmdbId: 129003 }
  ],
  // Items to skip (no blog post needed)
  skip: ['Love Puzzle', 'Aurora Teagarden Mysteries'],
  // Items to delete
  delete: ['Untitled Ayan Mukerji/Ranbir Kapoor Film']
};

function fetchWithRetry(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        timeout: 15000
      };
      
      const req = https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON'));
          }
        });
      });
      
      req.on('error', (err) => {
        if (n > 0) {
          console.log(`   Retrying... (${retries - n + 1}/${retries})`);
          setTimeout(() => attempt(n - 1), 2000);
        } else {
          reject(err);
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        if (n > 0) {
          console.log(`   Timeout, retrying... (${retries - n + 1}/${retries})`);
          setTimeout(() => attempt(n - 1), 2000);
        } else {
          reject(new Error('Timeout'));
        }
      });
    };
    attempt(retries);
  });
}

async function fetchMovieData(tmdbId) {
  const baseUrl = `https://api.themoviedb.org/3/movie/${tmdbId}`;
  const [movie, credits, reviews, keywords, videos] = await Promise.all([
    fetchWithRetry(`${baseUrl}?api_key=${TMDB_API_KEY}`),
    fetchWithRetry(`${baseUrl}/credits?api_key=${TMDB_API_KEY}`),
    fetchWithRetry(`${baseUrl}/reviews?api_key=${TMDB_API_KEY}`),
    fetchWithRetry(`${baseUrl}/keywords?api_key=${TMDB_API_KEY}`),
    fetchWithRetry(`${baseUrl}/videos?api_key=${TMDB_API_KEY}`)
  ]);
  return { movie, credits, reviews, keywords, videos };
}

async function fetchShowData(tmdbId) {
  const baseUrl = `https://api.themoviedb.org/3/tv/${tmdbId}`;
  const [show, credits, reviews, keywords, videos] = await Promise.all([
    fetchWithRetry(`${baseUrl}?api_key=${TMDB_API_KEY}`),
    fetchWithRetry(`${baseUrl}/credits?api_key=${TMDB_API_KEY}`),
    fetchWithRetry(`${baseUrl}/reviews?api_key=${TMDB_API_KEY}`),
    fetchWithRetry(`${baseUrl}/keywords?api_key=${TMDB_API_KEY}`),
    fetchWithRetry(`${baseUrl}/videos?api_key=${TMDB_API_KEY}`)
  ]);
  return { show, credits, reviews, keywords, videos };
}

function generateMovieBlogPost(localMovie, movie, credits, reviews, keywords, videos) {
  const castList = credits.cast?.slice(0, 10).map(c => c.name) || [];
  const director = credits.crew?.find(c => c.job === 'Director')?.name || 'the director';
  const lead1 = castList[0] || 'the lead actor';
  const lead2 = castList[1] || 'the supporting cast';
  const genre1 = localMovie.genres?.split(',')[0]?.trim() || 'Drama';
  const genre2 = localMovie.genres?.split(',')[1]?.trim() || '';
  const runtimeText = movie.runtime ? `${movie.runtime} minutes` : 'a compelling runtime';
  
  const budgetFormatted = movie.budget ? `$${(movie.budget / 1000000).toFixed(0)} Million` : 'Not disclosed';
  const revenueFormatted = movie.revenue ? `$${(movie.revenue / 1000000).toFixed(0)} Million` : 'Not available';
  const productionCompanies = movie.production_companies?.map(c => c.name).slice(0, 3).join(', ') || 'Various studios';
  const productionCountries = movie.production_countries?.map(c => c.name).join(', ') || 'USA';
  const tagline = movie.tagline || '';
  const voteCount = movie.vote_count || 0;
  const popularity = movie.popularity?.toFixed(0) || 0;
  
  const realReviews = reviews?.results?.slice(0, 3) || [];
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
    excerpt: `${localMovie.title} is a gripping ${genre1.toLowerCase()}${genre2 ? ` ${genre2.toLowerCase()}` : ''} directed by ${director}, featuring ${lead1} in a stellar role. ${tagline ? `"${tagline}" - ` : ''}This comprehensive guide covers everything you need to know.`,
    content: `${localMovie.title} marks an impressive ${genre1.toLowerCase()} experience, delivering one of the most ambitious films of ${localMovie.year}. ${tagline ? `With the tagline "${tagline}", the film sets its tone from the very beginning.\n\n` : ''}${movie.overview || localMovie.description}\n\nThe movie runs for ${runtimeText}, a runtime that allows the story to breathe and develop its complex web of characters and motivations.\n\nProduced by ${productionCompanies}, the film originated from ${productionCountries}. With a budget of ${budgetFormatted}, the production values are evident in every frame.\n\nWith an ensemble cast featuring ${castList.slice(0, 5).join(', ')}${castList.length > 5 ? ` and more` : ''} - the film delivers powerhouse performances.${composer ? ` The score by ${composer} elevates every scene.` : ''}`,
    plotSummary: `${movie.overview || localMovie.description}\n\nThe story begins with a compelling premise that draws viewers in immediately. As the narrative unfolds, we follow the characters through events that test their limits.\n\n${lead1}'s character serves as the emotional anchor. The supporting characters, including those played by ${lead2}${castList[2] ? ` and ${castList[2]}` : ''}, add layers of complexity.\n\n${keywordList.length > 0 ? `Key themes explored include: ${keywordList.slice(0, 5).join(', ')}.` : ''}`,
    review: `${localMovie.title} is a masterclass in ${genre1.toLowerCase()} filmmaking. ${director} proves their command over the medium with confident direction.\n\n${lead1} delivers a nuanced performance. The character development is portrayed with remarkable subtlety.\n\nThe supporting cast is equally impressive. ${lead2}'s performance is a highlight.\n\nTechnically, the film is impressive. ${cinematographer ? `The cinematography by ${cinematographer} captures both intimate moments and grand vistas.` : ''} ${composer ? `The score by ${composer} complements the visuals perfectly.` : ''}\n\n${realReviews.length > 0 ? `**What Critics Are Saying:**\n\n${reviewExcerpts}\n\n` : ''}With a TMDB rating of ${movie.vote_average?.toFixed(1) || localMovie.imdbRating}/10 based on ${voteCount.toLocaleString()} votes, audience reception has been ${parseFloat(movie.vote_average || localMovie.imdbRating) >= 7 ? 'overwhelmingly positive' : 'generally favorable'}.\n\nRating: ${movie.vote_average >= 8 ? '4.5/5 - A must-watch masterpiece' : movie.vote_average >= 7 ? '4/5 - Highly recommended' : '3.5/5 - Worth watching'}`,
    boxOffice: JSON.stringify(boxOfficeData),
    trivia: JSON.stringify([
      `${localMovie.title} was released in ${localMovie.year} and has a popularity score of ${popularity} on TMDB.`,
      `The film was produced by ${productionCompanies}.`,
      `With a runtime of ${runtimeText}, the film allows its story to develop fully.`,
      `${lead1} leads an ensemble cast of ${castList.length} credited actors.`,
      director !== 'the director' ? `Directed by ${director}.` : `The film was helmed by a talented director.`,
      writers ? `Written by ${writers}.` : `The screenplay was crafted by talented writers.`,
      trailerUrl ? `Watch the official trailer: ${trailerUrl}` : `The film features compelling promotional material.`,
      keywordList.length > 0 ? `Key themes: ${keywordList.join(', ')}.` : `The film explores various compelling themes.`
    ]),
    behindTheScenes: `The making of ${localMovie.title} involved collaboration between ${productionCompanies}. ${director !== 'the director' ? `Director ${director} brought a unique vision to the project.` : ''}\n\n${cinematographer ? `Cinematographer ${cinematographer} worked to create the film's distinctive visual style.` : ''} ${composer ? `Composer ${composer} crafted the memorable score.` : ''}\n\nThe production took place across ${productionCountries}, with the team working to bring this ambitious project to life.`,
    awards: null,
    keywords: JSON.stringify(keywordList),
    author: 'StreamVault Team',
    published: true,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function generateShowBlogPost(localShow, show, credits, reviews, keywords, videos) {
  const castList = credits.cast?.slice(0, 10).map(c => c.name) || [];
  const creator = show.created_by?.[0]?.name || 'the showrunner';
  const lead1 = castList[0] || 'the lead actor';
  const lead2 = castList[1] || 'the supporting cast';
  const genre1 = localShow.genres?.split(',')[0]?.trim() || 'Drama';
  const genre2 = localShow.genres?.split(',')[1]?.trim() || '';
  const seasonText = `${show.number_of_seasons || localShow.totalSeasons} season${(show.number_of_seasons || localShow.totalSeasons) > 1 ? 's' : ''}`;
  
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
      trailerUrl ? `Watch the official trailer: ${trailerUrl}` : `The series features compelling promotional material.`,
      keywordList.length > 0 ? `Key themes: ${keywordList.join(', ')}.` : `The series explores various compelling themes.`
    ]),
    behindTheScenes: `The making of ${localShow.title} involved collaboration between ${productionCompanies}. ${creator !== 'the showrunner' ? `Creator ${creator} brought a unique vision to the project.` : ''}\n\n${composers ? `Composer ${composers} crafted the memorable score.` : ''}\n\nThe production aired on ${networks}, with the team working to bring this ambitious project to life across ${seasonText}.`,
    awards: null,
    keywords: JSON.stringify(keywordList),
    author: 'StreamVault Team',
    published: true,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function main() {
  console.log('🔧 Fixing Failed Blog Posts');
  console.log('============================\n');
  
  // Load data
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  
  // Delete items marked for deletion
  console.log('🗑️  Deleting items...');
  for (const titleToDelete of ITEMS_TO_FIX.delete) {
    const movieIndex = data.movies.findIndex(m => m.title === titleToDelete);
    if (movieIndex !== -1) {
      data.movies.splice(movieIndex, 1);
      console.log(`   ✅ Deleted movie: ${titleToDelete}`);
      // Also remove any blog post for it
      const blogIndex = data.blogPosts.findIndex(b => b.title === titleToDelete);
      if (blogIndex !== -1) {
        data.blogPosts.splice(blogIndex, 1);
      }
    }
    
    const showIndex = data.shows.findIndex(s => s.title === titleToDelete);
    if (showIndex !== -1) {
      data.shows.splice(showIndex, 1);
      console.log(`   ✅ Deleted show: ${titleToDelete}`);
      const blogIndex = data.blogPosts.findIndex(b => b.title === titleToDelete);
      if (blogIndex !== -1) {
        data.blogPosts.splice(blogIndex, 1);
      }
    }
  }
  
  // Process movies
  console.log('\n🎬 Processing movies...');
  for (const item of ITEMS_TO_FIX.movies) {
    const localMovie = data.movies.find(m => m.title === item.title);
    if (!localMovie) {
      console.log(`   ⚠️  Movie not found: ${item.title}`);
      continue;
    }
    
    try {
      console.log(`   Processing: ${item.title} (TMDB ID: ${item.tmdbId})`);
      const { movie, credits, reviews, keywords, videos } = await fetchMovieData(item.tmdbId);
      
      const blogPost = generateMovieBlogPost(localMovie, movie, credits, reviews, keywords, videos);
      
      // Remove existing blog post if any
      const existingIndex = data.blogPosts.findIndex(b => b.contentId === localMovie.id);
      if (existingIndex !== -1) {
        data.blogPosts.splice(existingIndex, 1);
      }
      
      data.blogPosts.push(blogPost);
      console.log(`   ✅ Generated blog post for: ${item.title}`);
      
      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Process shows
  console.log('\n📺 Processing shows...');
  for (const item of ITEMS_TO_FIX.shows) {
    const localShow = data.shows.find(s => s.title === item.title);
    if (!localShow) {
      console.log(`   ⚠️  Show not found: ${item.title}`);
      continue;
    }
    
    try {
      console.log(`   Processing: ${item.title} (TMDB ID: ${item.tmdbId})`);
      const { show, credits, reviews, keywords, videos } = await fetchShowData(item.tmdbId);
      
      const blogPost = generateShowBlogPost(localShow, show, credits, reviews, keywords, videos);
      
      // Remove existing blog post if any
      const existingIndex = data.blogPosts.findIndex(b => b.contentId === localShow.id);
      if (existingIndex !== -1) {
        data.blogPosts.splice(existingIndex, 1);
      }
      
      data.blogPosts.push(blogPost);
      console.log(`   ✅ Generated blog post for: ${item.title}`);
      
      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Skipped items
  console.log('\n⏭️  Skipped items (no blog post):');
  for (const title of ITEMS_TO_FIX.skip) {
    console.log(`   - ${title}`);
  }
  
  // Save data
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log('\n✅ Data saved successfully!');
  console.log(`   Total blog posts: ${data.blogPosts.length}`);
}

main().catch(console.error);
