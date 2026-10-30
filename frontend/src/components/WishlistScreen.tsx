import React, { useState } from 'react';
import { ShoppingBag, Plus, Check, Tag, DollarSign, X, AlertCircle, RefreshCw } from 'lucide-react';
import type { WishlistItem, BookCondition } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';
import { createWishlistItem } from '../api/client';

export const WishlistScreen: React.FC = () => {
  const {
    wishlist,
    acquireItem,
    loadWishlist,
    libraryKey,
    authToken,
    addToast,
    setKeyModalOpen,
  } = useLibraryStore();

  const [acquireModalItem, setAcquireModalItem] = useState<WishlistItem | null>(null);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [condition, setCondition] = useState<BookCondition>('Good');
  const [location, setLocation] = useState<string>('Home Shelf');
  const [acquiring, setAcquiring] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New wishlist item form state
  const [newTitle, setNewTitle] = useState('');
  const [newAuthors, setNewAuthors] = useState('');
  const [newExpectedRp, setNewExpectedRp] = useState<number>(399);
  const [newTargetPrice, setNewTargetPrice] = useState<number>(150);
  const [newPriority, setNewPriority] = useState<string>('Normal');
  const [adding, setAdding] = useState(false);
  const [addFormOpen, setAddFormOpen] = useState(false);

  const openAcquireModal = (item: WishlistItem) => {
    setAcquireModalItem(item);
    setPurchasePrice(item.target_price || 0);
    setCondition('Good');
    setLocation('Home Shelf');
    setErrorMsg(null);
  };

  const handleAcquireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acquireModalItem) return;

    setAcquiring(true);
    setErrorMsg(null);

    try {
      await acquireItem(acquireModalItem.wishlist_id, {
        purchase_price: purchasePrice,
        condition,
        location: location.trim() || 'Home Shelf',
      });
      setAcquireModalItem(null);
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setErrorMsg('Authentication key required to acquire wishlist items.');
        setKeyModalOpen(true);
      } else {
        setErrorMsg(err.message || 'Failed to acquire item.');
      }
    } finally {
      setAcquiring(false);
    }
  };

  const handleCreateWishlistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setAdding(true);
    setErrorMsg(null);
    const token = authToken || libraryKey;
    try {
      const created = await createWishlistItem(
        {
          title: newTitle.trim(),
          authors: newAuthors.trim() || undefined,
          expected_rp: newExpectedRp,
          target_price: newTargetPrice,
          priority: newPriority,
        },
        token
      );
      addToast(`Added "${created.title}" to wishlist!`, 'success');
      setNewTitle('');
      setNewAuthors('');
      setAddFormOpen(false);
      await loadWishlist();
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setErrorMsg('Authentication key required to add wishlist items.');
        setKeyModalOpen(true);
      } else {
        setErrorMsg(err.message || 'Failed to add item to wishlist.');
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-ink dark:text-ink-dark">
            Acquisitions Wishlist ({wishlist.length})
          </h2>
          <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary">
            Planned physical book purchases with target second-hand prices and 1-click shelf acquisition.
          </p>
        </div>

        <button
          onClick={() => setAddFormOpen(!addFormOpen)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium self-start sm:self-auto transition-all"
        >
          <Plus size={15} />
          <span>Add Wishlist Item</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs rounded-xl bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/40 flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add New Wishlist Item Modal / Panel */}
      {addFormOpen && (
        <form
          onSubmit={handleCreateWishlistItem}
          className="p-5 rounded-2xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-medium">New Book to Acquire</h3>
            <button
              type="button"
              onClick={() => setAddFormOpen(false)}
              className="p-1 text-ink-muted hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                Book Title *
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. A Gentleman in Moscow"
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                Author
              </label>
              <input
                type="text"
                value={newAuthors}
                onChange={(e) => setNewAuthors(e.target.value)}
                placeholder="e.g. Amor Towles"
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                Expected Retail MRP (₹)
              </label>
              <input
                type="number"
                min="0"
                value={newExpectedRp}
                onChange={(e) => setNewExpectedRp(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs font-mono focus:outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                Target Second-Hand Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={newTargetPrice}
                onChange={(e) => setNewTargetPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs font-mono focus:outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised text-xs focus:outline-none focus:border-accent"
              >
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddFormOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-rule dark:border-rule-dark text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-xs"
            >
              {adding ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Add to Wishlist</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Wishlist Items List */}
      {wishlist.length === 0 ? (
        <div className="py-20 text-center text-ink-muted">
          Your acquisition wishlist is empty. Add titles you are hunting for in bookshops!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {wishlist.map((item) => (
            <article
              key={item.wishlist_id}
              className="p-4 rounded-xl border border-rule dark:border-rule-dark bg-surface-raised dark:bg-surface-dark-raised shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-3xs text-ink-muted">{item.wishlist_id}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-3xs font-medium uppercase ${
                      item.priority === 'High'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                        : item.priority === 'Low'
                        ? 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>
                <h3 className="font-serif text-sm font-medium text-ink dark:text-ink-dark line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-xs text-ink-secondary dark:text-ink-dark-secondary truncate">
                  {item.authors || 'Unknown author'}
                </p>
              </div>

              {/* Price details & CTA */}
              <div className="pt-2 border-t border-rule/60 dark:border-rule-dark/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-ink-muted">Target: ₹{item.target_price || '—'}</span>
                  <span className="text-ink-secondary">MRP: ₹{item.expected_rp || '—'}</span>
                </div>

                <button
                  onClick={() => openAcquireModal(item)}
                  className="w-full py-1.5 rounded-lg bg-surface dark:bg-surface-dark border border-rule dark:border-rule-dark hover:bg-rule/40 text-xs font-medium text-ink dark:text-ink-dark flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Check size={14} className="text-emerald-600" />
                  <span>Mark as Purchased</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Acquire Modal (Move from Wishlist to Books) */}
      {acquireModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-canvas dark:bg-canvas-dark border border-rule dark:border-rule-dark rounded-2xl shadow-xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-medium">Acquire Into Library</h3>
              <button
                onClick={() => setAcquireModalItem(null)}
                className="p-1 text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-ink-secondary">
              Acquiring <strong className="text-ink dark:text-ink-dark">{acquireModalItem.title}</strong> will generate a new <code className="font-mono">BOOK-XXX</code> record in the Books sheet tab and remove it from your Wishlist.
            </p>

            <form onSubmit={handleAcquireSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                  Actual Purchase Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                  Book Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as BookCondition)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
                >
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-3xs uppercase tracking-wider font-medium text-ink-muted">
                  Shelf Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark text-xs focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAcquireModalItem(null)}
                  className="px-3 py-1.5 rounded-lg border border-rule text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={acquiring}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-xs"
                >
                  {acquiring ? (
                    <>
                      <RefreshCw size={13} className="animate-spin text-white" />
                      <span>Adding to Books...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Confirm Acquisition</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

