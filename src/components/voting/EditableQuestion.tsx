'use client'

import { Loader2, Pencil } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

export interface EditOption {
  id: string
  text: string
}

export default function EditableQuestion({
  question,
  editOpen,
  editing,
  editSecondsLeft,
  onStartEdit,
  editQuestion,
  onQuestionChange,
  editOpts,
  onOptionChange,
  savingEdit,
  onCancel,
  onSave,
}: {
  question: string
  editOpen: boolean
  editing: boolean
  editSecondsLeft: number
  onStartEdit: () => void
  editQuestion: string
  onQuestionChange: (value: string) => void
  editOpts: EditOption[]
  onOptionChange: (index: number, value: string) => void
  savingEdit: boolean
  onCancel: () => void
  onSave: () => void
}) {
  const { t } = useLanguage()

  return (
    <>
      {/* Edit window banner */}
      {editOpen && !editing && (
        <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold">
            ✏️ {t('edit.banner')} {editSecondsLeft} {t('edit.seconds')}
          </span>
          <button
            onClick={onStartEdit}
            className="flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-3 min-h-[36px] rounded-full hover:bg-amber-600 active:scale-95 transition-all shrink-0"
          >
            <Pencil size={13} /> {t('edit.btn')}
          </button>
        </div>
      )}

      {/* Question — editable inline within the 60s window */}
      {editing ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={editQuestion}
            onChange={(e) => onQuestionChange(e.target.value.slice(0, 280))}
            rows={2}
            className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-lg font-bold bg-transparent resize-none outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex flex-col gap-2">
            {editOpts.map((o, i) => (
              <input
                key={o.id}
                value={o.text}
                onChange={(e) => onOptionChange(i, e.target.value.slice(0, 120))}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-base bg-transparent outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} disabled={savingEdit}
              className="flex-1 min-h-[44px] rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-border transition-colors">
              {t('edit.cancel')}
            </button>
            <button onClick={onSave} disabled={savingEdit}
              className="flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60">
              {savingEdit ? <Loader2 size={16} className="animate-spin" /> : t('edit.save')}
            </button>
          </div>
        </div>
      ) : (
        <h1 className="text-xl sm:text-2xl font-black text-foreground leading-snug">{question}</h1>
      )}
    </>
  )
}
