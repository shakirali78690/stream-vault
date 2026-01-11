#!/usr/bin/env python3
"""
Internet Archive Video Uploader
Uploads videos to archive.org for use with JW Player

Requirements:
- pip install internetarchive requests

Setup:
1. Create an account at https://archive.org
2. Get your API keys at https://archive.org/account/s3.php
3. Set environment variables:
   - IA_ACCESS_KEY=your_access_key
   - IA_SECRET_KEY=your_secret_key
   
   Or run: ia configure (from internetarchive package)
"""

import os
import sys
import re
import json
from pathlib import Path
from datetime import datetime

# Load environment variables from .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not required if env vars are already set

try:
    import internetarchive as ia
except ImportError:
    print("❌ Please install internetarchive: pip install internetarchive")
    sys.exit(1)

# Configure IA with S3 keys from environment
access_key = os.getenv('IA_ACCESS_KEY')
secret_key = os.getenv('IA_SECRET_KEY')

if access_key and secret_key:
    # Write to IA config file for S3 authentication
    config_dir = Path.home() / '.ia'
    config_dir.mkdir(exist_ok=True)
    config_file = Path.home() / '.config' / 'internetarchive' / 'ia.ini'
    config_file.parent.mkdir(parents=True, exist_ok=True)
    
    config_content = f"""[s3]
access = {access_key}
secret = {secret_key}
"""
    config_file.write_text(config_content)
    print(f"✅ Configured IA with S3 keys from environment")
else:
    print("⚠️  No IA_ACCESS_KEY/IA_SECRET_KEY found in environment")
    print("   Run: ia configure")

# Default metadata template
DEFAULT_METADATA = {
    "mediatype": "movies",
    "collection": "opensource_movies",  # or "community_media"
    "creator": "StreamVault",
    "licenseurl": "https://creativecommons.org/licenses/by/4.0/",
}

def slugify(text):
    """Create URL-safe slug from text"""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text

def generate_identifier(title, show_name=None, season=None, episode=None):
    """Generate unique identifier for Internet Archive"""
    timestamp = datetime.now().strftime("%Y%m%d")
    
    if show_name and season and episode:
        # TV Episode format
        base = f"{slugify(show_name)}-s{season:02d}e{episode:02d}"
    elif show_name:
        # Movie or single item
        base = slugify(show_name)
    else:
        base = slugify(title)
    
    # Add timestamp to ensure uniqueness
    identifier = f"{base}-{timestamp}"
    
    # IA identifiers must be 5-80 chars
    if len(identifier) > 80:
        identifier = identifier[:80]
    
    return identifier

def upload_video(
    file_path,
    title,
    description="",
    show_name=None,
    season=None,
    episode=None,
    year=None,
    genres=None,
    custom_identifier=None
):
    """
    Upload a video to Internet Archive
    
    Args:
        file_path: Path to the video file
        title: Video title
        description: Video description
        show_name: Name of the TV show (optional)
        season: Season number (optional)
        episode: Episode number (optional)
        year: Release year (optional)
        genres: Comma-separated genres (optional)
        custom_identifier: Custom identifier (optional, auto-generated if not provided)
    
    Returns:
        dict with upload results including URL
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"Video file not found: {file_path}")
    
    # Generate or use custom identifier
    identifier = custom_identifier or generate_identifier(title, show_name, season, episode)
    
    print(f"📤 Uploading: {file_path.name}")
    print(f"   Identifier: {identifier}")
    
    # Build metadata
    metadata = {
        **DEFAULT_METADATA,
        "title": title,
        "description": description,
    }
    
    if show_name:
        metadata["subject"] = show_name
    if year:
        metadata["date"] = str(year)
    if genres:
        metadata["subject"] = genres if not show_name else f"{show_name}; {genres}"
    
    # Episode-specific metadata
    if season and episode:
        metadata["title"] = f"{show_name} - S{season:02d}E{episode:02d} - {title}"
    
    try:
        # Upload to Internet Archive
        response = ia.upload(
            identifier,
            files=[str(file_path)],
            metadata=metadata,
            retries=3,
            retries_sleep=10,
            verbose=True
        )
        
        # Check if upload was successful
        success = all(r.status_code == 200 for r in response)
        
        if success:
            # Build the video URL
            filename = file_path.name
            video_url = f"https://archive.org/download/{identifier}/{filename}"
            embed_url = f"https://archive.org/embed/{identifier}"
            details_url = f"https://archive.org/details/{identifier}"
            
            result = {
                "success": True,
                "identifier": identifier,
                "video_url": video_url,
                "embed_url": embed_url,
                "details_url": details_url,
                "filename": filename,
                "title": metadata["title"]
            }
            
            print(f"\n✅ Upload successful!")
            print(f"   Video URL: {video_url}")
            print(f"   Embed URL: {embed_url}")
            print(f"   Details: {details_url}")
            
            return result
        else:
            print(f"❌ Upload failed")
            return {"success": False, "error": "Upload failed", "responses": [r.text for r in response]}
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"success": False, "error": str(e)}

def upload_folder(
    folder_path,
    identifier,
    title,
    description="",
    show_name=None,
    year=None,
    genres=None
):
    """
    Upload all videos in a folder to Internet Archive
    
    Args:
        folder_path: Path to folder containing video files
        identifier: Unique identifier for the archive item
        title: Title for the collection
        description: Description
        show_name: Show name (for TV shows)
        year: Year
        genres: Genres
    
    Returns:
        dict with upload results and individual video URLs
    """
    folder_path = Path(folder_path)
    
    if not folder_path.exists() or not folder_path.is_dir():
        raise ValueError(f"Folder not found: {folder_path}")
    
    # Find all video files
    video_extensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.m4v']
    video_files = []
    for ext in video_extensions:
        video_files.extend(folder_path.glob(f'*{ext}'))
        video_files.extend(folder_path.glob(f'*{ext.upper()}'))
    
    video_files = sorted(set(video_files))
    
    if not video_files:
        print(f"❌ No video files found in {folder_path}")
        return {"success": False, "error": "No video files found"}
    
    print(f"📁 Found {len(video_files)} video files")
    for vf in video_files:
        print(f"   - {vf.name}")
    
    # Build metadata
    metadata = {
        **DEFAULT_METADATA,
        "title": title,
        "description": description,
    }
    
    if show_name:
        metadata["subject"] = show_name
    if year:
        metadata["date"] = str(year)
    if genres:
        metadata["subject"] = genres if not show_name else f"{show_name}; {genres}"
    
    print(f"\n📤 Uploading {len(video_files)} files to identifier: {identifier}")
    print("   (Uploading one at a time to avoid rate limits...)")
    
    try:
        video_urls = []
        failed_files = []
        
        for i, video_file in enumerate(video_files):
            print(f"\n[{i+1}/{len(video_files)}] Uploading: {video_file.name}")
            
            try:
                # Upload one file at a time
                response = ia.upload(
                    identifier,
                    files=[str(video_file)],
                    metadata=metadata if i == 0 else None,  # Only set metadata on first upload
                    retries=5,
                    retries_sleep=30,
                    verbose=True
                )
                
                success = all(r.status_code == 200 for r in response)
                
                if success:
                    url = f"https://archive.org/download/{identifier}/{video_file.name}"
                    video_urls.append({
                        "filename": video_file.name,
                        "video_url": url
                    })
                    print(f"   ✅ Uploaded: {url}")
                else:
                    failed_files.append(video_file.name)
                    print(f"   ❌ Failed: {video_file.name}")
                
            except Exception as e:
                failed_files.append(video_file.name)
                print(f"   ❌ Error: {e}")
            
            # Wait between uploads to avoid rate limits
            if i < len(video_files) - 1:
                import time
                print("   ⏳ Waiting 5 seconds before next upload...")
                time.sleep(5)
        
        # Build result
        result = {
            "success": len(video_urls) > 0,
            "identifier": identifier,
            "details_url": f"https://archive.org/details/{identifier}",
            "embed_url": f"https://archive.org/embed/{identifier}",
            "total_files": len(video_files),
            "uploaded": len(video_urls),
            "failed": len(failed_files),
            "videos": video_urls,
            "failed_files": failed_files
        }
        
        print(f"\n{'='*50}")
        print(f"✅ Upload complete!")
        print(f"   Uploaded: {len(video_urls)}/{len(video_files)}")
        print(f"   Failed: {len(failed_files)}")
        print(f"   Details: {result['details_url']}")
        print(f"\n📹 Video URLs:")
        for v in video_urls:
            print(f"   {v['filename']}: {v['video_url']}")
        
        if failed_files:
            print(f"\n⚠️  Failed files (retry later):")
            for f in failed_files:
                print(f"   - {f}")
        
        return result
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"success": False, "error": str(e)}

def upload_batch(csv_file, output_file="upload_results.json"):
    """
    Upload multiple videos from a CSV file
    
    CSV format:
    file_path,title,description,show_name,season,episode,year,genres
    
    Example:
    /path/to/video.mp4,Episode Title,Description,Show Name,1,1,2024,Drama
    """
    import csv
    
    results = []
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            print(f"\n{'='*50}")
            
            result = upload_video(
                file_path=row['file_path'],
                title=row.get('title', ''),
                description=row.get('description', ''),
                show_name=row.get('show_name'),
                season=int(row['season']) if row.get('season') else None,
                episode=int(row['episode']) if row.get('episode') else None,
                year=row.get('year'),
                genres=row.get('genres')
            )
            
            results.append(result)
    
    # Save results
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✅ Batch upload complete! Results saved to {output_file}")
    
    # Summary
    successful = sum(1 for r in results if r.get('success'))
    print(f"   Successful: {successful}/{len(results)}")
    
    return results

def main():
    """Interactive mode"""
    print("=" * 60)
    print("🎬 Internet Archive Video Uploader")
    print("=" * 60)
    
    # Check if configured
    try:
        ia.get_session()
    except Exception:
        print("\n⚠️  Not configured! Please run: ia configure")
        print("   Or set IA_ACCESS_KEY and IA_SECRET_KEY environment variables")
        print("   Get your keys at: https://archive.org/account/s3.php")
        return
    
    print("\nModes:")
    print("1. Upload single video")
    print("2. Upload folder (multiple videos)")
    print("3. Upload batch from CSV")
    print("4. Exit")
    
    choice = input("\nSelect mode (1-4): ").strip()
    
    if choice == "1":
        # Single upload
        file_path = input("Video file path: ").strip().strip('"')
        title = input("Title: ").strip()
        description = input("Description (optional): ").strip()
        show_name = input("Show name (optional, for TV episodes): ").strip() or None
        
        season = None
        episode = None
        if show_name:
            season_input = input("Season number (optional): ").strip()
            episode_input = input("Episode number (optional): ").strip()
            season = int(season_input) if season_input else None
            episode = int(episode_input) if episode_input else None
        
        year = input("Year (optional): ").strip() or None
        genres = input("Genres (optional, comma-separated): ").strip() or None
        
        result = upload_video(
            file_path=file_path,
            title=title,
            description=description,
            show_name=show_name,
            season=season,
            episode=episode,
            year=year,
            genres=genres
        )
        
        if result.get('success'):
            # Save to results file
            results_file = "upload_results.json"
            existing = []
            if os.path.exists(results_file):
                with open(results_file, 'r') as f:
                    existing = json.load(f)
            existing.append(result)
            with open(results_file, 'w') as f:
                json.dump(existing, f, indent=2)
            print(f"\n💾 Result saved to {results_file}")
    
    elif choice == "2":
        # Folder upload
        folder_path = input("Folder path: ").strip().strip('"')
        identifier = input("Identifier (e.g., banshee-season-1): ").strip()
        title = input("Title (e.g., Banshee Season 1): ").strip()
        description = input("Description (optional): ").strip()
        show_name = input("Show name (optional): ").strip() or None
        year = input("Year (optional): ").strip() or None
        genres = input("Genres (optional): ").strip() or None
        
        result = upload_folder(
            folder_path=folder_path,
            identifier=identifier,
            title=title,
            description=description,
            show_name=show_name,
            year=year,
            genres=genres
        )
        
        if result.get('success'):
            # Save to results file
            results_file = "folder_upload_results.json"
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2)
            print(f"\n💾 Results saved to {results_file}")
            
    elif choice == "3":
        # Batch upload
        csv_file = input("CSV file path: ").strip().strip('"')
        output_file = input("Output JSON file (default: upload_results.json): ").strip() or "upload_results.json"
        upload_batch(csv_file, output_file)
    
    else:
        print("Goodbye!")

if __name__ == "__main__":
    main()
