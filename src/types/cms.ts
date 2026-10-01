export type CmsRecord = Record<string, unknown> & { id?: string }

export type CmsBootstrap = {
  ok: boolean
  generatedAt: string
  collections: Record<string, CmsRecord[]>
}

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export type UploadState = 'optimizing' | 'requesting' | 'uploading' | 'saving' | 'success' | 'error'
