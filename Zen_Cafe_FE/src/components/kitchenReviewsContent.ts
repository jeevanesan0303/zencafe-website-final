/** Set these to the actual Zen Café store URLs, not platform homepages.
 * Until configured, each clearly labelled button opens a WhatsApp link enquiry.
 */
export const deliveryLinks = {
  uber: '',
  pickme: '',
}

export type CustomerReview = {
  name: string
  text: string
  rating: number
  label?: string
  avatar?: string
}

/** Add only real reviews you have permission to display.
 * Empty by default: visitors see a friendly invitation to share feedback.
 * With 2+ entries, arrows and pagination dots appear automatically.
 * Example shape (replace with a genuine review, then uncomment):
 * { name: 'Customer name', text: 'Actual review text', rating: 5,
 *   label: 'Guest', avatar: '/assets/reviews/customer.jpg' },
 */
export const customerReviews: CustomerReview[] = []
