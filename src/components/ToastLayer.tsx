import { useToastStore } from '../stores/toastStore'

export default function ToastLayer() {
  const toasts = useToastStore((s) => s.toasts)
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-[360px] max-w-[90vw]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card glass animate-toast p-3 flex items-start gap-3 pointer-events-auto"
        >
          <span className="text-2xl leading-none">{t.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{t.title}</div>
            <div className="label-dim text-xs mt-0.5">{t.desc}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
