import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { projectsApi, resolveMediaUrl } from "../lib/api.js"
import type { Project } from "../types/index.js"
import { Layout } from "../components/common/Layout.js"
import { Sk } from "../components/common/Skeleton.js"

const ProjectsPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading) {
      setShowSkeleton(false)
      return
    }
    const id = setTimeout(() => setShowSkeleton(true), 150)
    return () => clearTimeout(id)
  }, [loading])

  useEffect(() => {
    setLoading(true)
    projectsApi
      .list({ lang: i18n.language })
      .then(({ data }) => setProjects(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [i18n.language])

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-50">{t("projects.title")}</h1>
        <p className="mt-2 text-slate-500">{t("projects.subtitle")}</p>
      </div>

      {showSkeleton && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-800 overflow-hidden"
              style={{ backgroundColor: "rgb(var(--color-surface-rgb) / 0.6)" }}
            >
              <Sk className="h-40 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Sk className="h-5 w-2/3" />
                <Sk className="h-3.5 w-full" />
                <Sk className="h-3.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-red-400">
          {error}
        </p>
      )}

      {!loading && projects.length === 0 && !error && (
        <p className="text-slate-500 text-center py-20">{t("projects.empty")}</p>
      )}

      {projects.length > 0 && (
        <div className="admin-page-enter grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </Layout>
  )
}

type CardProps = { project: Project }

const ProjectCard: React.FC<CardProps> = ({ project }) => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const goToDetail = (e: React.MouseEvent) => {
    e.preventDefault()
    React.startTransition(() => navigate(`/projects/${project.slug}`))
  }

  const stopProp = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <article
      className="group flex flex-col rounded-xl border border-slate-800 overflow-hidden
                 hover:border-slate-700 transition-all"
      style={{ backgroundColor: "rgb(var(--color-surface-rgb) / 0.6)" }}
    >
      <Link to={`/projects/${project.slug}`} onClick={goToDetail} className="block">
        {project.coverImage ? (
          <img
            src={resolveMediaUrl(project.coverImage)}
            alt={project.title}
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="relative h-40 w-full"
            style={{
              background:
                "linear-gradient(135deg, rgb(var(--color-primary-rgb) / 0.3), rgb(var(--color-surface-rgb) / 0.9))",
            }}
          >
            {project.featured && (
              <span className="absolute top-2 left-2 rounded-full bg-amber-900/60 px-2 py-0.5 text-xs font-semibold text-amber-400">
                ★ {t("projects.featured")}
              </span>
            )}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link to={`/projects/${project.slug}`} onClick={goToDetail}>
          <h2 className="font-semibold text-slate-100 group-hover:text-white transition-colors leading-snug">
            {project.featured && project.coverImage && (
              <span className="mr-1 text-amber-400">★</span>
            )}
            {project.title}
          </h2>
        </Link>

        {project.summary && (
          <p className="mt-2 text-sm text-slate-400 line-clamp-3">{project.summary}</p>
        )}

        {project.techStack.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.techStack.map((tech) => (
              <span
                key={tech}
                className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 pt-3 border-t border-slate-800/60 text-xs">
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stopProp}
              className="text-slate-500 hover:text-brand-400 transition-colors"
            >
              GitHub ↗
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stopProp}
              className="text-slate-500 hover:text-brand-400 transition-colors"
            >
              {t("projects.liveDemo")} ↗
            </a>
          )}
          {project.blogUrl &&
            (project.blogUrl.startsWith("/") ? (
              <Link
                to={project.blogUrl}
                onClick={stopProp}
                className="text-slate-500 hover:text-brand-400 transition-colors"
              >
                {t("projects.readMore")} →
              </Link>
            ) : (
              <a
                href={project.blogUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stopProp}
                className="text-slate-500 hover:text-brand-400 transition-colors"
              >
                {t("projects.readMore")} ↗
              </a>
            ))}
          <Link
            to={`/projects/${project.slug}`}
            onClick={goToDetail}
            className="ml-auto font-semibold text-brand-500 hover:text-brand-400 transition-colors"
          >
            {t("projects.details")} →
          </Link>
        </div>
      </div>
    </article>
  )
}

export default ProjectsPage
