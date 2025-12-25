import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Save, X, Upload, FileJson, LogOut, Mail, Send } from "lucide-react";
import type { Show, Episode, Movie, BlogPost } from "@shared/schema";
import { getAuthHeaders, logout as authLogout } from "@/lib/auth";

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("shows");
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        setLocation("/admin/login");
        return;
      }

      try {
        const res = await fetch("/api/admin/verify", {
          headers: { "x-admin-token": token },
        });
        const data = await res.json();

        if (data.valid) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("adminToken");
          setLocation("/admin/login");
        }
      } catch (error) {
        localStorage.removeItem("adminToken");
        setLocation("/admin/login");
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [setLocation]);

  const handleLogout = async () => {
    await authLogout();
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
    setLocation("/admin/login");
  };

  // Fetch all shows
  const { data: shows = [] } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  // Fetch all movies
  const { data: movies = [] } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your StreamVault content</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-11 mb-8">
            <TabsTrigger value="shows">Shows</TabsTrigger>
            <TabsTrigger value="movies">Movies</TabsTrigger>
            <TabsTrigger value="blog">Blog</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
            <TabsTrigger value="push">Push</TabsTrigger>
            <TabsTrigger value="add-show">Add Show</TabsTrigger>
            <TabsTrigger value="add-episode">Add Episode</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          {/* Manage Shows Tab */}
          <TabsContent value="shows">
            <ManageShows shows={shows} />
          </TabsContent>

          {/* Manage Movies Tab */}
          <TabsContent value="movies">
            <ManageMovies movies={movies} />
          </TabsContent>

          {/* Blog Management Tab */}
          <TabsContent value="blog">
            <ManageBlog />
          </TabsContent>

          {/* Comments Moderation Tab */}
          <TabsContent value="comments">
            <CommentsModeration />
          </TabsContent>

          {/* Content Requests Tab */}
          <TabsContent value="requests">
            <ContentRequests />
          </TabsContent>

          {/* Issue Reports Tab */}
          <TabsContent value="reports">
            <IssueReports />
          </TabsContent>

          {/* Newsletter Tab */}
          <TabsContent value="newsletter">
            <NewsletterManager />
          </TabsContent>

          {/* Push Notifications Tab */}
          <TabsContent value="push">
            <PushNotificationManager shows={shows} movies={movies} />
          </TabsContent>

          {/* Add Show Tab */}
          <TabsContent value="add-show">
            <AddShowForm />
          </TabsContent>

          {/* Add Episode Tab */}
          <TabsContent value="add-episode">
            <AddEpisodeForm shows={shows} />
          </TabsContent>

          {/* Import Episodes Tab */}
          <TabsContent value="import">
            <ImportEpisodesForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Manage Shows Component
function ManageShows({ shows }: { shows: Show[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (showId: string) => {
      const res = await fetch(`/api/admin/shows/${showId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete show");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      toast({
        title: "Success",
        description: "Show deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete show",
        variant: "destructive",
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/shows`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete all shows");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      setShowDeleteAllConfirm(false);
      toast({
        title: "Success",
        description: `Deleted ${data.deleted} shows and their episodes`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete all shows",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Show> }) => {
      const res = await fetch(`/api/admin/shows/${data.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data.updates),
      });
      if (!res.ok) throw new Error("Failed to update show");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      setIsEditDialogOpen(false);
      setEditingShow(null);
      toast({
        title: "Success",
        description: "Show updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update show",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (show: Show) => {
    setEditingShow(show);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (showId: string, showTitle: string) => {
    if (confirm(`Are you sure you want to delete "${showTitle}"? This will also delete all episodes.`)) {
      deleteMutation.mutate(showId);
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Shows ({shows.length})</CardTitle>
              <CardDescription>Manage your content library</CardDescription>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteAllConfirm(true)}
              disabled={shows.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All Shows
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shows.map((show) => (
              <div
                key={show.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={show.posterUrl}
                    alt={show.title}
                    className="w-16 h-24 object-cover rounded"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">{show.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {show.year} • {show.totalSeasons} Season(s) • {show.rating}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {show.genres?.split(',').slice(0, 3).map((genre) => (
                        <Badge key={genre.trim()} variant="secondary">
                          {genre.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(show)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(show.id, show.title)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Shows?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {shows.length} shows and their episodes. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteAllConfirm(false)}
              disabled={deleteAllMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAllMutation.mutate()}
              disabled={deleteAllMutation.isPending}
            >
              {deleteAllMutation.isPending ? "Deleting..." : "Delete All"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Show</DialogTitle>
            <DialogDescription>
              Update show information
            </DialogDescription>
          </DialogHeader>
          {editingShow && (
            <EditShowForm
              show={editingShow}
              onSave={(updates) => updateMutation.mutate({ id: editingShow.id, updates })}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Show Form Component
function EditShowForm({ show, onSave, onCancel, isLoading }: {
  show: Show;
  onSave: (updates: Partial<Show>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: show.title,
    slug: show.slug,
    description: show.description,
    posterUrl: show.posterUrl,
    backdropUrl: show.backdropUrl,
    year: show.year,
    rating: show.rating,
    imdbRating: show.imdbRating || "",
    genres: show.genres || "",
    language: show.language,
    totalSeasons: show.totalSeasons,
    cast: show.cast || "",
    creators: show.creators || "",
    featured: show.featured || false,
    trending: show.trending || false,
    category: show.category || "action",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      // Keep as strings (comma-separated)
      genres: formData.genres,
      cast: formData.cast,
      creators: formData.creators,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-slug">Slug (URL)</Label>
          <Input
            id="edit-slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            placeholder="e.g., money-heist"
            required
          />
          <p className="text-xs text-muted-foreground">
            URL: /show/{formData.slug}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-year">Year</Label>
          <Input
            id="edit-year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-category">Category</Label>
          <select
            id="edit-category"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="action">Action</option>
            <option value="drama">Drama</option>
            <option value="comedy">Comedy</option>
            <option value="horror">Horror</option>
            <option value="romance">Romance</option>
            <option value="thriller">Thriller</option>
            <option value="sci-fi">Sci-Fi</option>
            <option value="fantasy">Fantasy</option>
            <option value="documentary">Documentary</option>
            <option value="animation">Animation</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description">Description</Label>
        <Textarea
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-posterUrl">Poster URL</Label>
          <Input
            id="edit-posterUrl"
            value={formData.posterUrl}
            onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-backdropUrl">Backdrop URL</Label>
          <Input
            id="edit-backdropUrl"
            value={formData.backdropUrl}
            onChange={(e) => setFormData({ ...formData, backdropUrl: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-rating">Rating</Label>
          <select
            id="edit-rating"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
          >
            <option value="TV-Y">TV-Y</option>
            <option value="TV-Y7">TV-Y7</option>
            <option value="TV-G">TV-G</option>
            <option value="TV-PG">TV-PG</option>
            <option value="TV-14">TV-14</option>
            <option value="TV-MA">TV-MA</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-imdbRating">IMDb Rating</Label>
          <Input
            id="edit-imdbRating"
            value={formData.imdbRating}
            onChange={(e) => setFormData({ ...formData, imdbRating: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-totalSeasons">Total Seasons</Label>
          <Input
            id="edit-totalSeasons"
            type="number"
            min="1"
            value={formData.totalSeasons}
            onChange={(e) => setFormData({ ...formData, totalSeasons: parseInt(e.target.value) })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-genres">Genres (comma-separated)</Label>
          <Input
            id="edit-genres"
            value={formData.genres}
            onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-language">Language</Label>
          <Input
            id="edit-language"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-cast">Cast (comma-separated)</Label>
        <Input
          id="edit-cast"
          value={formData.cast}
          onChange={(e) => setFormData({ ...formData, cast: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">Featured</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.trending}
            onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">Trending</span>
        </label>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Add Show Form Component
function AddShowForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    posterUrl: "",
    backdropUrl: "",
    year: new Date().getFullYear(),
    rating: "TV-MA",
    imdbRating: "",
    genres: "",
    language: "English",
    totalSeasons: 1,
    cast: "",
    creators: "",
    featured: false,
    trending: false,
    category: "action",
  });

  const addShowMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/shows", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add show");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      toast({
        title: "Success!",
        description: "Show added successfully",
      });
      // Reset form
      setFormData({
        title: "",
        slug: "",
        description: "",
        posterUrl: "",
        backdropUrl: "",
        year: new Date().getFullYear(),
        rating: "TV-MA",
        imdbRating: "",
        genres: "",
        language: "English",
        totalSeasons: 1,
        cast: "",
        creators: "",
        featured: false,
        trending: false,
        category: "action",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Generate slug from title if not provided
    const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, "-");

    const showData = {
      ...formData,
      slug,
      genres: formData.genres.split(",").map((g) => g.trim()),
      cast: formData.cast.split(",").map((c) => c.trim()),
      creators: formData.creators.split(",").map((c) => c.trim()),
    };

    addShowMutation.mutate(showData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Show</CardTitle>
        <CardDescription>Add a new show to your library</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (auto-generated if empty)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="auto-generated-from-title"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="posterUrl">Poster URL *</Label>
              <Input
                id="posterUrl"
                type="url"
                value={formData.posterUrl}
                onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backdropUrl">Backdrop URL *</Label>
              <Input
                id="backdropUrl"
                type="url"
                value={formData.backdropUrl}
                onChange={(e) => setFormData({ ...formData, backdropUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Rating *</Label>
              <select
                id="rating"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              >
                <option value="TV-Y">TV-Y</option>
                <option value="TV-Y7">TV-Y7</option>
                <option value="TV-G">TV-G</option>
                <option value="TV-PG">TV-PG</option>
                <option value="TV-14">TV-14</option>
                <option value="TV-MA">TV-MA</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imdbRating">IMDb Rating *</Label>
              <Input
                id="imdbRating"
                value={formData.imdbRating}
                onChange={(e) => setFormData({ ...formData, imdbRating: e.target.value })}
                placeholder="8.5"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="genres">Genres (comma-separated) *</Label>
              <Input
                id="genres"
                value={formData.genres}
                onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
                placeholder="Action, Drama, Thriller"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
              <Input
                id="language"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalSeasons">Total Seasons *</Label>
              <Input
                id="totalSeasons"
                type="number"
                min="1"
                value={formData.totalSeasons}
                onChange={(e) => setFormData({ ...formData, totalSeasons: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="action">Action & Thriller</option>
                <option value="drama">Drama & Romance</option>
                <option value="comedy">Comedy</option>
                <option value="horror">Horror & Mystery</option>
              </select>
            </div>
            <div className="space-y-2 flex items-end gap-4 pb-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Featured</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.trending}
                  onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Trending</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cast">Cast (comma-separated) *</Label>
              <Input
                id="cast"
                value={formData.cast}
                onChange={(e) => setFormData({ ...formData, cast: e.target.value })}
                placeholder="Actor 1, Actor 2, Actor 3"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creators">Creators (comma-separated) *</Label>
              <Input
                id="creators"
                value={formData.creators}
                onChange={(e) => setFormData({ ...formData, creators: e.target.value })}
                placeholder="Creator 1, Creator 2"
                required
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={addShowMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {addShowMutation.isPending ? "Adding..." : "Add Show"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Add Episode Form Component
function AddEpisodeForm({ shows }: { shows: Show[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    showId: "",
    season: 1,
    episodeNumber: 1,
    title: "",
    description: "",
    thumbnailUrl: "",
    duration: 45,
    googleDriveUrl: "https://drive.google.com/file/d/1zcFHiGEOwgq2-j6hMqpsE0ov7qcIUqCd/preview",
    airDate: new Date().toISOString().split("T")[0],
  });

  const addEpisodeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/episodes", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add episode");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/episodes"] });
      toast({
        title: "Success!",
        description: "Episode added successfully",
      });
      // Reset form
      setFormData({
        ...formData,
        episodeNumber: formData.episodeNumber + 1,
        title: "",
        description: "",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addEpisodeMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Episode</CardTitle>
        <CardDescription>Add episodes to existing shows</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="showId">Select Show *</Label>
            <select
              id="showId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.showId}
              onChange={(e) => setFormData({ ...formData, showId: e.target.value })}
              required
            >
              <option value="">Choose a show...</option>
              {shows.map((show) => (
                <option key={show.id} value={show.id}>
                  {show.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="season">Season *</Label>
              <Input
                id="season"
                type="number"
                min="1"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="episodeNumber">Episode Number *</Label>
              <Input
                id="episodeNumber"
                type="number"
                min="1"
                value={formData.episodeNumber}
                onChange={(e) => setFormData({ ...formData, episodeNumber: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Episode Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Episode 1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Thumbnail URL *</Label>
            <Input
              id="thumbnailUrl"
              type="url"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="airDate">Air Date *</Label>
              <Input
                id="airDate"
                type="date"
                value={formData.airDate}
                onChange={(e) => setFormData({ ...formData, airDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="googleDriveUrl">Google Drive Video URL *</Label>
            <Input
              id="googleDriveUrl"
              type="url"
              value={formData.googleDriveUrl}
              onChange={(e) => setFormData({ ...formData, googleDriveUrl: e.target.value })}
              placeholder="https://drive.google.com/file/d/FILE_ID/preview"
              required
            />
            <p className="text-xs text-muted-foreground">
              Get File ID from Google Drive share link and use format: https://drive.google.com/file/d/FILE_ID/preview
            </p>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={addEpisodeMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              {addEpisodeMutation.isPending ? "Adding..." : "Add Episode"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Import Episodes Form Component
function ImportEpisodesForm() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState("love-puzzle.json");
  const [customPath, setCustomPath] = useState("");
  const [useCustomPath, setUseCustomPath] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const baseFolder = "C:\\Users\\yawar\\Desktop\\StreamVault\\bulk-imports";

  // Available JSON files in the folder (slug-named files)
  const availableFiles = [
    "stranger-things.json",
    "adamas.json",
    "all-i-want-for-love-is-you.json",
    "aurora-teagarden-mysteries.json",
    "berlin.json",
    "big-mouth.json",
    "blanca.json",
    "chilling-adventures-of-sabrina.json",
    "creature.json",
    "descendants-of-the-sun.json",
    "dont-be-shy.json",
    "exploration-method-of-love.json",
    "fake-it-till-you-make-it.json",
    "feria-the-darkest-light.json",
    "fool-me-once.json",
    "furies.json",
    "gyeongseong-creature.json",
    "hear-me.json",
    "house-of-ninjas.json",
    "i-can-see-you-shine.json",
    "im-not-a-robot.json",
    "into-the-badlands.json",
    "inventing-anna.json",
    "juvenile-justice.json",
    "last-one-standing.json",
    "lawless-lawyer.json",
    "life.json",
    "love-puzzle.json",
    "lover-or-stranger.json",
    "lucifer.json",
    "lupin.json",
    "marry-my-husband.json",
    "midnight-at-the-pera-palace.json",
    "misty.json",
    "money-flower.json",
    "mr-queen.json",
    "my-dearest.json",
    "my-family.json",
    "my-lethal-man.json",
    "one-dollar-lawyer.json",
    "orange-is-the-new-black.json",
    "over-water.json",
    "penthouse.json",
    "pride-and-prejudice.json",
    "queen-of-mystery.json",
    "queenmaker.json",
    "sebastian-fitzeks-therapy.json",
    "sherlock-the-russian-chronicles.json",
    "sketch.json",
    "snowfall.json",
    "song-of-the-bandits.json",
    "stranger.json",
    "tempted.json",
    "the-deceived.json",
    "the-divorce-insurance.json",
    "the-ghost-detective.json",
    "the-helicopter-heist.json",
    "the-untamed.json",
    "the-witcher-blood-origin.json",
    "the-witcher.json",
    "tientsin-mystic.json",
    "victor-lessard.json",
    "vikings.json",
    "vincenzo.json",
    "wenderellas-diary.json",
  ];

  const getFilePath = () => {
    if (useCustomPath) {
      return customPath;
    }
    return `${baseFolder}\\${selectedFile}`;
  };

  const importMutation = useMutation({
    mutationFn: async (path: string) => {
      const res = await fetch("/api/admin/import-shows-episodes", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ filePath: path }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || "Failed to import");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setImportResult(data.summary);
      const message = data.summary?.showTitle
        ? `Imported ${data.summary.episodesImported} episodes to "${data.summary.showTitle}"`
        : `Created ${data.summary?.showsCreated || 0} shows and imported ${data.summary?.episodesImported || 0} episodes`;
      toast({
        title: "Import Completed!",
        description: message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setImportResult(null);
    importMutation.mutate(getFilePath());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="w-5 h-5" />
          Import Episodes from JSON
        </CardTitle>
        <CardDescription>
          Import shows and episodes from the extracted JSON file. Creates shows if they don't exist and adds all episodes automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleImport} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useCustomPath"
                checked={useCustomPath}
                onChange={(e) => setUseCustomPath(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="useCustomPath" className="cursor-pointer">
                Use custom file path
              </Label>
            </div>

            {!useCustomPath ? (
              <div className="space-y-2">
                <Label htmlFor="fileSelect">Select JSON File *</Label>
                <select
                  id="fileSelect"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                  required
                >
                  {availableFiles.map((file) => (
                    <option key={file} value={file}>
                      {file}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Folder: {baseFolder}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="customPath">Custom File Path *</Label>
                <Input
                  id="customPath"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="C:\\Users\\yawar\\Desktop\\StreamVault\\bulk-imports\\love-puzzle.json"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full path to the JSON file
                </p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={importMutation.isPending}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {importMutation.isPending ? "Importing..." : "Start Import"}
          </Button>
        </form>

        {importMutation.isPending && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Importing episodes... This may take a few moments.
            </p>
          </div>
        )}

        {importResult && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <h3 className="font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                ✅ Import Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {importResult.showTitle && (
                  <div className="col-span-2 mb-2">
                    <p className="text-muted-foreground">Show:</p>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {importResult.showTitle}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-muted-foreground">Shows Created:</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importResult.showsCreated || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Shows Skipped:</p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {importResult.showsSkipped || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Episodes Imported:</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {importResult.episodesImported || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Episodes Skipped:</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {importResult.episodesSkipped || 0}
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Manage Movies Component
function ManageMovies({ movies }: { movies: Movie[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const deleteMovieMutation = useMutation({
    mutationFn: async (movieId: string) => {
      const res = await fetch(`/api/admin/movies/${movieId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete movie");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      toast({
        title: "Success",
        description: "Movie deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete movie",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Manage Movies</CardTitle>
            <CardDescription>View, edit, and delete movies</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Movie
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Movie</DialogTitle>
                <DialogDescription>
                  Add a new movie to your collection
                </DialogDescription>
              </DialogHeader>
              <AddMovieForm onSuccess={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {movies.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No movies found. Add your first movie!
            </p>
          ) : (
            movies.map((movie) => (
              <div
                key={movie.id}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-16 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{movie.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {movie.year} • {movie.duration}min • {movie.rating}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {movie.genres?.split(',').slice(0, 3).map((genre) => (
                      <Badge key={genre.trim()} variant="secondary">
                        {genre.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMovie(movie)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Movie</DialogTitle>
                        <DialogDescription>
                          Update movie information
                        </DialogDescription>
                      </DialogHeader>
                      {editingMovie && (
                        <EditMovieForm
                          movie={editingMovie}
                          onSave={() => setEditingMovie(null)}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete "${movie.title}"?`)) {
                        deleteMovieMutation.mutate(movie.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Add Movie Form Component
function AddMovieForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    posterUrl: "",
    backdropUrl: "",
    year: new Date().getFullYear(),
    rating: "PG-13",
    imdbRating: "",
    genres: "",
    language: "English",
    duration: 120,
    cast: "",
    directors: "",
    googleDriveUrl: "",
    featured: false,
    trending: false,
    category: "action",
  });

  const createMovieMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/movies", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create movie");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      toast({
        title: "Success",
        description: "Movie added successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add movie",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMovieMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="posterUrl">Poster URL *</Label>
          <Input
            id="posterUrl"
            value={formData.posterUrl}
            onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="backdropUrl">Backdrop URL *</Label>
          <Input
            id="backdropUrl"
            value={formData.backdropUrl}
            onChange={(e) => setFormData({ ...formData, backdropUrl: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="year">Year *</Label>
          <Input
            id="year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (min) *</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rating">Rating *</Label>
          <Input
            id="rating"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="imdbRating">IMDb Rating</Label>
          <Input
            id="imdbRating"
            value={formData.imdbRating}
            onChange={(e) => setFormData({ ...formData, imdbRating: e.target.value })}
            placeholder="8.5"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language *</Label>
          <Input
            id="language"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="genres">Genres (comma-separated) *</Label>
        <Input
          id="genres"
          value={formData.genres}
          onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
          placeholder="Action, Thriller, Drama"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cast">Cast (comma-separated)</Label>
        <Input
          id="cast"
          value={formData.cast}
          onChange={(e) => setFormData({ ...formData, cast: e.target.value })}
          placeholder="Actor 1, Actor 2, Actor 3"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="directors">Directors (comma-separated)</Label>
        <Input
          id="directors"
          value={formData.directors}
          onChange={(e) => setFormData({ ...formData, directors: e.target.value })}
          placeholder="Director 1, Director 2"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="googleDriveUrl">Google Drive URL *</Label>
        <Input
          id="googleDriveUrl"
          value={formData.googleDriveUrl}
          onChange={(e) => setFormData({ ...formData, googleDriveUrl: e.target.value })}
          placeholder="https://drive.google.com/file/d/..."
          required
        />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
          />
          <span className="text-sm">Featured</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.trending}
            onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
          />
          <span className="text-sm">Trending</span>
        </label>
      </div>

      <Button type="submit" className="w-full">
        <Save className="w-4 h-4 mr-2" />
        Add Movie
      </Button>
    </form>
  );
}

// Edit Movie Form Component
function EditMovieForm({
  movie,
  onSave,
}: {
  movie: Movie;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: movie.title,
    slug: movie.slug,
    description: movie.description,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    year: movie.year,
    rating: movie.rating,
    imdbRating: movie.imdbRating || "",
    genres: movie.genres || "",
    language: movie.language,
    duration: movie.duration,
    cast: movie.cast || "",
    directors: movie.directors || "",
    googleDriveUrl: movie.googleDriveUrl,
    featured: movie.featured || false,
    trending: movie.trending || false,
    category: movie.category || "action",
  });

  const updateMovieMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch(`/api/admin/movies/${movie.id}`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update movie");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      toast({
        title: "Success",
        description: "Movie updated successfully",
      });
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update movie",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMovieMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-slug">Slug</Label>
          <Input
            id="edit-slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description">Description</Label>
        <Textarea
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-posterUrl">Poster URL</Label>
          <Input
            id="edit-posterUrl"
            value={formData.posterUrl}
            onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-backdropUrl">Backdrop URL</Label>
          <Input
            id="edit-backdropUrl"
            value={formData.backdropUrl}
            onChange={(e) => setFormData({ ...formData, backdropUrl: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-year">Year</Label>
          <Input
            id="edit-year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-duration">Duration (min)</Label>
          <Input
            id="edit-duration"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-rating">Rating</Label>
          <Input
            id="edit-rating"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-genres">Genres (comma-separated)</Label>
        <Input
          id="edit-genres"
          value={formData.genres}
          onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-googleDriveUrl">Google Drive URL</Label>
        <Input
          id="edit-googleDriveUrl"
          value={formData.googleDriveUrl}
          onChange={(e) => setFormData({ ...formData, googleDriveUrl: e.target.value })}
        />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
          />
          <span className="text-sm">Featured</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.trending}
            onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
          />
          <span className="text-sm">Trending</span>
        </label>
      </div>

      <Button type="submit" className="w-full">
        <Save className="w-4 h-4 mr-2" />
        Save Changes
      </Button>
    </form>
  );
}

// Content Requests Component
function ContentRequests() {
  const { data: requests = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/content-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/content-requests", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch content requests");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading content requests...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Requests</CardTitle>
        <CardDescription>
          User requests for new shows and movies ({requests.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No content requests yet
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request: any) => (
              <Card key={request.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{request.title}</CardTitle>
                      <CardDescription>
                        {request.contentType} • {request.year || "Year not specified"}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {request.requestCount} request{request.requestCount > 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {request.genre && (
                    <div>
                      <strong>Genre:</strong> {request.genre}
                    </div>
                  )}
                  {request.description && (
                    <div>
                      <strong>Description:</strong> {request.description}
                    </div>
                  )}
                  {request.reason && (
                    <div>
                      <strong>Reason:</strong> {request.reason}
                    </div>
                  )}
                  {request.email && (
                    <div>
                      <strong>Email:</strong> {request.email}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Submitted: {new Date(request.createdAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Issue Reports Component
function IssueReports() {
  const { data: reports = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/issue-reports"],
    queryFn: async () => {
      const res = await fetch("/api/admin/issue-reports", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch issue reports");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading issue reports...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Reports</CardTitle>
        <CardDescription>
          User-reported issues and bugs ({reports.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No issue reports yet
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report: any) => (
              <Card key={report.id} className="border-l-4 border-l-destructive">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{report.title}</CardTitle>
                      <CardDescription>
                        {report.issueType.replace(/_/g, " ")}
                      </CardDescription>
                    </div>
                    <Badge variant={report.status === "pending" ? "destructive" : "secondary"}>
                      {report.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Description:</strong> {report.description}
                  </div>
                  {report.url && (
                    <div>
                      <strong>Page URL:</strong>{" "}
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {report.url}
                      </a>
                    </div>
                  )}
                  {report.email && (
                    <div>
                      <strong>Email:</strong> {report.email}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Submitted: {new Date(report.createdAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Comments Moderation Component
function CommentsModeration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shows = [] } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const { data: movies = [] } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["/api/admin/comments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/comments", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
  });

  // Fetch all episodes for matching
  const { data: allEpisodes = [] } = useQuery<Episode[]>({
    queryKey: ["/api/all-episodes"],
    queryFn: async () => {
      const res = await fetch("/api/all-episodes", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch episodes");
      return res.json();
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/comments"] });
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (commentId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete the comment by "${userName}"?`)) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading comments...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments Moderation</CardTitle>
        <CardDescription>
          Manage user comments ({comments.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No comments yet
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: any) => {
              let contentInfo = null;

              if (comment.episodeId) {
                const episode = allEpisodes.find((e: Episode) => e.id === comment.episodeId);
                if (episode) {
                  const show = shows.find((s: Show) => s.id === episode.showId);
                  contentInfo = {
                    type: 'Episode',
                    title: show?.title || 'Unknown Show',
                    subtitle: `S${episode.season}E${episode.episodeNumber}: ${episode.title}`,
                    link: `/watch/${show?.slug}?season=${episode.season}&episode=${episode.episodeNumber}`
                  };
                }
              } else if (comment.movieId) {
                const movie = movies.find((m: Movie) => m.id === comment.movieId);
                if (movie) {
                  contentInfo = {
                    type: 'Movie',
                    title: movie.title,
                    subtitle: `${movie.year}`,
                    link: `/watch-movie/${movie.slug}`
                  };
                }
              }

              return (
                <Card key={comment.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{comment.userName}</CardTitle>
                          <Badge variant="outline">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </Badge>
                        </div>
                        {contentInfo ? (
                          <CardDescription>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{contentInfo.type}</Badge>
                                <span className="font-semibold">{contentInfo.title}</span>
                              </div>
                              <div className="text-sm">{contentInfo.subtitle}</div>
                              <a
                                href={contentInfo.link}
                                className="text-xs text-primary hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View {contentInfo.type} →
                              </a>
                            </div>
                          </CardDescription>
                        ) : (
                          <CardDescription>General Comment</CardDescription>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(comment.id, comment.userName)}
                        disabled={deleteCommentMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deleteCommentMutation.isPending ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                    <div className="text-xs text-muted-foreground mt-3">
                      Posted: {new Date(comment.createdAt).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Manage Blog Component
function ManageBlog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    contentType: "movie",
    contentId: "",
    featuredImage: "",
    excerpt: "",
    content: "",
    plotSummary: "",
    review: "",
    boxOffice: "",
    trivia: "",
    behindTheScenes: "",
    awards: "",
    author: "StreamVault",
    published: false,
    featured: false,
  });

  const { data: blogPosts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch blog posts");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create blog post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Blog post created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create blog post", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update blog post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      setEditingPost(null);
      resetForm();
      toast({ title: "Success", description: "Blog post updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update blog post", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete blog post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      toast({ title: "Success", description: "Blog post deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete blog post", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      contentType: "movie",
      contentId: "",
      featuredImage: "",
      excerpt: "",
      content: "",
      plotSummary: "",
      review: "",
      boxOffice: "",
      trivia: "",
      behindTheScenes: "",
      awards: "",
      author: "StreamVault",
      published: false,
      featured: false,
    });
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({ ...prev, title, slug: generateSlug(title) }));
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      contentType: post.contentType,
      contentId: post.contentId || "",
      featuredImage: post.featuredImage,
      excerpt: post.excerpt,
      content: post.content,
      plotSummary: post.plotSummary || "",
      review: post.review || "",
      boxOffice: post.boxOffice || "",
      trivia: post.trivia || "",
      behindTheScenes: post.behindTheScenes || "",
      awards: post.awards || "",
      author: post.author || "StreamVault",
      published: post.published || false,
      featured: post.featured || false,
    });
  };

  const handleSubmit = () => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeletePost = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading blog posts...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Blog Management</CardTitle>
            <CardDescription>Create and manage blog posts ({blogPosts.length} total)</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen || !!editingPost} onOpenChange={(open) => {
            if (!open) { setIsCreateDialogOpen(false); setEditingPost(null); resetForm(); }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> New Blog Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPost ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
                <DialogDescription>{editingPost ? "Update the blog post details" : "Fill in the details"}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Blog post title" />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug *</Label>
                    <Input value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))} placeholder="url-friendly-slug" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Content Type *</Label>
                    <select className="w-full p-2 border rounded-md bg-background" value={formData.contentType} onChange={(e) => setFormData((prev) => ({ ...prev, contentType: e.target.value }))}>
                      <option value="movie">Movie</option>
                      <option value="show">TV Show</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Author</Label>
                    <Input value={formData.author} onChange={(e) => setFormData((prev) => ({ ...prev, author: e.target.value }))} placeholder="Author name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Featured Image URL *</Label>
                  <Input value={formData.featuredImage} onChange={(e) => setFormData((prev) => ({ ...prev, featuredImage: e.target.value }))} placeholder="https://example.com/image.jpg" />
                </div>
                <div className="space-y-2">
                  <Label>Excerpt *</Label>
                  <Textarea value={formData.excerpt} onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))} placeholder="Short description..." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Main Content *</Label>
                  <Textarea value={formData.content} onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))} placeholder="Full article content..." rows={6} />
                </div>
                <div className="space-y-2">
                  <Label>Plot Summary</Label>
                  <Textarea value={formData.plotSummary} onChange={(e) => setFormData((prev) => ({ ...prev, plotSummary: e.target.value }))} placeholder="Detailed plot..." rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>Review</Label>
                  <Textarea value={formData.review} onChange={(e) => setFormData((prev) => ({ ...prev, review: e.target.value }))} placeholder="Your review..." rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Box Office (JSON)</Label>
                    <Textarea value={formData.boxOffice} onChange={(e) => setFormData((prev) => ({ ...prev, boxOffice: e.target.value }))} placeholder='{"budget": "$100M"}' rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Awards</Label>
                    <Textarea value={formData.awards} onChange={(e) => setFormData((prev) => ({ ...prev, awards: e.target.value }))} placeholder="Oscar, Golden Globe..." rows={3} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Trivia (JSON array)</Label>
                  <Textarea value={formData.trivia} onChange={(e) => setFormData((prev) => ({ ...prev, trivia: e.target.value }))} placeholder='["Fact 1", "Fact 2"]' rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Behind The Scenes</Label>
                  <Textarea value={formData.behindTheScenes} onChange={(e) => setFormData((prev) => ({ ...prev, behindTheScenes: e.target.value }))} placeholder="Production details..." rows={3} />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.published} onChange={(e) => setFormData((prev) => ({ ...prev, published: e.target.checked }))} className="w-4 h-4" />
                    <span>Published</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.featured} onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))} className="w-4 h-4" />
                    <span>Featured</span>
                  </label>
                </div>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> {editingPost ? "Update" : "Create"} Blog Post
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {blogPosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No blog posts yet. Create your first one!</div>
        ) : (
          <div className="space-y-4">
            {blogPosts.map((post) => (
              <Card key={post.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{post.title}</CardTitle>
                        <Badge variant={post.published ? "default" : "secondary"}>{post.published ? "Published" : "Draft"}</Badge>
                        {post.featured && <Badge variant="outline">Featured</Badge>}
                        <Badge variant="outline">{post.contentType}</Badge>
                      </div>
                      <CardDescription className="line-clamp-2">{post.excerpt}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(post)}><Edit className="w-4 h-4 mr-2" />Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeletePost(post.id, post.title)} disabled={deleteMutation.isPending}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Slug: /blog/{post.slug}</span>
                    <span>Author: {post.author}</span>
                    <span>Created: {new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Newsletter Manager Component
function NewsletterManager() {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  const { data: subscriberData, isLoading } = useQuery<{
    count: number;
    subscribers: Array<{ email: string; subscribedAt: string; source: string }>;
  }>({
    queryKey: ["/api/admin/newsletter/subscribers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/newsletter/subscribers", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch subscribers");
      return res.json();
    },
  });

  const handleSendNewsletter = async () => {
    if (!confirm("Are you sure you want to send the newsletter to all subscribers?")) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (res.ok) {
        setSendResult(data);
        toast({
          title: "Newsletter Sent!",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send newsletter",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send newsletter",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Newsletter Management
          </CardTitle>
          <CardDescription>Manage subscribers and send newsletters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{subscriberData?.count || 0}</p>
              <p className="text-sm text-muted-foreground">Total Subscribers</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-green-500">{sendResult?.sent || 0}</p>
              <p className="text-sm text-muted-foreground">Last Send Success</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-red-500">{sendResult?.failed || 0}</p>
              <p className="text-sm text-muted-foreground">Last Send Failed</p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <Button
              onClick={handleSendNewsletter}
              disabled={isSending || !subscriberData?.count}
              className="bg-primary"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Sending..." : "Send Weekly Newsletter"}
            </Button>
          </div>

          {sendResult && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg mb-6">
              <h4 className="font-semibold text-green-500 mb-2">Last Newsletter Sent</h4>
              <p className="text-sm">
                📧 Sent to {sendResult.sent} subscribers |
                📺 {sendResult.newShows} new shows |
                🎬 {sendResult.newMovies} new movies
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscribers List */}
      <Card>
        <CardHeader>
          <CardTitle>Subscribers ({subscriberData?.count || 0})</CardTitle>
          <CardDescription>All newsletter subscribers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading subscribers...</p>
          ) : subscriberData?.subscribers?.length === 0 ? (
            <p className="text-muted-foreground">No subscribers yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {subscriberData?.subscribers?.map((sub, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{sub.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Subscribed: {new Date(sub.subscribedAt).toLocaleDateString()} • Source: {sub.source}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/admin/newsletter/send-one", {
                          method: "POST",
                          headers: getAuthHeaders(),
                          body: JSON.stringify({ email: sub.email }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          toast({
                            title: "Sent!",
                            description: `Newsletter sent to ${sub.email}`,
                          });
                        } else {
                          toast({
                            title: "Failed",
                            description: data.error || "Failed to send",
                            variant: "destructive",
                          });
                        }
                      } catch (err) {
                        toast({
                          title: "Error",
                          description: "Failed to send newsletter",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Send
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Push Notification Manager Component
function PushNotificationManager({ shows, movies }: { shows: Show[]; movies: Movie[] }) {
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [notificationType, setNotificationType] = useState<'custom' | 'show' | 'movie' | 'episode'>('custom');
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const { toast } = useToast();

  // Get episodes for selected show
  const selectedShow = shows.find(s => Number(s.id) === selectedShowId);

  // Fetch subscriber count
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/admin/push/subscribers', {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        setSubscriberCount(data.count || 0);
      } catch (e) {
        console.error('Failed to fetch push subscriber count');
      }
    };
    fetchCount();
  }, []);

  const handleSendNotification = async () => {
    if (subscriberCount === 0) {
      toast({
        title: "No Subscribers",
        description: "There are no push notification subscribers yet.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const payload: any = {};

      if (notificationType === 'custom') {
        if (!customTitle || !customBody) {
          toast({
            title: "Missing Fields",
            description: "Please fill in title and body for custom notification.",
            variant: "destructive",
          });
          setIsSending(false);
          return;
        }
        payload.title = customTitle;
        payload.body = customBody;
        payload.url = customUrl || 'https://streamvault.live';
      } else {
        if (!selectedContentId) {
          toast({
            title: "Select Content",
            description: `Please select a ${notificationType} to notify about.`,
            variant: "destructive",
          });
          setIsSending(false);
          return;
        }
        payload.type = notificationType;
        payload.contentId = selectedContentId;
      }

      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setSendResult({ sent: data.sent, failed: data.failed });
        toast({
          title: "Push Sent! 🔔",
          description: `Sent to ${data.sent} subscribers`,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send push notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send push notification",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔔 Push Notifications
          </CardTitle>
          <CardDescription>Send push notifications to browser subscribers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{subscriberCount}</p>
              <p className="text-sm text-muted-foreground">Push Subscribers</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-green-500">{sendResult?.sent || 0}</p>
              <p className="text-sm text-muted-foreground">Last Send Success</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-red-500">{sendResult?.failed || 0}</p>
              <p className="text-sm text-muted-foreground">Last Send Failed</p>
            </div>
          </div>

          {/* Notification Type Selection */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Notification Type</label>
              <select
                value={notificationType}
                onChange={(e) => {
                  setNotificationType(e.target.value as any);
                  setSelectedContentId(null);
                  setSelectedShowId(null);
                }}
                className="w-full p-2 bg-background border rounded-lg"
              >
                <option value="custom">Custom Message</option>
                <option value="show">New Show Added</option>
                <option value="movie">New Movie Added</option>
                <option value="episode">New Episode Added</option>
              </select>
            </div>

            {notificationType === 'custom' ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="🎬 New on StreamVault!"
                    className="w-full p-2 bg-background border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Body</label>
                  <textarea
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder="Check out our latest content..."
                    className="w-full p-2 bg-background border rounded-lg h-20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">URL (optional)</label>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://streamvault.live"
                    className="w-full p-2 bg-background border rounded-lg"
                  />
                </div>
              </>
            ) : notificationType === 'show' ? (
              <div>
                <label className="text-sm font-medium mb-1 block">Select Show</label>
                <select
                  value={selectedContentId || ''}
                  onChange={(e) => setSelectedContentId(Number(e.target.value))}
                  className="w-full p-2 bg-background border rounded-lg"
                >
                  <option value="">-- Select a show --</option>
                  {shows.slice(0, 50).map((show) => (
                    <option key={show.id} value={show.id}>
                      {show.title} ({show.year})
                    </option>
                  ))}
                </select>
              </div>
            ) : notificationType === 'movie' ? (
              <div>
                <label className="text-sm font-medium mb-1 block">Select Movie</label>
                <select
                  value={selectedContentId || ''}
                  onChange={(e) => setSelectedContentId(Number(e.target.value))}
                  className="w-full p-2 bg-background border rounded-lg"
                >
                  <option value="">-- Select a movie --</option>
                  {movies.slice(0, 50).map((movie) => (
                    <option key={movie.id} value={movie.id}>
                      {movie.title} ({movie.year})
                    </option>
                  ))}
                </select>
              </div>
            ) : notificationType === 'episode' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Select Show</label>
                  <select
                    value={selectedShowId || ''}
                    onChange={(e) => {
                      setSelectedShowId(Number(e.target.value));
                      setSelectedContentId(null);
                    }}
                    className="w-full p-2 bg-background border rounded-lg"
                  >
                    <option value="">-- Select a show --</option>
                    {shows.slice(0, 50).map((show) => (
                      <option key={show.id} value={show.id}>
                        {show.title} ({show.year})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedShow && (selectedShow as any).episodes && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Select Episode</label>
                    <select
                      value={selectedContentId || ''}
                      onChange={(e) => setSelectedContentId(Number(e.target.value))}
                      className="w-full p-2 bg-background border rounded-lg"
                    >
                      <option value="">-- Select an episode --</option>
                      {((selectedShow as any).episodes || []).map((ep: any) => (
                        <option key={ep.id} value={ep.id}>
                          S{ep.seasonNumber}E{ep.episodeNumber} - {ep.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : null}

            <Button
              onClick={handleSendNotification}
              disabled={isSending || subscriberCount === 0}
              className="w-full bg-primary"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Sending..." : `Send Push to ${subscriberCount} Subscribers`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
