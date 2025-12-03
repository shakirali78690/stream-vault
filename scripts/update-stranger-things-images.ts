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

function updateStrangerThingsImages() {
  console.log('🖼️  Updating Stranger Things images and position...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  // Find Stranger Things
  const stIndex = data.shows.findIndex(s => s.slug === 'stranger-things');
  
  if (stIndex === -1) {
    console.log('❌ Stranger Things not found!');
    return;
  }

  const strangerThings = data.shows[stIndex];

  // Update with old poster and backdrop
  strangerThings.posterUrl = 'https://image.tmdb.org/t/p/w780/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg';
  strangerThings.backdropUrl = 'https://image.tmdb.org/t/p/w780/lXS60geme1LlEob5Wgvj3KilClA.jpg';

  console.log('✅ Updated images:');
  console.log(`   Poster: ${strangerThings.posterUrl}`);
  console.log(`   Backdrop: ${strangerThings.backdropUrl}`);

  // Move Stranger Things to the first position in the array
  if (stIndex !== 0) {
    data.shows.splice(stIndex, 1);
    data.shows.unshift(strangerThings);
    console.log('\n✅ Moved Stranger Things to first position in shows array');
  } else {
    console.log('\n✅ Stranger Things already at first position');
  }

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ Stranger Things updated successfully!');
  console.log(`\n📊 Show details:`);
  console.log(`   Title: ${strangerThings.title}`);
  console.log(`   Featured: ${strangerThings.featured}`);
  console.log(`   Trending: ${strangerThings.trending}`);
  console.log(`   Position: 1st in shows array`);
}

updateStrangerThingsImages();
