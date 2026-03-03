interface SkeletonLoaderProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export function SkeletonLoader({
  width = '100%',
  height = '1rem',
  borderRadius = '0.375rem',
  className,
}: SkeletonLoaderProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
    backgroundColor: '#e5e7eb',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    display: 'block',
  }

  return (
    <>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <span style={style} className={className} aria-hidden="true" />
    </>
  )
}
