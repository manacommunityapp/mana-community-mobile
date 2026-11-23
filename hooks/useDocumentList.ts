import { useState, useEffect, useCallback } from 'react';
import {
  documentService,
  DocumentDto,
  DocumentCategory,
} from '@/services/documentService';

interface UseDocumentListOptions {
  entityType?: string;
  entityId?: string | number;
  category?: DocumentCategory;
  enabled?: boolean;
}

export function useDocumentList(options: UseDocumentListOptions) {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entityIdStr = String(options.entityId ?? '');

  const reload = useCallback(async () => {
    if (options.enabled === false) return;
    setLoading(true);
    try {
      let docs: DocumentDto[];
      if (options.entityType && options.entityId !== undefined) {
        docs = await documentService.listByEntity(options.entityType, entityIdStr);
      } else {
        docs = await documentService.list(options.category);
      }
      setDocuments(docs.filter((d) => d.status !== 'DELETED'));
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [options.entityType, entityIdStr, options.category, options.enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { documents, loading, error, reload };
}
