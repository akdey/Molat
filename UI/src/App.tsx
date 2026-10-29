import React, { useState, useEffect } from 'react';
import { AppProvider, useApp, type Theme } from './contexts/AppContext';
import { ToastProvider } from './components/common/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { HomeView } from './views/HomeView';
import { CollectionView } from './views/CollectionView';
import { AddBookView } from './views/AddBookView';
import { WishlistView } from './views/WishlistView';
import { ReadingView } from './views/ReadingView';
import { InventoryView } from './views/InventoryView';
import { InsightsView } from './views/InsightsView';
import { SettingsView } from './views/SettingsView';
import { BookDetailView } from './views/BookDetailView';
import { MOCK_BOOKS } from './lib/mockData';
import type { Book } from './types/book';

  type Route =
    | 'home' | 'collection' | 'add' | 'wishlist'
    | 'reading' | 'inventory' | 'insights' | 'data' | 'settings';

/** Applies / removes the .dark class on <html> based on theme preference. */
        function ThemeWatcher() {
  const {theme} = useApp();

  useEffect(() => {
    const root = document.documentElement;
        function applyTheme(t: Theme) {
      if (t === 'dark') {
          root.classList.add('dark');
      } else if (t === 'light') {
          root.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      }
    }
        applyTheme(theme);

        if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => root.classList.toggle('dark', e.matches);
        mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

      return null;
}

      /** Bootstraps mock data during development when the API is not available. */
      function MockDataLoader() {
  const {setBooks, setBooksLoading, setConnectionStatus, setLastRefresh} = useApp();

  useEffect(() => {
        setBooksLoading(true);
    const timer = setTimeout(() => {
        setBooks(MOCK_BOOKS);
      setBooksLoading(false);
      setConnectionStatus('ok');
      setLastRefresh(new Date());
    }, 600);
    return () => clearTimeout(timer);
  }, []);

      return null;
}

      function AppInner() {
  const {currency} = useApp();
      const [route, setRoute] = useState<Route>('home');
        const [selectedBook, setSelectedBook] = useState<Book | null>(null);
        const [editingBook, setEditingBook] = useState<Book | null>(null);

        function navigate(r: string) {
          setRoute(r as Route);
        setSelectedBook(null);
  }

        function selectBook(book: Book) {
          setSelectedBook(book);
  }

        function handleAddSuccess(book: Book) {
          setSelectedBook(book);
        setRoute('collection');
  }

        if (selectedBook) {
    return (
        <AppLayout route={route} onNavigate={navigate}>
          <BookDetailView
            book={selectedBook}
            onBack={() => setSelectedBook(null)}
            onEdit={book => { setEditingBook(book); setSelectedBook(null); }}
            currency={currency}
          />
        </AppLayout>
        );
  }

        if (route === 'add' || editingBook) {
    return (
        <AppLayout route="add" onNavigate={navigate}>
          <AddBookView
            onSuccess={handleAddSuccess}
            onCancel={() => { setEditingBook(null); setRoute('collection'); }}
          />
        </AppLayout>
        );
  }

  const content = (() => {
    switch (route) {
      case 'home':
        return <HomeView onNavigate={navigate} onSelectBook={selectBook} />;
        case 'collection':
        return <CollectionView onSelectBook={selectBook} onAddBook={() => setRoute('add')} />;
        case 'wishlist':
        return <WishlistView onSelectBook={selectBook} onAddBook={() => setRoute('add')} />;
        case 'reading':
        return <ReadingView onSelectBook={selectBook} />;
        case 'inventory':
        return <InventoryView onSelectBook={selectBook} />;
        case 'insights':
        return <InsightsView />;
        case 'settings':
        return <SettingsView />;
        case 'data':
        return (
        <div className="max-w-form mx-auto py-12 text-center space-y-3">
          <h1 className="font-serif text-3xl font-medium text-ink dark:text-ink-dark">Import / Export</h1>
          <p className="text-sm text-ink-secondary dark:text-ink-dark-secondary">
            CSV import preview, column mapping, and backup download will be built in Milestone 6.
          </p>
        </div>
        );
        default:
        return null;
    }
  })();

        return (
        <AppLayout route={route} onNavigate={navigate}>
          {content}
        </AppLayout>
        );
}

        export default function App() {
  return (
        <AppProvider>
          <ToastProvider>
            <ThemeWatcher />
            <MockDataLoader />
            <AppInner />
          </ToastProvider>
        </AppProvider>
        );
}
