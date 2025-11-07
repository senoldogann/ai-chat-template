'use client';

export default function ThinkingIndicator() {
  return (
    <div className="bg-[var(--bg-primary)] px-4 py-6">
      <div className="mx-auto flex max-w-3xl">
        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span>Düşünüyor</span>
            <div className="flex gap-1">
              <span className="h-1 w-1 rounded-full bg-[var(--text-secondary)] animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-secondary)] animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-secondary)] animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

