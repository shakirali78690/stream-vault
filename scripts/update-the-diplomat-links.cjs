/**
 * Update The Diplomat show episode Google Drive URLs
 * Run with: node scripts/update-the-diplomat-links.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/streamvault-data.json');

// Episode links (converted from /view to /preview)
const episodeLinks = {
    1: { // Season 1
        1: 'https://drive.google.com/file/d/1oCka7TkcaT4CxqJhkV3Hmd6LeThKt7XP/preview',
        2: 'https://drive.google.com/file/d/1zRH3fWEvZPdU1u6JqWIRUV4PPMKc59B3/preview',
        3: 'https://drive.google.com/file/d/1mMJfXA4xY78xia_5urE788ExeRzSuuKO/preview',
        4: 'https://drive.google.com/file/d/1q5NE76JNkcdJRvLrlzGksErOqAohyRM5/preview',
        5: 'https://drive.google.com/file/d/11_WManQyR30M1Ujjz5raNhS_5OD0VBHc/preview',
        6: 'https://drive.google.com/file/d/1SFnPEhpOv3yDKAwmWXTvrHp9k4PD_AiV/preview',
        7: 'https://drive.google.com/file/d/1I_J6_7sxEjYgbt_cKU7rN0SLkbliJh3L/preview',
        8: 'https://drive.google.com/file/d/1AaBEcLS0IQjpbX8XTAsyra7fZ3w7oRPs/preview',
    },
    2: { // Season 2
        1: 'https://drive.google.com/file/d/1MxTKt2x9ugUkvHNmMiaXk32_d7vK2x9u/preview',
        2: 'https://drive.google.com/file/d/1_aYK_iftmSTwSQuD46EsnXDMC0usaVu-/preview',
        3: 'https://drive.google.com/file/d/1DDv2Vwh-VLv6luwugZSl742_Mllsotni/preview',
        4: 'https://drive.google.com/file/d/1ZgW66qP5v2UQ7tvx9WJVaOF7ZmaGgpm8/preview',
        5: 'https://drive.google.com/file/d/1vJXpfwgbMYUZi2aUQnU5-hYnlMy-8vm2/preview',
        6: 'https://drive.google.com/file/d/1o1lqIWrwV-DGTeK2xDPFsrdy6VzsCLRU/preview',
    },
    3: { // Season 3
        1: 'https://drive.google.com/file/d/1c6IUgCsDfNGebEGzHklQ1tP5F4OkuBd_/preview',
        2: 'https://drive.google.com/file/d/1SaPhzz1Zeqd6aDhPJ2Vk8MU_wEU_bZAK/preview',
        3: 'https://drive.google.com/file/d/1-Rrmx7lhNcv2riMcaXv_pl2k-6zAyu8Z/preview',
        4: 'https://drive.google.com/file/d/1Zk2smau4MhM1BpJiOUzK7G7s9BaNQnan/preview',
        5: 'https://drive.google.com/file/d/1Yec8jNdoYNQDZJQaoah3Fay_8RqmEpM3/preview',
        6: 'https://drive.google.com/file/d/1DmD0qAklb58rZe7zQ-J7tenkvaFJ7eJr/preview',
        7: 'https://drive.google.com/file/d/1zA00fPr-VpPzHPuk11RKWw8Sk6Ih8how/preview',
        8: 'https://drive.google.com/file/d/1S7bIf_EzxkMKWQa1EHywXUc8mPLBpVCh/preview',
    },
};

async function updateLinks() {
    console.log('📺 Updating The Diplomat episode links...\n');

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    const show = data.shows.find(s => s.slug === 'the-diplomat');
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
