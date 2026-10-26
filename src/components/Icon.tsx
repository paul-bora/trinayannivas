// Small stroke icons (24×24), drawn inline so the app needs no icon font.
const paths = {
  home: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  community: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  directory: 'M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2zM18 8h2M18 12h2M18 16h2M8 9h6M8 13h6',
  unit: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  admin: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z M9 12l2 2 4-4',
  back: 'M15 18l-6-6 6-6',
  plus: 'M12 5v14M5 12h14',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  comment: 'M4 5h16v11H8l-4 4z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  whatsapp: 'M4 20l1.3-4A8 8 0 1 1 8 18.7zM9 9c0 3 3 6 6 6l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  chevron: 'M9 6l6 6-6 6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  flag: 'M5 21V4h11l-2 4 2 4H5',
  pin: 'M12 17v4M8 3h8l-1 6 3 3H6l3-3z',
  close: 'M6 6l12 12M18 6 6 18',
  rupee: 'M7 5h10M7 9h10M7 5c6 0 6 8 0 8l7 7',
} as const

export type IconName = keyof typeof paths

export default function Icon({ name, size = 22, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
