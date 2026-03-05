"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ROLES, Role } from "@/lib/types";

const ROLE_BUTTON_COLORS: Record<
  string,
  { bg: string; border: string; text: string; hover: string }
> = {
  Product: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    hover: "hover:bg-blue-500/20",
  },
  Engineering: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    text: "text-violet-400",
    hover: "hover:bg-violet-500/20",
  },
  Design: {
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
    text: "text-pink-400",
    hover: "hover:bg-pink-500/20",
  },
  Data: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    hover: "hover:bg-cyan-500/20",
  },
  Legal: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    hover: "hover:bg-amber-500/20",
  },
  Support: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
    hover: "hover:bg-orange-500/20",
  },
};

interface RolePickerDialogProps {
  open: boolean;
  excludeRole?: Role;
  draftedRoles?: Role[];
  onSelectRole: (role: Role) => void;
}

export function RolePickerDialog({
  open,
  excludeRole,
  draftedRoles,
  onSelectRole,
}: RolePickerDialogProps) {
  const pool = draftedRoles && draftedRoles.length > 0 ? draftedRoles : [...ROLES];
  const availableRoles = excludeRole
    ? pool.filter((r) => r !== excludeRole)
    : pool;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">What role are you?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select your role to see the questions that need your input.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 pt-2">
          {availableRoles.map((role) => {
            const colors = ROLE_BUTTON_COLORS[role];
            return (
              <button
                key={role}
                onClick={() => onSelectRole(role)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${colors.bg} ${colors.border} ${colors.hover}`}
              >
                <span className={`text-sm font-medium ${colors.text}`}>
                  {role}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
