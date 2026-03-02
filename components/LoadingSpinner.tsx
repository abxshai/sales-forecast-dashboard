export default function LoadingSpinner({ size = 'md', label }: { size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
  return (
    <div className="flex items-center gap-2">
      <div className={`${s} border-2 border-primary border-t-transparent rounded-full animate-spin`} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  )
}
