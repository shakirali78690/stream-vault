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

// Season 5 episode links
const season5Links = [
  'https://drive.google.com/file/d/1VqyHbQYrzbFhrAaBTGrQAIsnZND0u5WE/view',
  'https://drive.google.com/file/d/19dnzRiPOilQMMXiWJmQwjbPic597gGpd/view',
  'https://drive.google.com/file/d/11swxPyZSxvINHwKhVfeqakoKswrXMFzP/view',
  'https://drive.google.com/file/d/1FEv59K8yR6bu0nthXcelglWcJDjzxEMZ/view'
];

async function addSeason5() {
  console.log('📺 Adding Stranger Things Season 5 episodes...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  console.log('🔄 Fetching Season 5 from TMDB...\n');

  try {
    const seasonData = await fetchSeasonDetails(5);
    console.log(`   Found ${seasonData.episodes.length} episodes in TMDB\n`);

    // Only add episodes we have links for (4 episodes)
    const episodesToAdd = Math.min(seasonData.episodes.length, season5Links.length);

    for (let i = 0; i < episodesToAdd; i++) {
      const tmdbEpisode = seasonData.episodes[i];
      const fileId = extractFileId(season5Links[i]);

      const newEpisode: Episode = {
        id: generateId(),
        showId: STRANGER_THINGS_SHOW_ID,
        season: 5,
        episodeNumber: tmdbEpisode.episode_number,
        title: tmdbEpisode.name,
        description: tmdbEpisode.overview || `Stranger Things Season 5 Episode ${tmdbEpisode.episode_number}`,
        thumbnailUrl: tmdbEpisode.still_path ? `${TMDB_IMAGE_BASE}${tmdbEpisode.still_path}` : 'https://image.tmdb.org/t/p/w500/cVxVGwHce6xnW8UaVUggaPXbmoE.jpg',
        googleDriveUrl: fileId,
        videoUrl: null,
        airDate: tmdbEpisode.air_date,
        duration: tmdbEpisode.runtime || 60
      };

      data.episodes.push(newEpisode);
      console.log(`   ✅ S5E${tmdbEpisode.episode_number}: ${newEpisode.title}`);
      console.log(`      Air Date: ${newEpisode.airDate || 'TBA'}`);
      console.log(`      Duration: ${newEpisode.duration} min`);
      console.log(`      File ID: ${fileId}\n`);
    }

  } catch (error: any) {
    console.error('   ❌ Error fetching Season 5:', error.message);
    console.log('\n   Adding episodes with basic info...\n');

    // Fallback: add with basic info if TMDB fails
    const fallbackTitles = [
      'Chapter One: The Crawl',
      'Chapter Two: The Vanishing',
      'Chapter Three: The Turnbow Trap',
      'Chapter Four: Sorcerer'
    ];

    for (let i = 0; i < season5Links.length; i++) {
      const fileId = extractFileId(season5Links[i]);
      const newEpisode: Episode = {
        id: generateId(),
        showId: STRANGER_THINGS_SHOW_ID,
        season: 5,
        episodeNumber: i + 1,
        title: fallbackTitles[i],
        description: `Stranger Things Season 5 Episode ${i + 1}`,
        thumbnailUrl: 'https://image.tmdb.org/t/p/w500/cVxVGwHce6xnW8UaVUggaPXbmoE.jpg',
        googleDriveUrl: fileId,
        videoUrl: null,
        airDate: '2025-11-27',
        duration: 60
      };

      data.episodes.push(newEpisode);
      console.log(`   ✅ S5E${i + 1}: ${fallbackTitles[i]}`);
      console.log(`      File ID: ${fileId}\n`);
    }
  }

  // Save updated data
  console.log('💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ Season 5 episodes added!');
  console.log(`\n📊 Total episodes in database: ${data.episodes.length}`);
}

addSeason5().catch(console.error);
