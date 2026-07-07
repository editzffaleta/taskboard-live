import type { PresenceUser } from '@/hooks/use-board-socket';

const MAX_VISIBLE_USERS = 5;

function getInitials(name?: string): string {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();

  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

type BoardPresenceProps = {
  users: PresenceUser[];
};

/**
 * Avatares/iniciais sobrepostos de quem está visualizando o quadro agora, a partir de
 * `presence.update`. Somente leitura — sem interação nesta change.
 */
export function BoardPresence({ users }: BoardPresenceProps) {
  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, MAX_VISIBLE_USERS);
  const hiddenCount = users.length - visibleUsers.length;

  return (
    <div className="flex items-center" aria-label="Usuários vendo este quadro">
      {visibleUsers.map((user, index) => (
        <div
          key={user.id}
          title={user.name ?? user.id}
          className="relative flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-semibold text-primary-foreground"
          style={{ marginLeft: index === 0 ? 0 : -8, zIndex: MAX_VISIBLE_USERS - index }}
        >
          {getInitials(user.name)}
          <span
            className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-500"
            aria-hidden
          />
        </div>
      ))}
      {hiddenCount > 0 ? (
        <div
          className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-muted-foreground"
          style={{ marginLeft: -8 }}
        >
          +{hiddenCount}
        </div>
      ) : null}
    </div>
  );
}
