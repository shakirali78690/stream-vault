import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
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
  airDate?: string;
  duration?: number;
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

// Mirzapur Season 1 episode links
const mirzapurLinks = [
  'https://drive.google.com/file/d/1YN5GbeCazGY_K7OhGL68RIxYSm3tBupd/view',
  'https://drive.google.com/file/d/1XOeTwrwunJdmj3lAAG4Bzm6nv3jmQE92/view',
  'https://drive.google.com/file/d/1wV4zmvWJV_CTDB75QF52WE5Bb7KVT2_R/view',
  'https://drive.google.com/file/d/1IqoVvGfI-0Qo3sj6Zs1rnt6XwzThrC9H/view',
  'https://drive.google.com/file/d/1SaQ3d3XUNiT207bR2HZKQrQ0ezFNYVCT/view',
  'https://drive.google.com/file/d/13wbvRZLh2UFMuEtpHnNcXpmj7Lo6hVN2/view',
  'https://drive.google.com/file/d/1vwZvqKGgyOAMBvy3QrswTPVFXD_ntNhK/view',
  'https://drive.google.com/file/d/1jDhPHI7QvgNw_Zih3lq3m475KlPmeree/view',
  'https://drive.google.com/file/d/1caGxPBJeq8dbYiXosed0y-FKFSpm24vv/view'
];

async function updateEpisodes() {
  console.log('📺 Updating Stranger Things air dates and Mirzapur links...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  // ===== UPDATE STRANGER THINGS AIR DATES =====
  console.log('🔄 Updating Stranger Things air dates from TMDB...\n');

  for (let season = 1; season <= 4; season++) {
    console.log(`📺 Fetching Season ${season} from TMDB...`);
    
    try {
      const seasonData = await fetchSeasonDetails(season);

      for (const tmdbEpisode of seasonData.episodes) {
        const episode = data.episodes.find(
          e => e.showId === STRANGER_THINGS_SHOW_ID && 
               e.season === season && 
               e.episodeNumber === tmdbEpisode.episode_number
        );

        if (episode) {
          episode.airDate = tmdbEpisode.air_date;
          episode.duration = tmdbEpisode.runtime || 50;
          console.log(`   ✅ S${season}E${tmdbEpisode.episode_number}: ${tmdbEpisode.air_date} (${episode.duration} min)`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      console.error(`   ❌ Error fetching Season ${season}:`, error.message);
    }
  }

  // ===== UPDATE MIRZAPUR SEASON 1 LINKS =====
  console.log('\n🔄 Updating Mirzapur Season 1 episode links...\n');

  // Find Mirzapur show
  const mirzapurShow = data.shows.find(s => s.slug === 'mirzapur');
  
  if (!mirzapurShow) {
    console.log('❌ Mirzapur show not found!');
  } else {
    console.log(`📺 Found Mirzapur (ID: ${mirzapurShow.id})`);

    const mirzapurEpisodes = data.episodes
      .filter(e => e.showId === mirzapurShow.id && e.season === 1)
      .sort((a, b) => a.episodeNumber - b.episodeNumber);

    console.log(`   Found ${mirzapurEpisodes.length} episodes in Season 1\n`);

    mirzapurEpisodes.forEach((episode, index) => {
      if (mirzapurLinks[index]) {
        const fileId = extractFileId(mirzapurLinks[index]);
        episode.googleDriveUrl = fileId;
        console.log(`   ✅ S1E${episode.episodeNumber}: ${episode.title}`);
        console.log(`      File ID: ${fileId}`);
      }
    });
  }

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ All updates complete!');
}

updateEpisodes().catch(console.error);
