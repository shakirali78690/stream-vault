"""
StreamVault Missing Shows Extractor
Based on universalv6.py - extracts links for shows NOT yet in StreamVault

Usage: python scripts/extract_missing_shows.py
"""

import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import json
import time
import os

class StreamVaultExtractor:
    def __init__(self, base_url="https://www.worthcrete.com/", data_file="data/streamvault-data.json"):
        self.base_url = base_url
        self.data_file = data_file
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        self.output_file = "scripts/missing_shows_links.json"
        self.checkpoint_file = "scripts/extraction_checkpoint.json"
        self.existing_shows = set()
        self.load_existing_shows()
        self.load_checkpoint()
    
    def load_existing_shows(self):
        """Load existing show slugs from StreamVault data"""
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Extract show slugs (normalized to lowercase for comparison)
            if 'shows' in data:
                for show in data['shows']:
                    slug = show.get('slug', '').lower().strip()
                    title = show.get('title', '').lower().strip()
                    
                    # Add the slug and title directly
                    if slug:
                        self.existing_shows.add(slug)
                    if title:
                        self.existing_shows.add(title)
                    
                    # Add normalized versions (remove all special chars)
                    if title:
                        normalized = re.sub(r'[^a-z0-9]', '', title)
                        self.existing_shows.add(normalized)
                        # Also add slug-style (replace spaces/special with dashes)
                        slug_style = re.sub(r'[^a-z0-9]+', '-', title).strip('-')
                        self.existing_shows.add(slug_style)
            
            print(f"✅ Loaded {len(data.get('shows', []))} shows from StreamVault")
            print(f"   ({len(self.existing_shows)} match patterns)")
        except Exception as e:
            print(f"❌ Error loading StreamVault data: {e}")
            self.existing_shows = set()
    
    def normalize_name(self, name):
        """Normalize a show name for comparison"""
        name_lower = name.lower().strip()
        # Remove common suffixes like "Season X", "S01", etc.
        name_lower = re.sub(r'\s*season\s*\d+$', '', name_lower, flags=re.I)
        name_lower = re.sub(r'\s*s\d+$', '', name_lower, flags=re.I)
        return name_lower
    
    def is_show_in_streamvault(self, show_name):
        """Check if a show already exists in StreamVault"""
        name_lower = self.normalize_name(show_name)
        normalized = re.sub(r'[^a-z0-9]', '', name_lower)
        slug = re.sub(r'[^a-z0-9]+', '-', name_lower).strip('-')
        
        # Direct matches
        if name_lower in self.existing_shows:
            return True
        if normalized in self.existing_shows:
            return True
        if slug in self.existing_shows:
            return True
        
        # Partial match - check if any existing show contains this name or vice versa
        for existing in self.existing_shows:
            existing_norm = re.sub(r'[^a-z0-9]', '', existing)
            if len(normalized) > 4 and len(existing_norm) > 4:
                # Check if one contains the other (for similar names)
                if normalized in existing_norm or existing_norm in normalized:
                    return True
        
        return False
    
    def load_checkpoint(self):
        """Load extraction checkpoint"""
        if os.path.exists(self.checkpoint_file):
            try:
                with open(self.checkpoint_file, 'r', encoding='utf-8') as f:
                    self.checkpoint = json.load(f)
                print(f"📍 Loaded checkpoint")
            except:
                self.checkpoint = {}
        else:
            self.checkpoint = {}
    
    def save_checkpoint(self, results, category=None, show_index=None):
        """Save checkpoint"""
        checkpoint = {
            'results': results,
            'category': category,
            'show_index': show_index
        }
        try:
            with open(self.checkpoint_file, 'w', encoding='utf-8') as f:
                json.dump(checkpoint, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"❌ Error saving checkpoint: {e}")
    
    def extract_google_drive_id(self, content):
        """Extract Google Drive file ID from content"""
        patterns = [
            r'drive\.google\.com/file/d/([a-zA-Z0-9_-]+)',
            r'drive-video-([a-zA-Z0-9_-]+)',
            r'/file/d/([a-zA-Z0-9_-]+)/preview',
            r'id="drive-video-([a-zA-Z0-9_-]+)"',
            r'data-id="([a-zA-Z0-9_-]+)"',
            r'fileId["\s:=]+([a-zA-Z0-9_-]+)',
            r'src="[^"]*?/d/([a-zA-Z0-9_-]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def extract_video_source(self, html_content):
        """Detect and extract video source from HTML"""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Look for iframe with video sources
        iframes = soup.find_all('iframe', src=re.compile(r'(drive\.google\.com|mega\.nz|youtube\.com|youtu\.be|vimeo\.com)', re.I))
        if iframes:
            src = iframes[0]['src']
            if 'drive.google.com' in src:
                drive_id = self.extract_google_drive_id(src)
                if drive_id:
                    return {
                        'type': 'google_drive',
                        'drive_id': drive_id,
                        'embed_url': f"https://drive.google.com/file/d/{drive_id}/preview"
                    }
            return {'type': 'iframe', 'src': src}
        
        # Look for video tag
        video = soup.find('video')
        if video:
            src_attr = video.get('src')
            if not src_attr:
                source = video.find('source')
                if source:
                    src_attr = source.get('src')
            if src_attr:
                full_src = urljoin(self.base_url, src_attr) if not src_attr.startswith('http') else src_attr
                return {'type': 'html5', 'src': full_src}
        
        # Fallback regex for Google Drive
        drive_id = self.extract_google_drive_id(html_content)
        if drive_id:
            return {
                'type': 'google_drive',
                'drive_id': drive_id,
                'embed_url': f"https://drive.google.com/file/d/{drive_id}/preview"
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
    
    def get_episode_links(self, season_url):
        """Extract episode links from season page"""
        try:
            response = self.session.get(season_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            current_season = self.extract_season_number(season_url)
            if current_season is None:
                return []
            
            episodes = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                if 'episode' not in href.lower():
                    continue
                
                ep_season = self.extract_season_number(href)
                if ep_season == current_season:
                    full_url = urljoin(self.base_url, href)
                    ep_num = self.extract_episode_number(full_url)
                    if ep_num:
                        episodes.append((ep_num, full_url))
            
            # Remove duplicates and sort
            seen = set()
            unique = []
            for ep_num, url in episodes:
                if url not in seen:
                    seen.add(url)
                    unique.append((ep_num, url))
            unique.sort(key=lambda x: x[0])
            
            return [url for _, url in unique]
        except Exception as e:
            print(f"❌ Error fetching season: {e}")
            return []
    
    def extract_video_from_episode(self, episode_url, retries=3):
        """Extract video source from episode page"""
        for attempt in range(retries):
            try:
                response = self.session.get(episode_url, timeout=15)
                response.raise_for_status()
                return self.extract_video_source(response.text)
            except Exception as e:
                if attempt < retries - 1:
                    time.sleep(2)
                else:
                    return None
        return None
    
    def get_season_links(self, show_url):
        """Get season links from show page"""
        try:
            response = self.session.get(show_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            seasons = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                if re.search(r'season[s]?-\d+', href.lower()) and 'episode' not in href.lower():
                    full_url = urljoin(self.base_url, href)
                    seasons.append(full_url)
            
            seasons = list(set(seasons))
            seasons.sort(key=lambda x: self.extract_season_number(x) or 0)
            return seasons
        except Exception as e:
            print(f"❌ Error fetching show: {e}")
            return []
    
    def extract_show(self, show_url, show_name, delay=1):
        """Extract all episodes from a show"""
        print(f"\n🎬 Extracting: {show_name}")
        
        season_links = self.get_season_links(show_url)
        if not season_links:
            print("  ❌ No seasons found")
            return {}
        
        print(f"  ✅ Found {len(season_links)} seasons")
        
        all_episodes = {}
        
        for season_url in season_links:
            season_num = self.extract_season_number(season_url)
            print(f"  📺 Season {season_num}...")
            
            episode_links = self.get_episode_links(season_url)
            print(f"    Found {len(episode_links)} episodes")
            
            season_data = []
            for ep_url in episode_links:
                ep_num = self.extract_episode_number(ep_url)
                video = self.extract_video_from_episode(ep_url)
                
                if video:
                    season_data.append({
                        'episode': ep_num,
                        'url': ep_url,
                        'video': video
                    })
                    print(f"    ✓ Episode {ep_num}")
                else:
                    print(f"    ✗ Episode {ep_num}")
                
                time.sleep(delay)
            
            all_episodes[f"Season {season_num}"] = season_data
        
        return all_episodes
    
    def get_shows_from_category(self, category_url):
        """Get all shows from category with pagination"""
        print(f"🔍 Fetching shows from {category_url}...")
        shows = []
        page = 1
        
        while page <= 50:  # Safety limit
            page_url = f"{category_url}?pg={page}" if page > 1 else category_url
            try:
                response = self.session.get(page_url, timeout=15)
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')
                
                page_shows = []
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    if (re.search(r'/[^/]+-online-[^/]+/?$', href) and 
                        'seasons-' not in href.lower() and 'episode' not in href.lower()):
                        full_url = urljoin(self.base_url, href)
                        segments = href.rstrip('/').split('/')
                        if segments:
                            last_seg = segments[-1]
                            show_name = re.sub(r'-online-[^-]+$', '', last_seg).replace('-', ' ').title()
                            if show_name:
                                page_shows.append({'name': show_name, 'url': full_url})
                
                if not page_shows:
                    break
                
                shows.extend(page_shows)
                print(f"   Page {page}: {len(page_shows)} shows")
                page += 1
                time.sleep(1)
                
            except Exception as e:
                print(f"   Error on page {page}: {e}")
                break
        
        # Remove duplicates
        seen = set()
        unique = []
        for show in shows:
            if show['url'] not in seen:
                seen.add(show['url'])
                unique.append(show)
        
        unique.sort(key=lambda x: x['name'])
        print(f"✅ Total shows: {len(unique)}")
        return unique
    
    def extract_missing_shows(self, delay=1):
        """Main extraction - only shows NOT in StreamVault"""
        categories = {
            "English Seasons": "https://www.worthcrete.com/literature/seasons/english-seasons/",
            "Hindi Seasons": "https://www.worthcrete.com/literature/seasons/hindi-seasons/",
            "Hindi Dubbed Seasons": "https://www.worthcrete.com/literature/seasons/hindi-dubbed-seasons/"
        }
        
        results = self.checkpoint.get('results', {})
        
        for cat_name, cat_url in categories.items():
            print(f"\n{'='*80}")
            print(f"🌐 CATEGORY: {cat_name}")
            print(f"{'='*80}")
            
            if cat_name not in results:
                results[cat_name] = {}
            
            shows = self.get_shows_from_category(cat_url)
            
            # Filter out shows already in StreamVault
            missing = [s for s in shows if not self.is_show_in_streamvault(s['name'])]
            already_in = len(shows) - len(missing)
            
            print(f"\n📊 {already_in} shows already in StreamVault")
            print(f"📊 {len(missing)} shows to extract\n")
            
            for i, show in enumerate(missing):
                print(f"\n[{i+1}/{len(missing)}] {show['name']}")
                
                if show['name'] in results[cat_name]:
                    print("  ⏭️  Already extracted")
                    continue
                
                show_data = self.extract_show(show['url'], show['name'], delay)
                if show_data:
                    results[cat_name][show['name']] = {
                        'url': show['url'],
                        'seasons': show_data
                    }
                    self.save_checkpoint(results, cat_name, i)
                
                time.sleep(delay * 2)
        
        # Save final results
        self.save_results(results)
        return results
    
    def save_results(self, results):
        """Save extraction results"""
        try:
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"\n💾 Results saved to: {self.output_file}")
        except Exception as e:
            print(f"❌ Error saving: {e}")
    
    def print_summary(self, results):
        """Print extraction summary"""
        print("\n" + "="*80)
        print("📋 EXTRACTION SUMMARY")
        print("="*80)
        
        total_shows = 0
        total_episodes = 0
        
        for cat_name, shows in results.items():
            print(f"\n🌐 {cat_name}")
            for show_name, show_data in shows.items():
                if isinstance(show_data, dict) and 'seasons' in show_data:
                    eps = sum(len(s) for s in show_data['seasons'].values())
                    total_episodes += eps
                    total_shows += 1
                    print(f"  📺 {show_name}: {len(show_data['seasons'])} seasons, {eps} episodes")
        
        print(f"\n✅ Total: {total_shows} shows, {total_episodes} episodes")


def main():
    print("\n" + "="*80)
    print("🎬 STREAMVAULT MISSING SHOWS EXTRACTOR")
    print("="*80)
    print("\nThis script extracts links for shows NOT yet in StreamVault")
    print("from WorthCrete categories.\n")
    print("Categories:")
    print("• English Seasons")
    print("• Hindi Seasons")
    print("• Hindi Dubbed Seasons")
    
    print("\nOptions:")
    print("1. DRY RUN - Preview which shows would be extracted (no extraction)")
    print("2. EXTRACT - Actually extract missing shows")
    
    choice = input("\nEnter choice (1/2): ").strip()
    
    extractor = StreamVaultExtractor()
    
    if choice == "1":
        # Dry run - just show which shows are missing/already added
        categories = {
            "English Seasons": "https://www.worthcrete.com/literature/seasons/english-seasons/",
            "Hindi Seasons": "https://www.worthcrete.com/literature/seasons/hindi-seasons/",
            "Hindi Dubbed Seasons": "https://www.worthcrete.com/literature/seasons/hindi-dubbed-seasons/"
        }
        
        for cat_name, cat_url in categories.items():
            print(f"\n{'='*80}")
            print(f"🌐 CATEGORY: {cat_name}")
            print(f"{'='*80}")
            
            shows = extractor.get_shows_from_category(cat_url)
            
            # Separate into found and missing
            in_streamvault = []
            not_in_streamvault = []
            
            for show in shows:
                if extractor.is_show_in_streamvault(show['name']):
                    in_streamvault.append(show['name'])
                else:
                    not_in_streamvault.append(show['name'])
            
            print(f"\n✅ Already in StreamVault ({len(in_streamvault)}):")
            for name in sorted(in_streamvault)[:20]:  # Show first 20
                print(f"   • {name}")
            if len(in_streamvault) > 20:
                print(f"   ... and {len(in_streamvault) - 20} more")
            
            print(f"\n❌ NOT in StreamVault ({len(not_in_streamvault)}) - Would be extracted:")
            for name in sorted(not_in_streamvault):
                print(f"   • {name}")
        
        print("\n" + "="*80)
        print("✅ DRY RUN COMPLETE - No extraction performed")
        print("="*80)
        
    elif choice == "2":
        results = extractor.extract_missing_shows(delay=1)
        extractor.print_summary(results)
        
        print("\n" + "="*80)
        print("✅ Extraction complete!")
        print(f"📝 Results: {extractor.output_file}")
        print("="*80)
    else:
        print("❌ Invalid choice!")


if __name__ == "__main__":
    main()
