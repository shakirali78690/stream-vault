import fs from 'fs';
import path from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

// Map of show names to TMDB IDs
const SHOW_TMDB_IDS: { [key: string]: number } = {
  'better-call-saul': 60059,
  'black-mirror': 42009,
  'dark-desire': 105214,
  'friends': 1668,
  'narcos': 63351,
  'the-office': 2316,
  'the-walking-dead': 1402,
  'true-detective': 46648,
  'vikings': 44217,
  'we-are-lady-parts': 100351
};

interface DriveEpisode {
  episode: number;
  episode_url: string;
  google_drive_link: string;
}

interface SeasonData {
  [key: string]: DriveEpisode[];
}

async function fetchShowData(tmdbId: number) {
  const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,content_ratings`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch show ${tmdbId}: ${response.statusText}`);
  }
  return response.json();
}

async function fetchSeasonData(tmdbId: number, seasonNumber: number) {
  const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch season ${seasonNumber}: ${response.statusText}`);
  }
  return response.json();
}

function convertDriveUrl(url: string): string {
  // Convert /view to /preview
  return url.replace('/view', '/preview');
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function processShow(showFileName: string, showsFolder: string) {
  const showName = showFileName.replace('.json', '');
  const tmdbId = SHOW_TMDB_IDS[showName];
  
  if (!tmdbId) {
    console.log(`⚠️  Skipping ${showName} - No TMDB ID mapped`);
    return null;
  }

  console.log(`\n📺 Processing: ${showName}`);
  console.log(`   TMDB ID: ${tmdbId}`);

  // Read the Drive links JSON
  const driveDataPath = path.join(showsFolder, showFileName);
  const driveData: SeasonData = JSON.parse(fs.readFileSync(driveDataPath, 'utf-8'));

  // Fetch show data from TMDB
  const showData = await fetchShowData(tmdbId);
  
  console.log(`   Title: ${showData.name}`);
  console.log(`   Seasons: ${showData.number_of_seasons}`);

  // Get US content rating (TV-MA, TV-14, etc.)
  const usRating = showData.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US');
  const contentRating = usRating?.rating || 'TV-14';

  // Get cast (top 10 actors)
  const cast = showData.credits?.cast
    ?.slice(0, 10)
    .map((actor: any) => actor.name)
    .join(', ') || '';

  // Get language
  const language = showData.original_language === 'en' ? 'English' : 
                   showData.original_language === 'es' ? 'Spanish' :
                   showData.original_language === 'fr' ? 'French' :
                   showData.original_language === 'de' ? 'German' :
                   showData.original_language === 'ja' ? 'Japanese' :
                   showData.original_language === 'ko' ? 'Korean' : 'English';

  // Create show object
  const show = {
    id: generateId(),
    title: showData.name,
    slug: generateSlug(showData.name),
    description: showData.overview || '',
    posterUrl: showData.poster_path ? `${TMDB_IMAGE_BASE}${showData.poster_path}` : '',
    backdropUrl: showData.backdrop_path ? `${TMDB_IMAGE_BASE}${showData.backdrop_path}` : '',
    releaseYear: showData.first_air_date ? new Date(showData.first_air_date).getFullYear() : 2020,
    rating: contentRating,
    imdbRating: showData.vote_average ? showData.vote_average.toFixed(1) : '0.0',
    genres: showData.genres?.map((g: any) => g.name).join(', ') || '',
    category: 'Hollywood',
    totalSeasons: showData.number_of_seasons || 0,
    status: showData.status || 'Ended',
    language: language,
    cast: cast,
    isTrending: false,
    isFeatured: false
  };

  // Process episodes
  const episodes = [];
  
  for (const [seasonKey, seasonEpisodes] of Object.entries(driveData)) {
    const seasonNumber = parseInt(seasonKey.replace('Season ', ''));
    
    console.log(`   Fetching Season ${seasonNumber} data from TMDB...`);
    
    try {
      const seasonData = await fetchSeasonData(tmdbId, seasonNumber);
      
      for (const driveEp of seasonEpisodes) {
        const tmdbEpisode = seasonData.episodes.find((e: any) => e.episode_number === driveEp.episode);
        
        if (tmdbEpisode) {
          const episode = {
            id: generateId(),
            showId: show.id,
            season: seasonNumber,
            episodeNumber: driveEp.episode,
            title: tmdbEpisode.name || `Episode ${driveEp.episode}`,
            description: tmdbEpisode.overview || '',
            thumbnailUrl: tmdbEpisode.still_path ? `${TMDB_IMAGE_BASE}${tmdbEpisode.still_path}` : show.posterUrl,
            duration: tmdbEpisode.runtime || 45,
            googleDriveUrl: convertDriveUrl(driveEp.google_drive_link),
            airDate: tmdbEpisode.air_date || show.releaseYear.toString()
          };
          
          episodes.push(episode);
        }
      }
      
      console.log(`   ✓ Added ${seasonEpisodes.length} episodes from Season ${seasonNumber}`);
    } catch (error) {
      console.log(`   ⚠️  Failed to fetch Season ${seasonNumber}: ${error}`);
    }
  }

  return { show, episodes };
}

async function main() {
  const showsFolder = 'C:\\Users\\yawar\\Desktop\\shows';
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  
  console.log('🚀 Starting show import process...\n');
  
  // Read existing data
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Get all show files
  const showFiles = fs.readdirSync(showsFolder).filter(f => f.endsWith('.json'));
  
  console.log(`Found ${showFiles.length} show files to process\n`);
  
  let addedShows = 0;
  let updatedShows = 0;
  let addedEpisodes = 0;
  
  for (const showFile of showFiles) {
    try {
      const result = await processShow(showFile, showsFolder);
      
      if (!result) continue;
      
      const { show, episodes } = result;
      
      // Check if show already exists
      const existingShowIndex = data.shows.findIndex((s: any) => s.slug === show.slug);
      
      if (existingShowIndex !== -1) {
        // Update existing show
        const existingShow = data.shows[existingShowIndex];
        show.id = existingShow.id; // Keep the same ID
        show.isTrending = existingShow.isTrending; // Preserve trending status
        show.isFeatured = existingShow.isFeatured; // Preserve featured status
        data.shows[existingShowIndex] = show;
        
        // Remove old episodes for this show
        data.episodes = data.episodes.filter((e: any) => e.showId !== show.id);
        
        // Update episodes with correct showId
        episodes.forEach(ep => ep.showId = show.id);
        
        console.log(`   ✅ Updated show: ${show.title}`);
        updatedShows++;
      } else {
        // Add new show
        data.shows.push(show);
        console.log(`   ✅ Added new show: ${show.title}`);
        addedShows++;
      }
      
      // Add episodes
      data.episodes.push(...episodes);
      addedEpisodes += episodes.length;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
      
    } catch (error) {
      console.error(`❌ Error processing ${showFile}:`, error);
    }
  }
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log('\n\n📊 Summary:');
  console.log(`   New shows added: ${addedShows}`);
  console.log(`   Shows updated: ${updatedShows}`);
  console.log(`   Total episodes added: ${addedEpisodes}`);
  console.log(`   Total shows in database: ${data.shows.length}`);
  console.log(`   Total episodes in database: ${data.episodes.length}`);
  console.log('\n✅ All shows processed successfully!');
}

main().catch(console.error);
