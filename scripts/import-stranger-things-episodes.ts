import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

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

const STRANGER_THINGS_SHOW_ID = '3a8ff251-ed95-41a9-9cac-8246ab2e59d5';

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

// Episode titles from TMDB
const episodeTitles = {
  1: [
    'Chapter One: The Vanishing of Will Byers',
    'Chapter Two: The Weirdo on Maple Street',
    'Chapter Three: Holly, Jolly',
    'Chapter Four: The Body',
    'Chapter Five: The Flea and the Acrobat',
    'Chapter Six: The Monster',
    'Chapter Seven: The Bathtub',
    'Chapter Eight: The Upside Down'
  ],
  2: [
    'Chapter One: MADMAX',
    'Chapter Two: Trick or Treat, Freak',
    'Chapter Three: The Pollywog',
    'Chapter Four: Will the Wise',
    'Chapter Five: Dig Dug',
    'Chapter Six: The Spy',
    'Chapter Seven: The Lost Sister',
    'Chapter Eight: The Mind Flayer',
    'Chapter Nine: The Gate'
  ],
  3: [
    'Chapter One: Suzie, Do You Copy?',
    'Chapter Two: The Mall Rats',
    'Chapter Three: The Case of the Missing Lifeguard',
    'Chapter Four: The Sauna Test',
    'Chapter Five: The Flayed',
    'Chapter Six: E Pluribus Unum',
    'Chapter Seven: The Bite',
    'Chapter Eight: The Battle of Starcourt'
  ],
  4: [
    'Chapter One: The Hellfire Club',
    'Chapter Two: Vecna\'s Curse',
    'Chapter Three: The Monster and the Superhero',
    'Chapter Four: Dear Billy',
    'Chapter Five: The Nina Project',
    'Chapter Six: The Dive',
    'Chapter Seven: The Massacre at Hawkins Lab',
    'Chapter Eight: Papa',
    'Chapter Nine: The Piggyback'
  ]
};

function addStrangerThingsEpisodes() {
  console.log('📺 Adding Stranger Things episodes from JSON file...\n');

  // Read the stranger-things.json file
  const stDataPath = 'C:\\Users\\yawar\\Desktop\\stranger-things.json';
  const stRawData = readFileSync(stDataPath, 'utf-8');
  // Remove trailing comma before parsing
  const cleanedData = stRawData.replace(/,\s*}$/, '}');
  const stData: StrangerThingsData = JSON.parse(cleanedData);

  // Read the main data file
  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  let totalAdded = 0;

  // Process each season
  for (let season = 1; season <= 4; season++) {
    const seasonKey = `Season ${season}` as keyof StrangerThingsData;
    const seasonEpisodes = stData[seasonKey];
    
    console.log(`\n📺 Season ${season}:`);

    seasonEpisodes.forEach((epData, index) => {
      const episodeNumber = epData.episode;
      const fileId = extractFileId(epData.google_drive_link);
      const title = episodeTitles[season as keyof typeof episodeTitles][index];

      const newEpisode: Episode = {
        id: generateId(),
        showId: STRANGER_THINGS_SHOW_ID,
        season: season,
        episodeNumber: episodeNumber,
        title: title,
        description: `Stranger Things Season ${season} Episode ${episodeNumber}`,
        thumbnailUrl: 'https://image.tmdb.org/t/p/w500/cVxVGwHce6xnW8UaVUggaPXbmoE.jpg',
        googleDriveUrl: fileId,
        videoUrl: null
      };

      data.episodes.push(newEpisode);
      console.log(`   ✅ S${season}E${episodeNumber}: ${title}`);
      console.log(`      File ID: ${fileId}`);
      totalAdded++;
    });
  }

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Added ${totalAdded} episodes successfully!`);
  console.log(`\n📊 Total episodes in database: ${data.episodes.length}`);
  console.log('\n🎉 Stranger Things is now complete with all episodes!');
}

addStrangerThingsEpisodes();
