import React from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../../context/AuthContext.js"

export const ProtectedRoute: React.FC = () => {
  const { state } = useAuth()

  if (state.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return state.status === "authenticated" ? <Outlet /> : <Navigate to="/login" replace />
}
