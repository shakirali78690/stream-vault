import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import json
import time
import os

class WorthCreteExtractor:
    def __init__(self, base_url="https://www.worthcrete.com/"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        self.history_file = "extracted_history.json"
        self.checkpoint_file = "extraction_checkpoint.json"
        self.load_history()
        self.load_checkpoint()
    
    def load_history(self):
        """Load extraction history from JSON file"""
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    self.history = json.load(f)
            except Exception as e:
                print(f"⚠️  Error loading history: {e}. Starting fresh.")
                self.history = {}
        else:
            self.history = {}
    
    def save_history(self):
        """Save extraction history to JSON file"""
        try:
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(self.history, f, indent=2, ensure_ascii=False)
            print(f"💾 History saved to: {self.history_file}")
        except Exception as e:
            print(f"❌ Error saving history: {e}")
    
    def load_checkpoint(self):
        """Load extraction checkpoint from JSON file"""
        if os.path.exists(self.checkpoint_file):
            try:
                with open(self.checkpoint_file, 'r', encoding='utf-8') as f:
                    self.checkpoint = json.load(f)
                print(f"📍 Loaded checkpoint: {self.checkpoint}")
            except Exception as e:
                print(f"⚠️  Error loading checkpoint: {e}. Starting fresh.")
                self.checkpoint = {}
        else:
            self.checkpoint = {}
    
    def save_checkpoint(self, all_results, current_category=None, current_show_index=None):
        """Save extraction checkpoint and current results"""
        checkpoint_data = {
            'all_results': all_results,
            'current_category': current_category,
            'current_show_index': current_show_index
        }
        try:
            with open(self.checkpoint_file, 'w', encoding='utf-8') as f:
                json.dump(checkpoint_data, f, indent=2, ensure_ascii=False)
            print(f"📍 Checkpoint saved at {current_category} show {current_show_index if current_show_index else 'N/A'}")
        except Exception as e:
            print(f"❌ Error saving checkpoint: {e}")
    
    def is_show_extracted(self, category, show_name):
        """Check if a show in a category has been extracted"""
        if category not in self.history:
            return False
        return show_name in self.history[category]
    
    def mark_show_extracted(self, category, show_name):
        """Mark a show as extracted in history"""
        if category not in self.history:
            self.history[category] = []
        if show_name not in self.history[category]:
            self.history[category].append(show_name)
            self.save_history()
    
    def extract_google_drive_id(self, content):
        """Extract Google Drive file ID from content with multiple patterns"""
        patterns = [
            r'drive\.google\.com/file/d/([a-zA-Z0-9_-]+)',  # Standard iframe
            r'drive-video-([a-zA-Z0-9_-]+)',                # Video ID attribute
            r'/file/d/([a-zA-Z0-9_-]+)/preview',            # Preview URL
            r'id="drive-video-([a-zA-Z0-9_-]+)"',           # ID with drive-video
            r'data-id="([a-zA-Z0-9_-]+)"',                  # Data attribute
            r'fileId["\s:=]+([a-zA-Z0-9_-]+)',              # fileId variable
            r'video[_-]?id["\s:=]+([a-zA-Z0-9_-]+)',        # video_id/videoId
            r'src="[^"]*?/d/([a-zA-Z0-9_-]+)',              # src attribute
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def extract_video_source(self, html_content):
        """Detect and extract video source from HTML content for various players"""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Look for iframe with video sources
        iframes = soup.find_all('iframe', src=re.compile(r'(drive\.google\.com|mega\.nz|youtube\.com|youtu\.be|vimeo\.com)', re.I))
        if iframes:
            src = iframes[0]['src']  # Take the first matching iframe
            if 'drive.google.com' in src:
                drive_id = self.extract_google_drive_id(src)
                if drive_id:
                    embed_src = f"https://drive.google.com/file/d/{drive_id}/preview"
                    return {
                        'type': 'google_drive',
                        'embed_code': f'<iframe src="{embed_src}" width="100%" height="480" allowfullscreen></iframe>',
                        'direct_link': f"https://drive.google.com/file/d/{drive_id}/view"
                    }
            elif 'mega.nz' in src:
                return {
                    'type': 'mega',
                    'embed_code': f'<iframe src="{src}" width="100%" height="480" frameborder="0" allowfullscreen></iframe>',
                    'direct_link': src
                }
            elif 'youtube.com' in src or 'youtu.be' in src:
                return {
                    'type': 'youtube',
                    'embed_code': f'<iframe src="{src}" width="560" height="315" frameborder="0" allowfullscreen></iframe>',
                    'direct_link': src
                }
            # General iframe fallback
            return {
                'type': 'iframe_embed',
                'embed_code': f'<iframe src="{src}" width="100%" height="480" frameborder="0" allowfullscreen></iframe>',
                'direct_link': src
            }
        
        # Look for video tag (HTML5 player)
        video = soup.find('video')
        if video:
            src_attr = video.get('src')
            if not src_attr:
                source = video.find('source')
                if source:
                    src_attr = source.get('src')
            if src_attr:
                full_src = urljoin(self.base_url, src_attr) if not src_attr.startswith('http') else src_attr
                return {
                    'type': 'html5',
                    'embed_code': f'<video src="{full_src}" controls width="100%" height="480"></video>',
                    'direct_link': full_src
                }
        
        # Fallback regex for Google Drive
        drive_id = self.extract_google_drive_id(html_content)
        if drive_id:
            embed_src = f"https://drive.google.com/file/d/{drive_id}/preview"
            return {
                'type': 'google_drive',
                'embed_code': f'<iframe src="{embed_src}" width="100%" height="480" allowfullscreen></iframe>',
                'direct_link': f"https://drive.google.com/file/d/{drive_id}/view"
            }
        
        # Fallback regex for Mega
        mega_match = re.search(r'mega\.nz/(?:file|embed)/([A-Za-z0-9]+)#?([A-Za-z0-9]+)?', html_content, re.I)
        if mega_match:
            file_id = mega_match.group(1)
            key = mega_match.group(2) or ''
            embed_src = f"https://mega.nz/embed/{file_id}#{key}"
            return {
                'type': 'mega',
                'embed_code': f'<iframe src="{embed_src}" width="100%" height="480" frameborder="0" allowfullscreen></iframe>',
                'direct_link': embed_src
            }
        
        # Additional regex for other direct video URLs (e.g., .mp4 links)
        video_match = re.search(r'(?:src|href|data-src)=["\']([^"\']*\.(?:mp4|webm|ogg|avi|mkv)[^"\']*)["\']', html_content, re.I)
        if video_match:
            video_src = video_match.group(1)
            full_src = urljoin(self.base_url, video_src) if not video_src.startswith('http') else video_src
            return {
                'type': 'direct_video',
                'embed_code': f'<video src="{full_src}" controls width="100%" height="480"></video>',
                'direct_link': full_src
            }
        
        return None
    
    def extract_season_number(self, url):
        """Extract season number from URL"""
        match = re.search(r'season[s]?-(\d+)', url.lower())
        if match:
            return int(match.group(1))
        return None
    
    def extract_episode_number(self, url):
        """Extract episode number from URL"""
        match = re.search(r'episode[s]?-(\d+)', url.lower())
        if match:
            return int(match.group(1))
        return None
    
    def get_episode_links_from_season_page(self, season_url):
        """Extract all episode links from a season page, sorted by episode number"""
        try:
            response = self.session.get(season_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract the season number from the current URL
            current_season_num = self.extract_season_number(season_url)
            
            if current_season_num is None:
                print("⚠️  Could not determine season number from URL")
                return []
            
            episode_links = []
            
            # Find all links containing "episode" in the URL
            for link in soup.find_all('a', href=True):
                href = link['href']
                
                # Must contain 'episode' keyword
                if 'episode' not in href.lower():
                    continue
                
                # Must contain the same season number as current page
                episode_season_num = self.extract_season_number(href)
                
                # Only add if it matches the current season
                if episode_season_num == current_season_num:
                    full_url = urljoin(self.base_url, href)
                    ep_num = self.extract_episode_number(full_url)
                    if ep_num:  # Only include if episode number is extractable
                        episode_links.append((ep_num, full_url))
            
            # Remove duplicates (by URL) and sort by episode number
            seen_urls = set()
            unique_episodes = []
            for ep_num, url in episode_links:
                if url not in seen_urls:
                    seen_urls.add(url)
                    unique_episodes.append((ep_num, url))
            
            unique_episodes.sort(key=lambda x: x[0])  # Sort by episode number
            
            # Extract just the URLs
            episode_links = [url for _, url in unique_episodes]
            
            return episode_links
        
        except Exception as e:
            print(f"❌ Error fetching season page: {e}")
            return []
    
    def extract_video_from_episode(self, episode_url, retries=3):
        """Extract video source from an episode page with retry logic"""
        for attempt in range(retries):
            try:
                response = self.session.get(episode_url, timeout=15)
                response.raise_for_status()
                
                video_source = self.extract_video_source(response.text)
                if video_source:
                    return video_source
                
                # If no video source found on last attempt, show debug info
                if attempt == retries - 1:
                    print(f"\n⚠️  No video source found in HTML")
                return None
            
            except requests.exceptions.Timeout:
                if attempt < retries - 1:
                    print(f"⏱️  Timeout, retry {attempt + 2}/{retries}...", end=" ")
                    time.sleep(3)
                else:
                    print(f"❌ Timeout after {retries} attempts")
                    return None
            
            except requests.exceptions.RequestException as e:
                if attempt < retries - 1:
                    print(f"⚠️  Error, retry {attempt + 2}/{retries}...", end=" ")
                    time.sleep(3)
                else:
                    print(f"❌ Failed: {str(e)[:50]}")
                    return None
        
        return None
    
    def extract_season(self, season_url, delay=2):
        """Extract all video sources from a season"""
        print(f"\n🔍 Extracting season from: {season_url}")
        print("=" * 80)
        
        # Extract season number
        season_num = self.extract_season_number(season_url)
        if season_num:
            print(f"📺 Detected: Season {season_num}")
        
        # Get all episode links, sorted by episode number
        episode_links = self.get_episode_links_from_season_page(season_url)
        
        if not episode_links:
            print("❌ No episodes found!")
            return []
        
        print(f"✅ Found {len(episode_links)} episodes\n")
        
        results = []
        failed_episodes = []
        
        for idx, episode_url in enumerate(episode_links):
            episode_num = self.extract_episode_number(episode_url)
            if episode_num is None:
                print(f"⚠️  Skipping invalid episode URL: {episode_url}")
                continue
                
            print(f"📥 [Episode {episode_num}] Processing...", end=" ")
            
            video_source = self.extract_video_from_episode(episode_url)
            
            if video_source:
                results.append({
                    'episode': episode_num,
                    'episode_url': episode_url,
                    'video_source': video_source
                })
                print(f"✓ Success ({video_source['type']})")
            else:
                failed_episodes.append({'episode': episode_num, 'url': episode_url})
                print(f"✗ Failed")
            
            # Delay between requests
            if idx < len(episode_links) - 1:
                time.sleep(delay)
        
        # Show summary
        print("\n" + "=" * 80)
        print(f"✅ Successfully extracted: {len(results)}/{len(episode_links)} episodes")
        
        if failed_episodes:
            print(f"⚠️  Failed episodes: {len(failed_episodes)}")
            for ep in failed_episodes:
                print(f"   - Episode {ep['episode']}: {ep['url']}")
        
        return results
    
    def get_season_links_from_show_page(self, show_url):
        """Extract all season links from a show's main page"""
        try:
            response = self.session.get(show_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            season_links = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                # Match season pages (e.g., "seasons-1", "seasons-2")
                if re.search(r'season[s]?-\d+', href.lower()) and 'episode' not in href.lower():
                    full_url = urljoin(self.base_url, href)
                    season_links.append(full_url)
            
            # Remove duplicates and sort by season number
            season_links = list(set(season_links))
            season_links.sort(key=lambda x: self.extract_season_number(x) or 0)
            
            return season_links
        
        except Exception as e:
            print(f"❌ Error fetching show page: {e}")
            return []
    
    def extract_show(self, show_url, show_name, delay=2):
        """Extract all seasons and episodes from a show"""
        print(f"\n🎬 Extracting show: {show_name}")
        print(f"URL: {show_url}")
        print("=" * 80)
        
        season_links = self.get_season_links_from_show_page(show_url)
        
        if not season_links:
            print("❌ No seasons found!")
            return {}
        
        print(f"✅ Found {len(season_links)} seasons\n")
        
        all_results = {}
        total_success = 0
        total_failed = 0
        
        for season_num, season_url in enumerate(season_links, 1):
            print(f"\n{'='*80}")
            print(f"🎯 SEASON {season_num}")
            results = self.extract_season(season_url, delay)
            all_results[f"Season {season_num}"] = results
            
            # Count successes
            total_success += len(results)
            episode_links = self.get_episode_links_from_season_page(season_url)
            total_failed += len(episode_links) - len(results)
        
        # Show summary
        print("\n" + "=" * 80)
        print(f"📊 Show Summary: {len(season_links)} seasons, {total_success} successful episodes")
        if total_failed > 0:
            print(f"⚠️  Total Failed Episodes: {total_failed}")
        
        return all_results
    
    def get_show_links_from_category(self, category_url):
        """Extract all show links from a category page with pagination support"""
        print(f"🔍 Fetching shows from {category_url} with pagination...")
        show_links = []
        page = 1
        max_pages = 100  # Safety limit
        
        while page <= max_pages:
            page_url = f"{category_url}?pg={page}" if page > 1 else category_url
            try:
                print(f"   Processing page {page}...")
                response = self.session.get(page_url, timeout=15)
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')
                
                page_shows = []
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    # Improved regex for show links: ends with -online-something/
                    if (re.search(r'/[^/]+-online-[^/]+/?$', href) and 
                        'seasons-' not in href.lower() and 'episode' not in href.lower()):
                        full_url = urljoin(self.base_url, href)
                        # Extract show name from the segment before 'online'
                        segments = href.rstrip('/').split('/')
                        if segments:
                            last_seg = segments[-1]
                            show_name = re.sub(r'-online-[^-]+$', '', last_seg).replace('-', ' ').title()
                            if show_name:
                                page_shows.append({
                                    'name': show_name,
                                    'url': full_url
                                })
                
                if not page_shows:
                    print(f"   No more shows on page {page}. Stopping.")
                    break
                
                show_links.extend(page_shows)
                print(f"   Found {len(page_shows)} shows on page {page}")
                page += 1
                time.sleep(1)  # Delay between pages
                
            except requests.exceptions.RequestException as e:
                print(f"   Error on page {page}: {e}")
                break
        
        # Remove duplicates based on URL
        seen_urls = set()
        unique_shows = []
        for show in show_links:
            if show['url'] not in seen_urls:
                seen_urls.add(show['url'])
                unique_shows.append(show)
        
        # Sort alphabetically by name
        unique_shows.sort(key=lambda x: x['name'])
        
        print(f"✅ Total unique shows loaded: {len(unique_shows)}")
        return unique_shows
    
    def extract_category(self, category_url, category_name, all_results, delay=2, force=False):
        """Extract all shows from a category with checkpointing"""
        print(f"\n🌐 Extracting category: {category_name}")
        print(f"URL: {category_url}")
        print("=" * 80)
        
        show_links = self.get_show_links_from_category(category_url)
        
        if not show_links:
            print("❌ No shows found!")
            return all_results
        
        print(f"✅ Found {len(show_links)} shows\n")
        
        category_results = {}
        skipped = 0
        extracted = 0
        
        # Resume from checkpoint if available
        start_index = self.checkpoint.get('current_category', '') == category_name and self.checkpoint.get('current_show_index', 0) or 0
        if start_index > 0:
            print(f"📍 Resuming from show index {start_index}")
        
        for i in range(start_index, len(show_links)):
            show_info = show_links[i]
            show_name = show_info['name']
            show_url = show_info['url']
            
            print(f"[{i+1}/{len(show_links)}] Processing: {show_name}", end=" ")
            
            if not force and self.is_show_extracted(category_name, show_name):
                print("⏭️  Skipped (already extracted)")
                skipped += 1
                continue
            
            show_results = self.extract_show(show_url, show_name, delay)
            if show_results:
                category_results[show_name] = show_results
                self.mark_show_extracted(category_name, show_name)
                extracted += 1
                all_results[category_name] = category_results  # Update all_results
                # Checkpoint after each show
                self.save_checkpoint(all_results, category_name, i+1)
            else:
                print("❌ Failed to extract show")
            
            # Delay between shows
            time.sleep(delay * 2)  # Longer delay between shows
        
        # Category summary
        print("\n" + "=" * 80)
        print(f"📊 Category Summary: {len(show_links)} shows total")
        print(f"✅ Extracted: {extracted}")
        print(f"⏭️  Skipped: {skipped}")
        
        # Clear checkpoint for this category if completed
        if len(show_links) == i + 1:
            current_checkpoint = self.checkpoint.copy()
            if 'current_category' in current_checkpoint:
                del current_checkpoint['current_category']
            if 'current_show_index' in current_checkpoint:
                del current_checkpoint['current_show_index']
            self.save_checkpoint(all_results, **current_checkpoint)
        
        return all_results
    
    def extract_all_categories(self, categories, delay=2, force=False):
        """Extract from all provided categories with checkpointing"""
        all_results = self.checkpoint.get('all_results', {}) if self.checkpoint else {}
        total_extracted_shows = sum(len(shows) for shows in all_results.values()) if all_results else 0
        
        # Resume from checkpoint if available
        resume_category = self.checkpoint.get('current_category', None)
        if resume_category:
            print(f"📍 Resuming extraction from category: {resume_category}")
            categories_to_process = {k: v for k, v in categories.items() if k == resume_category}
            if not categories_to_process:
                categories_to_process = categories
        else:
            categories_to_process = categories
        
        for category_name, category_url in categories_to_process.items():
            print(f"\n{'='*100}")
            print(f"🚀 STARTING CATEGORY: {category_name}")
            print(f"{'='*100}")
            
            all_results = self.extract_category(category_url, category_name, all_results, delay, force)
            total_extracted_shows = sum(len(shows) for shows in all_results.values())
            
            # Checkpoint after each category
            self.save_checkpoint(all_results, category_name)
        
        # Final summary
        print("\n" + "=" * 100)
        print("🎊 GRAND FINAL SUMMARY")
        print("=" * 100)
        print(f"📊 Total Categories Processed: {len(categories)}")
        print(f"✅ Total Shows Extracted: {total_extracted_shows}")
        print(f"💾 Check history file: {self.history_file}")
        print(f"📍 Checkpoint file: {self.checkpoint_file}")
        
        # Clear checkpoint on completion
        try:
            os.remove(self.checkpoint_file)
            print("🗑️  Checkpoint cleared (extraction complete)")
        except:
            pass
        
        return all_results
    
    def save_to_json(self, data, filename="all_links.json"):
        """Save extracted data to JSON file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"\n💾 Data saved to: {filename}")
        except Exception as e:
            print(f"❌ Error saving file: {e}")
    
    def save_to_txt(self, data, filename="all_links.txt"):
        """Save extracted data to simple text file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                if isinstance(data, dict):
                    for category_name, shows in data.items():
                        if isinstance(shows, dict):
                            f.write(f"\n{'='*80}\n")
                            f.write(f"CATEGORY: {category_name.upper()}\n")
                            f.write(f"{'='*80}\n")
                            for show_name, seasons in shows.items():
                                f.write(f"\n📺 SHOW: {show_name}\n")
                                f.write("-" * 50 + "\n")
                                if isinstance(seasons, dict):
                                    for season_name, episodes in seasons.items():
                                        f.write(f"{season_name} ({len(episodes)} episodes)\n")
                                        f.write("-" * 30 + "\n")
                                        for ep in episodes:
                                            vs = ep['video_source']
                                            f.write(f"  Episode {ep['episode']} ({vs['type']}): {vs['direct_link']}\n")
                                            f.write(f"    Embed: {vs['embed_code']}\n")
            print(f"💾 Data saved to: {filename}")
        except Exception as e:
            print(f"❌ Error saving file: {e}")
    
    def print_results(self, results):
        """Print results in a formatted way"""
        print("\n" + "=" * 100)
        print("📋 GRAND EXTRACTION RESULTS")
        print("=" * 100)
        
        if isinstance(results, dict):
            for category_name, shows in results.items():
                if isinstance(shows, dict):
                    print(f"\n🌐 {category_name.upper()}")
                    print("-" * 80)
                    for show_name, seasons in shows.items():
                        print(f"\n  🎬 {show_name}")
                        print("  " + "-" * 50)
                        if isinstance(seasons, dict):
                            total_eps = sum(len(ep) for ep in seasons.values())
                            print(f"  📊 Total Episodes: {total_eps}")
                            for season_name, episodes in seasons.items():
                                print(f"    {season_name} ({len(episodes)} episodes)")
                                for ep in episodes:
                                    vs = ep['video_source']
                                    print(f"      Episode {ep['episode']} ({vs['type']}): {vs['direct_link']}")
                                    print(f"        Embed: {vs['embed_code'][:100]}...")
        else:
            print("No results to display.")


def main():
    """Main execution function"""
    print("\n" + "="*100)
    print("🎬 WORTHCRETE FULL CATEGORY EXTRACTOR v4.1 (Fixed Episode Sorting)")
    print("="*100)
    print("\nThis script extracts all shows from the three categories with support for multiple video players and pagination:")
    print("• Google Drive")
    print("• Mega.nz embeds")
    print("• HTML5 video players")
    print("• YouTube and general iframes")
    print("\nPagination: Automatically fetches all pages via ?pg=N until no more shows.")
    print("\nCheckpoint System: Saves progress after each show and category. Resumes automatically if interrupted.")
    print("\nEpisode Fix: Now extracts and sorts episodes by actual episode number from URL.")
    print("\nCategories:")
    print("1. English Seasons: https://www.worthcrete.com/literature/seasons/english-seasons/")
    print("2. Hindi Seasons: https://www.worthcrete.com/literature/seasons/hindi-seasons/")
    print("3. Hindi Dubbed Seasons: https://www.worthcrete.com/literature/seasons/hindi-dubbed-seasons/")
    print("\nOptions:")
    print("1. Extract all categories (skip already extracted shows)")
    print("2. Extract all categories (FORCE re-extract everything)")
    
    choice = input("\nEnter your choice (1/2): ").strip()
    
    if choice not in ['1', '2']:
        print("❌ Invalid choice! Please run again and choose 1 or 2.")
        return
    
    force = (choice == "2")
    
    extractor = WorthCreteExtractor()
    
    categories = {
        "English Seasons": "https://www.worthcrete.com/literature/seasons/english-seasons/",
        "Hindi Seasons": "https://www.worthcrete.com/literature/seasons/hindi-seasons/",
        "Hindi Dubbed Seasons": "https://www.worthcrete.com/literature/seasons/hindi-dubbed-seasons/"
    }
    
    all_results = extractor.extract_all_categories(categories, delay=2, force=force)
    
    if all_results:
        extractor.print_results(all_results)
        
        # Save files
        extractor.save_to_json(all_results, "all_categories_links.json")
        extractor.save_to_txt(all_results, "all_categories_links.txt")
    
    print("\n" + "="*100)
    print("✅ Full extraction complete!")
    print(f"📝 History updated: {extractor.history_file}")
    print("="*100)


if __name__ == "__main__":
    main()