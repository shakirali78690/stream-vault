/**
 * Update show episode Google Drive URLs
 * Run with: node scripts/update-show-links.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/streamvault-data.json');

// Show ID
const SHOW_ID = 'd0d829b8-d216-48ab-a8d3-774fa95f0a9e';

// Episode links (converted from /view to /preview)
const episodeLinks = {
    1: { // Season 1
        1: 'https://drive.google.com/file/d/19Mr0p9QK7pRf_zMq-wqqGrHJLBCWT9rG/preview',
        2: 'https://drive.google.com/file/d/1nbl3PkhXh8RF5kPRGRUvzxJgzFnZ6Pt1/preview',
        3: 'https://drive.google.com/file/d/1e_OZGN6ubrMf0z1oxld2G1SwqRmjjYZp/preview',
        4: 'https://drive.google.com/file/d/10HrkRT36ogQaxT3nq2MyB6kifP0Xv1D7/preview',
        5: 'https://drive.google.com/file/d/1i-cY5WHD9opGFoRU_jIo8XNzxrzP1oRF/preview',
        6: 'https://drive.google.com/file/d/17GPDrjD0cJPsdZFaW78F8s4C-gkiZtj-/preview',
    },
    2: { // Season 2
        1: 'https://drive.google.com/file/d/1015zB32LLFtzVFpaWHKqiZ-F_deje0Hc/preview',
        2: 'https://drive.google.com/file/d/1h2JTBffpTpd2jAoudLk9uPvdwg5N-F4P/preview',
        3: 'https://drive.google.com/file/d/10QjSVgYINqsbkOGo24yZz5zQdqroWgKz/preview',
        4: 'https://drive.google.com/file/d/1BxtfznV3Rtz4jGr8GcJOp22be2319zv4/preview',
        5: 'https://drive.google.com/file/d/1EMKRsfepIuZoY4GYj1pBvxsDpIPU4DdH/preview',
        6: 'https://drive.google.com/file/d/17fn2sXqcMDpKyx4NJP5o76GpybznOwo0/preview',
    },
    3: { // Season 3
        1: 'https://drive.google.com/file/d/1ndJDGoVZTOCquhp22Adg2ojZX8D_PQ2N/preview',
        2: 'https://drive.google.com/file/d/17-SJ0_K4PbUCSKLzCzdvcreEGyw-Bkd9/preview',
        3: 'https://drive.google.com/file/d/1K2VGgIbPG-H2veeBS1tfAHFbPBNpSbjC/preview',
        4: 'https://drive.google.com/file/d/1LhMbBGAWprK62OlLr9jvC7HgD625wFyM/preview',
        5: 'https://drive.google.com/file/d/1LJvC1p6bGwXVizhCIutVVn4YBhEmL1f_/preview',
        6: 'https://drive.google.com/file/d/1ETtEx4vNS7EfAAFt7UtnZW9CDFGpqS2l/preview',
    },
};

async function updateLinks() {
    console.log('📺 Updating show episode links...\n');

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    // Find show
    const show = data.shows.find(s => s.id === SHOW_ID);
    if (!show) {
        console.log('❌ Show not found!');
        return;
    }

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
                    updated++;
                }
            }
        }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log(`\n✅ Updated ${updated} episodes`);
    console.log('💾 Saved!');
}

updateLinks().catch(console.error);
