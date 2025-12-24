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
    }).slice(0, 5);

    const newMovies = (data.movies || []).filter(movie => {
        const createdAt = new Date(movie.createdAt || 0);
        return createdAt >= cutoffDate;
    }).slice(0, 5);

    return { newShows, newMovies };
}

function generateEmailHTML(newShows, newMovies) {
    const showsHTML = newShows.length > 0 ? `
    <h2 style="color: #e50914; margin-top: 30px;">📺 New TV Shows</h2>
    ${newShows.map(show => `
      <div style="margin-bottom: 20px; padding: 15px; background: #1a1a1a; border-radius: 8px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right: 15px;">
              <img src="${show.posterUrl}" alt="${show.title}" style="width: 80px; border-radius: 4px;">
            </td>
            <td style="vertical-align: top;">
              <h3 style="margin: 0 0 5px 0; color: #fff;">${show.title}</h3>
              <p style="margin: 0 0 5px 0; color: #888; font-size: 14px;">${show.year} • ${show.genres}</p>
              <p style="margin: 0 0 10px 0; color: #ccc; font-size: 14px;">${(show.description || '').substring(0, 100)}...</p>
              <a href="https://streamvault.live/show/${show.slug}" style="color: #e50914; text-decoration: none; font-weight: bold;">Watch Now →</a>
            </td>
          </tr>
        </table>
      </div>
    `).join('')}
  ` : '';

    const moviesHTML = newMovies.length > 0 ? `
    <h2 style="color: #e50914; margin-top: 30px;">🎬 New Movies</h2>
    ${newMovies.map(movie => `
      <div style="margin-bottom: 20px; padding: 15px; background: #1a1a1a; border-radius: 8px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right: 15px;">
              <img src="${movie.posterUrl}" alt="${movie.title}" style="width: 80px; border-radius: 4px;">
            </td>
            <td style="vertical-align: top;">
              <h3 style="margin: 0 0 5px 0; color: #fff;">${movie.title}</h3>
              <p style="margin: 0 0 5px 0; color: #888; font-size: 14px;">${movie.year} • ${movie.genres}</p>
              <p style="margin: 0 0 10px 0; color: #ccc; font-size: 14px;">${(movie.description || '').substring(0, 100)}...</p>
              <a href="https://streamvault.live/movie/${movie.slug}" style="color: #e50914; text-decoration: none; font-weight: bold;">Watch Now →</a>
            </td>
          </tr>
        </table>
      </div>
    `).join('')}
  ` : '';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #333;">
          <h1 style="color: #e50914; margin: 0; font-size: 28px;">StreamVault</h1>
          <p style="color: #888; margin: 5px 0 0 0;">Your Weekly Entertainment Update</p>
        </div>

        <!-- Content -->
        <div style="padding: 20px 0;">
          <p style="color: #fff; font-size: 16px;">Hey there! 👋</p>
          <p style="color: #ccc; font-size: 15px;">Here's what's new on StreamVault this week:</p>
          
          ${showsHTML}
          ${moviesHTML}
          
          ${newShows.length === 0 && newMovies.length === 0 ? `
            <p style="color: #888; text-align: center; padding: 40px 0;">
              No new content this week, but stay tuned! We're always adding new shows and movies.
            </p>
          ` : ''}
        </div>

        <!-- CTA -->
        <div style="text-align: center; padding: 30px 0;">
          <a href="https://streamvault.live" style="display: inline-block; background: #e50914; color: #fff; padding: 15px 40px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Browse All Content
          </a>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #333; padding: 20px 0; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            You're receiving this because you subscribed to StreamVault newsletter.
          </p>
          <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
            © 2024 StreamVault. All rights reserved.
          </p>
          <div style="margin-top: 15px;">
            <a href="https://twitter.streamvault.in" style="color: #888; text-decoration: none; margin: 0 10px;">Twitter</a>
            <a href="https://instagram.streamvault.in" style="color: #888; text-decoration: none; margin: 0 10px;">Instagram</a>
            <a href="https://telegram.streamvault.in" style="color: #888; text-decoration: none; margin: 0 10px;">Telegram</a>
          </div>
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
    const { newShows, newMovies } = getNewContent(data, DAYS_BACK);

    console.log(`📺 New shows (last ${DAYS_BACK} days): ${newShows.length}`);
    console.log(`🎬 New movies (last ${DAYS_BACK} days): ${newMovies.length}`);

    if (newShows.length === 0 && newMovies.length === 0) {
        console.log('\n⚠️  No new content to send. Sending reminder email anyway...');
    }

    // Generate email
    const emailHTML = generateEmailHTML(newShows, newMovies);
    const subject = newShows.length + newMovies.length > 0
        ? `🎬 ${newShows.length + newMovies.length} New Titles on StreamVault This Week!`
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
