import { upvote, getTop, redis } from "./leaderboard.js"; // import the leaderboard helpers and redis connection

async function run() { // define the async test runner
  const target = "post:50"; // pick a seeded post that starts low on the board

  // Upvote the target 50 times.
  for (let i = 0; i < 50; i++) { // run the same write operation fifty times
    await upvote(target); // wait for each upvote so the score is definitely updated
  }

  // Fetch the top 10 WITH metadata.
  const top = await getTop(10); // read back the current leaderboard state
  console.log("Top 10:"); // print a readable header
  top.forEach((p, i) => console.log(`  #${i + 1}  ${p.id}  score=${p.score}  ${p.title} (${p.author})`)); // show each ranked post with metadata

  const madeIt = top.some((p) => p.id === target); // check whether the target reached the top 10
  console.log(madeIt ? `\nPASS ✅  ${target} reached the top 10` : `\nFAIL ❌  ${target} is NOT in the top 10`); // report the result clearly

  redis.disconnect(); // close the Redis connection cleanly
  process.exit(madeIt ? 0 : 1); // exit with success or failure for the test runner
}

run(); // start the test