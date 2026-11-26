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
    <div className="max-w-3xl mx-auto w-full space-y-5 pb-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-medium text-ink dark:text-ink-dark">
              Family Alcove
            </h1>
            <p className="text-xs text-ink-muted">
              Shared household shelves with independent reading streaks
            </p>
          </div>
        </div>

        {primaryAlcove && (
          <button
            onClick={() => {
              setShelfScope('alcove');
              setActiveTab('shelf');
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer transition-colors shadow-xs"
          >
            <BookOpen size={15} />
            <span>Browse {sharedCount} Shared {sharedCount === 1 ? 'Book' : 'Books'}</span>
          </button>
        )}
      </div>

      {/* Soft Email Verification Gate */}
      {!emailVerified && (
        <div className="p-4 rounded-2xl border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>Verify your email address to create, join, or send Family Alcove invites.</span>
          </div>
          <button
            onClick={() => setVerifyEmailModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium min-h-[40px] cursor-pointer transition-colors shrink-0"
          >
            Verify Email
          </button>
        </div>
      )}

      {/* Pending Invites for Me */}
      {pendingInvitesForMe.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Invitations Waiting for You
          </h2>
          {pendingInvitesForMe.map((inv) => (
            <div
              key={inv.id}
              className="p-4 rounded-2xl border border-accent/30 bg-accent/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="text-xs space-y-0.5">
                <p className="font-serif text-base font-medium text-ink dark:text-ink-dark">
                  {inv.alcove_name}
                </p>
                <p className="text-ink-muted">Invited by ex/{inv.invited_by_username}</p>
              </div>
              <button
                disabled={busy || !emailVerified}
                onClick={() => handleJoin(inv.invite_code)}
                className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50"
              >
                Accept &amp; Join
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Alcove vs Create/Join */}
      {primaryAlcove ? (
        <div className="space-y-4">
          {/* Alcove Overview Card */}
          <div className="p-5 rounded-3xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-serif text-lg font-semibold text-ink dark:text-ink-dark">
                    {primaryAlcove.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-3xs font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 capitalize">
                    {primaryAlcove.my_role}
                  </span>
                </div>
                <p className="text-2xs text-ink-muted mt-0.5">
                  {primaryAlcove.members.length} {primaryAlcove.members.length === 1 ? 'reader' : 'readers'} sharing this household library
                </p>
              </div>

              <button
                onClick={() => copyCode(primaryAlcove.invite_code)}
                className="inline-flex items-center justify-between sm:justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark hover:border-accent text-xs font-mono cursor-pointer min-h-[44px]"
              >
                <span>{primaryAlcove.invite_code}</span>
                {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-ink-muted" />}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {primaryAlcove.members.map((m) => (
                <span
                  key={m.user_id}
                  className="px-3 py-1.5 rounded-xl bg-canvas dark:bg-canvas-dark border border-rule/60 dark:border-rule-dark/60 text-xs font-mono text-ink-secondary"
                >
                  ex/{m.username}
                </span>
              ))}
            </div>
          </div>

          {/* Search ex/ Handle or Invite External Email */}
          <div className="p-5 rounded-3xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-3 shadow-xs">
            <div>
              <h3 className="font-serif text-base font-medium text-ink dark:text-ink-dark">
                Invite Family or Friends
              </h3>
              <p className="text-xs text-ink-muted">
                Search registered readers by <span className="font-mono">ex/handle</span>, or enter an external email address.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inviteQuery.trim()) handleSendInvite(inviteQuery);
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <input
                  type="text"
                  value={inviteQuery}
                  onChange={(e) => setInviteQuery(e.target.value)}
                  placeholder="ex/partner or email@example.com"
                  disabled={!emailVerified || busy}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs focus:outline-none focus:border-accent min-h-[44px]"
                />
              </div>
              <button
                type="submit"
                disabled={!emailVerified || busy || !inviteQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shrink-0"
              >
                {isExternalEmail ? <Mail size={14} /> : <UserPlus size={14} />}
                <span>{isExternalEmail ? 'Email External Invite' : 'Send Invite'}</span>
              </button>
            </form>

            {/* Live Reader Lookup Dropdown */}
            {searchingReaders && (
              <p className="text-3xs text-ink-muted px-1">Searching Molat readers...</p>
            )}
            {lookupResults.length > 0 && (
              <div className="rounded-2xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark divide-y divide-rule/50 dark:divide-rule-dark/50 overflow-hidden">
                {lookupResults.map((reader) => (
                  <div key={reader.user_id} className="flex items-center justify-between px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-ink dark:text-ink-dark">
                        ex/{reader.username}
                      </span>
                      {reader.email_verified && (
                        <span className="px-1.5 py-0.5 rounded text-3xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                          Verified
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleSendInvite(`ex/${reader.username}`)}
                      className="px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium cursor-pointer"
                    >
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            )}

            {primaryAlcove.sent_invites.length > 0 && (
              <div className="pt-1 text-3xs text-ink-muted flex flex-wrap items-center gap-2">
                <ShieldCheck size={13} className="text-accent" />
                <span>Pending invites:</span>
                {primaryAlcove.sent_invites.map((i) => (
                  <span key={i.id} className="px-2 py-0.5 rounded-md bg-canvas dark:bg-canvas-dark border border-rule/50">
                    {i.invitee_email}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sharing Mode & Leave */}
          <div className="p-5 rounded-3xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-ink dark:text-ink-dark">
                  Share Entire Shelf Automatically
                </p>
                <p className="text-3xs text-ink-muted">
                  Off by default (selective per book). Turn on to merge all your books into {primaryAlcove.name}.
                </p>
              </div>
              <button
                onClick={handleToggleAutoShare}
                disabled={busy}
                className={`px-4 py-2.5 rounded-xl text-xs font-medium min-h-[44px] cursor-pointer transition-colors shrink-0 ${
                  primaryAlcove.my_auto_share
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark hover:border-accent'
                }`}
              >
                {primaryAlcove.my_auto_share ? 'Auto-Share: ON' : 'Selective Sharing'}
              </button>
            </div>

            <div className="pt-3 border-t border-rule/50 dark:border-rule-dark/50 flex justify-end">
              <button
                onClick={handleLeave}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer min-h-[40px]"
              >
                <LogOut size={14} />
                <span>Leave Alcove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Create or Join Cards (Clean Single-Column Mobile Stack) */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <form onSubmit={handleCreate} className="p-5 rounded-3xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-3 shadow-xs">
            <h2 className="font-serif text-base font-medium text-ink dark:text-ink-dark">
              Create a Household Alcove
            </h2>
            <p className="text-xs text-ink-muted">
              Start a shared shelf for your home and invite family members.
            </p>
            <input
              type="text"
              value={newAlcoveName}
              onChange={(e) => setNewAlcoveName(e.target.value)}
              placeholder="e.g. Dey Family Library"
              disabled={!emailVerified || busy}
              className="w-full px-3.5 py-2.5 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs focus:outline-none focus:border-accent min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!emailVerified || busy || newAlcoveName.trim().length < 2}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50"
            >
              <Plus size={15} />
              <span>Create Alcove</span>
            </button>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin(joinCode);
            }}
            className="p-5 rounded-3xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-3 shadow-xs"
          >
            <h2 className="font-serif text-base font-medium text-ink dark:text-ink-dark">
              Join with Invite Code
            </h2>
            <p className="text-xs text-ink-muted">
              Enter the 6-character code shared by your family curator.
            </p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ALC-XXXXXX"
              disabled={!emailVerified || busy}
              className="w-full px-3.5 py-2.5 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs font-mono focus:outline-none focus:border-accent min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!emailVerified || busy || joinCode.trim().length < 4}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark hover:border-accent text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50"
            >
              <Users size={15} />
              <span>Join Alcove</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
