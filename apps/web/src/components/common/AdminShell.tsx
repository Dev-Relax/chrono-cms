import React, { useTransition } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AdminSidebar, AdminShellContext, NavTransitionContext } from "./Layout.js";
import { SkeletonPageHeader, SkeletonTableRows } from "./Skeleton.js";

const AdminContentSkeleton: React.FC = () => (
  <>
    <SkeletonPageHeader />
    <SkeletonTableRows rows={7} cols={4} />
  </>
);

export const AdminShell: React.FC = () => {
  const [isPending, startTransition] = useTransition();
  const location = useLocation();

  return (
    <AdminShellContext.Provider value={true}>
      <NavTransitionContext.Provider value={startTransition}>
        <div className="flex h-screen overflow-hidden bg-slate-950">
          <AdminSidebar />
          <main
            className={`flex-1 overflow-y-auto transition-opacity duration-200 ${
              isPending ? "opacity-50" : "opacity-100"
            }`}
          >
            <div className="mx-auto max-w-6xl px-6 py-8">
              <React.Suspense fallback={<AdminContentSkeleton />}>
                <div key={location.pathname} className="admin-page-enter">
                  <Outlet />
                </div>
              </React.Suspense>
            </div>
          </main>
        </div>
      </NavTransitionContext.Provider>
    </AdminShellContext.Provider>
  );
};
