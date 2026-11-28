import React, { useEffect, useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Mail,
  Plus,
  LogOut,
  ShieldCheck,
  AlertCircle,
  BookOpen,
  Search,
  UserPlus,
  ArrowUpRight,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import {
  createAlcove,
  joinAlcove,
  inviteMemberToAlcove,
  leaveAlcove,
  updateAlcoveAutoShare,
  lookupReaders,
  type ReaderLookupItem,
} from '../api/client';

export const AlcoveScreen: React.FC = () => {
  const {
    alcoveOverview,
    emailVerified,
    setVerifyEmailModalOpen,
    loadAlcoves,
    addToast,
    setActiveTab,
    setShelfScope,
  } = useLibraryStore();

  const [newAlcoveName, setNewAlcoveName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [inviteQuery, setInviteQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<ReaderLookupItem[]>([]);
  const [searchingReaders, setSearchingReaders] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const alcoves = alcoveOverview?.alcoves || [];
  const pendingInvitesForMe = alcoveOverview?.pending_invites_for_me || [];
  const primaryAlcove = alcoves[0] || null;
  const sharedCount = alcoveOverview?.shared_books.length || 0;
  const isExternalEmail = inviteQuery.includes('@');

  // Debounced reader lookup by ex/ handle
  useEffect(() => {
    const q = inviteQuery.trim();
    if (!q || q.includes('@') || !emailVerified || !primaryAlcove) {
      setLookupResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingReaders(true);
      try {
        const res = await lookupReaders(q);
        setLookupResults(res);
      } catch {
        setLookupResults([]);
      } finally {
        setSearchingReaders(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [inviteQuery, emailVerified, primaryAlcove]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlcoveName.trim()) return;
    setBusy(true);
    try {
      await createAlcove(newAlcoveName.trim());
      setNewAlcoveName('');
      await loadAlcoves();
      addToast('Family Alcove created!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Could not create Alcove', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (codeToJoin: string) => {
    const clean = codeToJoin.trim().toUpperCase();
    if (!clean) return;
    setBusy(true);
    try {
      const res = await joinAlcove(clean);
      setJoinCode('');
      await loadAlcoves();
      addToast(`Joined ${res.name}!`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Invalid Alcove invite code', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSendInvite = async (target: string) => {
    if (!primaryAlcove || !target.trim()) return;
    setBusy(true);
    try {
      const res = await inviteMemberToAlcove(primaryAlcove.id, target.trim());
      setInviteQuery('');
      setLookupResults([]);
      await loadAlcoves();
      const label = res.invitee_handle || res.invitee_email;
      if (res.email_sent) {
        addToast(`Invitation sent to ${label}`, 'success');
      } else {
        addToast(`Invite created for ${label} (Code: ${res.invite_code})`, 'info');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to send invite', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleAutoShare = async () => {
    if (!primaryAlcove) return;
    setBusy(true);
    try {
      const nextVal = !primaryAlcove.my_auto_share;
      await updateAlcoveAutoShare(primaryAlcove.id, nextVal, true);
      await loadAlcoves();
      addToast(
        nextVal ? 'Your shelf is now shared with the Alcove.' : 'Switched to selective book sharing.',
        'success'
      );
    } catch (err: any) {
      addToast(err.message || 'Could not update sharing preference', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!primaryAlcove) return;
    setBusy(true);
    try {
      await leaveAlcove(primaryAlcove.id);
      await loadAlcoves();
      addToast(`Left ${primaryAlcove.name}`, 'info');
    } catch (err: any) {
      addToast(err.message || 'Could not leave Alcove', 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    addToast(`Copied ${code}`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 pb-6">
      {/* Editorial Header */}
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-rule/80 dark:border-rule-dark/80 pb-4">
        <div className="min-w-0">
          <p className="text-3xs font-semibold uppercase tracking-[0.16em] text-warm dark:text-amber-400">
            ❧ Shared Shelves
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-ink dark:text-ink-dark mt-0.5">
            Family Alcove
          </h1>
          <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-1">
            Household shelves and physical copy tracking with independent reading streaks.
          </p>
        </div>

        {primaryAlcove && (
          <button
            type="button"
            onClick={() => {
              setShelfScope('alcove');
              setActiveTab('shelf');
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer transition-colors shadow-2xs shrink-0"
          >
            <BookOpen size={15} />
            <span>Browse {sharedCount} Shared {sharedCount === 1 ? 'Book' : 'Books'}</span>
            <ArrowUpRight size={14} />
          </button>
        )}
      </header>

      {/* Soft Email Verification Gate */}
      {!emailVerified && (
        <div className="p-4 rounded-card border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>Verify your email address to create, join, or send Family Alcove invites.</span>
          </div>
          <button
            type="button"
            onClick={() => setVerifyEmailModalOpen(true)}
            className="px-4 py-2 rounded-button bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium min-h-[44px] cursor-pointer transition-colors shrink-0"
          >
            Verify Email
          </button>
        </div>
      )}

      {/* Pending Invites for Me */}
      {pendingInvitesForMe.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-secondary dark:text-ink-dark-secondary px-0.5">
            Invitations Waiting for You
          </h2>
          <div className="space-y-2.5">
            {pendingInvitesForMe.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-card border border-accent/30 bg-accent/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="text-xs space-y-0.5">
                  <p className="font-serif text-base font-medium text-ink dark:text-ink-dark">
                    {inv.alcove_name}
                  </p>
                  <p className="text-ink-secondary dark:text-ink-dark-secondary">
                    Invited by <span className="font-mono">ex/{inv.invited_by_username}</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy || !emailVerified}
                  onClick={() => handleJoin(inv.invite_code)}
                  className="px-4 py-2.5 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50 shrink-0"
                >
                  Accept &amp; Join
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Alcove vs Create/Join */}
      {primaryAlcove ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Alcove Overview & Sharing Settings */}
          <div className="lg:col-span-7 space-y-4">
            {/* Overview + Members */}
            <section className="p-5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-xl font-medium text-ink dark:text-ink-dark truncate">
                      {primaryAlcove.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-3xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 capitalize">
                      {primaryAlcove.my_role}
                    </span>
                  </div>
                  <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5 tabular-nums">
                    {primaryAlcove.members.length}{' '}
                    {primaryAlcove.members.length === 1 ? 'reader' : 'readers'} &bull; {sharedCount}{' '}
                    shared {sharedCount === 1 ? 'volume' : 'volumes'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => copyCode(primaryAlcove.invite_code)}
                  className="inline-flex items-center justify-between sm:justify-center gap-2 px-3.5 py-2 rounded-button border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark hover:border-accent/60 text-xs font-mono cursor-pointer min-h-[44px] shrink-0 transition-colors"
                  title="Copy Alcove invite code"
                >
                  <span>{primaryAlcove.invite_code}</span>
                  {copiedCode ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} className="text-ink-muted" />
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-rule/60 dark:border-rule-dark/60 space-y-2.5">
                <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted block">
                  Household Members
                </span>
                <div className="flex flex-wrap gap-2">
                  {primaryAlcove.members.map((m) => (
                    <div
                      key={m.user_id}
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-button bg-canvas dark:bg-canvas-dark border border-rule/70 dark:border-rule-dark/70"
                    >
                      <span
                        aria-hidden="true"
                        className="w-6 h-6 rounded-full bg-warm text-white flex items-center justify-center text-3xs font-serif font-bold shrink-0"
                      >
                        {m.username.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-ink dark:text-ink-dark">
                        ex/{m.username}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Sharing Mode & Leave */}
            <section className="p-5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-medium text-ink dark:text-ink-dark">
                    Share Entire Shelf Automatically
                  </h3>
                  <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary">
                    Off by default (selective per book). Turn on to mirror all your books into {primaryAlcove.name}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoShare}
                  disabled={busy}
                  className={`px-4 py-2 rounded-button text-xs font-medium min-h-[44px] cursor-pointer transition-colors shrink-0 ${
                    primaryAlcove.my_auto_share
                      ? 'bg-shelf-green hover:bg-emerald-800 text-white'
                      : 'bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark hover:border-accent/60 text-ink dark:text-ink-dark'
                  }`}
                >
                  {primaryAlcove.my_auto_share ? 'Auto-Share: ON' : 'Selective Sharing'}
                </button>
              </div>

              <div className="pt-3 border-t border-rule/60 dark:border-rule-dark/60 flex items-center justify-between gap-3">
                <span className="text-2xs text-ink-muted">
                  Leaving removes your shared shelves from this Alcove.
                </span>
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-button text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer min-h-[44px] shrink-0 transition-colors"
                >
                  <LogOut size={14} />
                  <span>Leave Alcove</span>
                </button>
              </div>
            </section>
          </div>

          {/* Right Column: Invite Family or Friends */}
          <section className="lg:col-span-5 p-5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-4 shadow-2xs">
            <div>
              <h2 className="font-serif text-lg font-medium text-ink dark:text-ink-dark">
                Invite Readers
              </h2>
              <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary mt-0.5">
                Search registered readers by <span className="font-mono">ex/handle</span>, or invite via email.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inviteQuery.trim()) handleSendInvite(inviteQuery);
              }}
              className="space-y-2.5"
            >
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                />
                <input
                  type="text"
                  value={inviteQuery}
                  onChange={(e) => setInviteQuery(e.target.value)}
                  placeholder="ex/partner or email@example.com"
                  disabled={!emailVerified || busy}
                  className="w-full pl-9 pr-3 py-2.5 rounded-input border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs focus:outline-none focus:border-accent min-h-[44px]"
                />
              </div>
              <button
                type="submit"
                disabled={!emailVerified || busy || !inviteQuery.trim()}
                className="w-full px-4 py-2.5 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                {isExternalEmail ? <Mail size={14} /> : <UserPlus size={14} />}
                <span>{isExternalEmail ? 'Email External Invite' : 'Send Invite'}</span>
              </button>
            </form>

            {/* Live Reader Lookup Dropdown */}
            {searchingReaders && (
              <p className="text-2xs text-ink-muted px-1">Searching Molat readers...</p>
            )}
            {lookupResults.length > 0 && (
              <div className="rounded-card border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark divide-y divide-rule/50 dark:divide-rule-dark/50 overflow-hidden">
                {lookupResults.map((reader) => (
                  <div key={reader.user_id} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden="true"
                        className="w-6 h-6 rounded-full bg-warm text-white flex items-center justify-center text-3xs font-serif font-bold shrink-0"
                      >
                        {reader.username.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-mono text-xs font-medium text-ink dark:text-ink-dark truncate">
                        ex/{reader.username}
                      </span>
                      {reader.email_verified && (
                        <span className="px-1.5 py-0.5 rounded-full text-3xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                          Verified
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleSendInvite(`ex/${reader.username}`)}
                      className="px-3 py-1.5 rounded-button bg-accent/10 hover:bg-accent/20 text-accent dark:text-accent-dark text-xs font-medium cursor-pointer min-h-[36px] shrink-0"
                    >
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            )}

            {primaryAlcove.sent_invites.length > 0 && (
              <div className="pt-2 border-t border-rule/60 dark:border-rule-dark/60 space-y-2">
                <div className="flex items-center gap-1.5 text-2xs font-medium text-ink-secondary dark:text-ink-dark-secondary">
                  <ShieldCheck size={13} className="text-accent dark:text-accent-dark shrink-0" />
                  <span>Pending Sent Invites</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {primaryAlcove.sent_invites.map((i) => (
                    <span
                      key={i.id}
                      className="px-2.5 py-1 rounded-input bg-canvas dark:bg-canvas-dark border border-rule/60 dark:border-rule-dark/60 text-2xs text-ink-secondary dark:text-ink-dark-secondary"
                    >
                      {i.invitee_email}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Create or Join Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <form
            onSubmit={handleCreate}
            className="p-5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-3 shadow-2xs flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <h2 className="font-serif text-lg font-medium text-ink dark:text-ink-dark">
                Create a Household Alcove
              </h2>
              <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
                Start a shared shelf for your home and invite family members.
              </p>
            </div>
            <div className="space-y-2.5 pt-1">
              <input
                type="text"
                value={newAlcoveName}
                onChange={(e) => setNewAlcoveName(e.target.value)}
                placeholder="e.g. Dey Family Library"
                disabled={!emailVerified || busy}
                className="w-full px-3.5 py-2.5 rounded-input border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs focus:outline-none focus:border-accent min-h-[44px]"
              />
              <button
                type="submit"
                disabled={!emailVerified || busy || newAlcoveName.trim().length < 2}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-button bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Plus size={15} />
                <span>Create Alcove</span>
              </button>
            </div>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin(joinCode);
            }}
            className="p-5 rounded-card border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-3 shadow-2xs flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <h2 className="font-serif text-lg font-medium text-ink dark:text-ink-dark">
                Join with Invite Code
              </h2>
              <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
                Enter the 6-character code shared by your family curator.
              </p>
            </div>
            <div className="space-y-2.5 pt-1">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ALC-XXXXXX"
                disabled={!emailVerified || busy}
                className="w-full px-3.5 py-2.5 rounded-input border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs font-mono focus:outline-none focus:border-accent min-h-[44px]"
              />
              <button
                type="submit"
                disabled={!emailVerified || busy || joinCode.trim().length < 4}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-button border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark hover:border-accent/60 text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Users size={15} />
                <span>Join Alcove</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
