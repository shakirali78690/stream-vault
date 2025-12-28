/**
 * Update The Undoing show episode Google Drive URLs
 * Run with: node scripts/update-the-undoing-links.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/streamvault-data.json');

// Episode links (converted from /view to /preview)
const episodeLinks = {
    1: { // Season 1
        1: 'https://drive.google.com/file/d/1u7Bk63t6aWGzjsJV_7J4UsqUY-6Bnbuj/preview',
        2: 'https://drive.google.com/file/d/1k-eSOC9gBng4iWo5cFU5HMaaWSzKkun0/preview',
        3: 'https://drive.google.com/file/d/1I-_6_jcM3xVbUivyBz2qjTwWvyNRFG9L/preview',
        4: 'https://drive.google.com/file/d/18HDCbfsy7yiekMPW4pLEGzEQE_fFzKOv/preview',
        5: 'https://drive.google.com/file/d/1gKNzOps9D_ilpby0y2PbmVzfm_lHQ_C5/preview',
        6: 'https://drive.google.com/file/d/1KMD000EGXd1luFgIjD3rsSvH3yQwTJyu/preview',
    },
};

async function updateLinks() {
    console.log('📺 Updating The Undoing episode links...\n');

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    // Find the show ID
    const show = data.shows.find(s => s.slug === 'the-undoing');
    if (!show) {
        console.log('❌ Show not found!');
        return;
    }

    const SHOW_ID = show.id;
    console.log(`Found show: ${show.title} (${SHOW_ID})\n`);

    let updated = 0;

    for (const episode of data.episodes) {
        if (episode.showId === SHOW_ID) {
            const season = episode.season;
            const epNum = episode.episodeNumber;

            if (episodeLinks[season] && episodeLinks[season][epNum]) {
                const newUrl = episodeLinks[season][epNum];
                const oldUrl = episode.googleDriveUrl;

                if (oldUrl !== newUrl) {
                    episode.googleDriveUrl = newUrl;
                    console.log(`✅ S${season}E${epNum}: ${episode.title}`);
                    console.log(`   New: ${newUrl}\n`);
                    updated++;
                } else {
                    console.log(`⏭️  S${season}E${epNum}: Already correct`);
                }
            }
        }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log(`\n✅ Updated ${updated} episodes`);
    console.log('💾 Saved!');
}

updateLinks().catch(console.error);
