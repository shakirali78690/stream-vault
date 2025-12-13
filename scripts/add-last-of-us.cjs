const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');
const TMDB_SHOW_ID = 100088; // The Last of Us

// Episode links
const episodeLinks = {
  '1-1': 'https://drive.google.com/file/d/1dthb0L8rttrq11iFg1t_YSRL2iBUJ6TU/preview',
  '1-2': 'https://drive.google.com/file/d/1zL0E5J6GJ05x3hURy-pAg2UmW1iQQ5BV/preview',
  '1-3': 'https://drive.google.com/file/d/1341yTctnuo8fhhv7WQlpI5UY1Z-aZXAq/preview',
  '1-4': 'https://drive.google.com/file/d/1FqJAGN5hmed5Rl6sv47caaOyeVMvjXaa/preview',
  '1-5': 'https://drive.google.com/file/d/15zqvoRaBckSET-knrWzs7ZEfUCK5F3MB/preview',
  '1-6': 'https://drive.google.com/file/d/1vnMQQnQtnNWFIuNB92h7rInd4yotts3o/preview',
  '1-7': 'https://drive.google.com/file/d/1ewNHoOZyNfDbfuvdqH85F-RPQ_2zAe1s/preview',
  '1-8': 'https://drive.google.com/file/d/1dmTbd32ICyAZ82uqHKBs___AzIfezQ_k/preview',
  '1-9': 'https://drive.google.com/file/d/13EgTgD_bqul6b_zT77Buna6LoVWcw7p6/preview',
  '2-1': 'https://drive.google.com/file/d/18_wtD4GsbEzX8Irf3cqqAYT8pcaReHB0/preview',
  '2-2': 'https://drive.google.com/file/d/1TXU7Gh9zTB1LWXBNjpcvpKzMlDzuzj-D/preview',
  '2-3': 'https://drive.google.com/file/d/180JA_0KdlyJEvnbnL5w3tsL7c2COoEX_/preview',
  '2-4': 'https://drive.google.com/file/d/1CaNLa7sWh3UDosuuo2RxqoVMSH967qKP/preview',
  '2-5': 'https://drive.google.com/file/d/1RZUG3w1jOqRXp9Xh2x4tO_sv7t1u-lBO/preview',
  '2-6': 'https://drive.google.com/file/d/17zAOCLvQdm11ZmPysf5ddu7O9tQ8IZVP/preview',
  '2-7': 'https://drive.google.com/file/d/1mSWIedBQOmxSruasWVC5m6b1vT1rC8ED/preview',
};

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
          console.log(`   ⚠️ Retrying (${attempt + 1}/${retries})...`);
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

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function mapContentRating(ratings) {
  const usRating = ratings?.results?.find(r => r.iso_3166_1 === 'US');
  return usRating?.rating || 'TV-MA';
}

function mapCategory(genres) {
  const genreMap = {
    'Action & Adventure': 'action', 'Drama': 'drama', 'Sci-Fi & Fantasy': 'sci-fi'
  };
  for (const genre of genres || []) {
    if (genreMap[genre.name]) return genreMap[genre.name];
  }
  return 'drama';
}

async function main() {
  console.log('📺 Adding The Last of Us...\n');

  // Load existing data
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

  // Remove existing The Last of Us if present
  const existingIdx = data.shows.findIndex(s => s.slug === 'the-last-of-us');
  if (existingIdx !== -1) {
    const existingId = data.shows[existingIdx].id;
    data.shows.splice(existingIdx, 1);
    data.episodes = data.episodes.filter(e => e.showId !== existingId);
    console.log('   Removed existing show data');
  }

  // Fetch show data from TMDB
  console.log('   Fetching show details from TMDB...');
  const show = await httpsGet(`${TMDB_BASE_URL}/tv/${TMDB_SHOW_ID}?api_key=${TMDB_API_KEY}&language=en-US`);
  await delay(500);
  
  console.log('   Fetching credits...');
  const credits = await httpsGet(`${TMDB_BASE_URL}/tv/${TMDB_SHOW_ID}/credits?api_key=${TMDB_API_KEY}`);
  await delay(500);
  
  console.log('   Fetching ratings...');
  const ratings = await httpsGet(`${TMDB_BASE_URL}/tv/${TMDB_SHOW_ID}/content_ratings?api_key=${TMDB_API_KEY}`);

  // Build cast
  const topCast = credits.cast?.slice(0, 10) || [];
  const castNames = topCast.map(c => c.name).join(', ');
  const castDetails = topCast.map(c => ({
    name: c.name,
    character: c.character,
    profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
  }));

  const creators = show.created_by?.map(c => c.name).join(', ') || '';
  const newShowId = generateUUID();

  const newShow = {
    id: newShowId,
    title: show.name,
    slug: 'the-last-of-us',
    description: show.overview || '',
    posterUrl: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : '',
    backdropUrl: show.backdrop_path ? `https://image.tmdb.org/t/p/original${show.backdrop_path}` : '',
    year: parseInt(show.first_air_date?.split('-')[0]) || 2023,
    rating: mapContentRating(ratings),
    imdbRating: show.vote_average?.toFixed(1) || null,
    genres: show.genres?.map(g => g.name).join(', ') || '',
    language: 'English',
    totalSeasons: show.number_of_seasons,
    cast: castNames,
    creators: creators,
    featured: true,
    trending: true,
    category: mapCategory(show.genres),
    castDetails: JSON.stringify(castDetails)
  };

  console.log(`\n✅ Show: ${newShow.title} (${newShow.year})`);
  console.log(`   Genres: ${newShow.genres}`);
  console.log(`   Rating: ${newShow.rating}`);
  console.log(`   IMDb: ${newShow.imdbRating}`);
  console.log(`   Cast: ${castNames.substring(0, 60)}...`);

  // Fetch episodes for both seasons
  const episodes = [];
  
  for (let seasonNum = 1; seasonNum <= 2; seasonNum++) {
    console.log(`\n📺 Fetching Season ${seasonNum} episodes...`);
    await delay(500);
    
    const seasonData = await httpsGet(`${TMDB_BASE_URL}/tv/${TMDB_SHOW_ID}/season/${seasonNum}?api_key=${TMDB_API_KEY}&language=en-US`);
    
    if (!seasonData.episodes) {
      console.log(`   No episodes found for season ${seasonNum}`);
      continue;
    }

    for (const ep of seasonData.episodes) {
      const key = `${seasonNum}-${ep.episode_number}`;
      const driveUrl = episodeLinks[key];
      
      if (driveUrl) {
        episodes.push({
          id: generateUUID(),
          showId: newShowId,
          season: seasonNum,
          episodeNumber: ep.episode_number,
          title: ep.name || `Episode ${ep.episode_number}`,
          description: ep.overview || '',
          duration: ep.runtime || 50,
          thumbnailUrl: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : '',
          googleDriveUrl: driveUrl,
          videoUrl: null,
          airDate: ep.air_date || null
        });
        console.log(`   ✅ S${seasonNum}E${ep.episode_number}: ${ep.name}`);
      }
    }
  }

  // Add to data
  data.shows.push(newShow);
  data.episodes.push(...episodes);

  // Generate blog post
  const blogPost = {
    id: `blog-the-last-of-us-${Date.now()}`,
    title: `The Last of Us (2023) - Complete Guide, Cast & Reviews`,
    slug: 'the-last-of-us-2023-complete-guide',
    contentType: 'show',
    contentId: newShowId,
    featuredImage: newShow.backdropUrl,
    excerpt: `The Last of Us (2023) is a Drama TV series that has captured audiences worldwide. Based on the critically acclaimed video game, this HBO series follows Joel and Ellie across a post-apocalyptic America.`,
    content: `The Last of Us stands as one of the most emotionally compelling series of 2023. This drama series delivers an unforgettable viewing experience.\n\n${show.overview}\n\nThe show features an impressive ensemble cast including ${castNames}, each bringing depth and authenticity to their roles.`,
    plotSummary: `The Last of Us takes viewers on an extraordinary journey through its emotionally rich narrative.\n\n${show.overview}\n\nThe story unfolds with masterful pacing, keeping audiences engaged from the first episode to the season finale.`,
    review: `The Last of Us (2023) delivers exactly what fans of Drama are looking for. The performances are uniformly excellent. Pedro Pascal and Bella Ramsey deliver career-defining performances.\n\nWith an IMDb rating of ${newShow.imdbRating}/10, audience reception has been overwhelmingly positive.\n\n**Our Rating: 5/5 - Masterpiece**`,
    boxOffice: null,
    trivia: `• The Last of Us was released in 2023 and quickly became a fan favorite.\n• Based on the critically acclaimed video game of the same name by Naughty Dog.\n• Pedro Pascal and Bella Ramsey deliver career-defining performances.\n• The series has been praised for its faithful adaptation of the source material.`,
    behindTheScenes: `The making of The Last of Us involved extensive preparation to faithfully adapt the beloved video game. Creator Neil Druckmann worked closely with Craig Mazin to bring the story to life.`,
    awards: `The Last of Us has received widespread critical acclaim and numerous award nominations including Emmy Awards.`,
    author: 'StreamVault Editorial',
    published: true,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Remove existing blog post if any
  data.blogPosts = data.blogPosts.filter(b => !b.slug.includes('the-last-of-us'));
  data.blogPosts.push(blogPost);

  // Save
  console.log('\n💾 Saving data...');
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  console.log('\n✅ Done!');
  console.log(`   Show: ${newShow.title}`);
  console.log(`   Seasons: ${newShow.totalSeasons}`);
  console.log(`   Episodes added: ${episodes.length}`);
  console.log(`   Blog post: Created`);
}

main().catch(console.error);
