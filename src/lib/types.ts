export type Role = 'resident' | 'admin'

export interface Unit {
  id: string
  number: string
  block: string | null
  area_sqft: number | null
  owner_name: string | null
  occupancy: 'owner' | 'tenant' | 'vacant'
  two_wheelers: number
  four_wheelers: number
  vehicle_numbers: string
}

export interface Profile {
  id: string
  email: string
  name: string
  phone: string | null
  hide_phone: boolean
  role: Role
  unit_id: string | null
  unit: Unit | null
}

export interface Author {
  name: string
  unit: { number: string } | null
}

export interface Announcement {
  id: string
  title: string
  body: string
  pinned: boolean
  created_at: string
}

export interface Post {
  id: string
  author_id: string
  body: string
  image_path: string | null
  created_at: string
  author: Author | null
  post_likes: { count: number }[]
  post_comments: { count: number }[]
}

export interface Comment {
  id: string
  author_id: string
  body: string
  created_at: string
  author: Author | null
}

export interface Listing {
  id: string
  seller_id: string
  kind: 'sell' | 'buy'
  title: string
  description: string | null
  price: number | null
  contact_phone: string | null
  image_path: string | null
  status: 'available' | 'closed'
  created_at: string
  seller: Author | null
}

export type DirectoryType = 'emergency' | 'vendor' | 'committee'

export interface DirectoryEntry {
  id: string
  type: DirectoryType
  name: string
  role: string | null
  phone: string | null
  sort: number
}

export interface DocumentFile {
  id: string
  title: string
  file_path: string
  created_at: string
}

export interface Due {
  id: string
  unit_id: string
  month: string
  amount: number
  status: 'due' | 'paid'
  paid_on: string | null
  mode: string | null
  reference: string | null
  reported_reference: string | null
  reported_at: string | null
}

export interface Expense {
  id: string
  spent_on: string
  category: string
  amount: number
  note: string | null
  receipt_path: string | null
}

export interface Settings {
  society_name: string
  upi_id: string | null
  upi_name: string | null
  upi_qr_path: string | null
  whatsapp_link: string | null
  rules_text: string | null
  monthly_maintenance: number
  opening_balance: number
}
