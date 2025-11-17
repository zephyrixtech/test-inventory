declare module "@/components/ui/dialog" {
  import * as React from "react";

  export const Dialog: React.FC<{ children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }>;
  export const DialogTrigger: React.FC<{ children?: React.ReactNode; asChild?: boolean }>;
  export const DialogPortal: React.FC<{ children?: React.ReactNode }>;
  export const DialogClose: React.FC<React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>;
  export const DialogOverlay: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const DialogContent: React.FC<{ children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>>;
  export const DialogHeader: React.FC<{ children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>>;
  export const DialogFooter: React.FC<{ children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>>;
  export const DialogTitle: React.FC<{ children?: React.ReactNode } & React.HTMLAttributes<HTMLHeadingElement>>;
  export const DialogDescription: React.FC<{ children?: React.ReactNode } & React.HTMLAttributes<HTMLParagraphElement>>;
}