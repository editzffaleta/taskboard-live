"use client";
// Guarda de rota para o grupo (private). Use no layout (private) envolvendo os filhos.
// Enquanto carrega a sessao, segura a UI; sem sessao, redireciona pro login.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../shared/context/auth-context";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return null; // ou um skeleton do projeto
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
