"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToggleEventVisibility } from "../hooks/useCalendarEvents";

interface EventVisibilityToggleProps {
   eventId: number;
   isVisible: boolean;
}

export function EventVisibilityToggle({ eventId, isVisible }: EventVisibilityToggleProps) {
   const { mutate, isPending } = useToggleEventVisibility();

   return (
      <Button
         variant="ghost"
         size="icon"
         className="h-7 w-7 shrink-0"
         disabled={isPending}
         title={isVisible ? "Hide event" : "Show event"}
         onClick={() => mutate(eventId)}
      >
         {isPending ? (
            <Loader2 size={14} className="animate-spin" />
         ) : isVisible ? (
            <Eye size={14} className="text-green-600" />
         ) : (
            <EyeOff size={14} className="text-muted-foreground" />
         )}
      </Button>
   );
}
