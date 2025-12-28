/**
 * Update Industry show episode Google Drive URLs
 * Run with: node scripts/update-industry-links.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/streamvault-data.json');

// Industry show ID
const INDUSTRY_SHOW_ID = 'a45c4042-1e2f-4abe-9cc5-9702509d93a6';

// New episode links (converted from /view to /preview)
const episodeLinks = {
    1: { // Season 1
        1: 'https://drive.google.com/file/d/1PlXE4wZYxLfbQpUHhc8b_caPt3mGQS_0/preview',
        2: 'https://drive.google.com/file/d/1mk5Ls8abpSq6mE4e1Kt4sRbEcykdBcmC/preview',
        3: 'https://drive.google.com/file/d/1bYA8_sL_wjQZ5N9WA7GTXazmcWKdR1fM/preview',
        4: 'https://drive.google.com/file/d/1aiw3Ea7sVLhfa9gy1hMPKPNesm_MJxoY/preview',
        5: 'https://drive.google.com/file/d/1gNPgtyPgc4tbGfHQGfEhhXUnCvZW7ED7/preview',
        6: 'https://drive.google.com/file/d/1IftHcb5PH9FZEeg50tMcQytOZBsUTg36/preview',
        7: 'https://drive.google.com/file/d/1Ba2GuiuElV4vxecE-GTuw6_eAOd_Tsoe/preview',
        8: 'https://drive.google.com/file/d/1GrFVu3tEuBluv51osnLTTD0YGHJ8-7Ao/preview',
    },
    2: { // Season 2
        1: 'https://drive.google.com/file/d/1QDqEh2QY-HZ5V5XgTAI1TPALvgeL-vaU/preview',
        2: 'https://drive.google.com/file/d/1qBidUOpUeUxPm04ayPlkEn6pGJqNWdmp/preview',
        3: 'https://drive.google.com/file/d/1ZvRNLpGiUn7IiLCsgthKgQVrNm-majP5/preview',
        4: 'https://drive.google.com/file/d/1fNRopKnHymmkypF7BoQdWYdMPKexBV8Q/preview',
        5: 'https://drive.google.com/file/d/176bJ0WkmN5FBI_5Mbe4Bu1yx4NhsB-HT/preview',
        6: 'https://drive.google.com/file/d/1OzNEciOMA1WfAcupEOKUHCp3wBdfWKKT/preview',
        7: 'https://drive.google.com/file/d/1xCTF119OEK_3IOVVKLXIYxLxQwobUdnm/preview',
        8: 'https://drive.google.com/file/d/1LcY9TnMthKpeJTtf7eUxO7-USxmwYpzo/preview',
    },
    3: { // Season 3
        1: 'https://drive.google.com/file/d/1XH4tN6GcoGbGu3R41Dgwg3VEmZlYWUPQ/preview',
        2: 'https://drive.google.com/file/d/1JaCnR1apB8cUtl1YiS4kOTZDiy_LJsPt/preview',
        3: 'https://drive.google.com/file/d/1ik1kkjMhkmLDEtzGMw--xOmT5viH12hh/preview',
        4: 'https://drive.google.com/file/d/1JEg93xCpVnsC9OCF2G24z8YUBmwacUVL/preview',
        5: 'https://drive.google.com/file/d/1JGsa1ZeOAbFnD45mrksiDwSaNTdXcvxC/preview',
        6: 'https://drive.google.com/file/d/1PuZrsb4AP_Wm0-QnjDZ0ObDJkbvywF0m/preview',
        7: 'https://drive.google.com/file/d/1v5MWSsEtLqYq4MD3y2q-_oLCuBfTAc47/preview',
        8: 'https://drive.google.com/file/d/15-dG3PpPesjcL7fL3givwCsFCCnCBPrh/preview',
    },
};

async function updateIndustryLinks() {
    console.log('📺 Updating Industry show episode links...\n');

    // Load data
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    let updated = 0;

    // Find and update Industry episodes
    for (const episode of data.episodes) {
        if (episode.showId === INDUSTRY_SHOW_ID) {
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

    // Save data
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log(`\n✅ Updated ${updated} episodes`);
    console.log('💾 Saved to:', DATA_FILE);
}

updateIndustryLinks().catch(console.error);
