import { useState, type FormEvent } from 'react'
import PostCard from '../../components/PostCard'
import { Empty, Fab, Field, Loaded, PageHeader, Sheet } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { uploadPhoto } from '../../lib/files'
import { POST_SELECT, deletePost, likedPostIds, reportPost, setLiked } from '../../lib/posts'
import { must, supabase } from '../../lib/supabase'
import type { Post } from '../../lib/types'
import { errorMessage, useLoad } from '../../lib/useLoad'

export default function Community() {
  const { profile, isAdmin } = useAuth()
  const [writing, setWriting] = useState(false)
  const [liked, setLikedIds] = useState<Set<string>>(new Set())
  const state = useLoad(async () => {
    const [posts, likedIds] = await Promise.all([
      supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(100).then(must),
      likedPostIds(profile!.id),
    ])
    setLikedIds(likedIds)
    return posts as unknown as Post[]
  })

  async function toggleLike(post: Post) {
    const isLiked = liked.has(post.id)
    try {
      await setLiked(post.id, !isLiked)
      state.reload()
    } catch (e) {
      alert(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader title="Community" />
      <Loaded state={state}>
        {(posts) =>
          posts.length === 0 ? (
            <Empty>No posts yet. Be the first to say hello!</Empty>
          ) : (
            posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                liked={liked.has(p.id)}
                canDelete={p.author_id === profile?.id || isAdmin}
                onLike={() => toggleLike(p)}
                onDelete={async () => (await deletePost(p)) && state.reload()}
                onReport={() => reportPost(p.id)}
              />
            ))
          )
        }
      </Loaded>
      <Fab label="New post" onClick={() => setWriting(true)} />
      {writing && (
        <NewPost
          onClose={() => setWriting(false)}
          onSaved={() => {
            setWriting(false)
            state.reload()
          }}
        />
      )}
    </>
  )
}

function NewPost({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [body, setBody] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const image_path = photo ? await uploadPhoto(photo) : null
      must(await supabase.from('posts').insert({ body: body.trim(), image_path }))
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Sheet title="New post" onClose={onClose}>
      <form onSubmit={save} className="stack">
        <textarea
          required
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share something with your neighbours…"
        />
        <Field label="Photo (optional)">
          <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </Field>
        <button className="btn" disabled={busy}>
          {busy ? 'Posting…' : 'Post'}
        </button>
        <p className="muted small">Be kind. Posts that break society rules can be removed by the committee.</p>
      </form>
    </Sheet>
  )
}
