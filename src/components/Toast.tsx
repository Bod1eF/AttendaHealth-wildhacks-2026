'use client'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onDismiss?: () => void
}

export default function Toast({ message, type, onDismiss }: ToastProps) {
  const bgColor =
    type === 'success'
      ? '#2E7D32'
      : type === 'error'
        ? '#C62828'
        : '#532AA8'

  return (
    <div
      className="animate-slide-down rounded-lg shadow-lg px-4 py-3 text-white text-sm font-medium max-w-[90vw] cursor-pointer"
      style={{ backgroundColor: bgColor }}
      onClick={onDismiss}
    >
      {message}
    </div>
  )
}
