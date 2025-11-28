import fs from 'fs';
import path from 'path';

async function fixWrongShows() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('Removing incorrectly added shows...\n');
  
  // Remove "Sweet Tooth" (should be Dark Desire)
  const sweetToothIndex = data.shows.findIndex((s: any) => s.title === 'Sweet Tooth');
  if (sweetToothIndex !== -1) {
    const sweetToothId = data.shows[sweetToothIndex].id;
    data.shows.splice(sweetToothIndex, 1);
    data.episodes = data.episodes.filter((e: any) => e.showId !== sweetToothId);
    console.log('✅ Removed Sweet Tooth');
  }
  
  // Remove "Star Wars: Visions" (should be We Are Lady Parts)
  const starWarsIndex = data.shows.findIndex((s: any) => s.title === 'Star Wars: Visions');
  if (starWarsIndex !== -1) {
    const starWarsId = data.shows[starWarsIndex].id;
    data.shows.splice(starWarsIndex, 1);
    data.episodes = data.episodes.filter((e: any) => e.showId !== starWarsId);
    console.log('✅ Removed Star Wars: Visions');
  }
  
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log('\n✅ Cleanup complete!');
  console.log(`   Total shows: ${data.shows.length}`);
  console.log(`   Total episodes: ${data.episodes.length}`);
}

fixWrongShows().catch(console.error);
