import { deletePhoto } from './files'
import { must, supabase } from './supabase'
import type { Post } from './types'

export const POST_SELECT =
  'id, author_id, body, image_path, created_at, author:profiles(name, unit:units(number)), post_likes(count), post_comments(count)'

export async function likedPostIds(userId: string): Promise<Set<string>> {
  const rows = must(await supabase.from('post_likes').select('post_id').eq('user_id', userId))
  return new Set(rows.map((r) => r.post_id as string))
}

export async function setLiked(postId: string, liked: boolean) {
  if (liked) must(await supabase.from('post_likes').insert({ post_id: postId }))
  else must(await supabase.from('post_likes').delete().eq('post_id', postId))
}

export async function deletePost(post: Post): Promise<boolean> {
  if (!confirm('Delete this post?')) return false
  must(await supabase.from('posts').delete().eq('id', post.id))
  await deletePhoto(post.image_path)
  return true
}

export async function reportPost(postId: string) {
  const reason = prompt('Why are you reporting this post? (optional)')
  if (reason === null) return
  const { error } = await supabase.from('post_reports').insert({ post_id: postId, reason: reason.trim() || null })
  if (error && error.code !== '23505') alert(error.message)
  else alert('Thanks. The committee will review this post.')
}
