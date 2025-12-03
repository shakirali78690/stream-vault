import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const STRANGER_THINGS_TMDB_ID = 66732;
const STRANGER_THINGS_SHOW_ID = '3a8ff251-ed95-41a9-9cac-8246ab2e59d5';

interface Episode {
  id: string;
  showId: string;
  season: number;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  googleDriveUrl: string;
  videoUrl: string | null;
}

interface Data {
  shows: any[];
  episodes: Episode[];
  movies: any[];
  comments: any[];
  watchlist: any[];
  progress: any[];
  contentRequests: any[];
  issueReports: any[];
}

interface StrangerThingsEpisode {
  episode: number;
  episode_url: string;
  google_drive_link: string;
}

interface StrangerThingsData {
  "Season 1": StrangerThingsEpisode[];
  "Season 2": StrangerThingsEpisode[];
  "Season 3": StrangerThingsEpisode[];
  "Season 4": StrangerThingsEpisode[];
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function extractFileId(url: string): string {
  const match = url.match(/\/d\/([^\/]+)/);
  return match ? match[1] : url;
}

async function fetchSeasonDetails(seasonNumber: number) {
  const url = `${TMDB_BASE_URL}/tv/${STRANGER_THINGS_TMDB_ID}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch season ${seasonNumber}: ${response.statusText}`);
  }
  return response.json();
}

async function addStrangerThingsEpisodesWithTMDB() {
  console.log('📺 Adding Stranger Things episodes with TMDB data...\n');

  // Read the stranger-things.json file for Drive links
  const stDataPath = 'C:\\Users\\yawar\\Desktop\\stranger-things.json';
  const stRawData = readFileSync(stDataPath, 'utf-8');
  const cleanedData = stRawData.replace(/,\s*}$/, '}');
  const stData: StrangerThingsData = JSON.parse(cleanedData);

  // Read the main data file
  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  // Remove old Stranger Things episodes if any
  const oldCount = data.episodes.filter(e => e.showId === STRANGER_THINGS_SHOW_ID).length;
  if (oldCount > 0) {
    console.log(`🗑️  Removing ${oldCount} old episodes...\n`);
    data.episodes = data.episodes.filter(e => e.showId !== STRANGER_THINGS_SHOW_ID);
  }

  let totalAdded = 0;

  // Process seasons 1-4
  for (let season = 1; season <= 4; season++) {
    console.log(`\n📺 Fetching Season ${season} from TMDB...`);
    
    try {
      const seasonData = await fetchSeasonDetails(season);
      const seasonKey = `Season ${season}` as keyof StrangerThingsData;
      const driveLinks = stData[seasonKey];

      console.log(`   Found ${seasonData.episodes.length} episodes\n`);

      for (const tmdbEpisode of seasonData.episodes) {
        const episodeNumber = tmdbEpisode.episode_number;
        const driveData = driveLinks.find(d => d.episode === episodeNumber);
        
        if (!driveData) {
          console.log(`   ⚠️  No drive link for S${season}E${episodeNumber}, skipping...`);
          continue;
        }

        const fileId = extractFileId(driveData.google_drive_link);

        const newEpisode: Episode = {
          id: generateId(),
          showId: STRANGER_THINGS_SHOW_ID,
          season: season,
          episodeNumber: episodeNumber,
          title: tmdbEpisode.name,
          description: tmdbEpisode.overview || `Stranger Things Season ${season} Episode ${episodeNumber}`,
          thumbnailUrl: tmdbEpisode.still_path ? `${TMDB_IMAGE_BASE}${tmdbEpisode.still_path}` : 'https://image.tmdb.org/t/p/w500/cVxVGwHce6xnW8UaVUggaPXbmoE.jpg',
          googleDriveUrl: fileId,
          videoUrl: null
        };

        data.episodes.push(newEpisode);
        console.log(`   ✅ S${season}E${episodeNumber}: ${newEpisode.title}`);
        totalAdded++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error: any) {
      console.error(`   ❌ Error fetching Season ${season}:`, error.message);
    }
  }

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Added ${totalAdded} episodes with full TMDB data!`);
  console.log(`\n📊 Total episodes in database: ${data.episodes.length}`);
  console.log('\n🎉 Stranger Things is now complete with TMDB metadata!');
}

addStrangerThingsEpisodesWithTMDB().catch(console.error);
