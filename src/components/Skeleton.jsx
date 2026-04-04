import { useTheme } from "../hooks/useTheme";

// Basic skeleton block
const Bone = ({ w = "100%", h = 16, rounded = 8, className = "" }) => (
  <div className={`skeleton ${className}`} style={{ width: w, height: h, borderRadius: rounded }} />
);

// Card skeleton (used in investor grid)
export const CardSkeleton = ({ count = 6 }) => {
  const t = useTheme();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md p-5" style={{ background: t.name === 'dark' ? t.surface : t.glassBg, border: `1px solid ${t.glassBorder}` }}>
          <div className="flex items-center gap-3 mb-4">
            <Bone w={44} h={44} rounded={12} />
            <div className="flex-1 space-y-2">
              <Bone w="60%" h={14} />
              <Bone w="40%" h={10} />
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <Bone w={80} h={22} rounded={12} />
            <Bone w={60} h={22} rounded={12} />
          </div>
          <div className="flex items-end justify-between">
            <div className="grid grid-cols-3 gap-3 flex-1">
              {[1, 2, 3].map(j => (
                <div key={j} className="space-y-1">
                  <Bone w="70%" h={10} />
                  <Bone w="50%" h={14} />
                </div>
              ))}
            </div>
            <Bone w={100} h={40} rounded={4} />
          </div>
        </div>
      ))}
    </div>
  );
};

// Table skeleton (used in holdings, screener)
export const TableSkeleton = ({ rows = 8, cols = 5 }) => {
  const t = useTheme();
  return (
    <div className="rounded-md overflow-hidden" aria-busy="true" aria-label="Loading" style={{ background: t.name === 'dark' ? t.surface : t.glassBg, border: `1px solid ${t.glassBorder}` }}>
      <div className="p-5">
        <Bone w={120} h={18} className="mb-4" />
        <div className="space-y-0">
          {/* Header */}
          <div className="flex gap-4 pb-3 mb-2" style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
            {Array.from({ length: cols }).map((_, i) => (
              <Bone key={i} w={i === 0 ? "20%" : `${60 / (cols - 1)}%`} h={12} />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3" style={{ borderBottom: `1px solid ${t.cardRowBorder}` }}>
              {Array.from({ length: cols }).map((_, j) => (
                <Bone key={j} w={j === 0 ? "20%" : `${60 / (cols - 1)}%`} h={14} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Hero skeleton
export const HeroSkeleton = () => (
  <div className="text-center py-8 sm:py-12 space-y-4">
    <Bone w={120} h={14} className="mx-auto" />
    <Bone w={240} h={40} className="mx-auto" />
    <Bone w={300} h={18} className="mx-auto" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mt-8">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-2">
          <Bone w="60%" h={32} className="mx-auto" />
          <Bone w="50%" h={10} className="mx-auto" />
        </div>
      ))}
    </div>
  </div>
);

// Detail page skeleton
export const DetailSkeleton = () => {
  const t = useTheme();
  return (
    <div className="space-y-6">
      <Bone w={100} h={14} />
      {/* Profile card */}
      <div className="rounded-md p-6" style={{ background: t.name === 'dark' ? t.surface : t.glassBg, border: `1px solid ${t.glassBorder}` }}>
        <div className="flex items-start gap-4 mb-4">
          <Bone w={64} h={64} rounded={16} />
          <div className="flex-1 space-y-2">
            <Bone w="40%" h={24} />
            <Bone w="60%" h={12} />
            <div className="flex gap-2 mt-2">
              <Bone w={80} h={22} rounded={12} />
              <Bone w={100} h={22} rounded={12} />
            </div>
          </div>
        </div>
        <Bone w="90%" h={12} />
        <Bone w="75%" h={12} className="mt-2" />
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-md p-4" style={{ background: t.name === 'dark' ? t.surface : t.glassBg, border: `1px solid ${t.glassBorder}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Bone w={28} h={28} rounded={8} />
              <Bone w="50%" h={10} />
            </div>
            <Bone w="60%" h={22} />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="rounded-md p-5" style={{ background: t.name === 'dark' ? t.surface : t.glassBg, border: `1px solid ${t.glassBorder}` }}>
            <Bone w={120} h={16} className="mb-4" />
            <Bone w="100%" h={220} rounded={12} />
          </div>
        ))}
      </div>
    </div>
  );
};

// 3-column activity skeleton
export const ActivitySkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {[1, 2, 3].map(col => (
      <div key={col} className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Bone w={20} h={20} rounded={6} />
          <Bone w={70} h={14} />
          <Bone w={24} h={18} rounded={10} />
        </div>
        {[1, 2, 3].map(row => (
          <div key={row} className="flex items-center gap-2.5 px-3 py-2.5 rounded" style={{ background: 'rgba(128,128,128,0.03)' }}>
            <Bone w={24} h={24} rounded={6} />
            <div className="flex-1 space-y-1">
              <Bone w="50%" h={13} />
              <Bone w="35%" h={10} />
            </div>
            <Bone w={36} h={12} />
          </div>
        ))}
      </div>
    ))}
  </div>
);

export { Bone };
