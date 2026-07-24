export default function MembersLoading() {
    return (
      <main className="min-h-screen max-w-6xl mx-auto p-6 sm:p-10 md:p-14 lg:p-16">
        <div className="max-w-3xl animate-pulse">
          <div className="h-3 bg-neutral-200/50 rounded w-20 tracking-[0.12em]" />
          <div className="mt-4 sm:mt-6 h-10 sm:h-12 md:h-14 bg-neutral-200/60 rounded-xl w-64 sm:w-80" />
          <div className="mt-3 sm:mt-4 h-3.5 bg-neutral-200/50 rounded w-24" />
          <div className="mt-6 sm:mt-8 space-y-2">
            <div className="h-4 bg-neutral-200/40 rounded w-full max-w-xl" />
            <div className="h-4 bg-neutral-200/40 rounded w-4/5 max-w-md" />
          </div>
        </div>
  
        <section className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="border border-neutral-200/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-surface flex flex-col justify-between h-[580px] sm:h-[620px] md:h-[640px] animate-pulse"
            >
              <div>
                <div>
                  <div className="h-3 bg-neutral-200/50 rounded w-16" />
                  <div className="mt-3 sm:mt-5 h-8 sm:h-9 bg-neutral-200/60 rounded-lg w-28" />
                </div>
  
                <div className="mt-8 sm:mt-10 flex items-end gap-1.5">
                  <div className="h-10 sm:h-12 bg-neutral-200/60 rounded-xl w-24" />
                  <div className="h-4 bg-neutral-200/40 rounded w-8 mb-1" />
                </div>
  
                <div className="mt-5 sm:mt-6 h-4 bg-neutral-200/40 rounded w-11/12" />
              </div>
  
              <div>
                <div className="mt-8 sm:mt-10">
                  <div className="w-full h-12 bg-neutral-200/50 rounded-xl border border-neutral-200/20" />
                </div>
  
                <div className="mt-8 sm:mt-10 space-y-4 sm:space-y-5 border-t border-dashed border-neutral-200/40 pt-6 sm:pt-8">
                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="flex items-start gap-2.5 sm:gap-3">
                      <div className="mt-[6px] sm:mt-[7px] h-[4px] w-[4px] sm:h-[5px] sm:w-[5px] rounded-full bg-neutral-200/60 shrink-0" />
                      <div className="space-y-2 w-full">
                        <div className="h-3.5 bg-neutral-200/40 rounded w-full" />
                        {idx === 3 && <div className="h-3.5 bg-neutral-200/30 rounded w-5/6" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
    )
  }