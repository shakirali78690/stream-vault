import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Users, Film, Tv, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWatchTogether, WatchTogetherProvider } from '@/contexts/watch-together-context';
import type { Show, Movie, Anime } from '@shared/schema';

function CreateRoomContent() {
    const [, setLocation] = useLocation();
    const searchString = useSearch();
    const {
        isConnected,
        roomInfo,
        createRoom,
        error,
        clearError
    } = useWatchTogether();

    const [username, setUsername] = useState('');
    const [contentType, setContentType] = useState<'show' | 'movie' | 'anime'>('show');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContent, setSelectedContent] = useState<Show | Movie | Anime | null>(null);
    const [selectedEpisode, setSelectedEpisode] = useState<string | null>(null);

    // Parse URL params
    const urlParams = new URLSearchParams(searchString);
    const preselectedType = urlParams.get('type') as 'show' | 'movie' | 'anime' | null;
    const preselectedId = urlParams.get('id');

    // Fetch shows (always fetch if we have a preselected show)
    const { data: shows } = useQuery<Show[]>({
        queryKey: ['/api/shows'],
        enabled: contentType === 'show' || preselectedType === 'show'
    });

    // Fetch movies (always fetch if we have a preselected movie)
    const { data: movies } = useQuery<Movie[]>({
        queryKey: ['/api/movies'],
        enabled: contentType === 'movie' || preselectedType === 'movie'
    });

    // Fetch anime (always fetch if we have a preselected anime)
    const { data: animeList } = useQuery<Anime[]>({
        queryKey: ['/api/anime'],
        enabled: contentType === 'anime' || preselectedType === 'anime'
    });

    // Fetch episodes when show is selected
    const { data: episodes } = useQuery<Array<{ id: string; season: number; episodeNumber: number }>>({
        queryKey: ['/api/episodes', (selectedContent as Show)?.id],
        enabled: contentType === 'show' && !!selectedContent
    });

    // Fetch anime episodes when anime is selected
    const { data: animeEpisodes } = useQuery<Array<{ id: string; season: number; episodeNumber: number }>>({
        queryKey: ['/api/anime-episodes', (selectedContent as Anime)?.id],
        enabled: contentType === 'anime' && !!selectedContent
    });

    // Pre-select content from URL params
    useEffect(() => {
        if (preselectedType && preselectedId && !selectedContent) {
            setContentType(preselectedType);

            if (preselectedType === 'show' && shows) {
                const show = shows.find(s => s.id === preselectedId);
                if (show) {
                    setSelectedContent(show);
                    setSearchQuery(show.title);
                }
            } else if (preselectedType === 'movie' && movies) {
                const movie = movies.find(m => m.id === preselectedId);
                if (movie) {
                    setSelectedContent(movie);
                    setSearchQuery(movie.title);
                }
            } else if (preselectedType === 'anime' && animeList) {
                const anime = animeList.find(a => a.id === preselectedId);
                if (anime) {
                    setSelectedContent(anime);
                    setSearchQuery(anime.title);
                }
            }
        }
    }, [preselectedType, preselectedId, shows, movies, animeList, selectedContent]);

    // Filter content based on search
    const filteredContent = contentType === 'show'
        ? shows?.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10)
        : contentType === 'movie'
            ? movies?.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10)
            : animeList?.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10);

    // Redirect when room is created - NOT USED ANYMORE
    // Room creation now happens on watch-together page

    const handleCreate = () => {
        if (!username.trim() || !selectedContent) return;
        if ((contentType === 'show' || contentType === 'anime') && !selectedEpisode) return;

        // Store room creation params for watch-together page
        sessionStorage.setItem('watchTogether_username', username.trim());
        sessionStorage.setItem('watchTogether_contentType', contentType);
        sessionStorage.setItem('watchTogether_contentId', selectedContent.id);
        if ((contentType === 'show' || contentType === 'anime') && selectedEpisode) {
            sessionStorage.setItem('watchTogether_episodeId', selectedEpisode);
        }
        sessionStorage.setItem('watchTogether_isCreator', 'true');

        // Redirect to watch-together with a "new" room code that will trigger creation
        setLocation('/watch-together/NEW');
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background via-background to-black flex items-center justify-center">
                <div className="text-center p-8 bg-card rounded-xl border border-border max-w-md">
                    <h2 className="text-2xl font-bold mb-4 text-red-500">Error</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={clearError}>Try Again</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-black py-8 px-4">
            <Helmet>
                <title>Create Watch Party | StreamVault</title>
            </Helmet>

            <div className="container max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2">🎬 Watch Together</h1>
                    <p className="text-muted-foreground">Create a room and watch with friends</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                    {/* Step 1: Your Name */}
                    <div>
                        <label className="text-lg font-semibold mb-3 block flex items-center gap-2">
                            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full text-sm flex items-center justify-center">1</span>
                            Your Name
                        </label>
                        <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your display name..."
                            className="text-lg"
                        />
                    </div>

                    {/* Step 2: Content Type */}
                    <div>
                        <label className="text-lg font-semibold mb-3 block flex items-center gap-2">
                            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full text-sm flex items-center justify-center">2</span>
                            What to Watch
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => { setContentType('show'); setSelectedContent(null); }}
                                className={`p-4 rounded-xl border-2 transition-all ${contentType === 'show'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <Tv className="h-8 w-8 mx-auto mb-2" />
                                <span className="font-medium">TV Shows</span>
                            </button>
                            <button
                                onClick={() => { setContentType('movie'); setSelectedContent(null); }}
                                className={`p-4 rounded-xl border-2 transition-all ${contentType === 'movie'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <Film className="h-8 w-8 mx-auto mb-2" />
                                <span className="font-medium">Movies</span>
                            </button>
                            <button
                                onClick={() => { setContentType('anime'); setSelectedContent(null); }}
                                className={`p-4 rounded-xl border-2 transition-all ${contentType === 'anime'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <Sparkles className="h-8 w-8 mx-auto mb-2" />
                                <span className="font-medium">Anime</span>
                            </button>
                        </div>
                    </div>

                    {/* Step 3: Select Content */}
                    <div>
                        <label className="text-lg font-semibold mb-3 block flex items-center gap-2">
                            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full text-sm flex items-center justify-center">3</span>
                            Select {contentType === 'show' ? 'Show' : contentType === 'movie' ? 'Movie' : 'Anime'}
                        </label>
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${contentType === 'show' ? 'shows' : contentType === 'movie' ? 'movies' : 'anime'}...`}
                            className="mb-3"
                        />

                        {!selectedContent && filteredContent && filteredContent.length > 0 && (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {filteredContent.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedContent(item)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                                    >
                                        <img
                                            src={item.posterUrl}
                                            alt={item.title}
                                            className="w-12 h-16 object-cover rounded"
                                        />
                                        <div>
                                            <p className="font-medium">{item.title}</p>
                                            <p className="text-sm text-muted-foreground">{item.year}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedContent && (
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-primary bg-primary/10">
                                <img
                                    src={selectedContent.posterUrl}
                                    alt={selectedContent.title}
                                    className="w-12 h-16 object-cover rounded"
                                />
                                <div className="flex-1">
                                    <p className="font-medium">{selectedContent.title}</p>
                                    <p className="text-sm text-muted-foreground">{selectedContent.year}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedContent(null)}>
                                    Change
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Step 4: Select Episode (for shows and anime) */}
                    {(contentType === 'show' || contentType === 'anime') && selectedContent && episodes && (
                        <div>
                            <label className="text-lg font-semibold mb-3 block flex items-center gap-2">
                                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full text-sm flex items-center justify-center">4</span>
                                Select Episode
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                {(episodes as any[])?.map((ep: any) => (
                                    <button
                                        key={ep.id}
                                        onClick={() => setSelectedEpisode(ep.id)}
                                        className={`p-2 rounded-lg border text-sm transition-all ${selectedEpisode === ep.id
                                            ? 'border-primary bg-primary/10'
                                            : 'border-border hover:border-primary/50'
                                            }`}
                                    >
                                        S{ep.season} E{ep.episodeNumber}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Create Button */}
                    <Button
                        className="w-full py-6 text-lg"
                        size="lg"
                        onClick={handleCreate}
                        disabled={
                            !username.trim() ||
                            !selectedContent ||
                            !isConnected ||
                            ((contentType === 'show' || contentType === 'anime') && !selectedEpisode)
                        }
                    >
                        {isConnected ? (
                            <>
                                <Users className="mr-2 h-5 w-5" />
                                Create Room
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                        ) : (
                            'Connecting...'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function CreateRoom() {
    return (
        <WatchTogetherProvider>
            <CreateRoomContent />
        </WatchTogetherProvider>
    );
}
