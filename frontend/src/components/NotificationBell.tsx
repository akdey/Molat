import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Users, MessageSquare, Sparkles, Clock, X, Check } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { acceptAlcoveInvite, declineAlcoveInvite } from '../api/client';
import type { AppNotification } from '../types/book';

type TabId =
  | 'home'
  | 'shelf'
  | 'insights'
  | 'tracker'
  | 'wishlist'
  | 'maintenance'
  | 'lending'
  | 'alcoves'
  | 'adda'
  | 'profile'
  | 'more';

interface NotificationBellProps {
  switchTab: (tab: TabId) => void;
}

const formatRelativeTime = (iso: string) => {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

const getIcon = (type: string) => {
  switch (type) {
    case 'alcove_invite':
    case 'alcove_accepted':
    case 'alcove_removed':
      return <Users size={14} className="text-warm shrink-0" />;
    case 'adda_reply':
      return <MessageSquare size={14} className="text-accent dark:text-accent-dark shrink-0" />;
    case 'adda_reaction':
      return <Sparkles size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />;
    case 'lending_overdue':
      return <Clock size={14} className="text-red-600 dark:text-red-400 shrink-0" />;
    default:
      return <Bell size={14} className="text-ink-muted shrink-0" />;
  }
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ switchTab }) => {
  const {
    notifications,
    unreadNotificationCount,
    loadNotifications,
    loadAlcoves,
    markNotificationRead,
    markAllNotificationsRead,
    addToast,
  } = useLibraryStore();

  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      loadNotifications();
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
    }
    if (notif.type.startsWith('alcove_')) {
      switchTab('alcoves');
    } else if (notif.type.startsWith('adda_')) {
      switchTab('adda');
    } else if (notif.type === 'lending_overdue') {
      switchTab('lending');
    }
    setOpen(false);
  };

  const handleInviteAction = async (
    e: React.MouseEvent,
    notif: AppNotification,
    action: 'accept' | 'decline'
  ) => {
    e.stopPropagation();
    const inviteId = notif.metadata?.invite_id || notif.reference_id;
    if (!inviteId) return;
    setBusyId(notif.id);
    try {
      if (action === 'accept') {
        const res = await acceptAlcoveInvite(String(inviteId));
        addToast(`Joined ${res.name}!`, 'success');
        await loadAlcoves();
        switchTab('alcoves');
        setOpen(false);
      } else {
        await declineAlcoveInvite(String(inviteId));
        addToast('Invitation declined', 'info');
      }
      await markNotificationRead(notif.id);
      await loadNotifications();
    } catch (err: any) {
      addToast(err.message || 'Could not process invitation', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={`relative p-2 rounded-button transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center ${
          open
            ? 'text-accent dark:text-accent-dark bg-accent/10'
            : 'text-ink-secondary hover:text-ink dark:hover:text-ink-dark hover:bg-surface dark:hover:bg-surface-dark'
        }`}
        title="Notifications"
        aria-label={`Notifications${unreadNotificationCount > 0 ? ` (${unreadNotificationCount} unread)` : ''}`}
        aria-expanded={open}
      >
        <Bell size={16} />
        {unreadNotificationCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-warm text-white text-[10px] font-mono font-bold leading-none flex items-center justify-center tabular-nums">
            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-12 sm:w-88 md:w-96 rounded-card border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised shadow-xl z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-rule/70 dark:border-rule-dark/70 flex items-center justify-between gap-2 bg-surface/60 dark:bg-surface-dark/60">
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm font-semibold text-ink dark:text-ink-dark">
                Notifications
              </span>
              {unreadNotificationCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-3xs font-mono font-semibold bg-warm/15 text-warm tabular-nums">
                  {unreadNotificationCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadNotificationCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead()}
                  className="px-2 py-1 rounded-button text-2xs font-medium text-accent dark:text-accent-dark hover:bg-accent/10 inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCheck size={12} />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="p-1 rounded-button text-ink-muted hover:text-ink dark:hover:text-ink-dark cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-rule/50 dark:divide-rule-dark/50">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center space-y-1">
                <Bell size={20} className="mx-auto text-ink-muted opacity-50" />
                <p className="text-xs font-medium text-ink dark:text-ink-dark">All caught up</p>
                <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary">
                  Alcove invites and Adda activity will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isInvite =
                  notif.type === 'alcove_invite' &&
                  !notif.is_read &&
                  (notif.metadata?.invite_id || notif.reference_id);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer hover:bg-surface/80 dark:hover:bg-surface-dark/80 ${
                      !notif.is_read ? 'bg-accent/5 dark:bg-accent-dark/10' : ''
                    }`}
                  >
                    <div className="mt-0.5 w-7 h-7 rounded-button bg-canvas dark:bg-canvas-dark border border-rule/60 dark:border-rule-dark/60 flex items-center justify-center shrink-0">
                      {getIcon(notif.type)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-ink dark:text-ink-dark truncate">
                          {notif.title}
                        </span>
                        <span className="text-3xs text-ink-muted shrink-0 tabular-nums">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-2xs text-ink-secondary dark:text-ink-dark-secondary leading-relaxed">
                        {notif.body}
                      </p>
                      {isInvite && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={busyId === notif.id}
                            onClick={(e) => handleInviteAction(e, notif, 'accept')}
                            className="px-2.5 py-1 rounded-button bg-accent hover:bg-accent-hover text-white text-2xs font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Check size={11} />
                            <span>Accept</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === notif.id}
                            onClick={(e) => handleInviteAction(e, notif, 'decline')}
                            className="px-2.5 py-1 rounded-button border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark text-ink-secondary hover:text-ink text-2xs font-medium cursor-pointer disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                    {!notif.is_read && (
                      <span
                        aria-label="Unread"
                        className="w-2 h-2 rounded-full bg-warm mt-2 shrink-0"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
