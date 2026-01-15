/**
 * Weekly Newsletter Script
 * Sends new movies/shows to all subscribers via Resend
 * 
 * Usage: node scripts/send-newsletter.cjs
 * 
 * Set RESEND_API_KEY in .env
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');
const SUBSCRIBERS_FILE = path.join(__dirname, '..', 'data', 'subscribers.json');

// How many days back to look for new content
const DAYS_BACK = 7;

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.log(`📧 [DRY RUN] Would send to: ${to}`);
    console.log(`   Subject: ${subject}`);
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'StreamVault <noreply@streamvault.live>',
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to send to ${to}:`, error);
      return false;
    }

    console.log(`✅ Sent to ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending to ${to}:`, error.message);
    return false;
  }
}

function getNewContent(data, daysBack) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const newShows = (data.shows || []).filter(show => {
    const createdAt = new Date(show.createdAt || 0);
    return createdAt >= cutoffDate;
  }).slice(0, 6);

  const newMovies = (data.movies || []).filter(movie => {
    const createdAt = new Date(movie.createdAt || 0);
    return createdAt >= cutoffDate;
  }).slice(0, 6);

  const newAnime = (data.anime || []).filter(anime => {
    const createdAt = new Date(anime.createdAt || 0);
    return createdAt >= cutoffDate;
  }).slice(0, 6);

  return { newShows, newMovies, newAnime };
}

function generateContentCard(item, type) {
  let url;
  if (type === 'show') {
    url = `https://streamvault.live/show/${item.slug}`;
  } else if (type === 'anime') {
    url = `https://streamvault.live/anime/${item.slug}`;
  } else {
    url = `https://streamvault.live/movie/${item.slug}`;
  }

  return `
    <td style="width: 180px; padding: 8px; vertical-align: top;">
      <a href="${url}" style="text-decoration: none; display: block;">
        <div style="background: #1a1a1a; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.4); transition: transform 0.2s;">
          <img src="${item.posterUrl}" alt="${item.title}" style="width: 100%; height: 240px; object-fit: cover; display: block;">
          <div style="padding: 12px; background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%);">
            <h3 style="color: #fff; margin: 0 0 6px 0; font-size: 13px; font-weight: 600; line-height: 1.3; height: 34px; overflow: hidden;">${item.title}</h3>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="color: #888; font-size: 11px;">${item.year}</span>
              <span style="background: #e50914; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">⭐ ${item.imdbRating || 'N/A'}</span>
            </div>
            <div style="background: linear-gradient(90deg, #e50914 0%, #b20710 100%); color: #fff; text-align: center; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">
              ▶ Watch Now
            </div>
          </div>
        </div>
      </a>
    </td>
  `;
}

function generateEmailHTML(newShows, newMovies, newAnime = []) {
  // Generate show cards in rows of 3
  let showsHTML = '';
  if (newShows.length > 0) {
    showsHTML = `
      <div style="margin: 30px 0;">
        <h2 style="color: #fff; font-size: 20px; margin: 0 0 20px 0; padding-left: 10px; border-left: 4px solid #e50914;">
          📺 New TV Shows
        </h2>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            ${newShows.slice(0, 3).map(show => generateContentCard(show, 'show')).join('')}
          </tr>
          ${newShows.length > 3 ? `
          <tr>
            ${newShows.slice(3, 6).map(show => generateContentCard(show, 'show')).join('')}
          </tr>
          ` : ''}
        </table>
      </div>
    `;
  }

  // Generate movie cards in rows of 3
  let moviesHTML = '';
  if (newMovies.length > 0) {
    moviesHTML = `
      <div style="margin: 30px 0;">
        <h2 style="color: #fff; font-size: 20px; margin: 0 0 20px 0; padding-left: 10px; border-left: 4px solid #e50914;">
          🎬 New Movies
        </h2>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            ${newMovies.slice(0, 3).map(movie => generateContentCard(movie, 'movie')).join('')}
          </tr>
          ${newMovies.length > 3 ? `
          <tr>
            ${newMovies.slice(3, 6).map(movie => generateContentCard(movie, 'movie')).join('')}
          </tr>
          ` : ''}
        </table>
      </div>
    `;
  }

  // Generate anime cards in rows of 3
  let animeHTML = '';
  if (newAnime.length > 0) {
    animeHTML = `
      <div style="margin: 30px 0;">
        <h2 style="color: #fff; font-size: 20px; margin: 0 0 20px 0; padding-left: 10px; border-left: 4px solid #ff6b9d;">
          🎌 New Anime
        </h2>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            ${newAnime.slice(0, 3).map(anime => generateContentCard(anime, 'anime')).join('')}
          </tr>
          ${newAnime.length > 3 ? `
          <tr>
            ${newAnime.slice(3, 6).map(anime => generateContentCard(anime, 'anime')).join('')}
          </tr>
          ` : ''}
        </table>
      </div>
    `;
  }

  const totalNew = newShows.length + newMovies.length + newAnime.length;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StreamVault Weekly Newsletter</title>
</head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <div style="max-width: 600px; margin: 0 auto;">
    
    <!-- Header with gradient -->
    <div style="background: linear-gradient(135deg, #e50914 0%, #8b0000 50%, #1a1a1a 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 36px; font-weight: 800; letter-spacing: -1px; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
        StreamVault
      </h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px; font-weight: 500;">
        🎬 Weekly Entertainment Digest
      </p>
    </div>

    <!-- Hero Section -->
    <div style="background: linear-gradient(180deg, #1a1a1a 0%, #141414 100%); padding: 30px 20px; text-align: center;">
      <div style="background: rgba(229, 9, 20, 0.1); border: 1px solid rgba(229, 9, 20, 0.3); border-radius: 50px; display: inline-block; padding: 8px 20px; margin-bottom: 15px;">
        <span style="color: #e50914; font-size: 13px; font-weight: 600;">🔥 This Week's Highlights</span>
      </div>
      <h2 style="color: #fff; margin: 0 0 10px 0; font-size: 26px; font-weight: 700;">
        ${totalNew > 0 ? `${totalNew} Fresh Titles Just Added!` : 'Your Weekly Update'}
      </h2>
      <p style="color: #888; margin: 0; font-size: 14px;">
        ${totalNew > 0 ? 'Check out what\'s new on StreamVault' : 'Explore our vast library of content'}
      </p>
    </div>

    <!-- Content Section -->
    <div style="background: #141414; padding: 10px 20px 30px 20px;">
      
      ${showsHTML}
      ${moviesHTML}
      ${animeHTML}
      
      ${totalNew === 0 ? `
        <div style="text-align: center; padding: 50px 20px; background: rgba(255,255,255,0.03); border-radius: 16px; margin: 20px 0;">
          <div style="font-size: 48px; margin-bottom: 15px;">🎭</div>
          <p style="color: #888; font-size: 16px; margin: 0 0 8px 0;">No new releases this week</p>
          <p style="color: #555; font-size: 13px; margin: 0;">But we have 200+ movies & shows waiting for you!</p>
        </div>
      ` : ''}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0 20px 0;">
        <a href="https://streamvault.live" style="display: inline-block; background: linear-gradient(90deg, #e50914 0%, #b20710 100%); color: #fff; padding: 16px 50px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 8px 25px rgba(229, 9, 20, 0.35); text-transform: uppercase; letter-spacing: 1px;">
          🎬 Explore All Content
        </a>
      </div>

      <!-- Stats Section -->
      <div style="background: rgba(255,255,255,0.03); border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align: center; padding: 10px;">
              <div style="color: #e50914; font-size: 32px; font-weight: 800;">100+</div>
              <div style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">TV Shows</div>
            </td>
            <td style="text-align: center; padding: 10px; border-left: 1px solid #333; border-right: 1px solid #333;">
              <div style="color: #e50914; font-size: 32px; font-weight: 800;">100+</div>
              <div style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Movies</div>
            </td>
            <td style="text-align: center; padding: 10px;">
              <div style="color: #e50914; font-size: 32px; font-weight: 800;">HD</div>
              <div style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Quality</div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #0a0a0a; padding: 30px 20px; text-align: center; border-top: 1px solid #222;">
      <!-- Social Icons -->
      <div style="margin-bottom: 20px;">
        <a href="https://twitter.streamvault.in" style="display: inline-block; width: 36px; height: 36px; background: #1a1a1a; border-radius: 50%; margin: 0 5px; line-height: 36px; text-decoration: none; color: #888; font-size: 14px;">X</a>
        <a href="https://instagram.streamvault.in" style="display: inline-block; width: 36px; height: 36px; background: #1a1a1a; border-radius: 50%; margin: 0 5px; line-height: 36px; text-decoration: none; color: #888; font-size: 14px;">IG</a>
        <a href="https://telegram.streamvault.in" style="display: inline-block; width: 36px; height: 36px; background: #1a1a1a; border-radius: 50%; margin: 0 5px; line-height: 36px; text-decoration: none; color: #888; font-size: 14px;">TG</a>
        <a href="https://whatsapp.streamvault.in" style="display: inline-block; width: 36px; height: 36px; background: #1a1a1a; border-radius: 50%; margin: 0 5px; line-height: 36px; text-decoration: none; color: #888; font-size: 14px;">WA</a>
      </div>
      
      <p style="color: #444; font-size: 11px; margin: 0 0 8px 0;">
        You received this email because you subscribed to StreamVault newsletter.
      </p>
      <p style="color: #333; font-size: 11px; margin: 0;">
        © 2024 StreamVault. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

async function main() {
  console.log('📬 StreamVault Weekly Newsletter');
  console.log('================================\n');

  // Check for subscribers
  if (!fs.existsSync(SUBSCRIBERS_FILE)) {
    console.log('❌ No subscribers file found');
    return;
  }

  const subscribersData = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8'));
  const subscribers = subscribersData.subscribers || [];

  if (subscribers.length === 0) {
    console.log('❌ No subscribers found');
    return;
  }

  console.log(`📧 Found ${subscribers.length} subscriber(s)`);

  // Load content data
  if (!fs.existsSync(DATA_FILE)) {
    console.log('❌ No data file found');
    return;
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const { newShows, newMovies, newAnime } = getNewContent(data, DAYS_BACK);

  console.log(`📺 New shows (last ${DAYS_BACK} days): ${newShows.length}`);
  console.log(`🎬 New movies (last ${DAYS_BACK} days): ${newMovies.length}`);
  console.log(`🎌 New anime (last ${DAYS_BACK} days): ${newAnime.length}`);

  const totalNew = newShows.length + newMovies.length + newAnime.length;

  if (totalNew === 0) {
    console.log('\n⚠️  No new content to send. Sending reminder email anyway...');
  }

  // Generate email
  const emailHTML = generateEmailHTML(newShows, newMovies, newAnime);
  const subject = totalNew > 0
    ? `🎬 ${totalNew} New Titles on StreamVault This Week!`
    : '📺 StreamVault Weekly Update';

  console.log(`\n📤 Sending emails...`);
  console.log(`   Subject: ${subject}\n`);

  // Send to all subscribers
  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    const success = await sendEmail(subscriber.email, subject, emailHTML);
    if (success) sent++;
    else failed++;

    // Rate limiting - wait 100ms between emails
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n✅ Newsletter complete!`);
  console.log(`   Sent: ${sent}`);
  console.log(`   Failed: ${failed}`);
}

main().catch(console.error);
