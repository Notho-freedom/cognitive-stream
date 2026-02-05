import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AutonomyQuestionDialogProps {
  open: boolean;
  question?: string;
  onSubmit: (answer: string) => void;
  onCancel: () => void;
}

export function AutonomyQuestionDialog({
  open,
  question,
  onSubmit,
  onCancel,
}: AutonomyQuestionDialogProps) {
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    if (open) {
      setAnswer("");
    }
  }, [open, question]);

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Question en attente</DialogTitle>
          <DialogDescription>{question || "Veuillez préciser votre réponse."}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            onSubmit(answer.trim());
          }}
        >
          <Input
            autoFocus
            placeholder="Votre réponse..."
            value={answer}
            onChange={event => setAnswer(event.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit">Envoyer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
