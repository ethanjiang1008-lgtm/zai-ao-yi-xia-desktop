import { useState, type ReactNode } from 'react'

export function ProgressBar({ value, height = 6 }: { value: number; height?: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="bar-track" style={{ height }}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Ring({ progress, size = 72, stroke = 6, children }: { progress: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(1, progress)))
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bar-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease-soft' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

export function EmptyState({ icon, text, action }: { icon: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-3 opacity-80">{icon}</div>
      <div className="label-dim mb-4">{text}</div>
      {action}
    </div>
  )
}

export function ConfirmModal({
  title,
  message,
  confirmText = '确认',
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmText?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="card-solid animate-pop p-5 max-w-sm w-[90%] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-semibold mb-2">{title}</div>
        <div className="label-dim text-sm mb-4">{message}</div>
        <div className="flex gap-2 justify-end">
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="card-solid animate-pop p-5 max-w-md w-[90%] relative max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold">{title}</div>
          <button className="btn btn-ghost text-xl" onClick={onClose} data-nodrag>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function useModalState() {
  const [open, setOpen] = useState(false)
  return { open, setOpen: (b: boolean) => setOpen(b), toggle: () => setOpen((v) => !v) }
}
