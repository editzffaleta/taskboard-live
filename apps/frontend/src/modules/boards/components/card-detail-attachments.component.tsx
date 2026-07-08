'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { Download, FileText, Image as ImageIcon, Paperclip, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { BoardsApiError } from '@/modules/boards/api/boards.api';
import {
  deleteAttachment,
  downloadAttachment,
  listAttachments,
  uploadAttachment,
  type AttachmentDto,
} from '@/modules/boards/api/card-detail.api';
import { getCurrentLocale, getMessage } from '@/shared/i18n';

type CardDetailAttachmentsProps = {
  token: string;
  boardId: string;
  cardId: string;
  currentUserId: string | null;
  isOwner: boolean;
  /** Incrementado a cada `card.updated` recebido para este cartão — recarrega a lista (`032`). */
  refreshSignal: number;
};

/** Handle exposto via `ref` para o atalho "Anexo" da seção "Adicionar ao cartão" (`033`). */
export type CardDetailAttachmentsHandle = {
  requestAttach: () => void;
};

function reportError(error: unknown) {
  if (error instanceof BoardsApiError) {
    error.errors.forEach((code) => toast.error(getMessage(code)));
    return;
  }

  toast.error(getMessage('DEFAULT_API_ERROR'));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function AttachmentTypeIcon({ mimeType }: { mimeType: string }) {
  if (isImageType(mimeType)) {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <ImageIcon className="size-5" />
      </span>
    );
  }

  if (mimeType === 'application/pdf') {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <FileText className="size-5" />
      </span>
    );
  }

  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <FileText className="size-5" />
    </span>
  );
}

/**
 * Seção "Anexos" do modal de detalhe (`032`): lista de anexos (ícone por tipo, nome, tamanho,
 * data relativa, quem enviou), botão "Anexo" que abre o seletor de arquivo, barra de "enviando…"
 * durante o upload, erros por toast (`attachment.too.large`/`attachment.type.not.allowed`),
 * download via `fetch` autenticado + blob, remoção com confirmação simples (autor ou owner).
 */
export const CardDetailAttachments = forwardRef<CardDetailAttachmentsHandle, CardDetailAttachmentsProps>(
  function CardDetailAttachments(
    { token, boardId, cardId, currentUserId, isOwner, refreshSignal },
    ref,
  ) {
  const [attachments, setAttachments] = useState<AttachmentDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const locale = getCurrentLocale() === 'en' ? enUS : ptBR;

  useImperativeHandle(ref, () => ({
    requestAttach: () => fileInputRef.current?.click(),
  }));

  useEffect(() => {
    let cancelled = false;

    listAttachments(token, boardId, cardId)
      .then((result) => {
        if (cancelled) return;
        setAttachments(result);
      })
      .catch((error) => {
        if (cancelled) return;
        reportError(error);
      });

    return () => {
      cancelled = true;
    };
  }, [token, boardId, cardId, refreshSignal]);

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const created = await uploadAttachment(token, boardId, cardId, file);
      setAttachments((current) => {
        if (current.some((attachment) => attachment.id === created.id)) return current;
        return [...current, created];
      });
    } catch (error) {
      reportError(error);
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(attachment: AttachmentDto) {
    setDownloadingId(attachment.id);
    try {
      await downloadAttachment(token, boardId, cardId, attachment.id, attachment.filename);
    } catch (error) {
      reportError(error);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(attachment: AttachmentDto) {
    if (!window.confirm(getMessage('cardDetail.attachments.deleteConfirm', { params: { filename: attachment.filename } }))) {
      return;
    }

    const previous = attachments;
    setAttachments((current) => current.filter((existing) => existing.id !== attachment.id));

    try {
      await deleteAttachment(token, boardId, cardId, attachment.id);
    } catch (error) {
      setAttachments(previous);
      reportError(error);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {getMessage('cardDetail.attachments.title')}
        </p>
        {attachments.length > 0 ? (
          <span className="text-xs font-semibold text-muted-foreground">{attachments.length}</span>
        ) : null}
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{getMessage('cardDetail.attachments.emptyState')}</p>
      ) : (
        <ul className="flex flex-col gap-2 pl-1" data-testid="card-detail-attachments-list">
          {attachments.map((attachment) => {
            const canDelete = attachment.uploadedBy.id === currentUserId || isOwner;

            return (
              <li
                key={attachment.id}
                className="group flex items-center gap-3 rounded-[10px] border border-border p-2"
                data-testid="card-detail-attachment"
              >
                <AttachmentTypeIcon mimeType={attachment.mimeType} />

                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[12.5px] font-semibold" title={attachment.filename}>
                    {attachment.filename}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {formatBytes(attachment.size)} ·{' '}
                    {getMessage('cardDetail.attachments.addedBy', {
                      params: {
                        name: attachment.uploadedBy.name,
                        time: formatDistanceToNow(new Date(attachment.createdAt), {
                          addSuffix: true,
                          locale,
                        }),
                      },
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownload(attachment)}
                  disabled={downloadingId === attachment.id}
                  aria-label={getMessage('cardDetail.attachments.downloadButton')}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  data-testid="card-detail-attachment-download"
                >
                  <Download className="size-4" />
                </button>

                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(attachment)}
                    aria-label={getMessage('cardDetail.attachments.deleteButton')}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    data-testid="card-detail-attachment-delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
        data-testid="card-detail-attachment-input"
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePickFile}
        disabled={uploading}
        className="w-fit gap-2"
        data-testid="card-detail-attachment-add"
      >
        <Paperclip className="size-4" />
        {uploading
          ? getMessage('cardDetail.attachments.uploading')
          : getMessage('cardDetail.attachments.addButton')}
      </Button>
    </div>
  );
  },
);
