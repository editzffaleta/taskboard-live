"use client";
// Pagina de login no grupo (public). Usa o validator e os componentes do projeto.
// Este exemplo e ilustrativo: troque os imports pelo validator/UI reais.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../shared/context/auth-context";
// import { Button, Input, FormErrorMessage } from "../../shared/components/ui";
// import { useValidator } from "../../shared/components/form/validator";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // validar com o validator do projeto antes de enviar
      await login(email, password);
      router.replace("/"); // rota de destino pos-login
    } catch {
      setError("auth.invalidCredentials"); // mensagem via i18n do projeto
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>Entrar</button>
    </form>
  );
}
