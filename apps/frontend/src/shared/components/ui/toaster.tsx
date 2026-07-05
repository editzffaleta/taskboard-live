"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/shared/hooks/use-theme.hook";

export function Toaster() {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      richColors
      position="bottom-right"
      closeButton
      offset={{ bottom: 40, right: 40 }}
    />
  );
}
