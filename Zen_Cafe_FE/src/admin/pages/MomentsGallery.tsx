
import { Images, UploadCloud } from 'lucide-react'

export default function MomentsGallery() {
  return (
    <div className="admin-moments-gallery">
      <div className="admin-moments-heading">
        <p>ZEN CAFÉ / MANAGEMENT</p>
        <h1>Moments Gallery</h1>
        <p>
          Upload and manage photos displayed
          in the Zen Café website gallery.
        </p>
      </div>

      <section className="admin-moments-upload">
        <UploadCloud size={36} />

        <h2>Upload New Moments</h2>

        <p>
          Share beautiful Zen Café moments
          with your website visitors.
        </p>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
        />

        <p>
          Photo publishing will be connected
          to the gallery backend.
        </p>
      </section>

      <section className="admin-moments-list">
        <Images size={28} />
        <h2>Published Moments</h2>
        <p>
          Your uploaded gallery photos will
          appear here after backend integration.
        </p>
      </section>
    </div>
  )
}
