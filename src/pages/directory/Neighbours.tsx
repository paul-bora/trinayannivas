import { useState } from 'react'
import ContactRow from '../../components/ContactRow'
import { Empty, Loaded, PageHeader } from '../../components/ui'
import { must, supabase } from '../../lib/supabase'
import { useLoad } from '../../lib/useLoad'

interface Neighbour {
  id: string
  name: string
  phone: string | null
  unit_number: string | null
  block: string | null
}

export default function Neighbours() {
  const [query, setQuery] = useState('')
  const state = useLoad(async () =>
    must<Neighbour[]>(await supabase.from('neighbours').select('*').order('unit_number', { nullsFirst: false })),
  )

  const q = query.trim().toLowerCase()
  const matches = (n: Neighbour) => !q || n.name.toLowerCase().includes(q) || (n.unit_number ?? '').toLowerCase().includes(q)

  return (
    <>
      <PageHeader title="Neighbours" back />
      <input
        className="search"
        type="search"
        placeholder="Search by name or flat"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Loaded state={state}>
        {(list) => {
          const shown = list.filter(matches)
          return shown.length === 0 ? (
            <Empty>No one found.</Empty>
          ) : (
            <div className="card list">
              {shown.map((n) => (
                <ContactRow
                  key={n.id}
                  title={n.name}
                  subtitle={[n.unit_number, n.block && `Block ${n.block}`].filter(Boolean).join(' · ')}
                  phone={n.phone}
                />
              ))}
            </div>
          )
        }}
      </Loaded>
    </>
  )
}
