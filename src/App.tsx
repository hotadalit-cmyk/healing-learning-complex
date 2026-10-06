import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import './Public.css';
import './design-tokens.css';
import './Customer.css';
import './Theme.css';
import './Assist.css';
import NotFound from './pages/NotFound';
import PublicSite from './pages/PublicSite';

const Index = lazy(() => import('./pages/Index'));
const CustomerAccount = lazy(() => import('./pages/CustomerAccount'));
const PublicPassport = lazy(() => import('./pages/PublicPassport'));
const PublicQuote = lazy(() => import('./pages/PublicQuote'));
const PublicStatus = lazy(() => import('./pages/PublicStatus'));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f7f4ee] text-sm text-slate-600" role="status">Загружаем страницу…</div>}>
        <Routes>
          <Route path="/" element={<PublicSite page="home" />} />
          <Route path="/services" element={<PublicSite page="services" />} />
          <Route path="/service/e-scooters" element={<PublicSite page="scooters" />} />
          <Route path="/service/e-bikes" element={<PublicSite page="ebikes" />} />
          <Route path="/service/monowheels" element={<PublicSite page="monowheels" />} />
          <Route path="/b2b" element={<PublicSite page="b2b" />} />
          <Route path="/faq" element={<PublicSite page="faq" />} />
          <Route path="/contacts" element={<PublicSite page="contacts" />} />
          <Route path="/privacy" element={<PublicSite page="privacy" />} />
          <Route path="/warranty" element={<PublicSite page="warranty" />} />
          <Route path="/booking" element={<PublicSite page="booking" />} />
          <Route path="/workshop" element={<Index />} />
          <Route path="/client" element={<CustomerAccount />} />
          <Route path="/public" element={<Navigate to="/" replace />} />
          <Route path="/qr/:qrId" element={<PublicPassport />} />
          <Route path="/status/:orderId" element={<PublicStatus />} />
          <Route path="/estimate/:orderId" element={<PublicQuote />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
