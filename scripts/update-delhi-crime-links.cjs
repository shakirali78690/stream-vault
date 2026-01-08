const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

console.log('📺 Updating Episode Links for Delhi Crime');
console.log('='.repeat(80));

// Load data
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

// Data provided by user
const providedData = {
    "Season 1": [
        { "episode": 1, "google_drive_link": "https://drive.google.com/file/d/1t7MHOknJwp9NU6Du3eX4QL4RwGskJJH3/view" },
        { "episode": 2, "google_drive_link": "https://drive.google.com/file/d/1nu-wCufM8UPev7uPo3-CHBmIU2Zn4jqs/view" },
        { "episode": 3, "google_drive_link": "https://drive.google.com/file/d/1H-nB6TSfoP5Fk1JDRLQ5z23P6zBLNtyI/view" },
        { "episode": 4, "google_drive_link": "https://drive.google.com/file/d/1Shupm0B39-84wIXAnUxYRiKVw-GUl6cB/view" },
        { "episode": 5, "google_drive_link": "https://drive.google.com/file/d/1J3C8VChzIq-OIeshkKpfRUw6ZP9niTKU/view" },
        { "episode": 6, "google_drive_link": "https://drive.google.com/file/d/1_Ad7Juu-d0_iEmCg7cCcv0HiyDjmqjvm/view" },
        { "episode": 7, "google_drive_link": "https://drive.google.com/file/d/1_Ad7Juu-d0_iEmCg7cCcv0HiyDjmqjvm/view" }
    ],
    "Season 2": [
        { "episode": 1, "google_drive_link": "https://drive.google.com/file/d/1DvKm-_u44MjHJcP51qVEVDR2Q-zDNGM3/view" },
        { "episode": 2, "google_drive_link": "https://drive.google.com/file/d/1cRjKnb-AGmpgr777U3ajG87u8d85l9ir/view" },
        { "episode": 3, "google_drive_link": "https://drive.google.com/file/d/1EDjFJKAOtuhhAjyXPAjPEwHcHqchBx3l/view" },
        { "episode": 4, "google_drive_link": "https://drive.google.com/file/d/12BJ2nCpoJ9OQH_hnf0lDHPAuZMTmMgSZ/view" },
        { "episode": 5, "google_drive_link": "https://drive.google.com/file/d/1IPtU-ZSOYrKl_pDMA_Mp4H25b9nyOOl2/view" }
    ],
    "Season 3": [
        { "episode": 1, "google_drive_link": "https://drive.google.com/file/d/1ibCK0-fWTlgXQYs6XxuV0KBajk_TWqoa/view" },
        { "episode": 2, "google_drive_link": "https://drive.google.com/file/d/1XisuxbxEEIZVJ9bruxq6cmxygLjms2ji/view" },
        { "episode": 3, "google_drive_link": "https://drive.google.com/file/d/1XQNrlwyrrhPXRVGHflkwlpr30-PXn8e1/view" },
        { "episode": 4, "google_drive_link": "https://drive.google.com/file/d/1u-kWa73g0XQ0wBLRLLIEt9Dy8jHuCRnF/view" },
        { "episode": 5, "google_drive_link": "https://drive.google.com/file/d/1Eqrj8cg0DPV8anjMZyokg3-Fuoiu8ty3/view" },
        { "episode": 6, "google_drive_link": "https://drive.google.com/file/d/1yl6afAkB_6HqGoGtcbmsB8yGS8CJclrw/view" }
    ]
};

function toPreviewUrl(url) {
    return url.replace(/\/view.*$/, '/preview').replace(/\/view$/, '/preview');
}

const show = data.shows.find(s => s.title.toLowerCase().includes('delhi crime'));

if (!show) {
    console.log('❌ Delhi Crime show not found!');
    process.exit(1);
}

console.log(`✅ Found: ${show.title} (ID: ${show.id})`);

let updatedCount = 0;

for (const [seasonStr, episodes] of Object.entries(providedData)) {
    const seasonNum = parseInt(seasonStr.replace('Season ', ''));
    console.log(`\nProcessing Season ${seasonNum}...`);

    for (const item of episodes) {
        const ep = data.episodes.find(e => e.showId === show.id && e.season === seasonNum && e.episodeNumber === item.episode);

        if (ep) {
            const newLink = toPreviewUrl(item.google_drive_link);
            if (ep.googleDriveUrl !== newLink) {
                ep.googleDriveUrl = newLink;
                console.log(`   ✓ Updated S${seasonNum}E${item.episode}: ${ep.title} -> ${newLink}`);
                updatedCount++;
            } else {
                console.log(`   - Skipped S${seasonNum}E${item.episode} (already up to date)`);
            }
        } else {
            console.log(`   ⚠️ Episode not found: S${seasonNum}E${item.episode}`);
        }
    }
}

console.log(`\n📊 Total updated episodes: ${updatedCount}`);

// Save data
console.log('\n💾 Saving data...');
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

console.log('\n✅ COMPLETED!');
