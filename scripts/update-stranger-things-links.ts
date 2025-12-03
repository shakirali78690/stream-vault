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

const STRANGER_THINGS_SHOW_ID = '3d34d92d-66b7-4645-a165-94a0e2223ff7';

// New Google Drive links from the JSON file
const newLinks = {
  1: [
    'https://drive.google.com/file/d/1Ad93dwsvjd_I_Yrt9MDLJG1tPDpNrqyj/view',
    'https://drive.google.com/file/d/1rO3VjCho7w4aNUFS5w3jjE6TeAkpzrOm/view',
    'https://drive.google.com/file/d/1FIveuQsY7jelvzJ7T04qsdhXqUXnaWZx/view',
    'https://drive.google.com/file/d/1ynsPIEJZhTAc33Ofd8GBo0AFu-5bbXI1/view',
    'https://drive.google.com/file/d/1GUiJeR6a6BHqa4TBtZy-Ctg9APNB78Zm/view',
    'https://drive.google.com/file/d/1LnuR3qowRn5UgpSF9UMNxmooAlW1kpGw/view',
    'https://drive.google.com/file/d/1iphbHofyBoHqJ1YhaGDvhEm5yS91A90H/view',
    'https://drive.google.com/file/d/1pl1pr4PTtV9hZ4b63VKSj2mJ98ZbmCAH/view'
  ],
  2: [
    'https://drive.google.com/file/d/1BkTET05UECknE1jL42_RSD5-Kg_4zLG_/view',
    'https://drive.google.com/file/d/1gGU1x3MpAVqM-rXmYuOMonoZju-LCuwH/view',
    'https://drive.google.com/file/d/1E34b9YCVAN_JIMVsL36KxXc4cJGY5Q4y/view',
    'https://drive.google.com/file/d/1cJc-hQra6RYnRuEum5JeaVelickIyDPg/view',
    'https://drive.google.com/file/d/1b9g0hqshRq7jv9CxlmjXnjSIwGHKfl5D/view',
    'https://drive.google.com/file/d/1uN3TTrPKXh1PqQUkSu_Fp2dEYQm5Opp_/view',
    'https://drive.google.com/file/d/1v-aosczFWb-mSPWztmtooprWzjQhWcZF/view',
    'https://drive.google.com/file/d/1GhgMYMAoMNlbuzoaDKXn5IiPOhSqnx95/view',
    'https://drive.google.com/file/d/1F6Unn0-SpomL100WBDVvoMUS3tELy9kh/view'
  ],
  3: [
    'https://drive.google.com/file/d/1u8GOHYXlBJoU6yGps6rO7AvTbQomlYSe/view',
    'https://drive.google.com/file/d/1XE5ClaLr4eevN01SaEsDUYrXtwXGs359/view',
    'https://drive.google.com/file/d/1xeEf8IrVss-6k8kyFiIgP7oXf0VGZNfu/view',
    'https://drive.google.com/file/d/1ijKVV6KbNyQGoPEHlzapZWBd9PXK_biR/view',
    'https://drive.google.com/file/d/14jv8wH_NSDY_8Luqv58KwVVe3z6fghkC/view',
    'https://drive.google.com/file/d/1iiGhSt7UTLbPJRIP60bSC8kdTL1a4tFk/view',
    'https://drive.google.com/file/d/14jv8wH_NSDY_8Luqv58KwVVe3z6fghkC/view',
    'https://drive.google.com/file/d/1Xtq3U0LFpQHYesOQvh-04y_M2qGOBJGb/view'
  ],
  4: [
    'https://drive.google.com/file/d/1H5TdZaw7MOchsk9qLGj4oi3xKtfT27n0/view',
    'https://drive.google.com/file/d/17ZOUb45pyz6wgfr6RjbI5ApLSJadzL5Q/view',
    'https://drive.google.com/file/d/1vngjqVE6OwwUT_NeQCUUQPwZlgHzh8Ca/view',
    'https://drive.google.com/file/d/1tX54YveVagLtza1t-YXTZ3AKWmRLN8zY/view',
    'https://drive.google.com/file/d/1Ql2ARn1CT7JeBz0NskWU6mTwUbun-peq/view',
    'https://drive.google.com/file/d/1c8l06ZzomkREO390PasibDjR5sSgMcuU/view',
    'https://drive.google.com/file/d/13kY5n-g2_z8HhNQS05g-9np-lGNgWSxO/view',
    'https://drive.google.com/file/d/1XSQgmOLxnWsRO99ZIoXVmQNRQH_9csbC/view',
    'https://drive.google.com/file/d/105-WFVMLZgL9fWbJ0d80YsFCnn17X7ok/view'
  ]
};

function updateStrangerThingsLinks() {
  console.log('🔄 Updating Stranger Things episode links (Seasons 1-4)...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  let updatedCount = 0;

  // Update episodes for seasons 1-4
  for (let season = 1; season <= 4; season++) {
    console.log(`\n📺 Season ${season}:`);
    
    const seasonEpisodes = data.episodes.filter(
      ep => ep.showId === STRANGER_THINGS_SHOW_ID && ep.season === season
    ).sort((a, b) => a.episodeNumber - b.episodeNumber);

    seasonEpisodes.forEach((episode, index) => {
      const newLink = newLinks[season as keyof typeof newLinks][index];
      if (newLink) {
        const oldLink = episode.googleDriveUrl;
        episode.googleDriveUrl = newLink;
        
        if (oldLink !== newLink) {
          console.log(`   ✅ Episode ${episode.episodeNumber}: ${episode.title}`);
          console.log(`      Old: ${oldLink.substring(0, 50)}...`);
          console.log(`      New: ${newLink.substring(0, 50)}...`);
          updatedCount++;
        }
      }
    });
  }

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Updated ${updatedCount} episode links!`);
  console.log('\n📊 Summary:');
  console.log(`   Season 1: ${newLinks[1].length} episodes`);
  console.log(`   Season 2: ${newLinks[2].length} episodes`);
  console.log(`   Season 3: ${newLinks[3].length} episodes`);
  console.log(`   Season 4: ${newLinks[4].length} episodes`);
  console.log(`   Total: ${newLinks[1].length + newLinks[2].length + newLinks[3].length + newLinks[4].length} episodes updated`);
}

updateStrangerThingsLinks();
