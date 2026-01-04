const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

console.log('📺 Fixing Firefly Episodes 12-14 with TVDB Data');
console.log('='.repeat(80));

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const fireflyShow = data.shows.find(s => s.title.toLowerCase().includes('firefly'));

if (!fireflyShow) {
    console.log('❌ Firefly not found!');
    process.exit(1);
}

console.log(`✅ Found: ${fireflyShow.title} (ID: ${fireflyShow.id})`);

// TVDB episode data with correct thumbnails
const episodeData = {
    12: {
        title: "The Message",
        description: "Mal and Zoe receive an urgent message from a fellow veteran of the war, now on the run with a stolen Alliance secret inside his body. The crew must protect him from a corrupt Alliance officer while dealing with the emotional weight of the past.",
        duration: 44,
        // Using TVDB artwork
        thumbnailUrl: "https://artworks.thetvdb.com/banners/episodes/78874/298000.jpg",
        airDate: "2003-07-28"
    },
    13: {
        title: "Heart of Gold",
        description: "Inara receives a call from an old friend who runs a bordello on a remote moon. When a powerful local businessman threatens to take a baby born to one of the workers, Mal and the crew agree to defend the establishment.",
        duration: 44,
        thumbnailUrl: "https://artworks.thetvdb.com/banners/episodes/78874/297999.jpg",
        airDate: "2003-08-04"
    },
    14: {
        title: "Objects in Space",
        description: "A bounty hunter named Jubal Early sneaks aboard Serenity intending to capture River. As he stalks through the ship taking out the crew one by one, River must use her unique abilities to outmaneuver him in a game of cat and mouse.",
        duration: 44,
        thumbnailUrl: "https://artworks.thetvdb.com/banners/episodes/78874/297998.jpg",
        airDate: "2002-12-13"
    }
};

// Update episodes 12, 13, 14
for (const ep of data.episodes) {
    if (ep.showId === fireflyShow.id && episodeData[ep.episodeNumber]) {
        const epData = episodeData[ep.episodeNumber];
        ep.title = epData.title;
        ep.description = epData.description;
        ep.duration = epData.duration;
        ep.thumbnailUrl = epData.thumbnailUrl;
        ep.airDate = epData.airDate;
        console.log(`✓ Updated E${ep.episodeNumber}: ${ep.title}`);
        console.log(`  📅 Air Date: ${ep.airDate}`);
        console.log(`  🖼️ Thumbnail: ${ep.thumbnailUrl}`);
    }
}

// Save
console.log('\n💾 Saving data...');
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log('✅ COMPLETED!');
