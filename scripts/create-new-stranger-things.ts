import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Show {
  id: string;
  title: string;
  slug: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  imdbRating: string | null;
  genres: string;
  language: string;
  cast: string;
  totalSeasons: number;
  featured: boolean;
  trending: boolean;
  creators: string;
  category: string | null;
}

interface Data {
  shows: Show[];
  episodes: any[];
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

function createNewStrangerThings() {
  console.log('🆕 Creating new Stranger Things show...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  // Remove old Stranger Things show
  const oldShowIndex = data.shows.findIndex(s => s.slug === 'stranger-things');
  if (oldShowIndex !== -1) {
    const oldShowId = data.shows[oldShowIndex].id;
    console.log(`🗑️  Removing old Stranger Things show (ID: ${oldShowId})`);
    data.shows.splice(oldShowIndex, 1);
    
    // Remove old episodes
    const oldEpisodes = data.episodes.filter(e => e.showId === oldShowId);
    console.log(`🗑️  Removing ${oldEpisodes.length} old episodes`);
    data.episodes = data.episodes.filter(e => e.showId !== oldShowId);
  }

  // Create new show with fresh data
  const newShow: Show = {
    id: generateId(),
    title: 'Stranger Things',
    slug: 'stranger-things',
    description: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w780/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    year: 2016,
    rating: 'TV-14',
    imdbRating: '8.7',
    genres: 'Sci-Fi & Fantasy, Mystery, Drama',
    language: 'EN',
    cast: 'Millie Bobby Brown, Finn Wolfhard, Winona Ryder, David Harbour, Gaten Matarazzo, Caleb McLaughlin, Noah Schnapp, Sadie Sink, Natalia Dyer, Charlie Heaton',
    totalSeasons: 5,
    featured: true,
    trending: true,
    creators: 'The Duffer Brothers',
    category: 'sci-fi'
  };

  data.shows.push(newShow);

  console.log('✅ New Stranger Things show created:');
  console.log(`   ID: ${newShow.id}`);
  console.log(`   Title: ${newShow.title}`);
  console.log(`   Slug: ${newShow.slug}`);
  console.log(`   Year: ${newShow.year}`);
  console.log(`   Rating: ${newShow.rating}`);
  console.log(`   IMDb: ${newShow.imdbRating}/10`);
  console.log(`   Total Seasons: ${newShow.totalSeasons}`);
  console.log(`   Genres: ${newShow.genres}`);
  console.log(`   Cast: ${newShow.cast}`);
  console.log(`   Featured: ${newShow.featured}`);
  console.log(`   Trending: ${newShow.trending}`);

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ New Stranger Things show created successfully!');
  console.log(`\n📊 Total shows in database: ${data.shows.length}`);
  console.log(`📊 Total episodes in database: ${data.episodes.length}`);
  console.log(`\n⚠️  NOTE: Show ID is ${newShow.id}`);
  console.log(`   Use this ID when adding episodes manually in the admin panel.`);
}

createNewStrangerThings();
