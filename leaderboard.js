import Redis from "ioredis"; // import the Redis client so we can talk to the leaderboard store

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379"); // create a shared Redis connection for this module

export async function upvote(postId) { // increment a post's score and keep its metadata in sync
  const id = String(postId); // normalize the id so key construction is consistent
  const metaKey = `${id}:meta`; // build the metadata hash key for this post
  const tx = redis.multi(); // start a transaction so both updates happen together
  tx.zincrby("trending:posts", 1, id); // bump the post's score in the sorted set
  tx.hincrby(metaKey, "engagement", 1); // bump the engagement field in the metadata hash
  await tx.exec(); // commit the transaction atomically
  return id; // return the updated post id
} // end upvote

/**
 * Fetch the top N posts, ranked high -> low, each WITH its metadata (title, author).
 * Must use ONE ioredis pipeline for all the HGETALL calls (not one round trip per post).
 *
 * @param {number} n  how many posts to return
 * @returns {Promise<Array<{ id: string, score: number, title?: string, author?: string }>>}
 */
export async function getTop(n) { // fetch the top n posts with metadata
  const limit = Math.max(0, Number(n) || 0); // sanitize the requested count
  if (limit === 0) return []; // return early for empty requests
  const flat = await redis.zrevrange("trending:posts", 0, limit - 1, "WITHSCORES"); // get ids and scores in descending order
  const rows = []; // hold the base leaderboard rows
  const pipeline = redis.pipeline(); // create one pipeline for all metadata fetches
  for (let i = 0; i < flat.length; i += 2) { // walk the flat [id, score, id, score, ...] array
    const id = flat[i]; // read the post id
    const score = Number(flat[i + 1]); // convert the score string to a number
    rows.push({ id, score }); // store the row in rank order
    pipeline.hgetall(`${id}:meta`); // queue the metadata fetch for this post
  } // finish queuing all metadata reads
  const results = await pipeline.exec(); // execute all HGETALL calls in one round trip
  return rows.map((row, i) => { // merge each metadata object back into its row
    const meta = results[i]?.[1] || {}; // extract the HGETALL result for this post
    return { ...row, ...meta }; // combine score data with title, author, and any other fields
  }); // return the hydrated rows
} // end getTop

export { redis }; // export the Redis client for tests or other modules