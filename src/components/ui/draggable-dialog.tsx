import * as React from "react";
import { X, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon?: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  children: React.ReactNode;
  className?: string;
}

export function DraggableDialog({
  open,
  onOpenChange,
  title,
  icon,
  defaultPosition = { x: window.innerWidth - 420, y: 80 },
  children,
  className,
}: DraggableDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState(defaultPosition);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragOffset = React.useRef({ x: 0, y: 0 });

  // Reset position when opening
  React.useEffect(() => {
    if (open) {
      setPosition(defaultPosition);
    }
  }, [open, defaultPosition]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dialogRef.current) return;
    
    const rect = dialogRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDragging(true);
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - 400));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 100));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className={cn(
        "fixed z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-lg border bg-background shadow-lg animate-in fade-in-0 zoom-in-95",
        isDragging && "cursor-grabbing select-none",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Draggable Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b cursor-grab active:cursor-grabbing select-none bg-muted/30 rounded-t-lg",
          isDragging && "cursor-grabbing"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 font-semibold text-sm">
          {icon}
          {title}
        </div>
        <div className="flex items-center gap-1">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
