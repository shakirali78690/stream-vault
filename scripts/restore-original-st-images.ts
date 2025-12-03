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

function restoreOriginalImages() {
  console.log('🔄 Restoring original Stranger Things images from GitHub...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  // Find Stranger Things
  const strangerThings = data.shows.find(s => s.slug === 'stranger-things');
  
  if (!strangerThings) {
    console.log('❌ Stranger Things not found!');
    return;
  }

  // Update with original poster and backdrop from GitHub
  const oldPoster = strangerThings.posterUrl;
  const oldBackdrop = strangerThings.backdropUrl;

  strangerThings.posterUrl = 'https://image.tmdb.org/t/p/w500/cVxVGwHce6xnW8UaVUggaPXbmoE.jpg';
  strangerThings.backdropUrl = 'https://i.ibb.co/HD1QjxZg/stranger-things.png';

  console.log('✅ Updated to original images:');
  console.log(`   Old Poster: ${oldPoster}`);
  console.log(`   New Poster: ${strangerThings.posterUrl}`);
  console.log(`   Old Backdrop: ${oldBackdrop}`);
  console.log(`   New Backdrop: ${strangerThings.backdropUrl}`);

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ Original images restored successfully!');
}

restoreOriginalImages();
