import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, ThumbsUp, ThumbsDown, ChevronDown, MoreVertical, Smile, Image, X, Search } from "lucide-react";
import type { Comment } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import EmojiPicker, { Theme } from "emoji-picker-react";

interface CommentsSectionProps {
  episodeId?: string;
  movieId?: string;
}

interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[];
  likes?: number;
}

// Generate avatar color based on username
function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500', 'bg-pink-500', 'bg-purple-500', 'bg-indigo-500',
    'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-green-500',
    'bg-yellow-500', 'bg-orange-500'
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

// Format comment text with @mentions highlighted and GIFs rendered
function formatCommentWithMentions(text: string): React.ReactNode {
  // First, split by GIF URLs (Tenor format)
  const gifRegex = /(https:\/\/media\.tenor\.com\/[^\s]+\.gif)/g;
  const parts = text.split(gifRegex);

  return parts.map((part, partIndex) => {
    // Check if this part is a GIF URL
    if (part.match(gifRegex)) {
      return (
        <img
          key={partIndex}
          src={part}
          alt="GIF"
          className="max-w-[300px] max-h-[200px] rounded-lg my-2 block"
          loading="lazy"
        />
      );
    }

    // Handle @mentions in text parts
    const mentionRegex = /@(\w+)/g;
    const mentionParts = part.split(mentionRegex);

    return mentionParts.map((mentionPart, index) => {
      if (index % 2 === 1) {
        return <span key={`${partIndex}-${index}`} className="text-red-500 font-medium">@{mentionPart}</span>;
      }
      return mentionPart;
    });
  });
}

// YouTube-style comment component
// Helper to remove emojis from string
function removeEmojis(text: string): string {
  // Regex for emojis (ranges covering most common emojis)
  return text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
}

// Calculate total replies recursively
function countTotalReplies(comment: CommentWithReplies): number {
  if (!comment.replies || comment.replies.length === 0) {
    return 0;
  }
  return comment.replies.reduce((total, reply) => {
    return total + 1 + countTotalReplies(reply);
  }, 0);
}

function CommentItem({
  comment,
  episodeId,
  movieId,
  userName,
  setUserName,
  isNameSaved,
  setIsNameSaved,
  depth = 0,
  parentUserName,
  parentLikes
}: {
  comment: CommentWithReplies;
  episodeId?: string;
  movieId?: string;
  userName: string;
  setUserName: (name: string) => void;
  isNameSaved?: boolean;
  setIsNameSaved?: (saved: boolean) => void;
  depth?: number;
  parentUserName?: string;
  parentLikes?: number;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);

  // Initialize likes - if reply, ensure it has fewer likes than parent
  const [likes, setLikes] = useState(() => {
    const baseLikes = comment.likes || Math.floor(Math.random() * 50);
    if (parentLikes !== undefined) {
      // For replies, ensure likes are significantly less than parent (e.g., max 30% of parent or random small number)
      return Math.min(baseLikes, Math.floor(parentLikes * 0.3), Math.max(1, parentLikes - 1));
    }
    return baseLikes;
  });

  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const queryClient = useQueryClient();

  const postReply = useMutation({
    mutationFn: async (data: { userName: string; comment: string; parentId: string }) => {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeId,
          movieId,
          parentId: data.parentId,
          userName: data.userName,
          comment: data.comment,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to post reply: ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: episodeId
          ? [`/api/comments/episode/${episodeId}`]
          : [`/api/comments/movie/${movieId}`],
      });
      setReplyText("");
      setShowReplyForm(false);
      // Only save username if it's at least 2 characters
      if (userName.trim().length >= 2) {
        localStorage.setItem("streamvault_username", userName.trim());
        if (setIsNameSaved) setIsNameSaved(true);
      }
    },
  });

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !replyText.trim()) return;
    postReply.mutate({
      userName: userName.trim(),
      comment: replyText.trim(),
      parentId: comment.id
    });
  };

  const handleLike = () => {
    if (liked) {
      setLikes(likes - 1);
      setLiked(false);
    } else {
      setLikes(likes + (disliked ? 1 : 1));
      setLiked(true);
      setDisliked(false);
    }
  };

  const handleDislike = () => {
    if (disliked) {
      setDisliked(false);
    } else {
      if (liked) {
        setLikes(likes - 1);
        setLiked(false);
      }
      setDisliked(true);
    }
  };

  const hasReplies = comment.replies && comment.replies.length > 0;
  const avatarColor = getAvatarColor(comment.userName);
  const firstLetter = comment.userName.charAt(0).toUpperCase();

  // Prepend @mention if this is a reply
  const commentText = parentUserName
    ? `@${parentUserName.toLowerCase().replace(/\s+/g, '')} ${comment.comment}`
    : comment.comment;

  return (
    <div className="relative">
      {/* Row 1: Main Comment */}
      <div className="flex gap-3">
        {/* Avatar Column */}
        <div className="flex flex-col items-center relative">
          <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white font-medium text-sm flex-shrink-0 relative z-10`}>
            {firstLetter}
          </div>
          {/* Vertical line from avatar down - always show if has replies */}
          {hasReplies && (
            <div className="w-0.5 bg-muted-foreground/30 flex-1" />
          )}
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Username and timestamp */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-foreground">@{comment.userName.toLowerCase().replace(/\s+/g, '')}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            <button className="ml-auto p-1 hover:bg-muted rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Comment Text with @mentions highlighted */}
          <p className="text-sm whitespace-pre-wrap break-words mb-2 text-foreground">
            {formatCommentWithMentions(commentText)}
          </p>

          {/* Actions: Like, Dislike, Reply */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleLike}
              className={`p-2 hover:bg-muted rounded-full transition-colors ${liked ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            </button>
            <span className="text-xs text-muted-foreground min-w-[20px]">
              {likes > 0 ? (likes >= 1000 ? `${(likes / 1000).toFixed(1)}K` : likes) : ''}
            </span>
            <button
              onClick={handleDislike}
              className={`p-2 hover:bg-muted rounded-full transition-colors ${disliked ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <ThumbsDown className={`w-4 h-4 ${disliked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-full transition-colors ml-2"
            >
              Reply
            </button>
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-3 flex gap-3">
              <div className={`w-8 h-8 rounded-full ${userName ? getAvatarColor(userName) : 'bg-muted'} flex items-center justify-center text-white font-medium text-xs flex-shrink-0`}>
                {userName ? userName.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="flex-1">
                {(!isNameSaved && !localStorage.getItem("streamvault_username")) && (
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={userName}
                    onChange={(e) => setUserName(removeEmojis(e.target.value))}
                    maxLength={50}
                    className="mb-2 bg-transparent border-0 border-b border-muted rounded-none focus:border-primary px-0"
                  />
                )}
                <form onSubmit={handleReplySubmit}>
                  <Input
                    type="text"
                    placeholder={`Reply to @${comment.userName.toLowerCase().replace(/\s+/g, '')}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    maxLength={1000}
                    className="bg-transparent border-0 border-b border-muted rounded-none focus:border-primary px-0"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowReplyForm(false);
                        setReplyText("");
                      }}
                      className="rounded-full"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={postReply.isPending || !userName.trim() || !replyText.trim()}
                      className="rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                    >
                      {postReply.isPending ? "..." : "Reply"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Replies Toggle (Only if hasReplies) */}
      {hasReplies && (
        <div className="flex gap-3">
          {/* Connector Column */}
          <div className="w-10 flex-shrink-0 relative">
            <svg
              className="absolute top-0 left-0 w-full h-full text-muted-foreground/30 pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              {/* 
                 If collapsed: Vertical to middle, curve right to button.
                 If expanded: Vertical straight down to connect to nested replies.
              */}
              {showReplies ? (
                <line x1="20" y1="0" x2="20" y2="100%" stroke="currentColor" strokeWidth="2" />
              ) : (
                <path d="M 20 0 L 20 16 Q 20 26 35 26" stroke="currentColor" strokeWidth="2" fill="none" />
              )}
            </svg>
          </div>

          {/* Button Column */}
          <div className="flex-1 py-1">
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-2 text-primary text-sm font-bold hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors w-fit"
            >
              {showReplies ? (
                <ChevronDown className="w-4 h-4 rotate-180" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {(() => {
                const totalReplies = countTotalReplies(comment);
                return `${showReplies ? 'Hide' : ''} ${totalReplies} ${totalReplies === 1 ? 'reply' : 'replies'}`;
              })()}
            </button>
          </div>
        </div>
      )}

      {/* Row 3: Nested Replies Row */}
      {hasReplies && showReplies && (
        <div className="flex flex-col w-full">
          {comment.replies!.map((reply, index) => {
            const isLast = index === comment.replies!.length - 1;
            return (
              <div key={reply.id} className="flex">
                {/* Connector Column */}
                <div className="w-10 flex-shrink-0 relative" style={{ minHeight: '48px' }}>
                  <svg
                    className="absolute top-0 left-0 pointer-events-none text-muted-foreground/30"
                    style={{ overflow: 'visible', width: '60px', height: '100%' }}
                    preserveAspectRatio="none"
                  >
                    {/* For non-last: vertical line from curve end (20px) to bottom */}
                    {!isLast && (
                      <line x1="20" y1="20" x2="20" y2="100%" stroke="currentColor" strokeWidth="2" />
                    )}

                    {/* Curve only - L shape: vertical down to 12, curve corner, horizontal to avatar */}
                    <path
                      d="M 20 0 L 20 12 Q 20 20 28 20 L 60 20"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </div>
                {/* Reply Content */}
                <div className="flex-1">
                  <CommentItem
                    comment={reply}
                    episodeId={episodeId}
                    movieId={movieId}
                    userName={userName}
                    setUserName={setUserName}
                    isNameSaved={isNameSaved}
                    setIsNameSaved={setIsNameSaved}
                    depth={depth + 1}
                    parentUserName={comment.userName}
                    parentLikes={likes}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CommentsSection({ episodeId, movieId }: CommentsSectionProps) {
  const [userName, setUserName] = useState("");
  const [isNameSaved, setIsNameSaved] = useState(false);
  const [comment, setComment] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Load saved username from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem("streamvault_username");
    if (savedName) {
      setUserName(savedName);
      setIsNameSaved(true);
    }
  }, []);

  // Click outside to close pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (gifPickerRef.current && !gifPickerRef.current.contains(event.target as Node)) {
        setShowGifPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search GIFs from Tenor API
  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }
    setIsLoadingGifs(true);
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&client_key=streamvault&limit=20`
      );
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error("GIF search error:", error);
      setGifs([]);
    }
    setIsLoadingGifs(false);
  };

  // Load trending GIFs when GIF picker opens
  useEffect(() => {
    if (showGifPicker && gifs.length === 0 && !gifSearch) {
      searchGifs("trending");
    }
  }, [showGifPicker]);

  // Handle emoji selection
  const handleEmojiClick = (emojiData: any) => {
    setComment(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Handle GIF selection
  const handleGifSelect = (gif: any) => {
    const gifUrl = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url;
    if (gifUrl) {
      setComment(prev => prev + (prev ? " " : "") + gifUrl);
    }
    setShowGifPicker(false);
    setGifSearch("");
  };

  // Fetch comments
  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: episodeId
      ? [`/api/comments/episode/${episodeId}`]
      : [`/api/comments/movie/${movieId}`],
    enabled: !!(episodeId || movieId),
  });

  // Organize comments into tree structure
  const organizeComments = (flatComments: Comment[]): CommentWithReplies[] => {
    const commentMap = new Map<string, CommentWithReplies>();
    const rootComments: CommentWithReplies[] = [];

    // First pass: create map of all comments
    flatComments.forEach(c => {
      commentMap.set(c.id, { ...c, replies: [] });
    });

    // Second pass: organize into tree
    flatComments.forEach(c => {
      const comment = commentMap.get(c.id)!;
      const parentId = (c as any).parentId; // Handle old comments without parentId
      if (parentId && commentMap.has(parentId)) {
        commentMap.get(parentId)!.replies!.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    // Sort: newest first for root comments, oldest first for replies
    rootComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return rootComments;
  };

  const organizedComments = comments ? organizeComments(comments) : [];
  const totalComments = comments?.length || 0;

  // Post comment mutation
  const postComment = useMutation({
    mutationFn: async (data: { userName: string; comment: string }) => {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeId,
          movieId,
          userName: data.userName,
          comment: data.comment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to post comment: ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: episodeId
          ? [`/api/comments/episode/${episodeId}`]
          : [`/api/comments/movie/${movieId}`],
      });
      setComment("");
      // Only save username if it's at least 2 characters
      if (userName.trim().length >= 2) {
        localStorage.setItem("streamvault_username", userName.trim());
        setIsNameSaved(true);
      }
    },
    onError: (error) => {
      alert(`Failed to post comment: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !comment.trim()) return;

    postComment.mutate({ userName: userName.trim(), comment: comment.trim() });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">
          {totalComments} Comments
        </h2>
      </div>

      {/* Comment Form - YouTube Style */}
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-full ${userName ? getAvatarColor(userName) : 'bg-muted'} flex items-center justify-center text-white font-medium text-sm flex-shrink-0`}>
          {userName ? userName.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            {!isNameSaved && (
              <Input
                type="text"
                placeholder="Your name"
                value={userName}
                onChange={(e) => setUserName(removeEmojis(e.target.value))}
                maxLength={50}
                className="mb-2 bg-transparent border-0 border-b border-muted rounded-none focus:border-primary px-0 focus-visible:ring-0"
              />
            )}
            <Input
              type="text"
              placeholder="Add a comment..."
              value={comment.replace(/https:\/\/media\.tenor\.com\/[^\s]+\.gif/g, '').trim() || (comment.includes('tenor.com') ? '' : comment)}
              onChange={(e) => {
                // Preserve any existing GIF URL when typing
                const gifMatch = comment.match(/(https:\/\/media\.tenor\.com\/[^\s]+\.gif)/);
                if (gifMatch && !e.target.value.includes(gifMatch[1])) {
                  setComment(e.target.value + (e.target.value ? ' ' : '') + gifMatch[1]);
                } else {
                  setComment(e.target.value);
                }
              }}
              maxLength={1000}
              className="bg-transparent border-0 border-b border-muted rounded-none focus:border-primary px-0 focus-visible:ring-0"
            />

            {/* GIF Preview */}
            {comment.match(/(https:\/\/media\.tenor\.com\/[^\s]+\.gif)/) && (
              <div className="mt-3 relative inline-block">
                <img
                  src={comment.match(/(https:\/\/media\.tenor\.com\/[^\s]+\.gif)/)?.[1]}
                  alt="GIF preview"
                  className="max-w-[200px] max-h-[150px] rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setComment(comment.replace(/(https:\/\/media\.tenor\.com\/[^\s]+\.gif)/, '').trim())}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Action buttons row - always visible */}
            <div className="flex items-center justify-between mt-3">
              {/* Emoji & GIF buttons */}
              <div className="flex items-center gap-1 relative">
                {/* Emoji Button */}
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowGifPicker(false);
                    }}
                    className={`p-2 rounded-full hover:bg-muted transition-colors ${showEmojiPicker ? 'bg-muted text-primary' : 'text-muted-foreground'}`}
                    title="Add emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {/* Emoji Picker Panel */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 z-50 shadow-xl rounded-lg overflow-hidden">
                      <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        theme={Theme.DARK}
                        width={350}
                        height={400}
                        searchPlaceHolder="Search emoji..."
                        skinTonesDisabled
                        previewConfig={{ showPreview: false }}
                      />
                    </div>
                  )}
                </div>

                {/* GIF Button */}
                <div className="relative" ref={gifPickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGifPicker(!showGifPicker);
                      setShowEmojiPicker(false);
                    }}
                    className={`p-2 rounded-full hover:bg-muted transition-colors ${showGifPicker ? 'bg-muted text-primary' : 'text-muted-foreground'}`}
                    title="Add GIF"
                  >
                    <span className="text-xs font-bold">GIF</span>
                  </button>

                  {/* GIF Picker Panel */}
                  {showGifPicker && (
                    <div className="absolute bottom-12 left-0 z-50 w-[350px] bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                      {/* Search Header */}
                      <div className="p-3 border-b border-border">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="Search GIFs..."
                            value={gifSearch}
                            onChange={(e) => {
                              setGifSearch(e.target.value);
                              searchGifs(e.target.value);
                            }}
                            className="pl-9 bg-muted/50"
                          />
                        </div>
                      </div>

                      {/* GIF Grid */}
                      <div className="h-[300px] overflow-y-auto p-2">
                        {isLoadingGifs ? (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            Loading GIFs...
                          </div>
                        ) : gifs.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {gifs.map((gif: any) => (
                              <button
                                key={gif.id}
                                type="button"
                                onClick={() => handleGifSelect(gif)}
                                className="aspect-video rounded overflow-hidden hover:ring-2 ring-primary transition-all"
                              >
                                <img
                                  src={gif.media_formats?.tinygif?.url || gif.media_formats?.nanogif?.url}
                                  alt={gif.content_description}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            {gifSearch ? "No GIFs found" : "Search for GIFs"}
                          </div>
                        )}
                      </div>

                      {/* Tenor Attribution */}
                      <div className="p-2 border-t border-border text-center">
                        <span className="text-xs text-muted-foreground">Powered by Tenor</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit buttons - only show when there's text */}
              {comment && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setComment("")}
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={postComment.isPending || !userName.trim() || !comment.trim()}
                    className="rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                  >
                    {postComment.isPending ? "..." : "Comment"}
                  </Button>
                </div>
              )}
            </div>
          </form>
          {postComment.isError && (
            <p className="text-sm text-red-500 mt-2">
              Failed to post comment. Please try again.
            </p>
          )}
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-5 mt-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading comments...
          </div>
        ) : organizedComments.length > 0 ? (
          organizedComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              episodeId={episodeId}
              movieId={movieId}
              userName={userName}
              setUserName={setUserName}
              isNameSaved={isNameSaved}
              setIsNameSaved={setIsNameSaved}
            />
          ))
        ) : (
          <div className="py-12 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
