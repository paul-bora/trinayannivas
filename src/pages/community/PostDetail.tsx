import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import PostCard from '../../components/PostCard'
import { Loaded, PageHeader } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { timeAgo } from '../../lib/format'
import { POST_SELECT, deletePost, likedPostIds, reportPost, setLiked } from '../../lib/posts'
import { must, supabase } from '../../lib/supabase'
import type { Comment, Post } from '../../lib/types'
import { errorMessage, useLoad } from '../../lib/useLoad'

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, isAdmin } = useAuth()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const state = useLoad(async () => {
    const [post, comments, liked] = await Promise.all([
      supabase.from('posts').select(POST_SELECT).eq('id', id!).single().then(must),
      supabase
        .from('post_comments')
        .select('id, author_id, body, created_at, author:profiles(name, unit:units(number))')
        .eq('post_id', id!)
        .order('created_at')
        .then(must),
      likedPostIds(profile!.id),
    ])
    return { post: post as unknown as Post, comments: comments as unknown as Comment[], liked: liked.has(id!) }
  }, [id])

  async function addComment(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      must(await supabase.from('post_comments').insert({ post_id: id, body: text.trim() }))
      setText('')
      state.reload()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function removeComment(c: Comment) {
    if (!confirm('Delete this comment?')) return
    must(await supabase.from('post_comments').delete().eq('id', c.id))
    state.reload()
  }

  return (
    <>
      <PageHeader title="Post" back />
      <Loaded state={state}>
        {({ post, comments, liked }) => (
          <>
            <PostCard
              post={post}
              liked={liked}
              linkToDetail={false}
              canDelete={post.author_id === profile?.id || isAdmin}
              onLike={async () => {
                await setLiked(post.id, !liked)
                state.reload()
              }}
              onDelete={async () => (await deletePost(post)) && navigate('/community', { replace: true })}
              onReport={() => reportPost(post.id)}
            />
            <section className="card">
              <h2>Comments</h2>
              {comments.length === 0 && <p className="muted">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="comment">
                  <div className="list-main">
                    <small>
                      <b>{c.author?.name ?? 'Former resident'}</b>
                      {c.author?.unit?.number ? ` · ${c.author.unit.number}` : ''} · {timeAgo(c.created_at)}
                    </small>
                    <p className="pre">{c.body}</p>
                  </div>
                  {(c.author_id === profile?.id || isAdmin) && (
                    <button className="icon-btn" onClick={() => removeComment(c)} aria-label="Delete comment">
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>
              ))}
              <form onSubmit={addComment} className="row gap comment-form">
                <input required value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment…" />
                <button className="btn small" disabled={busy}>
                  Send
                </button>
              </form>
            </section>
          </>
        )}
      </Loaded>
    </>
  )
}
