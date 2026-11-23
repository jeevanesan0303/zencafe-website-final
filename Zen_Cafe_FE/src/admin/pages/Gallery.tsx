
import {
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
  XCircle,
} from 'lucide-react'

import type { AdminPage } from '../AdminApp'
import { getAdminAuthHeaders } from '../../admin-auth'
import AdminAlert from '../utils/sweetAlert'

/* ==========================================
   TYPES
========================================== */

export type GalleryPhoto = {
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

type Props = {
  onNavigate: (page: AdminPage) => void
  query?: string
}

type FilterTab =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected'

type UploadPreview = {
  file: File
  url: string
}

type ApiResponse = {
  success?: boolean
  error?: string
  message?: string
  photos?: GalleryPhoto[]
}

/* ==========================================
   CONSTANTS
========================================== */

const MAX_PHOTOS = 2
const MAX_CAPTION_LENGTH = 1000
const MAX_REQUEST_BYTES = 15 * 1024 * 1024

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

/* ==========================================
   HELPERS
========================================== */

function formatDate(iso: string | null) {
  if (!iso) return '—'

  const date = new Date(iso)

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

async function readApiResponse(
  response: Response
): Promise<ApiResponse> {
  const text = await response.text()

  try {
    return JSON.parse(text) as ApiResponse
  } catch {
    throw new Error(
      `Server returned an invalid response (${response.status}).`
    )
  }
}

/* ==========================================
   ZEN CAFÉ — MOMENTS GALLERY
========================================== */

export default function Gallery({
  onNavigate,
  query = '',
}: Props) {
  /* ==========================================
     EXISTING GALLERY STATE
  ========================================== */

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

  const [
    actionInProgress,
    setActionInProgress,
  ] = useState<string | null>(null)

  /* ==========================================
     NEW ADMIN UPLOAD STATE
  ========================================== */

  const [uploadOpen, setUploadOpen] =
    useState(false)

  const [uploadPreviews, setUploadPreviews] =
    useState<UploadPreview[]>([])

  const [uploadCaption, setUploadCaption] =
    useState('')

  const [uploading, setUploading] =
    useState(false)

  const [uploadError, setUploadError] =
    useState('')

  const fileInputRef =
    useRef<HTMLInputElement | null>(null)

  const previewsRef =
    useRef<UploadPreview[]>([])

  const uploadingRef =
    useRef(false)

  /* ==========================================
     LOAD PHOTOS FROM POSTGRESQL
  ========================================== */

  async function loadPhotos() {
    setLoading(true)
    setError('')

    try {
      const headers = getAdminAuthHeaders()

      const response = await fetch(
        '/api/gallery/admin/photos?status=all',
        {
          headers,
          cache: 'no-store',
        }
      )

      const data = await readApiResponse(response)

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            `Failed to load photos (${response.status}).`
        )
      }

      setPhotos(
        Array.isArray(data.photos)
          ? data.photos
          : []
      )
    } catch (err) {
      console.error(
        'Error fetching admin gallery photos:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load photos.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPhotos()
  }, [])

  /* ==========================================
     PREVIEW URL MANAGEMENT
  ========================================== */

  function updateUploadPreviews(
    next: UploadPreview[]
  ) {
    previewsRef.current = next
    setUploadPreviews(next)
  }

  useEffect(() => {
    return () => {
      previewsRef.current.forEach(preview => {
        URL.revokeObjectURL(preview.url)
      })
    }
  }, [])

  /* ==========================================
     ESCAPE KEY
  ========================================== */

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return

      if (uploadOpen && !uploadingRef.current) {
        setUploadOpen(false)
      } else {
        setPreviewPhoto(null)
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [uploadOpen])

  /* ==========================================
     STATISTICS
  ========================================== */

  const stats = useMemo(() => {
    return {
      total: photos.length,
      pending: photos.filter(
        photo => photo.status === 'pending'
      ).length,
      approved: photos.filter(
        photo => photo.status === 'approved'
      ).length,
      rejected: photos.filter(
        photo => photo.status === 'rejected'
      ).length,
    }
  }, [photos])

  /* ==========================================
     FILTER AND SEARCH
  ========================================== */

  const effectiveSearch = (
    query || searchTerm
  ).trim().toLowerCase()

  const filteredPhotos = useMemo(() => {
    return photos.filter(photo => {
      if (
        activeTab !== 'all' &&
        photo.status !== activeTab
      ) {
        return false
      }

      if (!effectiveSearch) return true

      const searchable = [
        photo.customerName,
        photo.customerEmail,
        photo.description,
        photo.title,
        photo.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(effectiveSearch)
    })
  }, [
    photos,
    activeTab,
    effectiveSearch,
  ])

  /* ==========================================
     SELECT PHOTOS
  ========================================== */

  function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selected = Array.from(
      event.target.files || []
    )

    event.target.value = ''

    if (!selected.length) return

    setUploadError('')

    const current = previewsRef.current

    if (
      current.length + selected.length >
      MAX_PHOTOS
    ) {
      setUploadError(
        `You can upload a maximum of ${MAX_PHOTOS} photos at once.`
      )
      return
    }

    for (const file of selected) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError(
          'Only JPG, PNG and WebP images are supported.'
        )
        return
      }

      if (file.size === 0) {
        setUploadError(
          'One of the selected images is empty.'
        )
        return
      }
    }

    const totalBytes = [
      ...current.map(item => item.file),
      ...selected,
    ].reduce(
      (total, file) => total + file.size,
      0
    )

    if (totalBytes > MAX_REQUEST_BYTES) {
      setUploadError(
        'The selected photos exceed the 15 MB request limit.'
      )
      return
    }

    const next = [
      ...current,
      ...selected.map(file => ({
        file,
        url: URL.createObjectURL(file),
      })),
    ]

    updateUploadPreviews(next)
  }

  /* ==========================================
     REMOVE SELECTED PHOTO
  ========================================== */

  function removeUploadPhoto(index: number) {
    const current = previewsRef.current

    const removed = current[index]

    if (!removed) return

    URL.revokeObjectURL(removed.url)

    updateUploadPreviews(
      current.filter((_, i) => i !== index)
    )
  }

  /* ==========================================
     RESET UPLOAD
  ========================================== */

  function resetUpload() {
    previewsRef.current.forEach(item => {
      URL.revokeObjectURL(item.url)
    })

    updateUploadPreviews([])
    setUploadCaption('')
    setUploadError('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /* ==========================================
     UPLOAD ADMIN PHOTOS
  ========================================== */

  async function handleAdminUpload() {
    if (uploadingRef.current) return

    if (!uploadPreviews.length) {
      setUploadError(
        'Please select at least one photo.'
      )
      return
    }

    if (
      uploadCaption.length >
      MAX_CAPTION_LENGTH
    ) {
      setUploadError(
        'Caption must not exceed 1000 characters.'
      )
      return
    }

    const confirmed = await AdminAlert.confirm(
      'Publish Zen Moments',
      `Upload and publish ${uploadPreviews.length} photo(s) to the public Zen Café Gallery?`,
      'Yes, Publish'
    )

    if (!confirmed) return

    uploadingRef.current = true
    setUploading(true)
    setUploadError('')

    try {
      const formData = new FormData()

      formData.append(
        'caption',
        uploadCaption.trim()
      )

      uploadPreviews.forEach(item => {
        formData.append(
          'photos',
          item.file,
          item.file.name
        )
      })

      const authHeaders =
        getAdminAuthHeaders()

      const headers = new Headers(authHeaders)

      // Browser must generate the multipart boundary.
      headers.delete('Content-Type')

      const response = await fetch(
        '/api/gallery/admin/upload',
        {
          method: 'POST',
          headers,
          body: formData,
        }
      )

      const data =
        await readApiResponse(response)

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            `Upload failed (${response.status}).`
        )
      }

      resetUpload()
      setUploadOpen(false)
      setActiveTab('approved')

      await loadPhotos()

      await AdminAlert.success(
        'Photos Published',
        'Your Zen Café moments have been uploaded successfully.'
      )
    } catch (err) {
      console.error(
        'Admin gallery upload failed:',
        err
      )

      const message =
        err instanceof Error
          ? err.message
          : 'Unable to upload photos.'

      setUploadError(message)

      await AdminAlert.error(
        'Upload Failed',
        message
      )
    } finally {
      uploadingRef.current = false
      setUploading(false)
    }
  }

  /* ==========================================
     APPROVE PHOTO
  ========================================== */

  async function handleApprove(
    photo: GalleryPhoto
  ) {
    if (actionInProgress) return

    const confirmed =
      await AdminAlert.confirm(
        'Approve Photo',
        `Publish this photo by ${photo.customerName || 'customer'} to the public Community Gallery?`,
        'Yes, Approve'
      )

    if (!confirmed) return

    setActionInProgress(photo.id)

    try {
      const response = await fetch(
        `/api/gallery/admin/photos/${photo.id}/approve`,
        {
          method: 'POST',
          headers: getAdminAuthHeaders(),
        }
      )

      const data =
        await readApiResponse(response)

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            'Failed to approve photo.'
        )
      }

      setPhotos(previous =>
        previous.map(item =>
          item.id === photo.id
            ? {
                ...item,
                status: 'approved',
              }
            : item
        )
      )

      setPreviewPhoto(previous =>
        previous?.id === photo.id
          ? {
              ...previous,
              status: 'approved',
            }
          : previous
      )

      await AdminAlert.success(
        'Photo Approved',
        'Photo is now live in the public community gallery.'
      )
    } catch (err) {
      await AdminAlert.error(
        'Approval Failed',
        err instanceof Error
          ? err.message
          : 'Unable to approve photo.'
      )
    } finally {
      setActionInProgress(null)
    }
  }

  /* ==========================================
     REJECT PHOTO
  ========================================== */

  async function handleReject(
    photo: GalleryPhoto
  ) {
    if (actionInProgress) return

    const confirmed =
      await AdminAlert.confirm(
        'Reject Photo',
        'Reject this photo from public display? The photo will not appear in the public gallery.',
        'Yes, Reject'
      )

    if (!confirmed) return

    setActionInProgress(photo.id)

    try {
      const response = await fetch(
        `/api/gallery/admin/photos/${photo.id}/reject`,
        {
          method: 'POST',
          headers: getAdminAuthHeaders(),
        }
      )

      const data =
        await readApiResponse(response)

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            'Failed to reject photo.'
        )
      }

      setPhotos(previous =>
        previous.map(item =>
          item.id === photo.id
            ? {
                ...item,
                status: 'rejected',
              }
            : item
        )
      )

      setPreviewPhoto(previous =>
        previous?.id === photo.id
          ? {
              ...previous,
              status: 'rejected',
            }
          : previous
      )

      await AdminAlert.warning(
        'Photo Rejected',
        'Photo marked as rejected and hidden from public display.'
      )
    } catch (err) {
      await AdminAlert.error(
        'Rejection Failed',
        err instanceof Error
          ? err.message
          : 'Unable to reject photo.'
      )
    } finally {
      setActionInProgress(null)
    }
  }

  /* ==========================================
     DELETE PHOTO
  ========================================== */

  async function handleDelete(
    photo: GalleryPhoto
  ) {
    if (actionInProgress) return

    const confirmed =
      await AdminAlert.confirmDelete(
        `photo #${photo.id} by ${photo.customerName || 'customer'}`
      )

    if (!confirmed) return

    setActionInProgress(photo.id)

    try {
      const response = await fetch(
        `/api/gallery/admin/photos/${photo.id}`,
        {
          method: 'DELETE',
          headers: getAdminAuthHeaders(),
        }
      )

      const data =
        await readApiResponse(response)

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            'Failed to delete photo.'
        )
      }

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
        'Photo record and storage file have been permanently removed.'
      )
    } catch (err) {
      await AdminAlert.error(
        'Deletion Failed',
        err instanceof Error
          ? err.message
          : 'Unable to delete photo.'
      )
    } finally {
      setActionInProgress(null)
    }
  }

  /* ==========================================
     RENDER
  ========================================== */

  return (
    <div className="za-bookings-page">
      {/* BREADCRUMB */}

      <div className="za-products-breadcrumb">
        <button
          type="button"
          onClick={() =>
            onNavigate('dashboard')
          }
        >
          Dashboard
        </button>

        <span>/</span>

        <strong>Moments Gallery</strong>
      </div>

      {/* PAGE HEADER */}

      <div className="za-products-page-head">
        <div>
          <p className="za-kicker">
            ZEN CAFÉ MOMENTS
          </p>

          <h1>Moments Gallery</h1>

          <p>
            Upload café moments, manage guest
            photos, and control what appears
            on your public gallery.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="za-row-action !h-10 !w-auto !px-4 !rounded-full !border !border-[#513226]/15 bg-white font-bold"
            onClick={() => {
              void loadPhotos()
            }}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />

            <span className="ml-1.5 text-xs">
              Refresh
            </span>
          </button>

          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#8B3F2F] px-5 text-xs font-bold text-white transition hover:bg-[#713124]"
            onClick={() =>
              setUploadOpen(true)
            }
          >
            <ImagePlus size={17} />

            Upload Photos
          </button>
        </div>
      </div>

      {/* STATISTICS */}

      <div className="za-product-summary">
        <div className="za-product-summary-card">
          <span>Total Photos</span>
          <strong>{stats.total}</strong>
          <small>
            All gallery photos
          </small>
        </div>

        <div className="za-product-summary-card">
          <span>Pending Review</span>

          <strong
            style={{
              color: '#d97706',
            }}
          >
            {stats.pending}
          </strong>

          <small>
            Awaiting admin decision
          </small>
        </div>

        <div className="za-product-summary-card">
          <span>Approved (Public)</span>

          <strong
            style={{
              color: '#16a34a',
            }}
          >
            {stats.approved}
          </strong>

          <small>
            Published photos
          </small>
        </div>

        <div className="za-product-summary-card">
          <span>Rejected</span>

          <strong
            style={{
              color: '#dc2626',
            }}
          >
            {stats.rejected}
          </strong>

          <small>
            Hidden from public view
          </small>
        </div>
      </div>

      {/* ERROR BANNER */}

      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} />

            <span>{error}</span>
          </div>

          <button
            type="button"
            className="text-xs font-semibold underline"
            onClick={() => {
              void loadPhotos()
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* FILTER TABS */}

      <div className="za-filter-bar mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`za-filter-btn ${
              activeTab === 'pending'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveTab('pending')
            }
          >
            <Clock3
              size={14}
              className="mr-1"
            />

            Pending ({stats.pending})
          </button>

          <button
            type="button"
            className={`za-filter-btn ${
              activeTab === 'approved'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveTab('approved')
            }
          >
            <ShieldCheck
              size={14}
              className="mr-1"
            />

            Approved ({stats.approved})
          </button>

          <button
            type="button"
            className={`za-filter-btn ${
              activeTab === 'rejected'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveTab('rejected')
            }
          >
            <XCircle
              size={14}
              className="mr-1"
            />

            Rejected ({stats.rejected})
          </button>

          <button
            type="button"
            className={`za-filter-btn ${
              activeTab === 'all'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveTab('all')
            }
          >
            All Photos ({stats.total})
          </button>
        </div>

        {/* SEARCH */}

        <div className="relative min-w-[260px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />

          <input
            type="text"
            className="field-input !w-full !py-2 !pl-9 !text-xs"
            placeholder="Search photos, guests, captions..."
            value={searchTerm}
            onChange={event =>
              setSearchTerm(
                event.target.value
              )
            }
          />

          {searchTerm && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
              onClick={() =>
                setSearchTerm('')
              }
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* PHOTO GRID */}

      {loading ? (
        <div className="rounded-3xl border border-[#513226]/10 bg-white/70 p-12 text-center text-stone-500">
          <RefreshCw
            size={24}
            className="mx-auto mb-3 animate-spin"
          />

          <p className="text-sm">
            Loading gallery photos...
          </p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="rounded-3xl border border-[#513226]/10 bg-white/70 p-12 text-center text-stone-500">
          <ImageIcon
            size={36}
            className="mx-auto mb-3 text-stone-300"
          />

          <p className="font-serif text-lg text-stone-700">
            No photos found
          </p>

          <p className="mt-1 text-xs text-stone-400">
            {activeTab === 'pending'
              ? 'There are no pending photos awaiting moderation.'
              : 'No photos match your current filter.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPhotos.map(photo => {
            const isPending =
              photo.status === 'pending'

            const isApproved =
              photo.status === 'approved'

            const isRejected =
              photo.status === 'rejected'

            const isBusy =
              actionInProgress !== null

            const isAdminPhoto =
              photo.customerEmail === '—' &&
              (
                photo.title === 'Zen Café' ||
                photo.customerName === 'Zen Guest'
              )

            return (
              <div
                key={photo.id}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#513226]/10 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* PHOTO */}

                <button
                  type="button"
                  className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 text-left"
                  onClick={() =>
                    setPreviewPhoto(photo)
                  }
                  aria-label={`Preview photo ${photo.id}`}
                >
                  <img
                    src={
                      photo.imageUrl ||
                      photo.image_url
                    }
                    alt={
                      photo.description ||
                      'Zen Café gallery photo'
                    }
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* STATUS */}

                  <div className="absolute left-3 top-3">
                    {isPending && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white">
                        <Clock3 size={12} />
                        Pending
                      </span>
                    )}

                    {isApproved && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                        <Check size={12} />
                        Published
                      </span>
                    )}

                    {isRejected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white">
                        <X size={12} />
                        Rejected
                      </span>
                    )}
                  </div>

                  {/* PREVIEW OVERLAY */}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-stone-800">
                      <Eye size={14} />
                      Preview
                    </span>
                  </div>
                </button>

                {/* DETAILS */}

                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1 truncate font-bold text-stone-800">
                        <User
                          size={13}
                          className="text-stone-400"
                        />

                        {isAdminPhoto
                          ? 'Zen Café'
                          : photo.customerName ||
                            'Zen Guest'}
                      </span>

                      <span className="text-[10px] text-stone-400">
                        #{photo.id}
                      </span>
                    </div>

                    {!isAdminPhoto && (
                      <div className="mt-1 flex items-center gap-1 truncate text-[11px] text-stone-500">
                        <Mail size={11} />

                        <span className="truncate">
                          {photo.customerEmail || '—'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CAPTION */}

                  <p className="mb-3 line-clamp-2 flex-1 rounded-xl border border-stone-100 bg-stone-50 p-2 text-xs italic text-stone-600">
                    {photo.description ||
                      photo.title ||
                      'No caption provided.'}
                  </p>

                  {/* DATE */}

                  <div className="mb-3 flex items-center gap-1 text-[10px] text-stone-400">
                    <Clock3 size={11} />

                    Uploaded:{' '}
                    {formatDate(photo.createdAt)}
                  </div>

                  {/* ACTIONS */}

                  <div className="flex items-center gap-1.5 border-t border-stone-100 pt-3">
                    {!isApproved && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void handleApprove(photo)
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-2 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Check size={14} />

                        Approve
                      </button>
                    )}

                    {!isRejected && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void handleReject(photo)
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-amber-600 px-2 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                      >
                        <X size={14} />

                        Reject
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        void handleDelete(photo)
                      }}
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                      title="Permanently delete photo"
                      aria-label={`Delete photo ${photo.id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ======================================
          ADMIN UPLOAD MODAL
      ====================================== */}

      {uploadOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!uploading) {
              setUploadOpen(false)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Upload Zen Café photos"
            className="my-auto flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={event =>
              event.stopPropagation()
            }
          >
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A65C44]">
                  ZEN CAFÉ MOMENTS
                </p>

                <h2 className="font-serif text-2xl font-bold text-[#513226]">
                  Upload Photos
                </h2>

                <p className="mt-1 text-xs text-stone-500">
                  Share beautiful café moments
                  with your guests.
                </p>
              </div>

              <button
                type="button"
                disabled={uploading}
                onClick={() =>
                  setUploadOpen(false)
                }
                className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 disabled:opacity-50"
                aria-label="Close upload"
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="overflow-y-auto p-6">
              {/* FILE INPUT */}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleFileSelection}
                disabled={uploading}
              />

              {/* UPLOAD AREA */}

              <button
                type="button"
                disabled={
                  uploading ||
                  uploadPreviews.length >=
                    MAX_PHOTOS
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D9B5A5] bg-[#FFF9F5] px-5 py-9 text-center transition hover:border-[#A65C44] hover:bg-[#FFF3ED] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F2DDD2] text-[#8B3F2F]">
                  <UploadCloud size={27} />
                </div>

                <strong className="text-sm text-[#513226]">
                  Choose Your Photos
                </strong>

                <span className="mt-2 text-xs text-stone-500">
                  JPG, PNG or WebP
                </span>

                <span className="mt-1 text-[11px] text-stone-400">
                  Maximum 2 photos per upload
                </span>
              </button>

              {/* SELECTED PHOTOS */}

              {uploadPreviews.length > 0 && (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-stone-700">
                      Selected Photos
                    </h3>

                    <span className="text-xs text-stone-400">
                      {uploadPreviews.length}/{MAX_PHOTOS}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {uploadPreviews.map(
                      (item, index) => (
                        <div
                          key={item.url}
                          className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"
                        >
                          <img
                            src={item.url}
                            alt={`Selected photo ${index + 1}`}
                            className="aspect-[4/3] w-full object-cover"
                          />

                          <div className="p-2">
                            <p className="truncate text-[11px] font-semibold text-stone-700">
                              {item.file.name}
                            </p>

                            <p className="text-[10px] text-stone-400">
                              {formatBytes(
                                item.file.size
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={uploading}
                            onClick={() =>
                              removeUploadPhoto(index)
                            }
                            className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-red-600 shadow"
                            aria-label="Remove selected photo"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* CAPTION */}

              <div className="mt-6">
                <label
                  htmlFor="zen-gallery-caption"
                  className="mb-2 block text-xs font-bold text-stone-700"
                >
                  Photo Caption
                  <span className="ml-1 font-normal text-stone-400">
                    (Optional)
                  </span>
                </label>

                <textarea
                  id="zen-gallery-caption"
                  rows={3}
                  maxLength={MAX_CAPTION_LENGTH}
                  disabled={uploading}
                  value={uploadCaption}
                  onChange={event =>
                    setUploadCaption(
                      event.target.value
                    )
                  }
                  placeholder="A beautiful moment at Zen Café..."
                  className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 outline-none transition focus:border-[#A65C44]"
                />

                <p className="mt-1 text-right text-[10px] text-stone-400">
                  {uploadCaption.length}/{MAX_CAPTION_LENGTH}
                </p>
              </div>

              {/* UPLOAD ERROR */}

              {uploadError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <ShieldAlert
                    size={16}
                    className="shrink-0"
                  />

                  <span>{uploadError}</span>
                </div>
              )}

              {/* PUBLICATION INFO */}

              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
                <ShieldCheck
                  size={19}
                  className="shrink-0 text-emerald-600"
                />

                <div>
                  <p className="text-xs font-bold text-emerald-800">
                    Direct Publishing
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">
                    Admin uploads are published
                    directly to the public Zen Café
                    Gallery without customer
                    verification or cooldown.
                  </p>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-100 bg-stone-50 px-6 py-4">
              <button
                type="button"
                disabled={uploading}
                onClick={() =>
                  setUploadOpen(false)
                }
                className="rounded-xl border border-stone-200 bg-white px-5 py-3 text-xs font-bold text-stone-600 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  uploading ||
                  uploadPreviews.length === 0
                }
                onClick={() => {
                  void handleAdminUpload()
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#8B3F2F] px-6 py-3 text-xs font-bold text-white transition hover:bg-[#713124] disabled:cursor-not-allowed disabled:opacity-50"
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
                  ? 'Uploading...'
                  : 'Publish Photos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          FULL PHOTO PREVIEW MODAL
      ====================================== */}

      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() =>
            setPreviewPhoto(null)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Photo ${previewPhoto.id} preview`}
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={event =>
              event.stopPropagation()
            }
          >
            {/* PREVIEW HEADER */}

            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-800">
                  Photo #{previewPhoto.id}
                </h3>

                <p className="text-xs text-stone-500">
                  Uploaded by{' '}
                  {previewPhoto.customerName ||
                    'Zen Café'}{' '}
                  on{' '}
                  {formatDate(
                    previewPhoto.createdAt
                  )}
                </p>
              </div>

              <button
                type="button"
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100"
                onClick={() =>
                  setPreviewPhoto(null)
                }
                aria-label="Close photo preview"
              >
                <X size={20} />
              </button>
            </div>

            {/* FULL IMAGE */}

            <div className="flex min-h-[300px] max-h-[60vh] flex-1 items-center justify-center overflow-auto bg-stone-900 p-2">
              <img
                src={
                  previewPhoto.imageUrl ||
                  previewPhoto.image_url
                }
                alt={
                  previewPhoto.description ||
                  'Gallery photo preview'
                }
                className="max-h-[58vh] max-w-full rounded-lg object-contain"
              />
            </div>

            {/* PREVIEW FOOTER */}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 bg-stone-50 p-6">
              <div className="min-w-[180px] flex-1">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Caption
                </p>

                <p className="text-sm italic text-stone-800">
                  {previewPhoto.description ||
                    previewPhoto.title ||
                    'No caption provided.'}
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  Email:{' '}
                  {previewPhoto.customerEmail ||
                    '—'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {previewPhoto.status !==
                  'approved' && (
                  <button
                    type="button"
                    disabled={
                      actionInProgress !== null
                    }
                    onClick={() => {
                      void handleApprove(
                        previewPhoto
                      )
                    }}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    <Check size={16} />

                    Approve Photo
                  </button>
                )}

                {previewPhoto.status !==
                  'rejected' && (
                  <button
                    type="button"
                    disabled={
                      actionInProgress !== null
                    }
                    onClick={() => {
                      void handleReject(
                        previewPhoto
                      )
                    }}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    <X size={16} />

                    Reject Photo
                  </button>
                )}

                <button
                  type="button"
                  disabled={
                    actionInProgress !== null
                  }
                  onClick={() => {
                    void handleDelete(
                      previewPhoto
                    )
                  }}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={16} />

                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
