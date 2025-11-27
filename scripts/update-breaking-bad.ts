import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const BREAKING_BAD_TMDB_ID = 1396;

// Load Google Drive links
const driveLinksPath = 'C:\\Users\\yawar\\Desktop\\breaking-bad.json';
const driveLinksData = JSON.parse(fs.readFileSync(driveLinksPath, 'utf-8'));

// Helper to convert /view to /preview
function convertDriveUrl(url: string): string {
  return url.replace('/view', '/preview');
}

// Helper to get Google Drive link for episode
function getDriveLink(season: number, episode: number): string {
  const seasonKey = `Season ${season}`;
  const seasonData = driveLinksData[seasonKey];
  if (!seasonData) return '';
  
  const episodeData = seasonData.find((ep: any) => ep.episode === episode);
  return episodeData ? convertDriveUrl(episodeData.google_drive_link) : '';
}

async function fetchFromTMDB(endpoint: string) {
  const url = `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.statusText}`);
  }
  return response.json();
}

async function updateBreakingBad() {
  console.log('🎬 Fetching Breaking Bad details from TMDB...');
  
  // Fetch show details
  const showDetails = await fetchFromTMDB(`/tv/${BREAKING_BAD_TMDB_ID}`);
  
  console.log(`📺 Show: ${showDetails.name}`);
  console.log(`📅 Year: ${showDetails.first_air_date?.split('-')[0]}`);
  console.log(`⭐ Rating: ${showDetails.vote_average}`);
  console.log(`🎭 Seasons: ${showDetails.number_of_seasons}`);
  
  // Load existing data
  const dataPath = path.join(__dirname, '..', 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Find Breaking Bad in existing shows
  const breakingBadIndex = data.shows.findIndex((s: any) => s.slug === 'breaking-bad');
  
  if (breakingBadIndex === -1) {
    console.error('❌ Breaking Bad not found in database!');
    return;
  }
  
  // Update show details
  const updatedShow = {
    ...data.shows[breakingBadIndex],
    title: showDetails.name,
    year: parseInt(showDetails.first_air_date?.split('-')[0] || '2008'),
    description: showDetails.overview,
    posterUrl: `https://image.tmdb.org/t/p/w500${showDetails.poster_path}`,
    backdropUrl: `https://image.tmdb.org/t/p/original${showDetails.backdrop_path}`,
    rating: showDetails.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US')?.rating || 'TV-MA',
    imdbRating: showDetails.vote_average?.toFixed(1) || '9.5',
    totalSeasons: showDetails.number_of_seasons,
    genres: showDetails.genres?.map((g: any) => g.name).join(', ') || 'Crime, Drama, Thriller',
    language: 'English',
    cast: showDetails.credits?.cast?.slice(0, 5).map((c: any) => c.name).join(', ') || 'Bryan Cranston, Aaron Paul, Anna Gunn',
  };
  
  data.shows[breakingBadIndex] = updatedShow;
  
  console.log('\n📝 Fetching all episodes from TMDB...');
  
  // Fetch all episodes for all seasons
  const allEpisodes: any[] = [];
  
  for (let season = 1; season <= 5; season++) {
    console.log(`\n🔄 Processing Season ${season}...`);
    const seasonDetails = await fetchFromTMDB(`/tv/${BREAKING_BAD_TMDB_ID}/season/${season}`);
    
    for (const episode of seasonDetails.episodes) {
      const driveUrl = getDriveLink(season, episode.episode_number);
      
      if (!driveUrl) {
        console.log(`⚠️  No Drive link for S${season}E${episode.episode_number}`);
        continue;
      }
      
      const episodeData = {
        id: `breaking-bad-s${season}e${episode.episode_number}`,
        showId: data.shows[breakingBadIndex].id,
        season: season,
        episodeNumber: episode.episode_number,
        title: episode.name,
        description: episode.overview || 'No description available.',
        duration: episode.runtime || 47,
        airDate: episode.air_date || '',
        thumbnailUrl: episode.still_path 
          ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
          : updatedShow.backdropUrl,
        videoUrl: driveUrl,
        googleDriveUrl: driveUrl,
      };
      
      allEpisodes.push(episodeData);
      console.log(`  ✅ S${season}E${episode.episode_number}: ${episode.name}`);
    }
  }
  
  // Remove old Breaking Bad episodes
  data.episodes = data.episodes.filter((ep: any) => ep.showId !== data.shows[breakingBadIndex].id);
  
  // Add new episodes
  data.episodes.push(...allEpisodes);
  
  // Save updated data
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log('\n✅ Breaking Bad updated successfully!');
  console.log(`📊 Total episodes added: ${allEpisodes.length}`);
  console.log(`   Season 1: ${allEpisodes.filter(e => e.season === 1).length} episodes`);
  console.log(`   Season 2: ${allEpisodes.filter(e => e.season === 2).length} episodes`);
  console.log(`   Season 3: ${allEpisodes.filter(e => e.season === 3).length} episodes`);
  console.log(`   Season 4: ${allEpisodes.filter(e => e.season === 4).length} episodes`);
  console.log(`   Season 5: ${allEpisodes.filter(e => e.season === 5).length} episodes`);
}

updateBreakingBad().catch(console.error);
