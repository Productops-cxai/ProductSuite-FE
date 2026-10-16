import { useEffect, useState } from "react";
import { Btn, Field, TextArea } from "./lovable/payflow-ui";
import { Modal } from "../ui/Modal";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  busy?: boolean;
  required?: boolean;
  minLength?: number;
  hint?: string;
  placeholder?: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
};

export function WorkflowActionNoteModal({
  open,
  title,
  description,
  confirmLabel,
  busy,
  required,
  minLength = 0,
  hint = "Sent to PayFlow AI for reassessment and learning.",
  placeholder = "Explain why this action is being taken…",
  onClose,
  onConfirm,
}: Props) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  const trimmed = note.trim();
  const tooShort = required && trimmed.length < Math.max(minLength, 1);
  const canSubmit = !busy && !tooShort;

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={busy ? () => undefined : onClose}
      overlayClassName="z-[70]"
      footer={
        <div className="mt-2 flex justify-end gap-2.5">
          <Btn disabled={busy} onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={!canSubmit}
            onClick={() => onConfirm(trimmed)}
          >
            {busy ? "Working…" : confirmLabel}
          </Btn>
        </div>
      }
    >
      <Field
        label={required ? "Note for PayFlow (required)" : "Note for PayFlow (optional)"}
        hint={hint}
      >
        <TextArea
          value={note}
          onChange={setNote}
          placeholder={placeholder}
          disabled={busy}
        />
      </Field>
      {tooShort && (
        <p className="mt-2 text-[12px] text-destructive">
          {minLength > 1
            ? `Please enter at least ${minLength} characters.`
            : "A note is required for this action."}
        </p>
      )}
    </Modal>
  );
}
