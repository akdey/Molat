import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  Quote,
  Sparkles,
  BookOpen,
  Eye,
  EyeOff,
  Send,
  Trash2,
  BookmarkPlus,
  Globe,
  Users,
  Plus,
  X,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import {
  fetchAddaPosts,
  createAddaPost,
  deleteAddaPost,
  addAddaComment,
  deleteAddaComment,
  toggleAddaReaction,
  createWishlistItem,
} from '../api/client';
import type {
  AddaPost,
  AddaPostType,
  AddaReactionType,
  AddaVisibility,
} from '../types/book';
import { BookCover } from './BookCover';

const POST_TYPE_LABELS: Record<AddaPostType, string> = {
  note: 'Marginalia',
  quote: 'Quote',
  review: 'Review',
  discussion: 'Discussion',
};

const formatRelative = (iso: string) => {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

export const AddaScreen: React.FC = () => {
  const {
    books,
    authUser,
    authToken,
    alcoveOverview,
    loadWishlist,
    addToast,
  } = useLibraryStore();

  const [posts, setPosts] = useState<AddaPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [scope, setScope] = useState<'all' | 'alcove' | 'mine'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [postType, setPostType] = useState<AddaPostType>('quote');
  const [visibility, setVisibility] = useState<AddaVisibility>('public');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [pageNumber, setPageNumber] = useState<string>('');
  const [content, setContent] = useState('');
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Per-post UI state
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const hasAlcove = (alcoveOverview?.alcoves.length ?? 0) > 0;
  const primaryAlcove = alcoveOverview?.alcoves[0] || null;

  const loadFeed = async (nextScope = scope, nextType = typeFilter) => {
    setLoadingPosts(true);
    try {
      const res = await fetchAddaPosts(nextScope, nextType);
      setPosts(res.posts);
    } catch (err: any) {
      addToast(err.message || 'Could not load Adda feed', 'error');
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadFeed(scope, typeFilter);
  }, [scope, typeFilter]);

  const selectedBook = useMemo(
    () => books.find((b) => b.book_id === selectedBookId) || null,
    [books, selectedBookId]
  );

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const created = await createAddaPost({
        post_type: postType,
        visibility,
        alcove_id: visibility === 'alcove' ? primaryAlcove?.id : undefined,
        book_id: selectedBook?.book_id,
        book_title: selectedBook?.title,
        book_authors: selectedBook?.authors,
        book_cover_url: selectedBook?.cover_url,
        page_number: pageNumber ? Number(pageNumber) : undefined,
        content: content.trim(),
        has_spoiler: hasSpoiler,
      });
      setPosts((prev) => [created, ...prev]);
      setContent('');
      setPageNumber('');
      setSelectedBookId('');
      setHasSpoiler(false);
      setComposerOpen(false);
      addToast('Published to Adda!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to publish post', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteAddaPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      addToast('Post removed', 'info');
    } catch (err: any) {
      addToast(err.message || 'Could not delete post', 'error');
    }
  };

  const handleReact = async (post: AddaPost, reactionType: AddaReactionType) => {
    const hadReaction = post.my_reactions.includes(reactionType);
    try {
      await toggleAddaReaction(post.id, reactionType);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== post.id) return p;
          const nextMine = hadReaction
            ? p.my_reactions.filter((r) => r !== reactionType)
            : [...p.my_reactions, reactionType];
          const nextCounts = { ...p.reaction_counts };
          nextCounts[reactionType] = Math.max(0, (nextCounts[reactionType] || 0) + (hadReaction ? -1 : 1));
          return { ...p, my_reactions: nextMine, reaction_counts: nextCounts };
        })
      );

      // Phase 4: One-tap add to Acquisitions Wishlist when marking wishlisted
      if (!hadReaction && reactionType === 'wishlisted' && post.book_title) {
        try {
          await createWishlistItem(
            {
              title: post.book_title,
              authors: post.book_authors || undefined,
              priority: 'Normal',
              notes: `Discovered in Adda from ex/${post.username}`,
            },
            authToken || undefined
          );
          await loadWishlist();
          addToast(`Added "${post.book_title}" to Acquisitions Wishlist!`, 'success');
        } catch {
          // Ignore duplicate or wishlist errors silently
        }
      }
    } catch (err: any) {
      addToast(err.message || 'Could not update reaction', 'error');
    }
  };

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const draft = (commentDrafts[postId] || '').trim();
    if (!draft) return;
    try {
      const comment = await addAddaComment(postId, draft);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, comment] } : p))
      );
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    } catch (err: any) {
      addToast(err.message || 'Could not post reply', 'error');
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      await deleteAddaComment(commentId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p
        )
      );
    } catch (err: any) {
      addToast(err.message || 'Could not delete reply', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-6">
      {/* Editorial Header */}
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-rule/80 dark:border-rule-dark/80 pb-4">
        <div className="min-w-0">
          <p className="text-3xs font-semibold uppercase tracking-[0.16em] text-warm dark:text-amber-400">
            ❧ Literary Salon
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-ink dark:text-ink-dark mt-0.5">
            Adda
          </h1>
          <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-1">
            Reader marginalia, favorite passages, reviews, and quiet book conversations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setComposerOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer transition-colors shadow-2xs shrink-0"
        >
          {composerOpen ? <X size={15} /> : <Plus size={15} />}
          <span>{composerOpen ? 'Close' : 'Share Note'}</span>
        </button>
      </header>

      {/* Post Composer */}
      {composerOpen && (
        <form
          onSubmit={handlePublish}
          className="p-5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-4 shadow-2xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['quote', 'note', 'review', 'discussion'] as AddaPostType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPostType(t)}
                  className={`px-3 py-1.5 rounded-button text-xs font-medium transition-colors cursor-pointer min-h-[36px] ${
                    postType === t
                      ? 'bg-accent text-white'
                      : 'bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark text-ink-secondary hover:text-ink'
                  }`}
                >
                  {POST_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {hasAlcove && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button text-2xs font-medium cursor-pointer min-h-[34px] ${
                    visibility === 'public'
                      ? 'bg-warm text-white'
                      : 'bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark text-ink-secondary'
                  }`}
                >
                  <Globe size={12} />
                  <span>Public Salon</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('alcove')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button text-2xs font-medium cursor-pointer min-h-[34px] ${
                    visibility === 'alcove'
                      ? 'bg-warm text-white'
                      : 'bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark text-ink-secondary'
                  }`}
                >
                  <Users size={12} />
                  <span>{primaryAlcove?.name || 'Alcove'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              aria-label="Link a book from your shelf"
              className="sm:col-span-3 px-3 py-2.5 rounded-input border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs focus:outline-none focus:border-accent min-h-[44px]"
            >
              <option value="">General literary thought (no specific book)</option>
              {books.map((b) => (
                <option key={b.book_id} value={b.book_id}>
                  {b.title} {b.authors ? `— ${b.authors}` : ''}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              max={50000}
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              placeholder="Page # (opt)"
              className="px-3 py-2.5 rounded-input border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs font-mono focus:outline-none focus:border-accent min-h-[44px]"
            />
          </div>

          <textarea
            rows={4}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              postType === 'quote'
                ? 'Transcribe a passage that stayed with you...'
                : postType === 'review'
                ? 'Share your honest reading impression...'
                : 'Write a note or start a conversation...'
            }
            className="w-full px-3.5 py-2.5 rounded-input border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-sm focus:outline-none focus:border-accent resize-y"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-ink-secondary dark:text-ink-dark-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasSpoiler}
                onChange={(e) => setHasSpoiler(e.target.checked)}
                className="rounded border-rule text-accent focus:ring-accent"
              />
              <span>Contains plot spoilers (blur until clicked)</span>
            </label>

            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-5 py-2.5 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Send size={14} />
              <span>{submitting ? 'Publishing...' : 'Publish'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Scope & Type Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', label: 'Public Salon' },
              ...(hasAlcove ? [{ id: 'alcove', label: 'Family Alcove' }] : []),
              { id: 'mine', label: 'My Commonplace' },
            ] as { id: 'all' | 'alcove' | 'mine'; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id)}
              className={`px-3.5 py-2 rounded-button text-xs font-medium transition-colors cursor-pointer min-h-[38px] ${
                scope === tab.id
                  ? 'bg-accent/10 dark:bg-accent-dark/20 text-accent dark:text-accent-dark font-semibold'
                  : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'quote', 'review', 'note', 'discussion'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-full text-2xs font-medium transition-colors cursor-pointer ${
                typeFilter === t
                  ? 'bg-warm text-white'
                  : 'bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark text-ink-secondary hover:text-ink'
              }`}
            >
              {t === 'all' ? 'All' : POST_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {loadingPosts ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark animate-pulse"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="p-10 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-center space-y-2.5">
          <Quote size={24} className="mx-auto text-warm opacity-70" />
          <h2 className="font-serif text-lg font-medium text-ink dark:text-ink-dark">
            The salon is quiet
          </h2>
          <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary max-w-md mx-auto">
            Share a favorite passage, a brief reading reflection, or a question for fellow Molat readers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isAuthor = authUser && post.username.toLowerCase() === authUser.toLowerCase();
            const isSpoilerHidden = post.has_spoiler && !revealedSpoilers[post.id];
            const commentsOpen = Boolean(expandedComments[post.id]);
            const resonatedCount = post.reaction_counts.resonated || 0;
            const readingTooCount = post.reaction_counts.reading_too || 0;
            const wishlistedCount = post.reaction_counts.wishlisted || 0;

            return (
              <article
                key={post.id}
                className="p-4 sm:p-5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-3.5 shadow-2xs"
              >
                {/* Post Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-8 h-8 rounded-full bg-warm text-white flex items-center justify-center text-3xs font-serif font-bold shrink-0"
                    >
                      {post.username.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-medium text-ink dark:text-ink-dark">
                          ex/{post.username}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-3xs font-medium bg-canvas dark:bg-canvas-dark border border-rule/70 dark:border-rule-dark/70 text-ink-secondary">
                          {POST_TYPE_LABELS[post.post_type as AddaPostType] || post.post_type}
                        </span>
                        {post.visibility === 'alcove' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-medium bg-warm/10 text-warm">
                            <Users size={10} />
                            <span>Alcove</span>
                          </span>
                        )}
                      </div>
                      <span className="text-3xs text-ink-muted block mt-0.5">
                        {formatRelative(post.created_at)}
                        {post.page_number ? ` • p. ${post.page_number}` : ''}
                      </span>
                    </div>
                  </div>

                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      aria-label="Delete post"
                      className="p-2 rounded-button text-ink-muted hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Linked Book Chip */}
                {post.book_title && (
                  <div className="flex items-center gap-3 p-2.5 rounded-input bg-canvas dark:bg-canvas-dark border border-rule/60 dark:border-rule-dark/60">
                    <div className="w-9 shrink-0 aspect-[2/3] rounded overflow-hidden">
                      <BookCover
                        title={post.book_title}
                        authors={post.book_authors || undefined}
                        coverUrl={post.book_cover_url || undefined}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-serif text-sm font-medium text-ink dark:text-ink-dark truncate">
                        {post.book_title}
                      </p>
                      {post.book_authors && (
                        <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                          {post.book_authors}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="relative">
                  <p
                    className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      post.post_type === 'quote'
                        ? 'font-serif italic text-base border-l-2 border-warm pl-3.5 text-ink dark:text-ink-dark'
                        : 'text-ink dark:text-ink-dark'
                    } ${isSpoilerHidden ? 'blur-sm select-none' : ''}`}
                  >
                    {post.content}
                  </p>
                  {isSpoilerHidden && (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedSpoilers((prev) => ({ ...prev, [post.id]: true }))
                      }
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark text-xs font-medium text-ink dark:text-ink-dark cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Reveal Spoiler</span>
                    </button>
                  )}
                  {post.has_spoiler && !isSpoilerHidden && (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedSpoilers((prev) => ({ ...prev, [post.id]: false }))
                      }
                      className="mt-1.5 inline-flex items-center gap-1 text-3xs text-ink-muted hover:text-ink cursor-pointer"
                    >
                      <EyeOff size={11} />
                      <span>Hide spoiler</span>
                    </button>
                  )}
                </div>

                {/* Literary Reactions & Comments Toggle */}
                <div className="pt-2 border-t border-rule/50 dark:border-rule-dark/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleReact(post, 'resonated')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button text-2xs font-medium transition-colors cursor-pointer min-h-[34px] ${
                        post.my_reactions.includes('resonated')
                          ? 'bg-warm/15 text-warm border border-warm/30'
                          : 'bg-canvas dark:bg-canvas-dark border border-rule/70 dark:border-rule-dark/70 text-ink-secondary hover:text-ink'
                      }`}
                    >
                      <Sparkles size={12} />
                      <span>Resonated</span>
                      {resonatedCount > 0 && <span className="font-mono tabular-nums">{resonatedCount}</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReact(post, 'reading_too')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button text-2xs font-medium transition-colors cursor-pointer min-h-[34px] ${
                        post.my_reactions.includes('reading_too')
                          ? 'bg-accent/15 text-accent dark:text-accent-dark border border-accent/30'
                          : 'bg-canvas dark:bg-canvas-dark border border-rule/70 dark:border-rule-dark/70 text-ink-secondary hover:text-ink'
                      }`}
                    >
                      <BookOpen size={12} />
                      <span>Reading Too</span>
                      {readingTooCount > 0 && (
                        <span className="font-mono tabular-nums">{readingTooCount}</span>
                      )}
                    </button>

                    {post.book_title && (
                      <button
                        type="button"
                        onClick={() => handleReact(post, 'wishlisted')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button text-2xs font-medium transition-colors cursor-pointer min-h-[34px] ${
                          post.my_reactions.includes('wishlisted')
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-shelf-green dark:text-emerald-300 border border-emerald-300/60'
                            : 'bg-canvas dark:bg-canvas-dark border border-rule/70 dark:border-rule-dark/70 text-ink-secondary hover:text-ink'
                        }`}
                      >
                        <BookmarkPlus size={12} />
                        <span>+ Wishlist</span>
                        {wishlistedCount > 0 && (
                          <span className="font-mono tabular-nums">{wishlistedCount}</span>
                        )}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-button text-2xs font-medium text-ink-secondary hover:text-ink cursor-pointer min-h-[34px]"
                  >
                    <MessageSquare size={13} />
                    <span className="tabular-nums">
                      {post.comments.length} {post.comments.length === 1 ? 'Reply' : 'Replies'}
                    </span>
                  </button>
                </div>

                {/* Expandable Reply Thread */}
                {commentsOpen && (
                  <div className="pt-2 space-y-2.5 border-t border-rule/40 dark:border-rule-dark/40">
                    {post.comments.map((c) => {
                      const canDeleteComment =
                        authUser && c.username.toLowerCase() === authUser.toLowerCase();
                      return (
                        <div
                          key={c.id}
                          className="px-3 py-2 rounded-input bg-canvas dark:bg-canvas-dark flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-2xs font-mono font-medium text-ink dark:text-ink-dark">
                                ex/{c.username}
                              </span>
                              <span className="text-3xs text-ink-muted">
                                {formatRelative(c.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
                              {c.content}
                            </p>
                          </div>
                          {canDeleteComment && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(post.id, c.id)}
                              aria-label="Delete reply"
                              className="p-1 text-ink-muted hover:text-red-600 cursor-pointer shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <form
                      onSubmit={(e) => handleAddComment(e, post.id)}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={commentDrafts[post.id] || ''}
                        onChange={(e) =>
                          setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        placeholder="Add a thoughtful reply..."
                        className="flex-1 px-3 py-2 rounded-input border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs focus:outline-none focus:border-accent min-h-[38px]"
                      />
                      <button
                        type="submit"
                        disabled={!(commentDrafts[post.id] || '').trim()}
                        className="px-3 py-2 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-medium cursor-pointer disabled:opacity-50 min-h-[38px]"
                      >
                        Reply
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
