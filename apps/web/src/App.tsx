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
const ProjectsPage = React.lazy(() => import("./pages/ProjectsPage.js"))
const ProjectDetailPage = React.lazy(() => import("./pages/ProjectDetailPage.js"))
const CustomPageView = React.lazy(() => import("./pages/CustomPageView.js"))
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard.js"))
const PostEditorPage = React.lazy(() => import("./pages/admin/PostEditorPage.js"))
const DesignCustomizer = React.lazy(() => import("./pages/admin/DesignCustomizer.js"))
const MediaLibrary = React.lazy(() => import("./pages/admin/MediaLibrary.js"))
const UserManagement = React.lazy(() => import("./pages/admin/UserManagement.js"))
const PagesAdmin = React.lazy(() => import("./pages/admin/PagesAdmin.js"))
const PageEditorPage = React.lazy(() => import("./pages/admin/PageEditorPage.js"))
const ProjectsAdmin = React.lazy(() => import("./pages/admin/ProjectsAdmin.js"))
const ProjectEditorPage = React.lazy(() => import("./pages/admin/ProjectEditorPage.js"))
const WebhooksAdmin = React.lazy(() => import("./pages/admin/WebhooksAdmin.js"))
const ApiKeysAdmin = React.lazy(() => import("./pages/admin/ApiKeysAdmin.js"))
const PostsAdmin = React.lazy(() => import("./pages/admin/PostsAdmin.js"))
const CommentsAdmin = React.lazy(() => import("./pages/admin/CommentsAdmin.js"))
const BrandingPage = React.lazy(() => import("./pages/admin/BrandingPage.js"))
const NavigationAdmin = React.lazy(() => import("./pages/admin/NavigationAdmin.js"))
const SkillsAdmin = React.lazy(() => import("./pages/admin/SkillsAdmin.js"))
const ExperiencesAdmin = React.lazy(() => import("./pages/admin/ExperiencesAdmin.js"))
const ExperienceEditorPage = React.lazy(() => import("./pages/admin/ExperienceEditorPage.js"))
const EducationAdmin = React.lazy(() => import("./pages/admin/EducationAdmin.js"))
const EducationEditorPage = React.lazy(() => import("./pages/admin/EducationEditorPage.js"))
const TestimonialsAdmin = React.lazy(() => import("./pages/admin/TestimonialsAdmin.js"))
const ContactAdmin = React.lazy(() => import("./pages/admin/ContactAdmin.js"))
const CertificationsAdmin = React.lazy(() => import("./pages/admin/CertificationsAdmin.js"))
const AnalyticsDashboard = React.lazy(() => import("./pages/admin/AnalyticsDashboard.js"))

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
            <Route path="/admin/projects" element={<ProjectsAdmin />} />
            <Route path="/admin/projects/new" element={<ProjectEditorPage />} />
            <Route path="/admin/projects/:id/edit" element={<ProjectEditorPage />} />
            <Route path="/admin/posts" element={<PostsAdmin />} />
            <Route path="/admin/webhooks" element={<WebhooksAdmin />} />
            <Route path="/admin/apikeys" element={<ApiKeysAdmin />} />
            <Route path="/admin/comments" element={<CommentsAdmin />} />
            <Route path="/admin/branding" element={<BrandingPage />} />
            <Route path="/admin/navigation" element={<NavigationAdmin />} />
            <Route path="/admin/skills" element={<SkillsAdmin />} />
            <Route path="/admin/experiences" element={<ExperiencesAdmin />} />
            <Route path="/admin/experiences/new" element={<ExperienceEditorPage />} />
            <Route path="/admin/experiences/:id/edit" element={<ExperienceEditorPage />} />
            <Route path="/admin/education" element={<EducationAdmin />} />
            <Route path="/admin/education/new" element={<EducationEditorPage />} />
            <Route path="/admin/education/:id/edit" element={<EducationEditorPage />} />
            <Route path="/admin/testimonials" element={<TestimonialsAdmin />} />
            <Route path="/admin/contact" element={<ContactAdmin />} />
            <Route path="/admin/certifications" element={<CertificationsAdmin />} />
            <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
          </Route>
        </Route>

        <Route
          path="/projects"
          element={
            <React.Suspense fallback={<PublicSpinner />}>
              <ProjectsPage />
            </React.Suspense>
          }
        />
        <Route
          path="/projects/:slug"
          element={
            <React.Suspense fallback={<PublicSpinner />}>
              <ProjectDetailPage />
            </React.Suspense>
          }
        />

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
