import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * The frame every authenticated page renders inside.
 *
 * The sidebar is fixed on desktop and a slide-over sheet on mobile, so the
 * same navigation works at both sizes without a second implementation.
 *
 * A fixed, aria-hidden wash sits behind everything: the warm radial light
 * plus a trace of grain. Both are decorative — they give the large flat
 * fields somewhere to breathe instead of banding.
 */
export const AppShell = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="relative min-h-screen">
      <div aria-hidden className="aura-wash grain pointer-events-none fixed inset-0" />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] md:block">
        <Sidebar />
      </aside>

      <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
        <SheetContent side="left" className="w-[17.5rem] border-r-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setIsNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative md:pl-[17rem]">
        <Topbar onOpenNav={() => setIsNavOpen(true)} />

        <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
          {/* Keyed on pathname so each page fades in on navigation. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
