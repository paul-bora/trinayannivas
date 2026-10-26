import { Link } from 'react-router-dom'
import { photoUrl } from '../lib/files'
import { timeAgo } from '../lib/format'
import type { Post } from '../lib/types'
import Icon from './Icon'

export default function PostCard({
  post,
  liked,
  canDelete,
  onLike,
  onDelete,
  onReport,
  linkToDetail = true,
}: {
  post: Post
  liked: boolean
  canDelete: boolean
  onLike: () => void
  onDelete: () => void
  onReport: () => void
  linkToDetail?: boolean
}) {
  const likes = post.post_likes[0]?.count ?? 0
  const comments = post.post_comments[0]?.count ?? 0
  return (
    <article className="card post">
      <div className="post-head">
        <div className="avatar">{(post.author?.name ?? '?').charAt(0).toUpperCase()}</div>
        <div className="list-main">
          <strong>{post.author?.name ?? 'Former resident'}</strong>
          <small>
            {post.author?.unit?.number ? `${post.author.unit.number} · ` : ''}
            {timeAgo(post.created_at)}
          </small>
        </div>
        {canDelete ? (
          <button className="icon-btn" onClick={onDelete} aria-label="Delete post">
            <Icon name="trash" size={18} />
          </button>
        ) : (
          <button className="icon-btn" onClick={onReport} aria-label="Report post">
            <Icon name="flag" size={18} />
          </button>
        )}
      </div>
      <p className="pre">{post.body}</p>
      {post.image_path && <img className="post-img" src={photoUrl(post.image_path)} alt="" loading="lazy" />}
      <div className="post-actions">
        <button className={`chip-btn ${liked ? 'liked' : ''}`} onClick={onLike}>
          <Icon name="heart" size={18} filled={liked} /> {likes}
        </button>
        {linkToDetail ? (
          <Link className="chip-btn" to={`/community/${post.id}`}>
            <Icon name="comment" size={18} /> {comments}
          </Link>
        ) : (
          <span className="chip-btn">
            <Icon name="comment" size={18} /> {comments}
          </span>
        )}
      </div>
    </article>
  )
}
