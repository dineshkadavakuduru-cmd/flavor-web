import assert from "node:assert/strict";

const legacy = "https://food-jet-delta.vercel.app";
const canonical = "https://flavor-web.vercel.app";
const bookmarks = [
  "/",
  "/?source=old%20bookmark&tag=a%2Bb&tag=c",
  "/?ingredient=tomato",
];

async function getHeaders(url) {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  await response.body?.cancel();
  return response;
}

let failures = 0;
for (const path of bookmarks) {
  const destination = canonical + path;
  try {
    const redirect = await getHeaders(legacy + path);
    assert.equal(redirect.status, 308, "The legacy request must return HTTP 308");
    assert.equal(redirect.headers.get("location"), destination, "Location must preserve the path and query");

    const final = await getHeaders(destination);
    assert.equal(final.status, 200, "The canonical destination must return HTTP 200 without another hop");
    assert.match(final.headers.get("content-type") ?? "", /^text\/html\b/i, "Expected the explorer HTML");
    console.log(`PASS ${path} → 308 → 200 ${destination}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${path} — ${error.message}`);
  }
}

process.exitCode = failures ? 1 : 0;
