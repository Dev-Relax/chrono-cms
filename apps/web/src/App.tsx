import React from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext.js"
import { ThemeProvider } from "./context/ThemeContext.js"
import { ProtectedRoute } from "./components/common/ProtectedRoute.js"
import { AdminShell } from "./components/common/AdminShell.js"

// Pages (lazy-loaded for performance)
const LoginPage = React.lazy(() => import("./pages/LoginPage.js"))
const BlogFeedPage = React.lazy(() => import("./pages/BlogFeedPage.js"))
const BlogPostPage = React.lazy(() => import("./pages/BlogPostPage.js"))
const CustomPageView = React.lazy(() => import("./pages/CustomPageView.js"))
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard.js"))
const PostEditorPage = React.lazy(() => import("./pages/admin/PostEditorPage.js"))
const DesignCustomizer = React.lazy(() => import("./pages/admin/DesignCustomizer.js"))
const MediaLibrary = React.lazy(() => import("./pages/admin/MediaLibrary.js"))
const UserManagement = React.lazy(() => import("./pages/admin/UserManagement.js"))
const PagesAdmin = React.lazy(() => import("./pages/admin/PagesAdmin.js"))
const PageEditorPage = React.lazy(() => import("./pages/admin/PageEditorPage.js"))
const WebhooksAdmin = React.lazy(() => import("./pages/admin/WebhooksAdmin.js"))
const ApiKeysAdmin = React.lazy(() => import("./pages/admin/ApiKeysAdmin.js"))
const PostsAdmin = React.lazy(() => import("./pages/admin/PostsAdmin.js"))
const CommentsAdmin = React.lazy(() => import("./pages/admin/CommentsAdmin.js"))
const BrandingPage = React.lazy(() => import("./pages/admin/BrandingPage.js"))
const NavigationAdmin = React.lazy(() => import("./pages/admin/NavigationAdmin.js"))

// Public-route fallback — minimal full-screen spinner
const PublicSpinner = () => (
  <div className="flex h-screen items-center justify-center bg-slate-950">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
  </div>
)

const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <Routes>
        <Route
          path="/"
          element={
            <React.Suspense fallback={<PublicSpinner />}>
              <BlogFeedPage />
            </React.Suspense>
          }
        />
        <Route
          path="/posts/:slug"
          element={
            <React.Suspense fallback={<PublicSpinner />}>
              <BlogPostPage />
            </React.Suspense>
          }
        />
        <Route
          path="/login"
          element={
            <React.Suspense fallback={<PublicSpinner />}>
              <LoginPage />
            </React.Suspense>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminShell />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/posts/new" element={<PostEditorPage />} />
            <Route path="/admin/posts/:id/edit" element={<PostEditorPage />} />
            <Route path="/admin/design" element={<DesignCustomizer />} />
            <Route path="/admin/media" element={<MediaLibrary />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/pages" element={<PagesAdmin />} />
            <Route path="/admin/pages/new" element={<PageEditorPage />} />
            <Route path="/admin/pages/:id/edit" element={<PageEditorPage />} />
            <Route path="/admin/posts" element={<PostsAdmin />} />
            <Route path="/admin/webhooks" element={<WebhooksAdmin />} />
            <Route path="/admin/apikeys" element={<ApiKeysAdmin />} />
            <Route path="/admin/comments" element={<CommentsAdmin />} />
            <Route path="/admin/branding" element={<BrandingPage />} />
            <Route path="/admin/navigation" element={<NavigationAdmin />} />
          </Route>
        </Route>

        {/* Custom CMS pages — must be before the catch-all */}
        <Route
          path="/:slug"
          element={
            <React.Suspense fallback={<PublicSpinner />}>
              <CustomPageView />
            </React.Suspense>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </ThemeProvider>
)

export default App
