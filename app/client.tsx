import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './globals.css';
import Landing from './landing';
import PrivacyPage from './privacy/page';

const WriterApp = lazy(() => import('./writer-app'));
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const route = window.location.pathname.slice(base.length).replace(/\/+$/, '') || '/';

if (route === '/writer') document.title = 'Writing desk — Invariant';
if (route === '/privacy') document.title = 'Privacy — Invariant';

const page = route === '/writer'
  ? <Suspense fallback={<main className="route-loading">Opening your writing desk…</main>}><WriterApp/></Suspense>
  : route === '/privacy' ? <PrivacyPage/> : <Landing/>;

createRoot(document.getElementById('root')!).render(page);
