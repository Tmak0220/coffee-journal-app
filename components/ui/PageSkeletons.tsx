import type { ReactNode } from "react"

function Pulse({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rounded-lg bg-neutral-100 ${className}`} />
}

function Shell({ children, width = "max-w-6xl" }: { children: ReactNode; width?: string }) {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      className={`mx-auto min-h-screen w-full ${width} animate-pulse px-5 py-8 sm:px-10 sm:py-12 md:px-14 md:py-16`}
    >
      {children}
    </main>
  )
}

function Header() {
  return (
    <header>
      <Pulse className="h-3 w-36" />
      <Pulse className="mt-7 h-9 w-52 sm:h-11 sm:w-72" />
      <Pulse className="mt-3 h-3 w-20" />
    </header>
  )
}

export function HomeSkeleton() {
  return (
    <Shell>
      <div className="flex items-center justify-between">
        <Pulse className="h-3 w-28" />
        <Pulse className="h-10 w-28 rounded-xl" />
      </div>
      <div className="mt-20 sm:mt-28">
        <Pulse className="h-12 w-4/5 max-w-xl sm:h-16" />
        <Pulse className="mt-5 h-4 w-36" />
      </div>
      <div className="mt-20 grid gap-4 rounded-3xl border border-neutral-100 p-4 shadow-sm sm:grid-cols-2 sm:p-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-neutral-100 bg-white p-7 shadow-sm">
            <Pulse className="h-5 w-28" />
            <Pulse className="mt-3 h-3 w-16" />
            <Pulse className="mt-10 h-4 w-4/5" />
          </div>
        ))}
      </div>
    </Shell>
  )
}

export function DirectorySkeleton() {
  return (
    <Shell>
      <Header />
      <div className="mt-12 border-t border-neutral-100 pt-9">
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-6 shadow-sm">
          <Pulse className="h-3 w-24" />
          <Pulse className="mt-5 h-4 w-full max-w-2xl" />
          <Pulse className="mt-3 h-4 w-3/4 max-w-xl" />
        </div>
        <div className="mt-8 grid grid-cols-2 overflow-hidden rounded-2xl border border-neutral-100 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="min-h-28 border-b border-r border-neutral-100 p-5">
              <Pulse className="h-2 w-6" />
              <Pulse className="mt-6 h-4 w-20" />
              <Pulse className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
        <Pulse className="mt-6 h-14 w-full rounded-xl" />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <Pulse className="size-14 shrink-0 rounded-full" />
                <div className="flex-1">
                  <Pulse className="h-4 w-2/3" />
                  <Pulse className="mt-2 h-2 w-24" />
                </div>
              </div>
              <Pulse className="mt-6 h-3 w-full" />
              <Pulse className="mt-2 h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

export function ArticleSkeleton() {
  return (
    <Shell width="max-w-7xl">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-12">
        <div className="space-y-5">
          <Pulse className="aspect-[4/5] w-full rounded-3xl shadow-sm" />
          <Pulse className="hidden aspect-square w-full rounded-3xl sm:block" />
        </div>
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm sm:p-9">
            <div className="flex items-center gap-4 border-b border-neutral-100 pb-7">
              <Pulse className="size-14 rounded-full" />
              <div className="flex-1">
                <Pulse className="h-3 w-16" />
                <Pulse className="mt-3 h-5 w-40" />
              </div>
            </div>
            <Pulse className="mt-10 h-10 w-full" />
            <Pulse className="mt-3 h-10 w-4/5" />
            <div className="mt-8 flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => <Pulse key={index} className="h-8 w-24 rounded-full" />)}
            </div>
            <Pulse className="mt-10 h-28 w-full rounded-2xl" />
            <div className="mt-10 space-y-3">
              <Pulse className="h-3 w-full" />
              <Pulse className="h-3 w-full" />
              <Pulse className="h-3 w-3/4" />
            </div>
            <div className="mt-10 flex gap-3 border-t border-neutral-100 pt-7">
              <Pulse className="h-14 w-24 rounded-2xl" />
              <Pulse className="h-14 flex-1 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export function ProfileSkeleton() {
  return (
    <Shell width="max-w-7xl">
      <Pulse className="h-3 w-52" />
      <Pulse className="mt-9 aspect-[3/1] w-full rounded-2xl sm:aspect-[4/1]" />
      <div className="-mt-8 flex items-end gap-5 px-4 sm:-mt-12 sm:gap-8 sm:px-10">
        <Pulse className="size-24 shrink-0 rounded-3xl border-4 border-white sm:size-36" />
        <div className="flex-1 pb-2">
          <Pulse className="h-6 w-44 sm:h-8 sm:w-64" />
          <Pulse className="mt-3 h-3 w-28" />
        </div>
        <Pulse className="hidden h-12 w-32 rounded-xl sm:block" />
      </div>
      <div className="mt-12 grid gap-10 border-t border-neutral-100 pt-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <Pulse className="h-4 w-24" />
          <Pulse className="h-3 w-full" />
          <Pulse className="h-3 w-5/6" />
        </div>
        <Pulse className="h-48 w-full rounded-2xl" />
      </div>
      <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <Pulse className="aspect-[4/5] rounded-2xl" />
            <Pulse className="mt-3 h-4 w-4/5" />
          </div>
        ))}
      </div>
    </Shell>
  )
}

export function SearchSkeleton() {
  return (
    <Shell>
      <Header />
      <div className="mt-12 border-t border-neutral-100 pt-10">
        <Pulse className="h-16 w-full rounded-2xl shadow-sm" />
        <div className="mt-10 grid gap-7 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, column) => (
            <div key={column} className="rounded-2xl border border-neutral-100 p-5 shadow-sm">
              <Pulse className="h-5 w-36" />
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 12 }).map((_, index) => (
                  <Pulse key={index} className="h-12 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

export function GridSkeleton() {
  return (
    <Shell>
      <Header />
      <div className="mt-10 flex gap-3 border-y border-neutral-100 py-5">
        {Array.from({ length: 4 }).map((_, index) => <Pulse key={index} className="h-10 w-24 rounded-xl" />)}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-neutral-100 bg-white shadow-sm">
            <Pulse className="aspect-[4/3] w-full rounded-t-2xl rounded-b-none" />
            <div className="p-4">
              <Pulse className="h-3 w-20" />
              <Pulse className="mt-4 h-5 w-4/5" />
              <Pulse className="mt-3 h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </Shell>
  )
}

export function DashboardSkeleton() {
  return (
    <Shell width="max-w-7xl">
      <Header />
      <div className="mt-10 flex gap-2 overflow-hidden border-b border-neutral-100 pb-4">
        {Array.from({ length: 4 }).map((_, index) => <Pulse key={index} className="h-11 w-28 shrink-0 rounded-xl" />)}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => <Pulse key={index} className="h-12 w-full rounded-xl" />)}
        </div>
        <div className="rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm sm:p-8">
          <Pulse className="h-6 w-48" />
          <Pulse className="mt-3 h-3 w-72 max-w-full" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Pulse className="h-14 w-full rounded-xl" />
            <Pulse className="h-14 w-full rounded-xl" />
            <Pulse className="h-36 w-full rounded-xl sm:col-span-2" />
            <Pulse className="h-14 w-full rounded-xl sm:col-span-2" />
          </div>
        </div>
      </div>
    </Shell>
  )
}

export function FormSkeleton() {
  return (
    <Shell width="max-w-4xl">
      <Header />
      <div className="mt-10 space-y-7 border-t border-neutral-100 pt-8">
        <div className="grid grid-cols-2 gap-4 sm:max-w-2xl">
          <Pulse className="aspect-[4/5] rounded-2xl" />
          <Pulse className="aspect-[4/5] rounded-2xl" />
        </div>
        <Pulse className="h-14 w-full rounded-xl" />
        <Pulse className="h-32 w-full rounded-xl" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Pulse className="h-14 rounded-xl" />
          <Pulse className="h-14 rounded-xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }).map((_, index) => <Pulse key={index} className="h-9 w-20 rounded-full" />)}
        </div>
      </div>
    </Shell>
  )
}

export function JournalSkeleton() {
  return (
    <Shell>
      <div className="grid gap-10 border-b border-neutral-100 pb-10 lg:grid-cols-[1fr_380px]">
        <Header />
        <Pulse className="h-48 rounded-3xl shadow-sm" />
      </div>
      <div className="mt-10 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => <Pulse key={index} className="h-12 w-28 shrink-0 rounded-xl" />)}
      </div>
      <div className="mt-10 space-y-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-neutral-100 p-6 shadow-sm">
            <div className="flex gap-4"><Pulse className="h-7 w-16" /><Pulse className="h-4 w-24" /></div>
            <Pulse className="mt-6 h-6 w-4/5" />
            <Pulse className="mt-5 h-3 w-full" />
            <Pulse className="mt-2 h-3 w-3/4" />
          </div>
        ))}
      </div>
    </Shell>
  )
}
