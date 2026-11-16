import { redis } from "./leaderboard.js"; // reuse the shared Redis client from the app

async function seed() { // define the async seeding routine
  const pipeline = redis.pipeline(); // create one pipeline so all writes go in a single round trip

  pipeline.del("trending:posts"); // clear the leaderboard before inserting fresh test data

  for (let i = 1; i <= 100; i++) { // generate exactly 100 fake posts
    const postId = `post:${i}`; // build the post key used in the sorted set
    pipeline.hset(`post:${i}:meta`, "title", `Post number ${i}`, "author", `@user${i}`); // store the post metadata hash
    pipeline.zadd("trending:posts", Math.floor(Math.random() * 50), postId); // add the post with a modest random starting score
  } // finish queuing all post writes

  await pipeline.exec(); // send every queued command to Redis at once

  console.log("Seeded 100 posts."); // confirm the seed completed successfully
  redis.disconnect(); // close the Redis connection cleanly
} // end seed function

seed(); // run the seeding script