'use client';

import { useState } from 'react';
import { Pencil, Save } from 'lucide-react';
import { updateCardNote } from '@/app/actions/updateCardNote';

export function CardNoteSection({
  cardId,
  initialNote,
}: {
  cardId: string;
  initialNote: string | null;
}) {
  const [note, setNote] = useState<string>(initialNote ?? '');
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  const startEditing = () => {
    setInput(note);
    setEditing(true);
  };

  const save = async () => {
    const trimmed = input.trim();
    await updateCardNote(cardId, trimmed || null);
    setNote(trimmed);
    setEditing(false);
  };

  return (
    <div className="mt-4 px-4 lg:px-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Note
        </span>
        {!editing ? (
          <button
            onClick={startEditing}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil size={13} />
          </button>
        ) : (
          <button
            onClick={save}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Save size={13} />
          </button>
        )}
      </div>
      {!editing ? (
        <p className="text-sm text-foreground whitespace-pre-wrap min-h-[2rem]">
          {note || (
            <span className="text-muted-foreground italic">No note</span>
          )}
        </p>
      ) : (
        <textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}
    </div>
  );
}
