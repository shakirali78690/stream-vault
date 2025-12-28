/**
 * Update Alice in Borderland episode Google Drive URLs
 * Run with: node scripts/update-alice-borderland-links.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/streamvault-data.json');

// Alice in Borderland show ID
const SHOW_ID = '9aa0e693-485b-4d68-98a0-af29dc3cb2f4';

// Episode links (converted from /view to /preview)
const episodeLinks = {
    1: { // Season 1
        1: 'https://drive.google.com/file/d/1sFFp3RHnn2pGU4r1tCAA8v3TmiCxonpM/preview',
        2: 'https://drive.google.com/file/d/1o0pJMG7w1Z9RG3EPqTKApXkey-vOjaR8/preview',
        3: 'https://drive.google.com/file/d/1lZqNtDYfnbUeYSdgCTxmnteoA5Jel2j4/preview',
        4: 'https://drive.google.com/file/d/1tlUti4qmrtKNDdMfrMRjuEXAxJW_XHUU/preview',
        5: 'https://drive.google.com/file/d/1MOW-KDU5RyLgZBw_lUYfon2dlgtJ7lrU/preview',
        6: 'https://drive.google.com/file/d/1BeK0Lz3sfpKxfRA2gDWKKYG2KGqU01f5/preview',
        7: 'https://drive.google.com/file/d/1-awpwSoDgRJ8BM6x1P8sAAKexX1MaCss/preview',
        8: 'https://drive.google.com/file/d/1ePdT0z3WVLZOBJZOcCr2WZ-PzunXkAet/preview',
    },
    2: { // Season 2
        1: 'https://drive.google.com/file/d/1DkmN-KkL09YsTV45B_us0cGpUuLjra_e/preview',
        2: 'https://drive.google.com/file/d/1lNtpeOtF1B-OoL5QdULF_1gOmQNXhtt5/preview',
        3: 'https://drive.google.com/file/d/1XioWtqHf1YQi8A2nF8-HcxkfvXmj_9gN/preview',
        4: 'https://drive.google.com/file/d/10YjsU9gq0pJF-7EKDcNw0ps6kPFfMgpB/preview',
        5: 'https://drive.google.com/file/d/19jE486zvkzZLISdt28mwJe2CxAp6qDp3/preview',
        6: 'https://drive.google.com/file/d/1D5ePj8ihSAszAVNkQGHZifRoJ3fArWzt/preview',
        7: 'https://drive.google.com/file/d/1q3Wg-kABm88qYvj-DMGjnu5iCGA-4LGa/preview',
        8: 'https://drive.google.com/file/d/16MesaP6LB_4IT3qM-47XiT6o55Lotw1K/preview',
    },
    3: { // Season 3
        1: 'https://drive.google.com/file/d/15titO8KQpL3XavivltrED6S3lCd49XDX/preview',
        2: 'https://drive.google.com/file/d/1Wxij8gEYr091b2ydm6r0WVSxsnwX1MHR/preview',
        3: 'https://drive.google.com/file/d/1S4ywUoxqa4PTy4wt8C_eE4FbvCqa8iUe/preview',
        4: 'https://drive.google.com/file/d/1DRLz0M-bXK9pgXS0qard5zxyoXi5Xput/preview',
        5: 'https://drive.google.com/file/d/1_0eP3DPPS8L4FccWaQzrz37Lqav-wkIZ/preview',
        6: 'https://drive.google.com/file/d/15titO8KQpL3XavivltrED6S3lCd49XDX/preview',
    },
};

async function updateLinks() {
    console.log('📺 Updating Alice in Borderland episode links...\n');

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

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
                    console.log(`   Old: ${oldUrl}`);
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
    console.log('💾 Saved to:', DATA_FILE);
}

updateLinks().catch(console.error);
