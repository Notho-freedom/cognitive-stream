import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AutonomyConfirmDialogProps {
  open: boolean;
  action?: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AutonomyConfirmDialog({
  open,
  action,
  description,
  onConfirm,
  onCancel,
}: AutonomyConfirmDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer l'action destructrice</AlertDialogTitle>
          <AlertDialogDescription>
            {description || "Cette action pourrait modifier ou supprimer des données."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="font-semibold">Action proposée</div>
          <div className="mt-1 text-xs uppercase tracking-wide">{action || "Action inconnue"}</div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
