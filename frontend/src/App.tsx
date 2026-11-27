import { useEffect, useState, useRef } from 'react';
import { useLibraryStore } from './store/useLibraryStore';
import { verifyEmailLinkToken, joinAlcove } from './api/client';
import type { AlcoveBookItem } from './types/book';

import { AppShell } from './layouts/AppShell';
import { TabRouter } from './layouts/TabRouter';
import { AuthScreen } from './components/AuthScreen';
import { BookDetailDrawer } from './components/BookDetailDrawer';
import { QuickLogModal } from './components/QuickLogModal';
import { FocusReadingRoomModal } from './components/FocusReadingRoomModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { LendBookDrawer } from './components/LendBookDrawer';
import { PickNextReadModal } from './components/PickNextReadModal';
import { ToastContainer } from './components/ToastContainer';
import { EmailVerificationModal } from './components/EmailVerificationModal';
import { AlcoveBookDrawer } from './components/AlcoveBookDrawer';

export default function App() {
  const {
    books,
    activeTab,
    setActiveTab,
    setSelectedBook,
    openQuickLog,
    pickNextModalOpen,
    setPickNextModalOpen,
    updateBookDetails,
    loadAllData,
    authToken,
    setEmailVerified,
    verifyEmailModalOpen,
    setVerifyEmailModalOpen,
    setShelfScope,
    loadAlcoves,
    addToast,
    logout,
  } = useLibraryStore();

  const [centerMenuOpen, setCenterMenuOpen] = useState(false);
  const [selectedAlcoveBook, setSelectedAlcoveBook] = useState<AlcoveBookItem | null>(null);

  // Per-tab scroll position memory
  const scrollPositions = useRef<Record<string, number>>({});

  const switchTab = (newTab: typeof activeTab) => {
    if (newTab === activeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCenterMenuOpen(false);
      return;
    }
    scrollPositions.current[activeTab] = window.scrollY;
    setCenterMenuOpen(false);
    setActiveTab(newTab);
  };

  useEffect(() => {
    const targetY = scrollPositions.current[activeTab] ?? 0;
    window.scrollTo({ top: targetY, behavior: 'instant' });
    const timer = setTimeout(() => {
      window.scrollTo({ top: targetY, behavior: 'instant' });
    }, 20);
    return () => clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    if (authToken) {
      loadAllData();
    }
  }, [authToken, loadAllData]);

  // Handle clickable email verification & Alcove invite deep-links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verify_token');
    const joinCode = params.get('join_alcove');

    if (verifyToken) {
      verifyEmailLinkToken(verifyToken)
        .then(() => {
          setEmailVerified(true);
          addToast('Email verified successfully!', 'success');
          if (authToken) loadAllData(true);
        })
        .catch((err: any) => {
          addToast(err.message || 'Verification link is invalid or expired.', 'error');
        })
        .finally(() => {
          params.delete('verify_token');
          const nextSearch = params.toString();
          window.history.replaceState({}, '', `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`);
        });
    }

    if (joinCode && authToken) {
      joinAlcove(joinCode)
        .then(async (res) => {
          addToast(`Joined ${res.name}!`, 'success');
          await loadAlcoves();
          setShelfScope('alcove');
          setActiveTab('shelf');
        })
        .catch((err: any) => {
          addToast(err.message || 'Could not join Alcove. Verify email first if needed.', 'error');
        })
        .finally(() => {
          params.delete('join_alcove');
          const nextSearch = params.toString();
          window.history.replaceState({}, '', `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`);
        });
    }
  }, [authToken]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('molat:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('molat:unauthorized', handleUnauthorized);
  }, [logout]);

  if (!authToken) {
    return (
      <>
        <AuthScreen />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <AppShell
        switchTab={switchTab}
        centerMenuOpen={centerMenuOpen}
        setCenterMenuOpen={setCenterMenuOpen}
      >
        <TabRouter
          switchTab={switchTab}
          onSelectAlcoveBook={setSelectedAlcoveBook}
        />
      </AppShell>

      {/* Global Modals & Drawers */}
      <BookDetailDrawer />
      <QuickLogModal />
      <FocusReadingRoomModal />
      <BarcodeScannerModal />
      <LendBookDrawer />
      <PickNextReadModal
        isOpen={pickNextModalOpen}
        onClose={() => setPickNextModalOpen(false)}
        books={books}
        onStartReading={async (book) => {
          try {
            await updateBookDetails(book.book_id, { reading_status: 'READING' });
            openQuickLog(book);
          } catch (err) {
            console.error('Failed to transition book to reading:', err);
          }
        }}
        onOpenDetails={(book) => setSelectedBook(book)}
      />
      <ToastContainer />
      <EmailVerificationModal isOpen={verifyEmailModalOpen} onClose={() => setVerifyEmailModalOpen(false)} />
      <AlcoveBookDrawer book={selectedAlcoveBook} onClose={() => setSelectedAlcoveBook(null)} />
    </>
  );
}
