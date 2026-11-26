import React, { useState } from 'react';
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
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import {
  createAlcove,
  joinAlcove,
  inviteMemberToAlcove,
  leaveAlcove,
  updateAlcoveAutoShare,
} from '../api/client';

interface AlcoveSectionProps {
  onOpenVerifyModal: () => void;
}

export const AlcoveSection: React.FC<AlcoveSectionProps> = ({ onOpenVerifyModal }) => {
  const {
    alcoveOverview,
    emailVerified,
    loadAlcoves,
    addToast,
    setActiveTab,
    setShelfScope,
  } = useLibraryStore();

  const [newAlcoveName, setNewAlcoveName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const alcoves = alcoveOverview?.alcoves || [];
  const pendingInvitesForMe = alcoveOverview?.pending_invites_for_me || [];
  const primaryAlcove = alcoves[0] || null;
  const sharedCount = alcoveOverview?.shared_books.length || 0;

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

  const handleInviteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryAlcove || !inviteEmail.trim()) return;
    setBusy(true);
    try {
      const res = await inviteMemberToAlcove(primaryAlcove.id, inviteEmail.trim());
      setInviteEmail('');
      await loadAlcoves();
      if (res.email_sent) {
        addToast(`Invitation emailed to ${res.invitee_email}`, 'success');
      } else {
        addToast(`Invite created (Code: ${res.invite_code}). Share code directly if email relay is offline.`, 'info');
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
    <section
      aria-label="Family Alcove Shared Library"
      className="rounded-3xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark p-6 space-y-5 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div>
            <h3 className="font-serif text-lg font-medium text-ink dark:text-ink-dark">
              Family Alcove
            </h3>
            <p className="text-xs text-ink-muted">
              Shared household shelves with independent reading streaks &amp; notes
            </p>
          </div>
        </div>

        {primaryAlcove && (
          <button
            onClick={() => {
              setShelfScope('alcove');
              setActiveTab('shelf');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium min-h-[40px] cursor-pointer transition-colors"
          >
            <BookOpen size={14} />
            <span>Browse {sharedCount} Shared {sharedCount === 1 ? 'Book' : 'Books'}</span>
          </button>
        )}
      </div>

      {/* Soft Email Verification Gate */}
      {!emailVerified && (
        <div className="p-4 rounded-2xl border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>Verify your email address to create, join, or send Family Alcove invites.</span>
          </div>
          <button
            onClick={onOpenVerifyModal}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium min-h-[38px] cursor-pointer transition-colors"
          >
            Verify Email
          </button>
        </div>
      )}

      {/* Pending Invites Addressed to Me */}
      {pendingInvitesForMe.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-ink-secondary">Pending Invitations for You</p>
          {pendingInvitesForMe.map((inv) => (
            <div
              key={inv.id}
              className="p-3.5 rounded-2xl border border-accent/30 bg-accent/5 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="text-xs">
                <span className="font-semibold text-ink dark:text-ink-dark">{inv.alcove_name}</span>
                <span className="text-ink-muted">
                  {' '}
                  &bull; Invited by ex/{inv.invited_by_username}
                </span>
              </div>
              <button
                disabled={busy || !emailVerified}
                onClick={() => handleJoin(inv.invite_code)}
                className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[38px] cursor-pointer disabled:opacity-50"
              >
                Accept &amp; Join
              </button>
            </div>
          ))}
        </div>
      )}

      {/* State A: Active Alcove */}
      {primaryAlcove ? (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl border border-rule/70 dark:border-rule-dark/70 bg-canvas/70 dark:bg-canvas-dark/70 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-semibold text-ink dark:text-ink-dark">
                  {primaryAlcove.name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-3xs font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 capitalize">
                  {primaryAlcove.my_role}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {primaryAlcove.members.map((m) => (
                  <span
                    key={m.user_id}
                    className="px-2.5 py-1 rounded-lg bg-surface dark:bg-surface-dark border border-rule/60 dark:border-rule-dark/60 text-3xs font-mono text-ink-secondary"
                  >
                    ex/{m.username}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => copyCode(primaryAlcove.invite_code)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent text-xs font-mono cursor-pointer min-h-[40px]"
              title="Copy Invite Code"
            >
              <span>{primaryAlcove.invite_code}</span>
              {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-ink-muted" />}
            </button>
          </div>

          {/* Selective vs Auto-Share Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-rule/60 dark:border-rule-dark/60">
            <div className="space-y-0.5 max-w-lg">
              <p className="text-xs font-semibold text-ink dark:text-ink-dark">
                Share Entire Shelf with {primaryAlcove.name}
              </p>
              <p className="text-3xs text-ink-muted">
                Off by default (selective sharing per book). Turn on to automatically merge all your books into the shared household shelf.
              </p>
            </div>
            <button
              onClick={handleToggleAutoShare}
              disabled={busy}
              className={`px-4 py-2 rounded-xl text-xs font-medium min-h-[40px] cursor-pointer transition-colors ${
                primaryAlcove.my_auto_share
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-surface-raised dark:bg-surface-dark-raised border border-rule dark:border-rule-dark text-ink dark:text-ink-dark hover:border-accent'
              }`}
            >
              {primaryAlcove.my_auto_share ? 'Auto-Share: ON' : 'Selective Sharing'}
            </button>
          </div>

          {/* Invite by Email */}
          <form onSubmit={handleInviteEmail} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Invite family member by email..."
                disabled={!emailVerified || busy}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-xs focus:outline-none focus:border-accent min-h-[44px]"
              />
            </div>
            <button
              type="submit"
              disabled={!emailVerified || busy || !inviteEmail.trim()}
              className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              <Mail size={14} />
              <span>Send Email Invite</span>
            </button>
          </form>

          {primaryAlcove.sent_invites.length > 0 && (
            <div className="text-3xs text-ink-muted flex flex-wrap items-center gap-2">
              <ShieldCheck size={13} className="text-accent" />
              <span>Pending email invites:</span>
              {primaryAlcove.sent_invites.map((i) => (
                <span key={i.id} className="px-2 py-0.5 rounded-md bg-canvas dark:bg-canvas-dark border border-rule/50">
                  {i.invitee_email}
                </span>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-rule/50 dark:border-rule-dark/50 flex justify-end">
            <button
              onClick={handleLeave}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer min-h-[36px]"
            >
              <LogOut size={13} />
              <span>Leave Alcove</span>
            </button>
          </div>
        </div>
      ) : (
        /* State B: Create or Join Alcove */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form onSubmit={handleCreate} className="p-4 rounded-2xl border border-rule/60 dark:border-rule-dark/60 bg-canvas/50 dark:bg-canvas-dark/50 space-y-3">
            <p className="text-xs font-semibold text-ink dark:text-ink-dark">Create a Household Alcove</p>
            <input
              type="text"
              value={newAlcoveName}
              onChange={(e) => setNewAlcoveName(e.target.value)}
              placeholder="e.g. Dey Family Library"
              disabled={!emailVerified || busy}
              className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent min-h-[42px]"
            />
            <button
              type="submit"
              disabled={!emailVerified || busy || newAlcoveName.trim().length < 2}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50"
            >
              <Plus size={14} />
              <span>Create Alcove</span>
            </button>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin(joinCode);
            }}
            className="p-4 rounded-2xl border border-rule/60 dark:border-rule-dark/60 bg-canvas/50 dark:bg-canvas-dark/50 space-y-3"
          >
            <p className="text-xs font-semibold text-ink dark:text-ink-dark">Join with Invite Code</p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ALC-XXXXXX"
              disabled={!emailVerified || busy}
              className="w-full px-3 py-2 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-mono focus:outline-none focus:border-accent min-h-[42px]"
            />
            <button
              type="submit"
              disabled={!emailVerified || busy || joinCode.trim().length < 4}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark hover:border-accent text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50"
            >
              <Users size={14} />
              <span>Join Alcove</span>
            </button>
          </form>
        </div>
      )}
    </section>
  );
};
