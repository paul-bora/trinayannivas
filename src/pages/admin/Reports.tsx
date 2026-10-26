import { Empty, Loaded, PageHeader } from '../../components/ui'
import { deletePhoto } from '../../lib/files'
import { timeAgo } from '../../lib/format'
import { must, supabase } from '../../lib/supabase'
import { errorMessage, useLoad } from '../../lib/useLoad'

interface Report {
  id: string
  reason: string | null
  created_at: string
  reporter: { name: string } | null
  post: { id: string; body: string; image_path: string | null; author: { name: string } | null } | null
}

export default function Reports() {
  const state = useLoad(async () =>
    must(
      await supabase
        .from('post_reports')
        .select('id, reason, created_at, reporter:profiles(name), post:posts(id, body, image_path, author:profiles(name))')
        .order('created_at', { ascending: false }),
    ) as unknown as Report[],
  )

  async function act(action: () => PromiseLike<{ error: { message: string } | null }>) {
    try {
      must({ data: null, ...(await action()) })
      state.reload()
    } catch (e) {
      alert(errorMessage(e))
    }
  }

  async function removePost(r: Report) {
    if (!r.post || !confirm('Delete this post for everyone?')) return
    await act(() => supabase.from('posts').delete().eq('id', r.post!.id))
    await deletePhoto(r.post.image_path)
  }

  return (
    <>
      <PageHeader title="Reported posts" back />
      <Loaded state={state}>
        {(reports) =>
          reports.length === 0 ? (
            <Empty>No reports. All quiet!</Empty>
          ) : (
            reports.map((r) => (
              <article key={r.id} className="card stack">
                <small className="muted">
                  Reported by {r.reporter?.name ?? 'a resident'} · {timeAgo(r.created_at)}
                  {r.reason ? ` · "${r.reason}"` : ''}
                </small>
                <blockquote className="pre">
                  <b>{r.post?.author?.name}:</b> {r.post?.body}
                </blockquote>
                <div className="row gap">
                  <button className="btn small danger" onClick={() => removePost(r)}>
                    Delete post
                  </button>
                  <button className="btn small ghost" onClick={() => act(() => supabase.from('post_reports').delete().eq('id', r.id))}>
                    Keep post (dismiss)
                  </button>
                </div>
              </article>
            ))
          )
        }
      </Loaded>
    </>
  )
}
