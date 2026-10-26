import { useState, type FormEvent } from 'react'
import ContactRow from '../../components/ContactRow'
import { Empty, Fab, Field, Loaded, PageHeader, Sheet } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { deletePhoto, photoUrl, uploadPhoto } from '../../lib/files'
import { money, timeAgo } from '../../lib/format'
import { must, supabase } from '../../lib/supabase'
import type { Listing } from '../../lib/types'
import { errorMessage, useLoad } from '../../lib/useLoad'

type Filter = 'all' | 'sell' | 'buy' | 'mine'

export default function BuySell() {
  const { profile, isAdmin } = useAuth()
  const [filter, setFilter] = useState<Filter>('all')
  const [adding, setAdding] = useState(false)
  const state = useLoad(async () =>
    must<Listing[]>(
      await supabase
        .from('listings')
        .select('*, seller:profiles!listings_seller_id_fkey(name, unit:units!profiles_unit_id_fkey(number))')
        .order('created_at', { ascending: false }),
    ),
  )

  async function close(l: Listing) {
    must(await supabase.from('listings').update({ status: 'closed' }).eq('id', l.id))
    state.reload()
  }

  async function remove(l: Listing) {
    if (!confirm(`Delete "${l.title}"?`)) return
    must(await supabase.from('listings').delete().eq('id', l.id))
    await deletePhoto(l.image_path)
    state.reload()
  }

  const visible = (list: Listing[]) =>
    list.filter((l) =>
      filter === 'mine' ? l.seller_id === profile?.id : l.status === 'available' && (filter === 'all' || l.kind === filter),
    )

  return (
    <>
      <PageHeader title="Buy / Sell" back />
      <div className="tabs-inline">
        {(['all', 'sell', 'buy', 'mine'] as Filter[]).map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {{ all: 'All', sell: 'For sale', buy: 'Wanted', mine: 'My listings' }[f]}
          </button>
        ))}
      </div>
      <Loaded state={state}>
        {(list) =>
          visible(list).length === 0 ? (
            <Empty>Nothing here yet. Tap + to post an item.</Empty>
          ) : (
            visible(list).map((l) => {
              const mine = l.seller_id === profile?.id
              return (
                <article key={l.id} className={`card listing ${l.status === 'closed' ? 'faded' : ''}`}>
                  {l.image_path && <img className="post-img" src={photoUrl(l.image_path)} alt="" loading="lazy" />}
                  <div className="row between">
                    <strong>{l.title}</strong>
                    <span className={`badge ${l.kind === 'buy' ? 'blue' : ''}`}>{l.kind === 'buy' ? 'Wanted' : 'For sale'}</span>
                  </div>
                  {l.price != null && <div className="price">{money(l.price)}</div>}
                  {l.description && <p className="pre">{l.description}</p>}
                  <ContactRow
                    title={l.seller?.name ?? 'Resident'}
                    subtitle={`${l.seller?.unit?.number ?? ''} · ${timeAgo(l.created_at)}`}
                    phone={mine ? null : l.contact_phone}
                  />
                  {(mine || isAdmin) && (
                    <div className="row gap">
                      {l.status === 'available' && (
                        <button className="btn small ghost" onClick={() => close(l)}>
                          Mark sold / found
                        </button>
                      )}
                      <button className="btn small ghost danger" onClick={() => remove(l)}>
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              )
            })
          )
        }
      </Loaded>
      <Fab label="Post an item" onClick={() => setAdding(true)} />
      {adding && (
        <ListingForm
          defaultPhone={profile?.phone ?? ''}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            state.reload()
          }}
        />
      )}
    </>
  )
}

function ListingForm({ defaultPhone, onClose, onSaved }: { defaultPhone: string; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<'sell' | 'buy'>('sell')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState(defaultPhone)
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const image_path = photo ? await uploadPhoto(photo) : null
      must(
        await supabase.from('listings').insert({
          kind,
          title: title.trim(),
          price: price ? Number(price) : null,
          description: description.trim() || null,
          contact_phone: phone.trim() || null,
          image_path,
        }),
      )
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Sheet title="Post an item" onClose={onClose}>
      <form onSubmit={save} className="stack">
        <div className="tabs-inline">
          <button type="button" className={kind === 'sell' ? 'active' : ''} onClick={() => setKind('sell')}>
            I'm selling
          </button>
          <button type="button" className={kind === 'buy' ? 'active' : ''} onClick={() => setKind('buy')}>
            I'm looking for
          </button>
        </div>
        <Field label="What is it?">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Study table" />
        </Field>
        <Field label="Price (₹, optional)">
          <input type="number" min="0" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Details">
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Contact number">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Photo (optional)">
          <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </Field>
        <button className="btn" disabled={busy}>
          {busy ? 'Posting…' : 'Post'}
        </button>
      </form>
    </Sheet>
  )
}
