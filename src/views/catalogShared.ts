export function getAvailableCategories<T>(
  items: T[],
  getCategory: (item: T) => string | undefined
): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const cat = getCategory(item)?.trim();
    if (cat) {
      set.add(cat);
    }
  }
  return ['All', ...Array.from(set).sort()];
}

export function renderCatalogSkeleton(showProgressBars = false): string {
  return `
    <div class="page p-6 w-full animate-pulse">
      <div class="flex items-center gap-2 mb-5">
        <div class="h-6 w-16 bg-brand-line/60 rounded-full"></div>
        <div class="h-6 w-16 bg-brand-line/40 rounded-full"></div>
        <div class="h-6 w-16 bg-brand-line/40 rounded-full"></div>
      </div>
      <div class="flex items-center justify-between mb-5">
        <div class="h-4 w-32 bg-brand-line/60 rounded"></div>
        <div class="h-8 w-44 bg-brand-line/40 rounded-lg"></div>
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
        ${Array.from({ length: 6 })
          .map(
            () => `
          <div class="bg-brand-surface border border-brand-line rounded-xl p-5 min-h-[140px] flex flex-col justify-between">
            <div>
              <div class="h-3 w-20 bg-brand-line/60 rounded mb-3"></div>
              <div class="h-5 w-3/4 bg-brand-line rounded mb-3"></div>
              ${showProgressBars ? '<div class="h-1.5 w-full bg-brand-line/40 rounded-full"></div>' : ''}
            </div>
            <div class="flex items-center justify-between pt-4 mt-auto">
              <div class="h-3 w-24 bg-brand-line/50 rounded"></div>
              <div class="h-6 w-16 bg-brand-line/60 rounded-md"></div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

