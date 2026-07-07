import { InviteAcceptView } from '@/modules/boards/components/invite-accept-view.component';

type InviteAcceptPageProps = {
  params: Promise<{ token: string }>;
};

/**
 * Página pública `/convite/[token]` (`026`) — prévia pública do convite e aceite,
 * reproduzindo `mockups/Aceitar Convite.dc.html`. Não exige sessão para ver a prévia.
 */
export default async function InviteAcceptPage({ params }: InviteAcceptPageProps) {
  const { token } = await params;

  return <InviteAcceptView token={token} />;
}
