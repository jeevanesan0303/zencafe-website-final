
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import {
  Check,
  Clock3,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ImagePlus,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
  User,
  X,
} from 'lucide-react'

import { getAdminAuthHeaders } from '../../admin-auth'
import AdminAlert from '../utils/sweetAlert'

/* ==========================================
   TYPES
========================================== */

type GalleryPhoto = {
  id: string
  title: string | null
  description: string | null
  imageUrl: string
  image_url?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  customerName: string
  customerEmail: string
  customerPhone?: string
}

type UploadItem = {
  id: string
  file: File
  preview: string
}

type FilterTab =
  | 'all'
  | 'approved'
  | 'rejected'
  | 'pending'

type ApiResponse = {
  success?: boolean
  error?: string
  message?: string
  photos?: GalleryPhoto[]
  count?: number
}

/* ==========================================
   CONSTANTS
========================================== */

const MAX_BATCH_PHOTOS = 2

// Keep below the backend's 15 MB request limit.
// Multipart form fields add a small amount of overhead.
const MAX_BATCH_BYTES = 14 * 1024 * 1024

const MAX_CAPTION_LENGTH = 1000

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

/* ==========================================
   HELPERS
========================================== */

function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function parseResponse(
  response: Response
): Promise<ApiResponse> {
  const text = await response.text()

  let data: ApiResponse

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(
      `Invalid server response (${response.status}).`
    )
  }

  if (!response.ok || !data.success) {
    throw new Error(
      data.error ||
      data.message ||
      `Request failed (${response.status}).`
    )
  }

  return data
}

function createBatches(
  items: UploadItem[]
): UploadItem[][] {
  const batches: UploadItem[][] = []
  let current: UploadItem[] = []
  let currentBytes = 0

  for (const item of items) {
    if (item.file.size > MAX_BATCH_BYTES) {
      throw new Error(
        `${item.file.name} is too large for one upload request.`
      )
    }

    if (
      current.length >= MAX_BATCH_PHOTOS ||
      currentBytes + item.file.size >
        MAX_BATCH_BYTES
    ) {
      if (current.length) {
        batches.push(current)
      }

      current = []
      currentBytes = 0
    }

    current.push(item)
    currentBytes += item.file.size
  }

  if (current.length) {
    batches.push(current)
  }

  return batches
}

/* ==========================================
   MOMENTS GALLERY
========================================== */

export default function MomentsGallery() {
  const [photos, setPhotos] =
    useState<GalleryPhoto[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [activeTab, setActiveTab] =
    useState<FilterTab>('all')

  const [searchTerm, setSearchTerm] =
    useState('')

  const [previewPhoto, setPreviewPhoto] =
    useState<GalleryPhoto | null>(null)

  const [actionId, setActionId] =
    useState<string | null>(null)

  const [uploadOpen, setUploadOpen] =
    useState(false)

  const [selectedPhotos, setSelectedPhotos] =
    useState<UploadItem[]>([])

  const [caption, setCaption] =
    useState('')

  const [uploading, setUploading] =
    useState(false)

  const [uploadError, setUploadError] =
    useState('')

  const [uploadedCount, setUploadedCount] =
    useState(0)

  const [uploadTotal, setUploadTotal] =
    useState(0)

  const [completedBatches, setCompletedBatches] =
    useState(0)

  const [totalBatches, setTotalBatches] =
    useState(0)

  const fileInputRef =
    useRef<HTMLInputElement | null>(null)

  const selectedRef =
    useRef<UploadItem[]>([])

  const uploadLockRef =
    useRef(false)

  const mountedRef =
    useRef(true)

  /* ==========================================
     PHOTO DATA
  ========================================== */

  const loadPhotos = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        '/api/gallery/admin/photos?status=all',
        {
          method: 'GET',
          headers: getAdminAuthHeaders(),
          cache: 'no-store',
        }
      )

      const data = await parseResponse(response)

      if (mountedRef.current) {
        setPhotos(
          Array.isArray(data.photos)
            ? data.photos
            : []
        )
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load gallery photos.'
        )
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void loadPhotos()

    return () => {
      mountedRef.current = false

      selectedRef.current.forEach(item => {
        URL.revokeObjectURL(item.preview)
      })
    }
  }, [loadPhotos])

  /* ==========================================
     UPLOAD SELECTION
  ========================================== */

  function updateSelection(items: UploadItem[]) {
    selectedRef.current = items
    setSelectedPhotos(items)
  }

  function selectFiles(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    )

    event.target.value = ''

    if (!files.length) return

    setUploadError('')

    const invalid = files.find(
      file => !ACCEPTED_TYPES.includes(file.type)
    )

    if (invalid) {
      setUploadError(
        'Only JPG, PNG and WebP photos are supported.'
      )
      return
    }

    const empty = files.find(
      file => file.size === 0
    )

    if (empty) {
      setUploadError(
        'An empty photo cannot be uploaded.'
      )
      return
    }

    const oversized = files.find(
      file => file.size > MAX_BATCH_BYTES
    )

    if (oversized) {
      setUploadError(
        `${oversized.name} exceeds the safe per-photo upload size of 14 MB.`
      )
      return
    }

    const newItems: UploadItem[] = files.map(
      file => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      })
    )

    updateSelection([
      ...selectedRef.current,
      ...newItems,
    ])
  }

  function removeSelectedPhoto(id: string) {
    const item = selectedRef.current.find(
      photo => photo.id === id
    )

    if (item) {
      URL.revokeObjectURL(item.preview)
    }

    updateSelection(
      selectedRef.current.filter(
        photo => photo.id !== id
      )
    )
  }

  function clearSelection() {
    selectedRef.current.forEach(item => {
      URL.revokeObjectURL(item.preview)
    })

    updateSelection([])
    setCaption('')
    setUploadError('')
    setUploadedCount(0)
    setUploadTotal(0)
    setCompletedBatches(0)
    setTotalBatches(0)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function closeUpload() {
    if (uploadLockRef.current) return

    setUploadOpen(false)
    clearSelection()
  }

  /* ==========================================
     UNLIMITED ADMIN UPLOAD
     AUTOMATIC SAFE BATCHING
  ========================================== */

  async function handleUpload() {
    if (uploadLockRef.current) return

    if (!selectedPhotos.length) {
      setUploadError(
        'Please select at least one photo.'
      )
      return
    }

    if (caption.length > MAX_CAPTION_LENGTH) {
      setUploadError(
        'Caption cannot exceed 1000 characters.'
      )
      return
    }

    let batches: UploadItem[][]

    try {
      batches = createBatches(selectedPhotos)
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Unable to prepare photos.'
      )
      return
    }

    const confirmed = await AdminAlert.confirm(
      'Publish Zen Moments',
      `Publish ${selectedPhotos.length} photos to the public Zen Café gallery?`,
      'Yes, Publish'
    )

    if (!confirmed) return
    if (uploadLockRef.current) return

    uploadLockRef.current = true

    setUploading(true)
    setUploadError('')
    setUploadedCount(0)
    setUploadTotal(selectedPhotos.length)
    setCompletedBatches(0)
    setTotalBatches(batches.length)

    let successful = 0
    let successfulBatches = 0

    try {
      for (const batch of batches) {
        const formData = new FormData()

        formData.append(
          'caption',
          caption.trim()
        )

        for (const item of batch) {
          formData.append(
            'photos',
            item.file,
            item.file.name
          )
        }

        const headers = new Headers(
          getAdminAuthHeaders()
        )

        // Let the browser set the multipart boundary.
        headers.delete('Content-Type')

        const response = await fetch(
          '/api/gallery/admin/upload',
          {
            method: 'POST',
            headers,
            body: formData,
          }
        )

        const data = await parseResponse(response)

        successful +=
          typeof data.count === 'number'
            ? data.count
            : batch.length

        successfulBatches++

        setUploadedCount(successful)
        setCompletedBatches(successfulBatches)
      }

      clearSelection()
      setUploadOpen(false)
      setActiveTab('approved')

      await loadPhotos()

      await AdminAlert.success(
        'Photos Published',
        `${successful} photos were successfully published to the Zen Café gallery.`
      )
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Upload failed.'

      setUploadError(
        `${successful} of ${selectedPhotos.length} photos published. ${message} You can retry the remaining photos.`
      )

      // Remove photos already successfully uploaded,
      // so retrying cannot duplicate those batches.
      const completedItems = batches
        .slice(0, successfulBatches)
        .flat()

      const completedIds = new Set(
        completedItems.map(item => item.id)
      )

      completedItems.forEach(item => {
        URL.revokeObjectURL(item.preview)
      })

      updateSelection(
        selectedRef.current.filter(
          item => !completedIds.has(item.id)
        )
      )

      await loadPhotos()

      await AdminAlert.error(
        'Upload Interrupted',
        `${successful} photos were published. ${message}`
      )
    } finally {
      uploadLockRef.current = false
      setUploading(false)
    }
  }

  /* ==========================================
     SHOW / HIDE / DELETE
  ========================================== */

  async function updatePhotoStatus(
    photo: GalleryPhoto,
    action: 'approve' | 'reject'
  ) {
    if (actionId) return

    const isShowing = action === 'approve'

    const confirmed = await AdminAlert.confirm(
      isShowing ? 'Show Photo' : 'Hide Photo',
      isShowing
        ? 'Make this photo visible in the public gallery?'
        : 'Hide this photo from the public gallery? It can be shown again later.',
      isShowing ? 'Yes, Show' : 'Yes, Hide'
    )

    if (!confirmed) return

    setActionId(photo.id)

    try {
      const response = await fetch(
        `/api/gallery/admin/photos/${encodeURIComponent(photo.id)}/${action}`,
        {
          method: 'POST',
          headers: getAdminAuthHeaders(),
        }
      )

      await parseResponse(response)

      const nextStatus =
        isShowing ? 'approved' : 'rejected'

      setPhotos(previous =>
        previous.map(item =>
          item.id === photo.id
            ? {
                ...item,
                status: nextStatus,
              }
            : item
        )
      )

      setPreviewPhoto(previous =>
        previous?.id === photo.id
          ? {
              ...previous,
              status: nextStatus,
            }
          : previous
      )

      await AdminAlert.success(
        isShowing ? 'Photo Visible' : 'Photo Hidden',
        isShowing
          ? 'The photo is now visible in the public gallery.'
          : 'The photo is hidden and can be restored later.'
      )
    } catch (err) {
      await AdminAlert.error(
        'Action Failed',
        err instanceof Error
          ? err.message
          : 'Unable to update the photo.'
      )
    } finally {
      setActionId(null)
    }
  }

  async function deletePhoto(photo: GalleryPhoto) {
    if (actionId) return

    const confirmed =
      await AdminAlert.confirmDelete(
        `photo #${photo.id}`
      )

    if (!confirmed) return

    setActionId(photo.id)

    try {
      const response = await fetch(
        `/api/gallery/admin/photos/${encodeURIComponent(photo.id)}`,
        {
          method: 'DELETE',
          headers: getAdminAuthHeaders(),
        }
      )

      await parseResponse(response)

      setPhotos(previous =>
        previous.filter(
          item => item.id !== photo.id
        )
      )

      setPreviewPhoto(previous =>
        previous?.id === photo.id
          ? null
          : previous
      )

      await AdminAlert.success(
        'Photo Deleted',
        'The photo was permanently deleted.'
      )
    } catch (err) {
      await AdminAlert.error(
        'Delete Failed',
        err instanceof Error
          ? err.message
          : 'Unable to delete the photo.'
      )
    } finally {
      setActionId(null)
    }
  }

  /* ==========================================
     STATS AND FILTERING
  ========================================== */

  const stats = useMemo(() => ({
    total: photos.length,
    approved: photos.filter(
      photo => photo.status === 'approved'
    ).length,
    hidden: photos.filter(
      photo => photo.status === 'rejected'
    ).length,
    pending: photos.filter(
      photo => photo.status === 'pending'
    ).length,
  }), [photos])

  const filteredPhotos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return photos.filter(photo => {
      if (
        activeTab !== 'all' &&
        photo.status !== activeTab
      ) {
        return false
      }

      if (!term) return true

      return [
        photo.id,
        photo.title,
        photo.description,
        photo.customerName,
        photo.customerEmail,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [photos, activeTab, searchTerm])

  const progress =
    uploadTotal > 0
      ? Math.round(
          (uploadedCount / uploadTotal) * 100
        )
      : 0

  /* ==========================================
     RENDER
  ========================================== */

  return (
    <div className="za-bookings-page">
      {/* HEADER */}

      <div className="za-products-page-head">
        <div>
          <p className="za-kicker">
            ZEN CAFÉ MOMENTS
          </p>

          <h1>Moments Gallery</h1>

          <p>
            Upload café moments and manage
            photos displayed in your public gallery.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="za-row-action !h-10 !w-auto !px-4 !rounded-full bg-white"
            onClick={() => void loadPhotos()}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={
                loading ? 'animate-spin' : ''
              }
            />
            <span className="ml-2">
              Refresh
            </span>
          </button>

          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#8B3F2F] px-5 text-xs font-bold text-white hover:bg-[#713124]"
            onClick={() => setUploadOpen(true)}
          >
            <ImagePlus size={17} />
            Upload Photos
          </button>
        </div>
      </div>

      {/* STATISTICS */}

      <div className="za-product-summary">
        {[
          {
            label: 'Total Photos',
            value: stats.total,
          },
          {
            label: 'Published',
            value: stats.approved,
          },
          {
            label: 'Hidden',
            value: stats.hidden,
          },
          {
            label: 'Pending',
            value: stats.pending,
          },
        ].map(stat => (
          <div
            className="za-product-summary-card"
            key={stat.label}
          >
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>
              Gallery management
            </small>
          </div>
        ))}
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* FILTERS */}

      <div className="za-filter-bar mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            ['all', 'All Photos', stats.total],
            ['approved', 'Published', stats.approved],
            ['rejected', 'Hidden', stats.hidden],
            ['pending', 'Pending', stats.pending],
          ] as const).map(
            ([id, label, count]) => (
              <button
                type="button"
                key={id}
                className={`za-filter-btn ${
                  activeTab === id
                    ? 'active'
                    : ''
                }`}
                onClick={() => setActiveTab(id)}
              >
                {label} ({count})
              </button>
            )
          )}
        </div>

        <div className="relative min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />

          <input
            type="search"
            className="field-input !w-full !py-2 !pl-9 !text-xs"
            placeholder="Search gallery..."
            value={searchTerm}
            onChange={event =>
              setSearchTerm(event.target.value)
            }
          />
        </div>
      </div>

      {/* GALLERY GRID */}

      {loading ? (
        <div className="rounded-3xl bg-white p-12 text-center">
          <RefreshCw
            size={24}
            className="mx-auto mb-3 animate-spin"
          />
          Loading photos...
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center text-stone-500">
          <ImageIcon
            size={34}
            className="mx-auto mb-3"
          />
          No photos found.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPhotos.map(photo => {
            const published =
              photo.status === 'approved'

            const hidden =
              photo.status === 'rejected'

            const busy = actionId !== null

            return (
              <div
                key={photo.id}
                className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-stone-100"
                  onClick={() =>
                    setPreviewPhoto(photo)
                  }
                >
                  <img
                    src={
                      photo.imageUrl ||
                      photo.image_url
                    }
                    alt={
                      photo.description ||
                      'Zen Café photo'
                    }
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />

                  <span
                    className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold text-white ${
                      published
                        ? 'bg-emerald-600'
                        : hidden
                          ? 'bg-stone-600'
                          : 'bg-amber-500'
                    }`}
                  >
                    {published
                      ? 'Published'
                      : hidden
                        ? 'Hidden'
                        : 'Pending'}
                  </span>
                </button>

                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-bold text-stone-800">
                      <User size={13} />
                      {photo.title === 'Zen Café' &&
                      photo.customerEmail === '—'
                        ? 'Zen Café'
                        : photo.customerName ||
                          'Zen Guest'}
                    </span>

                    <span className="text-[10px] text-stone-400">
                      #{photo.id}
                    </span>
                  </div>

                  {photo.customerEmail &&
                    photo.customerEmail !== '—' && (
                      <p className="mb-2 flex items-center gap-1 truncate text-[11px] text-stone-500">
                        <Mail size={12} />
                        {photo.customerEmail}
                      </p>
                    )}

                  <p className="mb-3 line-clamp-2 min-h-[42px] rounded-xl bg-stone-50 p-2 text-xs italic text-stone-600">
                    {photo.description ||
                      photo.title ||
                      'No caption provided.'}
                  </p>

                  <p className="mb-3 flex items-center gap-1 text-[10px] text-stone-400">
                    <Clock3 size={12} />
                    {formatDate(photo.createdAt)}
                  </p>

                  <div className="flex gap-2 border-t border-stone-100 pt-3">
                    {published ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void updatePhotoStatus(
                            photo,
                            'reject'
                          )
                        }
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        <EyeOff size={14} />
                        Hide
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void updatePhotoStatus(
                            photo,
                            'approve'
                          )
                        }
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        <Eye size={14} />
                        Show
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void deletePhoto(photo)
                      }
                      className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 disabled:opacity-50"
                      aria-label={`Delete photo ${photo.id}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* UPLOAD MODAL */}

      {uploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Upload photos"
            className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-100 p-6">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-[#A65C44]">
                  ZEN CAFÉ MOMENTS
                </p>
                <h2 className="font-serif text-2xl font-bold text-[#513226]">
                  Upload Photos
                </h2>
              </div>

              <button
                type="button"
                disabled={uploading}
                onClick={closeUpload}
                aria-label="Close upload"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={selectFiles}
              />

              <button
                type="button"
                disabled={uploading}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-[#D9B5A5] bg-[#FFF9F5] p-8 text-center"
              >
                <UploadCloud
                  size={34}
                  className="mb-3 text-[#8B3F2F]"
                />

                <strong className="text-sm text-[#513226]">
                  Choose Your Photos
                </strong>

                <span className="mt-2 text-xs text-stone-500">
                  JPG, PNG or WebP
                </span>

                <span className="mt-1 text-[11px] text-stone-400">
                  No total photo count limit
                </span>
              </button>

              {selectedPhotos.length > 0 && (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <strong className="text-xs">
                      Selected Photos
                    </strong>

                    <span className="text-xs text-stone-500">
                      {selectedPhotos.length} photos
                    </span>
                  </div>

                  <div className="grid max-h-56 grid-cols-3 gap-3 overflow-y-auto">
                    {selectedPhotos.map(item => (
                      <div
                        key={item.id}
                        className="relative overflow-hidden rounded-xl border border-stone-200"
                      >
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="aspect-square w-full object-cover"
                        />

                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() =>
                            removeSelectedPhoto(item.id)
                          }
                          className="absolute right-1 top-1 rounded-full bg-white p-1 text-red-600"
                          aria-label="Remove photo"
                        >
                          <X size={13} />
                        </button>

                        <p className="truncate px-2 py-1 text-[10px] text-stone-500">
                          {item.file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5">
                <label
                  htmlFor="gallery-caption"
                  className="mb-2 block text-xs font-bold text-stone-700"
                >
                  Caption (Optional)
                </label>

                <textarea
                  id="gallery-caption"
                  rows={3}
                  maxLength={MAX_CAPTION_LENGTH}
                  disabled={uploading}
                  value={caption}
                  onChange={event =>
                    setCaption(event.target.value)
                  }
                  placeholder="A beautiful moment at Zen Café..."
                  className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm outline-none"
                />
              </div>

              {uploadError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {uploadError}
                </div>
              )}

              {(uploading ||
                uploadedCount > 0) && (
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-xs font-semibold">
                    <span>
                      Uploaded {uploadedCount} of{' '}
                      {uploadTotal}
                    </span>

                    <span>{progress}%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-[11px] text-stone-500">
                    Batch {completedBatches} of{' '}
                    {totalBatches} completed
                  </p>
                </div>
              )}

              <div className="mt-5 flex gap-3 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-800">
                <ShieldCheck
                  size={19}
                  className="shrink-0"
                />

                <span>
                  Admin photos publish directly.
                  Large selections upload automatically
                  in safe batches without customer
                  verification or cooldown.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-stone-100 bg-stone-50 p-5">
              <button
                type="button"
                disabled={uploading}
                onClick={closeUpload}
                className="rounded-xl border border-stone-200 bg-white px-5 py-3 text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  uploading ||
                  selectedPhotos.length === 0
                }
                onClick={() => void handleUpload()}
                className="flex items-center gap-2 rounded-xl bg-[#8B3F2F] px-6 py-3 text-xs font-bold text-white disabled:opacity-50"
              >
                {uploading ? (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <UploadCloud size={16} />
                )}

                {uploading
                  ? 'Publishing...'
                  : `Publish ${selectedPhotos.length} Photos`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW */}

      {previewPhoto && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Photo preview"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white"
          >
            <div className="flex items-center justify-between p-5">
              <div>
                <h3 className="font-serif text-lg font-bold">
                  Photo #{previewPhoto.id}
                </h3>

                <p className="text-xs text-stone-500">
                  {formatDate(
                    previewPhoto.createdAt
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPreviewPhoto(null)
                }
                aria-label="Close preview"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-stone-900 p-3">
              <img
                src={
                  previewPhoto.imageUrl ||
                  previewPhoto.image_url
                }
                alt={
                  previewPhoto.description ||
                  'Gallery photo'
                }
                className="max-h-[60vh] max-w-full object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <p className="text-xs italic text-stone-600">
                {previewPhoto.description ||
                  'No caption provided.'}
              </p>

              <div className="flex gap-2">
                {previewPhoto.status ===
                'approved' ? (
                  <button
                    type="button"
                    disabled={actionId !== null}
                    onClick={() =>
                      void updatePhotoStatus(
                        previewPhoto,
                        'reject'
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    <EyeOff size={15} />
                    Hide
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionId !== null}
                    onClick={() =>
                      void updatePhotoStatus(
                        previewPhoto,
                        'approve'
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    <Eye size={15} />
                    Show
                  </button>
                )}

                <button
                  type="button"
                  disabled={actionId !== null}
                  onClick={() =>
                    void deletePhoto(previewPhoto)
                  }
                  className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
