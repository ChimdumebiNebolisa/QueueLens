/** Devvit Reddit API uses fullname-shaped branded ids in typings. */

export type RedditPostId = `t3_${string}`;
export type RedditCommentId = `t1_${string}`;

export function asRedditPostId(id: string): RedditPostId {
  return id as RedditPostId;
}

export function asRedditCommentId(id: string): RedditCommentId {
  return id as RedditCommentId;
}
