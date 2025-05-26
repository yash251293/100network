import type React from "react"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import { Toaster } from 'sonner'; // Import Toaster

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <Toaster richColors position="top-right" /> {/* Add Toaster here */}
    </div>
  )
} 