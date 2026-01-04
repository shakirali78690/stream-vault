const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

console.log('📺 Updating Episode Links for Firefly and The Wheel of Time');
console.log('='.repeat(80));

// Load data
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// Convert /view to /preview format
function toPreviewUrl(url) {
    return url.replace('/view', '/preview');
}

// ==================== FIREFLY ====================
console.log('\n📺 FIREFLY');
console.log('-'.repeat(80));

const fireflyShow = data.shows.find(s => s.title.toLowerCase().includes('firefly'));
if (!fireflyShow) {
    console.log('❌ Firefly show not found!');
} else {
    console.log(`✅ Found: ${fireflyShow.title} (ID: ${fireflyShow.id})`);

    const fireflyLinks = {
        1: 'https://drive.google.com/file/d/1kvaUWCNIRmTppt95Mj3WEawJ4ufe11Vp/preview',
        2: 'https://drive.google.com/file/d/1dl1oTvphDpt0chaudbSGx8Iebokbhj4F/preview',
        3: 'https://drive.google.com/file/d/1sWdJ8vTaXNDPZ-0Vzkz1IWV9TiW2165Y/preview',
        4: 'https://drive.google.com/file/d/1lmf5pZ5-waLPbhMv_fP7yoG1MtU9ttLE/preview',
        5: 'https://drive.google.com/file/d/1222-Ug2bi6B5YqyPvET3ckI4y8SDaw-U/preview',
        6: 'https://drive.google.com/file/d/1Tgp97F0SrRepxvdiKF-jEFtab-IJqnY7/preview',
        7: 'https://drive.google.com/file/d/1sLdFYlHE7ybYOmUfdQo_V27jjiz01Fss/preview',
        8: 'https://drive.google.com/file/d/1mhrCRl141TOMyH-hE5p9doQoblFlWHOW/preview',
        9: 'https://drive.google.com/file/d/1jCJpKCJoPyZpskyUlEC3PrvLqQnGlYEC/preview',
        10: 'https://drive.google.com/file/d/1r-OlwONKeQkoW47azKA_WS7bAfMj2lRA/preview',
        11: 'https://drive.google.com/file/d/1oK_KWzyyi2pSbJUBoyuc36Gga2RZhCHa/preview',
        12: 'https://drive.google.com/file/d/1qpYYl4OEg5KvThnUVnxmLfN0xaZhShq1/preview',
        13: 'https://drive.google.com/file/d/1n1UFi30_LzFKkzDm_qblJXLU8MY57K-t/preview',
        14: 'https://drive.google.com/file/d/1531COnhao-A7xSonwpkLGUxkRhF8dIBZ/preview'
    };

    // Update existing episodes
    let updatedCount = 0;
    for (const ep of data.episodes) {
        if (ep.showId === fireflyShow.id && fireflyLinks[ep.episodeNumber]) {
            ep.googleDriveUrl = fireflyLinks[ep.episodeNumber];
            console.log(`   ✓ Updated S1E${ep.episodeNumber}: ${ep.title}`);
            updatedCount++;
        }
    }

    // Add episodes 12, 13, 14 if they don't exist
    const existingEpNums = data.episodes.filter(e => e.showId === fireflyShow.id).map(e => e.episodeNumber);

    // Episode 12 - "The Message"
    if (!existingEpNums.includes(12)) {
        data.episodes.push({
            id: generateUUID(),
            showId: fireflyShow.id,
            season: 1,
            episodeNumber: 12,
            title: "The Message",
            description: "Mal and Zoe receive a corpse which claims to be hiding a precious cargo from a local cut-throat.",
            duration: 44,
            thumbnailUrl: "https://image.tmdb.org/t/p/w300/aVj1mFBJqqnQBJGwfK7NMfNLLfC.jpg",
            googleDriveUrl: fireflyLinks[12],
            videoUrl: null,
            airDate: "2003-07-28"
        });
        console.log('   ✓ Added S1E12: The Message');
    }

    // Episode 13 - "Heart of Gold"
    if (!existingEpNums.includes(13)) {
        data.episodes.push({
            id: generateUUID(),
            showId: fireflyShow.id,
            season: 1,
            episodeNumber: 13,
            title: "Heart of Gold",
            description: "Mal agrees to help a brothel defend itself from a local land baron who has impregnated one of their workers and now wants to take the baby.",
            duration: 44,
            thumbnailUrl: "https://image.tmdb.org/t/p/w300/aVj1mFBJqqnQBJGwfK7NMfNLLfC.jpg",
            googleDriveUrl: fireflyLinks[13],
            videoUrl: null,
            airDate: "2003-08-04"
        });
        console.log('   ✓ Added S1E13: Heart of Gold');
    }

    // Episode 14 - "Objects in Space"
    if (!existingEpNums.includes(14)) {
        data.episodes.push({
            id: generateUUID(),
            showId: fireflyShow.id,
            season: 1,
            episodeNumber: 14,
            title: "Objects in Space",
            description: "A bounty hunter boards Serenity and attempts to capture River, but she proves to be more resourceful than expected.",
            duration: 44,
            thumbnailUrl: "https://image.tmdb.org/t/p/w300/aVj1mFBJqqnQBJGwfK7NMfNLLfC.jpg",
            googleDriveUrl: fireflyLinks[14],
            videoUrl: null,
            airDate: "2002-12-13"
        });
        console.log('   ✓ Added S1E14: Objects in Space');
    }

    console.log(`   📊 Updated ${updatedCount} episodes, added ${14 - existingEpNums.length} new episodes`);
}

// ==================== THE WHEEL OF TIME ====================
console.log('\n📺 THE WHEEL OF TIME');
console.log('-'.repeat(80));

const wotShow = data.shows.find(s => s.title.toLowerCase().includes('wheel of time'));
if (!wotShow) {
    console.log('❌ The Wheel of Time show not found!');
} else {
    console.log(`✅ Found: ${wotShow.title} (ID: ${wotShow.id})`);

    const wotLinks = {
        // Season 1
        '1-1': 'https://drive.google.com/file/d/15C49Owrl9GdrnbGozFXpETILC4VnDd5n/preview',
        '1-2': 'https://drive.google.com/file/d/12PBhEZ4HQ_84KteleGmVvyrW4eLCX4xz/preview',
        '1-3': 'https://drive.google.com/file/d/1Z--r63PhBS4nMXHADsX891Vod4dkUl5S/preview',
        '1-4': 'https://drive.google.com/file/d/1uG9it3XIW6Ln6Awg9WtPdlFTIGlFDkl9/preview',
        '1-5': 'https://drive.google.com/file/d/1qo5SEbQLLFP0IPn8IU3aEbD589YDkEPW/preview',
        '1-6': 'https://drive.google.com/file/d/1ZXlCL0Dp8BoVoI139LR3fMNa1tGEr5dN/preview',
        '1-7': 'https://drive.google.com/file/d/15zB97zINsG7zjh9WmMQkNaUA4PJgPFnZ/preview',
        '1-8': 'https://drive.google.com/file/d/1YU7Klll0QLYlbSUNZWAqzoeBbanVKNF3/preview',
        // Season 2
        '2-1': 'https://drive.google.com/file/d/1o-HIS0STAEXcOE4TZh5I6dsFe6tSyeFF/preview',
        '2-2': 'https://drive.google.com/file/d/1Cez99VqJjCHe8L5n1FLAKOsYsZdpslnG/preview',
        '2-3': 'https://drive.google.com/file/d/15Pv6w9DtYTEjbFNkHYpSWKedhdBBUNDI/preview',
        '2-4': 'https://drive.google.com/file/d/16RXozL1Rljht96WlD1eaAvT6HG99tBxk/preview',
        '2-5': 'https://drive.google.com/file/d/16jQHxq0Jbg6U844-M9Div0HHE_A0ftkL/preview',
        '2-6': 'https://drive.google.com/file/d/1VtOW9QsL3r4N-cxkzCGlQYmHJJbsJszs/preview',
        '2-7': 'https://drive.google.com/file/d/1knty6hdpR8NY0gg9jMkjTPO0QBNOzN2z/preview',
        '2-8': 'https://drive.google.com/file/d/1FaVHXnrzLIlq3wjYIcou8IyFRgLRYLKy/preview',
        // Season 3
        '3-1': 'https://drive.google.com/file/d/153R9d6E5tKRV-LLblImCMrHAagWaBE_Y/preview',
        '3-2': 'https://drive.google.com/file/d/1zvnET2jYH8LPk010JHTLIEJqaHiC4Xtq/preview',
        '3-3': 'https://drive.google.com/file/d/1jdKsbJGc_i-WjYFlBuURQfc19ve193s-/preview',
        '3-4': 'https://drive.google.com/file/d/1PLFPIQV_Ae9KBJwPEJFznSB-YtN-DFd8/preview',
        '3-5': 'https://drive.google.com/file/d/1fZ7zBYNsSZEDLcp-fcJXVmyhsX4PUC8p/preview',
        '3-6': 'https://drive.google.com/file/d/1fZ7zBYNsSZEDLcp-fcJXVmyhsX4PUC8p/preview',
        '3-7': 'https://drive.google.com/file/d/1xwfGhCgnbzfzeQxO-dni-I7TnZo6ekPT/preview',
        '3-8': 'https://drive.google.com/file/d/1Ah-5TuBkzPoXsFXy-dROfIMaa1_egIz3/preview'
    };

    let wotUpdated = 0;
    for (const ep of data.episodes) {
        if (ep.showId === wotShow.id) {
            const key = `${ep.season}-${ep.episodeNumber}`;
            if (wotLinks[key]) {
                ep.googleDriveUrl = wotLinks[key];
                console.log(`   ✓ Updated S${ep.season}E${ep.episodeNumber}: ${ep.title}`);
                wotUpdated++;
            }
        }
    }
    console.log(`   📊 Updated ${wotUpdated} episodes`);
}

// Save data
console.log('\n💾 Saving data...');
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

console.log('\n✅ COMPLETED!');
