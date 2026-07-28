import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatNoteTimestamp, type PersonalNote } from "@/lib/notesStorage";

interface NoteItemProps {
  note: PersonalNote;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEditClick: (note: PersonalNote) => void;
  className?: string;
}

export function NoteItem({ note, onToggleComplete, onDelete, onEditClick, className }: NoteItemProps) {
  return (
    <div className={cn("rounded-2xl border border-soft-gray-dark p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <label className="flex flex-1 items-start gap-2.5">
          <input
            type="checkbox"
            checked={note.isCompleted}
            onChange={() => onToggleComplete(note.id)}
            className="mt-1 h-4 w-4 shrink-0 accent-purple"
            aria-label="Tandai selesai"
          />
          <p
            className={cn(
              "line-clamp-3 text-sm",
              note.isCompleted ? "text-muted line-through" : "text-navy"
            )}
          >
            {note.content}
          </p>
        </label>
        {note.isCompleted && (
          <Badge variant="green" className="shrink-0">
            Selesai
          </Badge>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-[26px]">
        <span className="text-xs text-muted">{formatNoteTimestamp(note.updatedAt)}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Edit catatan"
            onClick={() => onEditClick(note)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-soft-gray hover:text-purple"
          >
            <Pencil size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Hapus catatan"
            onClick={() => {
              if (window.confirm("Hapus catatan ini?")) {
                onDelete(note.id);
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
