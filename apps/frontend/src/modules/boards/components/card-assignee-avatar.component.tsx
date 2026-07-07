const AVATAR_PALETTE = [
  '#7C3AED',
  '#059669',
  '#E11D48',
  '#4F46E5',
  '#0891B2',
  '#D97706',
  '#DB2777',
];

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

type CardAssigneeAvatarProps = {
  id: string;
  name: string;
  className?: string;
};

/**
 * Avatar circular de iniciais, cor determinística por `id` (mesma paleta do mockup),
 * reaproveitado no modal de detalhe e no `kanban-card`.
 */
export function CardAssigneeAvatar({ id, name, className }: CardAssigneeAvatarProps) {
  const color = AVATAR_PALETTE[hashId(id) % AVATAR_PALETTE.length];

  return (
    <span
      title={name}
      style={{ backgroundColor: color }}
      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${className ?? ''}`}
      data-testid="card-assignee-avatar"
      data-assignee-id={id}
    >
      {initialsOf(name)}
    </span>
  );
}
