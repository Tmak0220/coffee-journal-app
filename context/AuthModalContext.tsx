"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type AuthModalContextType = {
  isOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openAuthModal = () => setIsOpen(true)
  const closeAuthModal = () => setIsOpen(false)

  return (
    <AuthModalContext.Provider value={{ isOpen, openAuthModal, closeAuthModal }}>
      {children}
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider")
  }
  return context
}

export default AuthModalProvider