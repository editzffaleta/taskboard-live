'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Laptop, ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ReadonlyTextField } from '@/shared/components/ui/readonly-text-field';
import { FormErrorMessage } from '@/shared/components/ui/form-error-message';
import { DeleteConfirmationDialog } from '@/shared/components/ui/delete-confirmation-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { getMessage, setI18nLocale, type I18nLocale } from '@/shared/i18n';
import { LOCALE_STORAGE_KEY } from '@/shared/i18n/locale-bootstrap.component';
import { useThemeContext } from '@/shared/context/theme.context';
import { useAuth } from '@/modules/auth/context/auth.context';
import {
  AccountApiError,
  changePassword,
  deleteAccount,
  updateProfile,
} from '@/modules/auth/api/account.api';

function reportError(error: unknown) {
  if (error instanceof AccountApiError) {
    error.errors.forEach((code) => toast.error(getMessage(code)));
    return;
  }
  toast.error(getMessage('DEFAULT_API_ERROR'));
}

function readStoredLocale(): I18nLocale {
  if (typeof window === 'undefined') return 'pt';
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}

/**
 * Tela "Configurações da Conta" (`021`), acessível a qualquer usuário autenticado — sem
 * restrição de papel, pois trata só da própria conta. Reproduz as quatro abas do mockup
 * `Configuracoes da Conta.dc.html`: Perfil (nome real via `PATCH /auth/me`, e-mail
 * somente leitura), Segurança (troca de senha real via `PATCH /auth/me/password`; 2FA e
 * sessões/dispositivos são **placeholders estáticos**, fiéis ao visual mas sem nenhuma
 * chamada de API), Preferências (tema real via `useThemeContext`; idioma real com
 * `window.location.reload()` documentado; notificações por e-mail placeholder) e Zona de
 * perigo (excluir conta real via `DELETE /auth/me`).
 *
 * Rota: mantém `/account` (já existente na navegação, `002`) em vez de criar
 * `/account/settings` — evita duplicar entrada de menu; decisão registrada na evidência
 * da task `3.1`.
 */
export function AccountSettings() {
  const { user, token, updateUserName, logout } = useAuth();
  const { theme, setTheme } = useThemeContext();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const [locale, setLocale] = useState<I18nLocale>(() => readStoredLocale());

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSaveName(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !token) return;

    setSavingName(true);
    try {
      const updated = await updateProfile(token, trimmed);
      updateUserName(updated.name);
      toast.success(getMessage('accountSettings.profile.saveSuccess'));
    } catch (error) {
      reportError(error);
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    if (!token) return;

    if (newPassword !== confirmPassword) {
      setPasswordError(getMessage('accountSettings.security.passwordMismatch'));
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(token, currentPassword, newPassword);
      toast.success(getMessage('accountSettings.security.changePasswordSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      reportError(error);
    } finally {
      setChangingPassword(false);
    }
  }

  function handleSelectLocale(nextLocale: I18nLocale) {
    if (nextLocale === locale) return;

    setLocale(nextLocale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // Ignora falha de persistência (ex.: modo privado) — o reload ainda aplica o locale.
    }
    setI18nLocale(nextLocale);
    window.location.reload();
  }

  async function handleDeleteAccount() {
    if (!token) return;

    setDeleting(true);
    try {
      await deleteAccount(token);
      logout();
      router.replace('/join');
    } catch (error) {
      reportError(error);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-12" data-testid="account-settings">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{getMessage('accountSettings.title')}</h1>
        <p className="text-sm text-muted-foreground">{getMessage('accountSettings.subtitle')}</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" data-testid="account-settings-tab-profile">
            {getMessage('accountSettings.tabs.profile')}
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="account-settings-tab-security">
            {getMessage('accountSettings.tabs.security')}
          </TabsTrigger>
          <TabsTrigger value="preferences" data-testid="account-settings-tab-preferences">
            {getMessage('accountSettings.tabs.preferences')}
          </TabsTrigger>
          <TabsTrigger value="danger-zone" data-testid="account-settings-tab-danger-zone">
            {getMessage('accountSettings.tabs.dangerZone')}
          </TabsTrigger>
        </TabsList>

        {/* ── Perfil ────────────────────────────────────────────────────────── */}
        <TabsContent value="profile" className="flex flex-col gap-5">
          <section
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            data-testid="account-settings-profile"
          >
            <form onSubmit={handleSaveName} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="account-settings-name">{getMessage('accountSettings.profile.nameLabel')}</Label>
                <Input
                  id="account-settings-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  data-testid="account-settings-name-input"
                />
              </div>

              <div>
                <Label htmlFor="account-settings-email">{getMessage('accountSettings.profile.emailLabel')}</Label>
                <ReadonlyTextField id="account-settings-email" value={user?.email} />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {getMessage('accountSettings.profile.emailReadonlyNote')}
                </p>
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={savingName || !name.trim()}
                  data-testid="account-settings-name-save"
                >
                  {savingName ? getMessage('accountSettings.profile.saving') : getMessage('accountSettings.profile.save')}
                </Button>
              </div>
            </form>
          </section>
        </TabsContent>

        {/* ── Segurança ─────────────────────────────────────────────────────── */}
        <TabsContent value="security" className="flex flex-col gap-5">
          <section
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            data-testid="account-settings-change-password"
          >
            <h2 className="mb-4 text-base font-bold">{getMessage('accountSettings.security.changePasswordTitle')}</h2>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="account-settings-current-password">
                  {getMessage('accountSettings.security.currentPasswordLabel')}
                </Label>
                <Input
                  id="account-settings-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  data-testid="account-settings-current-password-input"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="account-settings-new-password">
                    {getMessage('accountSettings.security.newPasswordLabel')}
                  </Label>
                  <Input
                    id="account-settings-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    data-testid="account-settings-new-password-input"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="account-settings-confirm-password">
                    {getMessage('accountSettings.security.confirmPasswordLabel')}
                  </Label>
                  <Input
                    id="account-settings-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    data-testid="account-settings-confirm-password-input"
                  />
                </div>
              </div>

              {passwordError ? <FormErrorMessage>{passwordError}</FormErrorMessage> : null}

              <div>
                <Button
                  type="submit"
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  data-testid="account-settings-change-password-submit"
                >
                  {changingPassword
                    ? getMessage('accountSettings.security.changePasswordButtonSaving')
                    : getMessage('accountSettings.security.changePasswordButton')}
                </Button>
              </div>
            </form>
          </section>

          {/* Placeholder estático — sem chamada de API (`021`, fora de escopo: TOTP). */}
          <section
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
            data-testid="account-settings-two-factor"
          >
            <ShieldCheck className="size-6 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{getMessage('accountSettings.security.twoFactorTitle')}</p>
              <p className="text-xs text-muted-foreground">{getMessage('accountSettings.security.twoFactorDescription')}</p>
            </div>
            <Button type="button" variant="outline" disabled data-testid="account-settings-two-factor-toggle">
              {getMessage('accountSettings.security.comingSoon')}
            </Button>
          </section>

          {/* Placeholder informativo — sem "encerrar sessão" funcional (`021`, fora de
              escopo: sessões/refresh token). Mostra só a sessão atual. */}
          <section
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            data-testid="account-settings-sessions"
          >
            <h2 className="mb-1 text-base font-bold">{getMessage('accountSettings.security.sessionsTitle')}</h2>
            <p className="mb-4 text-xs text-muted-foreground">{getMessage('accountSettings.security.sessionsDescription')}</p>
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Laptop className="size-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{getMessage('accountSettings.security.sessionsCurrentDevice')}</p>
              </div>
            </div>
          </section>
        </TabsContent>

        {/* ── Preferências ──────────────────────────────────────────────────── */}
        <TabsContent value="preferences" className="flex flex-col gap-5">
          <section
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            data-testid="account-settings-theme"
          >
            <h2 className="mb-1 text-base font-bold">{getMessage('accountSettings.preferences.themeTitle')}</h2>
            <p className="mb-4 text-xs text-muted-foreground">{getMessage('accountSettings.preferences.themeDescription')}</p>
            <div className="inline-flex gap-1 rounded-lg border border-border bg-muted p-1">
              <Button
                type="button"
                size="sm"
                variant={theme === 'light' ? 'default' : 'ghost'}
                onClick={() => setTheme('light')}
                data-testid="account-settings-theme-light"
              >
                {getMessage('accountSettings.preferences.themeLight')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={theme === 'dark' ? 'default' : 'ghost'}
                onClick={() => setTheme('dark')}
                data-testid="account-settings-theme-dark"
              >
                {getMessage('accountSettings.preferences.themeDark')}
              </Button>
            </div>
          </section>

          <section
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            data-testid="account-settings-language"
          >
            <h2 className="mb-1 text-base font-bold">{getMessage('accountSettings.preferences.languageTitle')}</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {getMessage('accountSettings.preferences.languageDescription')}
            </p>
            <div className="inline-flex gap-1 rounded-lg border border-border bg-muted p-1">
              <Button
                type="button"
                size="sm"
                variant={locale === 'pt' ? 'default' : 'ghost'}
                onClick={() => handleSelectLocale('pt')}
                data-testid="account-settings-language-pt"
              >
                {getMessage('accountSettings.preferences.languagePt')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={locale === 'en' ? 'default' : 'ghost'}
                onClick={() => handleSelectLocale('en')}
                data-testid="account-settings-language-en"
              >
                {getMessage('accountSettings.preferences.languageEn')}
              </Button>
            </div>
          </section>

          {/* Placeholder desabilitado — sem provedor de e-mail no projeto (`021`). */}
          <section
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            data-testid="account-settings-notifications"
          >
            <h2 className="mb-1 text-base font-bold">{getMessage('accountSettings.preferences.notificationsTitle')}</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {getMessage('accountSettings.preferences.notificationsDescription')}
            </p>
            {[
              'accountSettings.preferences.notificationsMentions',
              'accountSettings.preferences.notificationsAssignments',
              'accountSettings.preferences.notificationsDue',
              'accountSettings.preferences.notificationsWeekly',
            ].map((messageKey) => (
              <div
                key={messageKey}
                className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
              >
                <p className="flex-1 text-sm font-medium">{getMessage(messageKey)}</p>
                <Button type="button" variant="outline" size="sm" disabled>
                  {getMessage('accountSettings.security.comingSoon')}
                </Button>
              </div>
            ))}
          </section>
        </TabsContent>

        {/* ── Zona de perigo ────────────────────────────────────────────────── */}
        <TabsContent value="danger-zone">
          <section
            className="rounded-2xl border border-destructive bg-card p-5"
            data-testid="account-settings-danger-zone"
          >
            <h2 className="mb-4 text-base font-bold text-destructive">{getMessage('accountSettings.dangerZone.title')}</h2>
            <div className="flex items-center gap-4">
              <p className="flex-1 text-sm text-muted-foreground">{getMessage('accountSettings.dangerZone.description')}</p>
              <Button
                type="button"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setDeleteOpen(true)}
                data-testid="account-settings-delete-trigger"
              >
                {getMessage('accountSettings.dangerZone.deleteButton')}
              </Button>
            </div>
          </section>

          <DeleteConfirmationDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={handleDeleteAccount}
            title={getMessage('accountSettings.dangerZone.title')}
            description={getMessage('accountSettings.dangerZone.description')}
            itemLabel={getMessage('accountSettings.dangerZone.deleteItemLabel')}
            itemValue={user?.email}
            confirmWord={getMessage('accountSettings.dangerZone.deleteConfirmWord')}
            isConfirming={deleting}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
