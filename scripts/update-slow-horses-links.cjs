/**
 * Update Slow Horses show episode Google Drive URLs
 * Run with: node scripts/update-slow-horses-links.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/streamvault-data.json');

// Show ID
const SHOW_ID = '6fdf04b1-62ab-4e09-a806-ea0ba7dc7c7d';

// Episode links (converted from /view to /preview)
const episodeLinks = {
    1: { // Season 1
        1: 'https://drive.google.com/file/d/1B25HozVs9WMOB3bupiw9soR62Q2PQwHd/preview',
        2: 'https://drive.google.com/file/d/1CgPvCz_LOz9thz-Tb2w6Yksg6gJMW4Yk/preview',
        3: 'https://drive.google.com/file/d/15PqN1BU8XHYufyt84ZD5RHbWeZ5uIJCO/preview',
        4: 'https://drive.google.com/file/d/1XjI4tp6NYGhsdGW1mKfUD1lvwA6Zan65/preview',
        5: 'https://drive.google.com/file/d/11ZKkrMt1fPpXCHcmRMsg8v1W-h3ind9Z/preview',
    },
    2: { // Season 2
        1: 'https://drive.google.com/file/d/1ZKg-78RjDy-6-GNNU5m-Fwj3gYLXrho6/preview',
        2: 'https://drive.google.com/file/d/1WIFOs4a8YPstun4pV1dSRvBlyfeshzaL/preview',
        3: 'https://drive.google.com/file/d/1WL54zF_bJf-lSDLZLnpkFy8ajsaW2MFl/preview',
        4: 'https://drive.google.com/file/d/1p9fMIHNdU0lOJtp7zlCKxgNIjAYc_zWT/preview',
        5: 'https://drive.google.com/file/d/1i9rdldZb4Yk8VBUkrnd964tY9FSykP0-/preview',
        6: 'https://drive.google.com/file/d/1LzVTjcpMiTsrXAhJ9K3O1zUMeE6PpUpl/preview',
    },
    3: { // Season 3
        1: 'https://drive.google.com/file/d/1uraqBF1bzuC-4xUtTXV0K7QWhF_p9-QD/preview',
        2: 'https://drive.google.com/file/d/14e3kPZ3flZAvEYV-4E7l3aE-1WNT33Dl/preview',
        3: 'https://drive.google.com/file/d/1HLqYAc025ovdrrmnklkGNJHRF3NY6jNh/preview',
        4: 'https://drive.google.com/file/d/1cwXb_E3bvDcDUErIbQJ5mn4czxiaE25x/preview',
        5: 'https://drive.google.com/file/d/1vomG4WgXz7q6BCgmQgwP1LjpZ0xkwTfn/preview',
        6: 'https://drive.google.com/file/d/1ZXVAd2g3NeFzAsquq7a2Bf0iG3IdSEH1/preview',
    },
    4: { // Season 4
        1: 'https://drive.google.com/file/d/1vtTJ4itAl9-_umAypNokgzp8Kal3RNkP/preview',
        2: 'https://drive.google.com/file/d/1EhzZinnFq7Hv_Lg9wKZGyAYIFb1Ka4xd/preview',
        3: 'https://drive.google.com/file/d/1LmMkHvCTs7qiseiyRDYGtkxFNNCelQ5i/preview',
        4: 'https://drive.google.com/file/d/1wUarqLe7TFn9jdPkwMpQjXYKpEuTYNLN/preview',
        5: 'https://drive.google.com/file/d/1wUarqLe7TFn9jdPkwMpQjXYKpEuTYNLN/preview', // Same as E4
        6: 'https://drive.google.com/file/d/1YK_0OHKl8kHZIts_xKWlnjJPXSCtd-zS/preview',
    },
    5: { // Season 5
        1: 'https://drive.google.com/file/d/1nqK0krgOMeyyvw12QhIgnW7_MFtK1fuZ/preview',
        2: 'https://drive.google.com/file/d/1fm-u4LKI7rPRDzeceJTLvCqXUJLpruvs/preview',
        3: 'https://drive.google.com/file/d/1BuHZq3bU-KXmXY03iMLLO_V3LuPZjQu4/preview',
        4: 'https://drive.google.com/file/d/1BuHZq3bU-KXmXY03iMLLO_V3LuPZjQu4/preview', // Same as E3
        5: 'https://drive.google.com/file/d/1kq_vX2AOTwDP4HL0LtFKdvRRLsgJmQb-/preview',
        6: 'https://drive.google.com/file/d/1UUbKvccadGbYkF7dVn_8irce9Y-XvkTT/preview',
    },
};

async function updateLinks() {
    console.log('📺 Updating Slow Horses episode links...\n');

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
