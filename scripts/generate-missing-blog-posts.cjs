const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

// Generate detailed blog content for a movie/show
function generateBlogContent(item, type) {
  const isMovie = type === 'movie';
  const title = item.title;
  const year = item.year;
  const genres = item.genres || '';
  const cast = item.cast || '';
  const directors = item.directors || item.creators || '';
  const description = item.description || '';
  const language = item.language || 'English';
  const rating = item.rating || 'NR';
  const imdbRating = item.imdbRating || 'N/A';
  const duration = item.duration || 0;
  
  const slug = `${item.slug}-${year}-complete-guide`;
  
  const excerpt = `${title} (${year}) is a ${genres.split(',')[0]?.trim() || 'captivating'} ${isMovie ? 'movie' : 'TV series'} that has captured audiences worldwide. This comprehensive guide covers everything you need to know - from plot details to behind-the-scenes insights.`;
  
  const content = `${title} stands as one of the most ${genres.includes('Action') ? 'thrilling' : genres.includes('Drama') ? 'emotionally compelling' : genres.includes('Comedy') ? 'entertaining' : 'captivating'} ${isMovie ? 'films' : 'series'} of ${year}. ${isMovie ? `With a runtime that allows the story to fully develop, this ${genres.split(',')[0]?.trim()?.toLowerCase() || ''} masterpiece` : `Spanning multiple episodes, this ${genres.split(',')[0]?.trim()?.toLowerCase() || ''} series`} delivers an unforgettable viewing experience.

${description}

The ${isMovie ? 'film' : 'show'} features an impressive ensemble cast including ${cast || 'talented performers'}, each bringing depth and authenticity to their roles. ${directors ? `Under the direction of ${directors}, the production achieves a perfect balance of storytelling and visual spectacle.` : ''}

Available in ${language}, ${title} has garnered critical acclaim${imdbRating !== 'N/A' ? ` with an IMDb rating of ${imdbRating}/10` : ''}, cementing its place as a must-watch ${isMovie ? 'film' : 'series'} for fans of ${genres || 'quality entertainment'}.`;

  const plotSummary = `${title} takes viewers on an extraordinary journey through its ${genres.includes('Action') ? 'action-packed' : genres.includes('Drama') ? 'emotionally rich' : genres.includes('Thriller') ? 'suspenseful' : 'compelling'} narrative.

${description}

The story unfolds with masterful pacing, keeping audiences engaged from ${isMovie ? 'the opening scene to the final credits' : 'the first episode to the season finale'}. Each character is carefully developed, with their arcs interweaving to create a rich tapestry of human experience.

${isMovie ? 'The film' : 'The series'} explores themes of ${genres.includes('Romance') ? 'love and relationships' : genres.includes('Action') ? 'courage and perseverance' : genres.includes('Drama') ? 'human connection and growth' : genres.includes('Thriller') ? 'tension and mystery' : 'life and its complexities'}, resonating deeply with viewers across all demographics.`;

  const review = `${title} (${year}) delivers exactly what fans of ${genres || 'quality entertainment'} are looking for. ${directors ? `Director ${directors.split(',')[0]?.trim()} demonstrates` : 'The creative team demonstrates'} a clear vision that translates beautifully to the screen.

The performances are uniformly excellent. ${cast ? cast.split(',').slice(0, 2).join(' and ') : 'The lead actors'} deliver standout performances that anchor the ${isMovie ? 'film' : 'series'} emotionally. The supporting cast provides equally impressive work, creating a fully realized world.

Technically, the production values are top-notch. The cinematography captures both intimate moments and grand spectacles with equal skill. The score complements the visuals perfectly, enhancing the emotional impact of key scenes.

${imdbRating !== 'N/A' ? `With an IMDb rating of ${imdbRating}/10, audience reception has been overwhelmingly positive.` : 'Audience reception has been positive across the board.'}

**Our Rating: ${imdbRating !== 'N/A' ? (parseFloat(imdbRating) >= 8 ? '5/5 - Masterpiece' : parseFloat(imdbRating) >= 7 ? '4/5 - Highly Recommended' : parseFloat(imdbRating) >= 6 ? '3.5/5 - Worth Watching' : '3/5 - Decent') : '4/5 - Recommended'}**`;

  const boxOffice = isMovie && duration > 0 ? JSON.stringify({
    budget: 'Information not available',
    worldwide: 'Information not available',
    opening: 'Information not available'
  }) : null;

  const trivia = `• ${title} was released in ${year} and quickly became a fan favorite in the ${genres.split(',')[0]?.trim() || 'entertainment'} genre.
• The ${isMovie ? 'film' : 'series'} features ${cast ? cast.split(',').length : 'numerous'} talented cast members bringing the story to life.
• ${directors ? `${directors.split(',')[0]?.trim()} brought their unique vision to this project.` : 'The creative team worked tirelessly to bring this vision to life.'}
• Filmed with attention to detail, every scene contributes to the overall narrative.
• The ${isMovie ? 'movie' : 'show'} has been praised for its ${genres.includes('Action') ? 'stunning action sequences' : genres.includes('Drama') ? 'emotional depth' : genres.includes('Comedy') ? 'comedic timing' : 'compelling storytelling'}.`;

  const behindTheScenes = `The making of ${title} involved months of preparation and dedication from the entire cast and crew.

${directors ? `${directors.split(',')[0]?.trim()} approached this project with a clear artistic vision, working closely with the cast to achieve authentic performances.` : 'The creative team approached this project with dedication and passion.'}

The production design team created immersive environments that transport viewers into the world of the story. Every detail, from costumes to set pieces, was carefully considered to enhance the viewing experience.

${cast ? `Lead actors ${cast.split(',').slice(0, 2).join(' and ')} underwent extensive preparation for their roles, bringing depth and nuance to their characters.` : 'The cast underwent extensive preparation for their roles.'}

The post-production process involved careful editing, color grading, and sound design to create the final polished product that audiences enjoy today.`;

  const awards = `${title} has received recognition for its quality and impact:

• ${imdbRating !== 'N/A' && parseFloat(imdbRating) >= 7.5 ? 'Critically acclaimed with high audience ratings' : 'Positive reception from audiences'}
• Praised for ${genres.includes('Action') ? 'outstanding action choreography' : genres.includes('Drama') ? 'powerful performances' : genres.includes('Comedy') ? 'excellent comedic writing' : 'quality production'}
• ${cast ? `${cast.split(',')[0]?.trim()} received particular praise for their performance` : 'The ensemble cast received praise for their performances'}
• Recognized as a standout ${isMovie ? 'film' : 'series'} in the ${genres.split(',')[0]?.trim() || 'entertainment'} genre`;

  return {
    id: `blog-${item.slug}-${Date.now()}`,
    title: `${title} (${year}) - Complete Guide, Cast & Reviews`,
    slug: slug,
    contentType: type,
    contentId: item.id,
    featuredImage: item.backdropUrl || item.posterUrl,
    excerpt: excerpt,
    content: content,
    plotSummary: plotSummary,
    review: review,
    boxOffice: boxOffice,
    trivia: trivia,
    behindTheScenes: behindTheScenes,
    awards: awards,
    author: 'StreamVault Editorial',
    published: true,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function main() {
  console.log('📝 Checking for missing blog posts...\n');
  
  // Load data
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  // Get existing blog post content IDs
  const existingBlogContentIds = new Set(
    (data.blogPosts || []).map(bp => bp.contentId)
  );
  
  // Also check by slug prefix
  const existingBlogSlugs = new Set(
    (data.blogPosts || []).map(bp => bp.slug.split('-')[0])
  );
  
  // Find movies without blog posts
  const moviesWithoutBlog = data.movies.filter(movie => 
    !existingBlogContentIds.has(movie.id) && 
    !existingBlogSlugs.has(movie.slug.split('-')[0])
  );
  
  // Find shows without blog posts
  const showsWithoutBlog = data.shows.filter(show => 
    !existingBlogContentIds.has(show.id) &&
    !existingBlogSlugs.has(show.slug.split('-')[0])
  );
  
  console.log(`📊 Found:`);
  console.log(`   - ${moviesWithoutBlog.length} movies without blog posts`);
  console.log(`   - ${showsWithoutBlog.length} shows without blog posts`);
  
  if (moviesWithoutBlog.length === 0 && showsWithoutBlog.length === 0) {
    console.log('\n✅ All movies and shows have blog posts!');
    return;
  }
  
  // List them
  if (moviesWithoutBlog.length > 0) {
    console.log('\n🎬 Movies without blog posts:');
    moviesWithoutBlog.forEach(m => console.log(`   - ${m.title} (${m.year})`));
  }
  
  if (showsWithoutBlog.length > 0) {
    console.log('\n📺 Shows without blog posts:');
    showsWithoutBlog.forEach(s => console.log(`   - ${s.title} (${s.year})`));
  }
  
  // Generate blog posts
  console.log('\n📝 Generating blog posts...\n');
  
  const newBlogPosts = [];
  
  // Generate for movies
  for (const movie of moviesWithoutBlog) {
    const blogPost = generateBlogContent(movie, 'movie');
    newBlogPosts.push(blogPost);
    console.log(`   ✅ Generated blog post for: ${movie.title}`);
  }
  
  // Generate for shows
  for (const show of showsWithoutBlog) {
    const blogPost = generateBlogContent(show, 'show');
    newBlogPosts.push(blogPost);
    console.log(`   ✅ Generated blog post for: ${show.title}`);
  }
  
  // Add to data
  if (!data.blogPosts) {
    data.blogPosts = [];
  }
  data.blogPosts.push(...newBlogPosts);
  
  // Save
  console.log('\n💾 Saving data...');
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ Done! Added ${newBlogPosts.length} new blog posts.`);
  console.log(`   Total blog posts: ${data.blogPosts.length}`);
}

main();
