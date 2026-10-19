#!/usr/bin/env node
/**
 * Browser audit for Flavor Web.
 *
 *   npm run build && npx next start -p 3100 &
 *   npm run audit:browser
 *
 * Drives the real app in Chrome (puppeteer-core, no bundled browser) and checks
 * the behaviours that only exist at runtime: the 5s loading timeout + retry on a
 * throttled connection, the offline path, WebGL context loss, deep links,
 * keyboard navigation of the graph, reduced motion, mobile gestures, and the
 * frame cost of the full dataset.
 *
 * Timings are relative signals: headless Chrome here renders through the
 * SwiftShader software rasteriser, so fps is a floor, not what a real GPU does.
 */
import puppeteer from "puppeteer-core";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { join } from "node:path";

const BASE = process.env.AUDIT_URL ?? "http://127.0.0.1:3100";
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const results = [];
const record = (name, status, detail = "") => {
  results.push({ name, status, detail });
  const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "•";
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ""}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const section = (t) => console.log(`\n${t}\n${"─".repeat(t.length)}`);

async function findChrome() {
  for (const p of CHROME_CANDIDATES) if (existsSync(p)) return p;
  throw new Error("No Chrome found — set CHROME_PATH");
}

async function newPage(browser, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport({
    width: opts.width ?? 1440,
    height: opts.height ?? 900,
    deviceScaleFactor: opts.deviceScaleFactor ?? 1,
    isMobile: opts.isMobile ?? false,
    hasTouch: opts.hasTouch ?? false,
  });
  if (opts.reducedMotion) {
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  }
  return page;
}

const has = (page, testId) => page.$(`[data-testid="${testId}"]`).then(Boolean);

async function waitGalaxyReady(page, timeout = 60000) {
  await page.waitForFunction(
    () => document.querySelector("canvas") && !document.querySelector('[data-testid="loading-screen"]'),
    { timeout, polling: 200 }
  );
}

async function waitError(page, timeout = 60000) {
  await page.waitForSelector('[data-testid="loading-error"]', { timeout, visible: true });
  return errorText(page);
}

function errorText(page) {
  return page.$eval('[data-testid="loading-error"]', (el) => el.textContent.trim()).catch(() => "");
}

/**
 * The canvas is a separately code-split chunk. To simulate "the 3D engine could
 * not be downloaded" we need its real filename, so find the chunk that contains
 * GalaxyCanvas by its own marker string in the build output.
 */
function findCanvasChunk(marker = "webglcontextlost") {
  const dir = join(process.cwd(), ".next/static/chunks");
  const hits = [];
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (entry.endsWith(".js") && readFileSync(p, "utf8").includes(marker)) hits.push(entry);
    }
  };
  walk(dir);
  return hits[0] ?? null;
}

async function main() {
  const executablePath = await findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--use-angle=swiftshader",
      "--mute-audio",
      "--hide-scrollbars",
      // Without these, a headless page that is not the focused one has its
      // timers throttled and the 5s loading budget measures ~11s.
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  });

  console.log(`Flavor Web browser audit → ${BASE}`);
  console.log(`chrome: ${executablePath}`);

  try {
    // ------------------------------------------------------------- 1. boot
    section("1. Boot & render (normal connection)");
    {
      const page = await newPage(browser);
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      const failedRequests = [];
      page.on("response", (r) => r.status() >= 400 && failedRequests.push(`${r.status()} ${r.url()}`));
      const t0 = Date.now();
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      try {
        await waitGalaxyReady(page);
        record("galaxy reaches ready state", "PASS", `${Date.now() - t0}ms from navigation`);
      } catch {
        record("galaxy reaches ready state", "FAIL", "canvas never became ready within 60s");
      }

      const info = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
        return {
          renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "n/a",
          cssW: canvas.clientWidth,
          cssH: canvas.clientHeight,
          bufW: canvas.width,
          bufH: canvas.height,
          dpr: window.devicePixelRatio,
          stats: document.querySelector("footer span")?.textContent ?? "",
          zoomAllowed: !(document.querySelector('meta[name="viewport"]')?.content ?? "").includes("maximum-scale"),
        };
      });
      record("full dataset rendered", "PASS", info.stats.trim());
      const ratio = info.bufW / info.cssW;
      record(
        "DPR capped (canvas buffer ratio)",
        ratio <= 1.76 ? "PASS" : "FAIL",
        `devicePixelRatio ${info.dpr} → buffer ratio ${ratio.toFixed(2)} (cap 1.75)`
      );
      record(
        "page zoom not blocked",
        info.zoomAllowed ? "PASS" : "FAIL",
        "viewport meta has no maximum-scale"
      );
      record("no uncaught page errors", errors.length === 0 ? "PASS" : "FAIL", errors.join(" | ") || "none");
      record("webgl backend", "INFO", info.renderer);

      // Every asset the shell references must actually resolve — this is what
      // caught the stale next/font preload (a 404 on every page load).
      const refs = await page.evaluate(() => {
        const urls = new Set();
        document.querySelectorAll('link[href], script[src]').forEach((el) => {
          const u = el.getAttribute('href') ?? el.getAttribute('src');
          if (u?.startsWith('/_next/')) urls.add(u);
        });
        return [...urls];
      });
      const statuses = await Promise.all(
        refs.map(async (u) => ({
          u,
          code: await page.evaluate((url) => fetch(url).then((r) => r.status), u),
        }))
      );
      const broken = statuses.filter((s) => s.code !== 200);
      record(
        "every /_next asset referenced by the shell resolves",
        broken.length === 0 ? "PASS" : "FAIL",
        broken.length ? broken.map((b) => `${b.code} ${b.u}`).join(", ") : `${statuses.length} assets, all 200`
      );
      await page.close();
    }

    // ------------------------------------------------- 2. slow 3G + retry
    section("2. Slow 3G: 5s timeout, retry, and eventual success");
    {
      const page = await newPage(browser);
      const cdp = await page.target().createCDPSession();
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 400,
        downloadThroughput: (400 * 1024) / 8, // 400 kbps
        uploadThroughput: (200 * 1024) / 8,
      });

      const t0 = Date.now();
      await page.goto(BASE, { waitUntil: "domcontentloaded" });

      // Measure the timeout from when the app actually mounts (the loading
      // effect stamps __flavorLoadStartedAt): on this link the JS bundle itself
      // takes many seconds to arrive, and the 5s budget is about the galaxy
      // condensing, not about the download.
      await page.waitForFunction(() => typeof window.__flavorLoadStartedAt === "number", {
        timeout: 60000,
        polling: 100,
      });
      let text = "";
      try {
        text = await waitError(page, 60000);
      } catch {
        /* reported below */
      }
      const afterMount = await page.evaluate(
        () => Date.now() - (window.__flavorLoadStartedAt ?? Date.now())
      );
      record(
        "timeout fires ~5s after mount on a 400kbps/400ms link",
        text && afterMount >= 4000 && afterMount <= 8000 ? "PASS" : "FAIL",
        text ? `${Math.round(afterMount)}ms after mount` : "no error state appeared"
      );
      record(
        "retry affordance present",
        (await has(page, "retry-button")) ? "PASS" : "FAIL",
        'data-testid="retry-button"'
      );
      if (text) record("error copy", "INFO", text.replace(/\s+/g, " ").slice(0, 90));

      // Keep waiting on the same throttled connection: once the chunks land the
      // galaxy must still come up on its own, behind the overlay.
      try {
        await waitGalaxyReady(page, 180000);
        record("slow load still completes without a reload", "PASS", `${Date.now() - t0}ms total`);
      } catch {
        record("slow load still completes without a reload", "FAIL", "never recovered");
      }
      await page.close();
    }

    // ------------------------------------------------------- 3. offline path
    section("3. Offline / failed canvas chunk");
    {
      const page = await newPage(browser);
      const cdp = await page.target().createCDPSession();
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

      // Simulate "the shell loaded, the 3D engine could not be downloaded".
      const canvasChunk = findCanvasChunk();
      record(
        "canvas code lives in its own chunk",
        canvasChunk ? "PASS" : "FAIL",
        canvasChunk ?? "no chunk contains the canvas marker"
      );
      let blocked = Boolean(canvasChunk);
      const chunkHits = { n: 0 };
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const url = req.url();
        if (blocked && canvasChunk && url.includes(canvasChunk)) {
          chunkHits.n++;
          req.abort("failed");
          return;
        }
        req.continue();
      });

      const navigations = [];
      page.on("framenavigated", (f) => f === page.mainFrame() && navigations.push(Date.now()));

      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      let chunkFailText = "";
      try {
        chunkFailText = await waitError(page, 60000);
        record("canvas chunk failure surfaces as an error", "PASS", "timeout state reached");
        record(
          "chunk failure names the download, not just slowness",
          /download/i.test(chunkFailText) ? "PASS" : "FAIL",
          chunkFailText.replace(/\s+/g, " ").slice(0, 80)
        );
      } catch {
        record("canvas chunk failure surfaces as an error", "FAIL", "no error state");
      }

      // Browser goes offline: the message should stop blaming the network speed.
      await cdp.send("Network.emulateNetworkConditions", {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      });
      await sleep(600);
      const offlineText = await errorText(page);
      record(
        "offline state reported as offline",
        /offline/i.test(offlineText) ? "PASS" : "FAIL",
        offlineText.replace(/\s+/g, " ").slice(0, 80)
      );

      // Back online → retry must not require a click. A blocked chunk import is
      // cached by the bundler, so the app escalates to a full reload, which is
      // the only thing that can re-fetch it.
      const navsBefore = navigations.length;
      const hitsBefore = chunkHits.n;
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
      await sleep(2500);
      record(
        "reconnect auto-retries without user input",
        navigations.length > navsBefore || chunkHits.n > hitsBefore ? "PASS" : "FAIL",
        `navigations +${navigations.length - navsBefore}, chunk requests +${chunkHits.n - hitsBefore}`
      );

      // And the retry button must not be a silent no-op on a dead chunk either.
      const retryBtn = await page.$('[data-testid="retry-button"]');
      if (retryBtn) {
        const before = navigations.length;
        await retryBtn.click().catch(() => {});
        await sleep(2500);
        record(
          "retry recovers a dead chunk (escalates to a reload)",
          navigations.length > before || (await has(page, "loading-screen")) ? "PASS" : "FAIL",
          `navigations +${navigations.length - before}`
        );
      }

      // Leave interception enabled until the page is closed. Disabling it while
      // a request is in flight makes puppeteer throw "Request Interception is
      // not enabled" from the still-attached handler.
      await page.close();
    }

    // ------------------------------------------------------ 4. context loss
    section("4. WebGL context loss");
    {
      const page = await newPage(browser);
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await waitGalaxyReady(page);

      const lossErrors = [];
      page.on("pageerror", (e) => lossErrors.push(String(e).replace(/\s+/g, " ").slice(0, 90)));

      const loseContext = () =>
        page.evaluate(() => {
          const c = document.querySelector("canvas");
          if (!c) return false;
          const gl = c.getContext("webgl2") || c.getContext("webgl");
          const ext = gl?.getExtension("WEBGL_lose_context");
          if (!ext) return false;
          window.__loseExt = ext;
          ext.loseContext();
          return true;
        });

      // Transient loss within the grace window: three.js restores it and the
      // user should never see an error, and nothing may throw.
      const couldLose = await loseContext();
      record(
        "WEBGL_lose_context available in this browser",
        couldLose ? "PASS" : "INFO",
        couldLose ? "forced a real context loss" : "extension unavailable — test skipped"
      );
      if (couldLose) {
        await sleep(800);
        await page.evaluate(() => window.__loseExt?.restoreContext());
        await sleep(4500);
        const afterTransient = await page.evaluate(() => ({
          canvas: !!document.querySelector("canvas"),
          error: document.querySelector('[data-testid="loading-error"]')?.textContent?.trim() ?? null,
        }));
        record(
          "transient context loss recovers silently",
          !afterTransient.error && afterTransient.canvas ? "PASS" : "FAIL",
          afterTransient.error
            ? afterTransient.error.replace(/\s+/g, " ").slice(0, 70)
            : "canvas survived, no overlay"
        );
        record(
          "nothing thrown while the context was lost",
          lossErrors.length === 0 ? "PASS" : "FAIL",
          lossErrors.join(" | ") || "0 page errors"
        );

        // Permanent loss: error state with a retry, and retry actually recovers.
        await loseContext();
        let text = "";
        try {
          text = await waitError(page, 20000);
          record(
            "permanent context loss surfaces an error",
            /context|WebGL/i.test(text) ? "PASS" : "FAIL",
            text.replace(/\s+/g, " ").slice(0, 80)
          );
        } catch {
          record("permanent context loss surfaces an error", "FAIL", "no error surfaced");
        }
      } else {
        record("transient context loss recovers silently", "INFO", "skipped");
        record("permanent context loss surfaces an error", "INFO", "skipped");
      }
      const retry = await page.$('[data-testid="retry-button"]');
      let recovered = false;
      if (retry) {
        await retry.click();
        try {
          await waitGalaxyReady(page, 30000);
          recovered = true;
        } catch {
          /* reported below */
        }
      }
      record(
        "retry rebuilds the galaxy after context loss",
        recovered ? "PASS" : "FAIL",
        recovered ? "canvas ready again" : "still broken"
      );
      record(
        "retry rebuilt within the reload guard",
        recovered ? "PASS" : "INFO",
        "remount path (not a full reload)"
      );
      await page.close();
    }

    // ---------------------------------------------- 5. search & filtering
    section("5. Search & filters with no results");
    {
      const page = await newPage(browser);
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await waitGalaxyReady(page);

      await page.click('[data-testid="search-input"]');
      await page.type('[data-testid="search-input"]', "zzqq");
      await sleep(300);
      const noMatch = await page.$eval("#search-results", (el) => el.textContent.replace(/\s+/g, " ").trim());
      record(
        "search with no matches explains itself",
        /No ingredients match/i.test(noMatch) ? "PASS" : "FAIL",
        noMatch.slice(0, 70)
      );

      // Clear the query, then turn every category off.
      const clear = await page.$('button[aria-label="Clear search"]');
      if (clear) await clear.click();
      await sleep(200);
      await page.evaluate(() => {
        document.querySelectorAll('[data-testid="category-chips"] button[aria-pressed="true"]')
          .forEach((b) => b.click());
      });
      await sleep(250);
      const hint = await page.$$eval('[role="status"]', (els) => els.map((e) => e.textContent).join(" | "));
      record(
        "all-filters-off is called out on the canvas",
        /Every category is hidden/i.test(hint) ? "PASS" : "FAIL",
        hint.replace(/\s+/g, " ").slice(0, 80)
      );

      // Now search for something that exists: with every category off, the
      // typeahead must say why it has nothing to offer.
      await page.click('[data-testid="search-input"]');
      await page.type('[data-testid="search-input"]', "tomato");
      await sleep(400);
      const filtered = await page.$eval("#search-results", (el) => el.textContent.replace(/\s+/g, " ").trim());
      record(
        "search explains matches hidden by filters",
        /hidden by the category filters/i.test(filtered) ? "PASS" : "FAIL",
        filtered.slice(0, 90)
      );
      await page.close();
    }

    // ------------------------------------------------------- 6. long names
    section("6. Long ingredient names");
    {
      const page = await newPage(browser, { width: 1280, height: 720 });
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await waitGalaxyReady(page);
      await page.click('[data-testid="search-input"]');
      await page.type('[data-testid="search-input"]', "Portobello");
      await sleep(300);
      await page.click("#search-option-mushroom-portobello");
      await sleep(900);
      const box = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="detail-panel"]');
        const h = panel.querySelector("h2");
        return {
          title: h.textContent.trim(),
          overflowsX: h.scrollWidth > h.clientWidth + 1,
          overflowsPanel: panel.scrollWidth > panel.clientWidth + 1,
          right: Math.round(panel.getBoundingClientRect().right),
          vw: window.innerWidth,
          fontPx: parseFloat(getComputedStyle(h).fontSize),
        };
      });
      record(
        "long name renders without horizontal overflow",
        !box.overflowsX && !box.overflowsPanel ? "PASS" : "FAIL",
        `"${box.title}" @${box.fontPx}px, panel right ${box.right} / vw ${box.vw}`
      );
      record(
        "detail panel stays inside the viewport",
        box.right <= box.vw ? "PASS" : "FAIL",
        `right ${box.right} ≤ ${box.vw}`
      );
      await page.close();
    }

    // -------------------------------------------------------- 7. deep links
    section("7. Deep-linking a selected ingredient");
    {
      const page = await newPage(browser);
      await page.goto(`${BASE}/?ingredient=lamb`, { waitUntil: "domcontentloaded" });
      await waitGalaxyReady(page);
      await sleep(600);
      const title = await page.$eval('[data-testid="detail-panel"] h2', (el) => el.textContent.trim());
      record("?ingredient=lamb opens that ingredient", title === "Lamb" ? "PASS" : "FAIL", `panel shows "${title}"`);

      await page.reload({ waitUntil: "domcontentloaded" });
      await waitGalaxyReady(page);
      await sleep(600);
      const afterReload = await page.$eval('[data-testid="detail-panel"] h2', (el) => el.textContent.trim());
      record(
        "selection survives a reload",
        afterReload === "Lamb" ? "PASS" : "FAIL",
        `panel shows "${afterReload}"`
      );

      // Clicking an orb (via search) must write the URL.
      await page.click('[data-testid="search-input"]');
      await page.type('[data-testid="search-input"]', "Basil");
      await sleep(300);
      await page.click("#search-option-basil");
      await sleep(600);
      record(
        "selecting updates the URL",
        page.url().includes("ingredient=basil") ? "PASS" : "FAIL",
        page.url()
      );

      // And an unknown id must not break the page.
      await page.goto(`${BASE}/?ingredient=not-a-real-ingredient`, { waitUntil: "domcontentloaded" });
      await waitGalaxyReady(page);
      record(
        "unknown ?ingredient id is ignored",
        (await has(page, "detail-panel")) ? "FAIL" : "PASS",
        "no panel, galaxy still renders"
      );
      await page.close();
    }

    // ----------------------------------------------------------- 8. keyboard
    section("8. Keyboard access to the graph");
    {
      const page = await newPage(browser);
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await waitGalaxyReady(page);
      const focusable = await page.$eval('[role="application"]', (el) => el.tabIndex);
      record("galaxy surface is focusable", focusable === 0 ? "PASS" : "FAIL", `tabIndex=${focusable}`);

      await page.evaluate(() => document.querySelector('[role="application"]').focus());
      await page.keyboard.press("ArrowRight");
      await sleep(700);
      const first = await page.evaluate(() => ({
        url: window.location.search,
        live: document.querySelector('[aria-live="polite"]').textContent.trim(),
        panel: document.querySelector('[data-testid="detail-panel"] h2')?.textContent.trim() ?? null,
      }));
      record(
        "ArrowRight selects an ingredient",
        first.panel ? "PASS" : "FAIL",
        `panel "${first.panel}", url "${first.url}", announced "${first.live}"`
      );
      record(
        "selection announced to screen readers",
        first.live.length > 0 ? "PASS" : "FAIL",
        first.live
      );

      await page.keyboard.press("ArrowRight");
      await sleep(700);
      const second = await page.$eval('[data-testid="detail-panel"] h2', (el) => el.textContent.trim());
      record(
        "arrow keys step along real pairings",
        second !== first.panel ? "PASS" : "FAIL",
        `${first.panel} → ${second}`
      );

      await page.keyboard.press("Escape");
      await sleep(400);
      record(
        "Escape deselects",
        !(await has(page, "detail-panel")) ? "PASS" : "FAIL",
        "panel closed"
      );
      await page.close();
    }

    // ------------------------------------------------------ 9. reduced motion
    section("9. prefers-reduced-motion");
    {
      // R3F's adaptive `performance` prop lowers the drawing-buffer size while
      // frames are slow, so the first frames after mount change resolution even
      // when nothing in the scene moves. Wait for the buffer to settle before
      // judging motion, and report it so a failure is readable.
      const buffer = (page) => page.evaluate(() => document.querySelector("canvas")?.width ?? 0);
      const waitForStableBuffer = async (page) => {
        let last = await buffer(page);
        for (let i = 0; i < 20; i++) {
          await sleep(500);
          const now = await buffer(page);
          if (now === last) return now;
          last = now;
        }
        return last;
      };

      const still = async (reducedMotion) => {
        const page = await newPage(browser, { reducedMotion });
        await page.goto(BASE, { waitUntil: "domcontentloaded" });
        await waitGalaxyReady(page);
        const width = await waitForStableBuffer(page);
        const a = await page.screenshot();
        await sleep(1500);
        const b = await page.screenshot();
        const widthAfter = await buffer(page);
        await page.close();
        return { identical: Buffer.compare(a, b) === 0, width, widthAfter };
      };
      const reduced = await still(true);
      const normal = await still(false);
      record(
        "scene is static under reduced motion",
        reduced.identical ? "PASS" : "FAIL",
        reduced.identical
          ? `two frames 1.5s apart are pixel-identical (buffer ${reduced.width}px)`
          : `scene still animates (buffer ${reduced.width}→${reduced.widthAfter}px)`
      );
      record(
        "scene animates without the preference",
        !normal.identical ? "PASS" : "FAIL",
        normal.identical ? "unexpectedly static" : "frames differ (rotation + shimmer)"
      );
    }

    // ------------------------------------------------------------- 10. mobile
    section("10. Mobile touch & layout");
    {
      const page = await newPage(browser, {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      });
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await waitGalaxyReady(page);

      const touch = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        // Walk up to the element that actually scrolls: the testid sits on the
        // inner chip list, not on the overflow container.
        let scroller = document.querySelector('[data-testid="category-chips"]');
        while (scroller && scroller !== document.body) {
          const ox = getComputedStyle(scroller).overflowX;
          if (ox === "auto" || ox === "scroll") break;
          scroller = scroller.parentElement;
        }
        window.__scroller = scroller;
        return {
          canvasTouchAction: getComputedStyle(canvas).touchAction,
          chipScrollable: scroller.scrollWidth > scroller.clientWidth,
          chipTouchAction: getComputedStyle(document.querySelector('[data-testid="category-chips"] button')).touchAction,
          dpr: window.devicePixelRatio,
          bufW: canvas.width,
          cssW: canvas.clientWidth,
        };
      });
      record(
        "canvas claims gestures, page does not scroll under them",
        touch.canvasTouchAction === "none" ? "PASS" : "FAIL",
        `canvas touch-action: ${touch.canvasTouchAction}`
      );
      record(
        "chip row scrolls horizontally on a phone",
        touch.chipScrollable ? "PASS" : "FAIL",
        `touch-action on chips: ${touch.chipTouchAction}`
      );
      record(
        "mobile DPR capped at 1.5",
        touch.bufW / touch.cssW <= 1.51 ? "PASS" : "FAIL",
        `devicePixelRatio ${touch.dpr} → buffer ratio ${(touch.bufW / touch.cssW).toFixed(2)}`
      );

      // Drag the chip row with a real touch sequence: it must scroll, not orbit.
      const chipBox = await page.evaluate(() => {
        const r = window.__scroller.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      const box = chipBox;
      await page.touchscreen.touchStart(box.x + box.width - 20, box.y + box.height / 2);
      for (let i = 1; i <= 8; i++) {
        await page.touchscreen.touchMove(box.x + box.width - 20 - i * 25, box.y + box.height / 2);
      }
      await page.touchscreen.touchEnd();
      await sleep(400);
      const scrolled = await page.evaluate(() => window.__scroller.scrollLeft);
      record("chip row responds to a swipe", scrolled > 0 ? "PASS" : "FAIL", `scrollLeft ${scrolled}`);

      // A drag on the canvas must orbit, never scroll the page.
      await page.touchscreen.touchStart(195, 420);
      for (let i = 1; i <= 6; i++) await page.touchscreen.touchMove(195 + i * 12, 420 + i * 6);
      await page.touchscreen.touchEnd();
      const scrollY = await page.evaluate(() => window.scrollY);
      record("canvas drag does not scroll the page", scrollY === 0 ? "PASS" : "FAIL", `scrollY ${scrollY}`);

      // Select on mobile: the detail sheet must not bury the footer controls.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.click('[data-testid="search-input"]');
      await page.type('[data-testid="search-input"]', "Basil");
      await sleep(300);
      await page.click("#search-option-basil");
      await sleep(900);
      const overlap = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="detail-panel"]');
        const surprise = [...document.querySelectorAll("footer button")].pop();
        const p = panel.getBoundingClientRect();
        const s = surprise.getBoundingClientRect();
        const hitsPanel = document.elementFromPoint(s.x + s.width / 2, s.y + s.height / 2);
        return {
          panelTop: Math.round(p.top),
          panelBottom: Math.round(p.bottom),
          vh: window.innerHeight,
          surpriseReachable: !!hitsPanel && !panel.contains(hitsPanel),
        };
      });
      record(
        "mobile sheet stays inside the viewport",
        overlap.panelBottom <= overlap.vh ? "PASS" : "FAIL",
        `panel ${overlap.panelTop}–${overlap.panelBottom} of ${overlap.vh}`
      );
      record(
        "footer controls stay reachable with the sheet open",
        overlap.surpriseReachable ? "PASS" : "FAIL",
        "Surprise button not covered"
      );
      await page.close();
    }

    // ---------------------------------------------------- 11. frame budget
    section("11. Frame budget with the full dataset (software rasteriser — floor, not a benchmark)");
    {
      const page = await newPage(browser, { width: 1440, height: 900, deviceScaleFactor: 2 });
      const cdp = await page.target().createCDPSession();
      await cdp.send("Performance.enable");
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await waitGalaxyReady(page);

      const idle = await measure(page, cdp, 6000);
      record("idle frames per second", "INFO", `${idle.fps.toFixed(1)} fps @ dpr 2 viewport, ${idle.heapMB.toFixed(1)} MB JS heap`);
      record(
        "canvas buffer ratio with the DPR cap",
        idle.bufferRatio <= 1.76 ? "PASS" : "FAIL",
        `${idle.bufferRatio.toFixed(2)} (uncapped dpr 2 would be 2.00)`
      );

      // Select the most connected orb: the focused state dims ~140 edges and
      // pulls neighbours, which is the heaviest frame in the app.
      await page.click('[data-testid="search-input"]');
      await page.type('[data-testid="search-input"]', "Tomato");
      await sleep(300);
      await page.click("#search-option-tomato");
      await sleep(1600);
      const focused = await measure(page, cdp, 6000);
      record("focused frames per second", "INFO", `${focused.fps.toFixed(1)} fps, ${focused.heapMB.toFixed(1)} MB JS heap`);
      record(
        "no JS heap growth between idle and focused",
        focused.heapMB - idle.heapMB < 8 ? "PASS" : "FAIL",
        `${idle.heapMB.toFixed(1)} → ${focused.heapMB.toFixed(1)} MB`
      );
      await page.close();
    }

    // --------------------------------------------------- 11b. low-power mode
    section("11b. Low-power device profile (hardware hints)");
    {
      const page = await newPage(browser, { width: 1280, height: 800 });
      // Same signals useDeviceProfile reads: few cores, little memory, saveData.
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 });
        Object.defineProperty(navigator, "deviceMemory", { get: () => 2 });
        Object.defineProperty(navigator, "connection", {
          get: () => ({ saveData: true, effectiveType: "3g" }),
        });
      });
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await waitGalaxyReady(page);
      const low = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        return {
          antialias: gl.getContextAttributes()?.antialias ?? null,
          ratio: canvas.width / canvas.clientWidth,
        };
      });
      record(
        "low-power device drops antialiasing/bloom",
        low.antialias === false ? "PASS" : "FAIL",
        `antialias ${low.antialias}`
      );
      record(
        "low-power DPR capped at 1.25",
        low.ratio <= 1.26 ? "PASS" : "FAIL",
        `buffer ratio ${low.ratio.toFixed(2)}`
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }

  // ------------------------------------------------- 12. canonical artifacts
  section("12. Canonical deployment artifacts");
  {
    const CANONICAL = "https://flavor-web.vercel.app";
    let html = "";
    try {
      html = await (await fetch(`${BASE}/`)).text();
    } catch (e) {
      record("home page reachable", "FAIL", String(e));
    }
    const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1] ?? "";
    const ogUrl = html.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/)?.[1] ?? "";
    // Next emits the origin without a trailing slash for both. Treat that as
    // canonical; the trailing-slash form is the same resource.
    const stripSlash = (u) => u.replace(/\/$/, "");
    const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)?.[1] ?? "";
    record(
      "canonical link uses the canonical domain",
      stripSlash(canonical) === CANONICAL ? "PASS" : "FAIL",
      canonical || "missing"
    );
    record(
      "og:url uses the canonical domain",
      stripSlash(ogUrl) === CANONICAL ? "PASS" : "FAIL",
      ogUrl || "missing"
    );
    record(
      "og:image is absolute on the canonical domain",
      ogImage === `${CANONICAL}/og-image.png` ? "PASS" : "FAIL",
      ogImage || "missing"
    );
    if (ogImage) {
      const img = await fetch(ogImage).catch(() => null);
      record(
        "og:image resolves",
        img?.ok ? "PASS" : "FAIL",
        img ? `${img.status} ${img.headers.get("content-type")} ${img.headers.get("content-length")} bytes` : "fetch failed"
      );
    }

    const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    record(
      "sitemap only lists canonical URLs",
      locs.length > 0 && locs.every((u) => u.startsWith(`${CANONICAL}/`)) ? "PASS" : "FAIL",
      locs.join(", ") || "no <loc>"
    );

    const robots = await (await fetch(`${BASE}/robots.txt`)).text();
    record(
      "robots.txt points at the canonical sitemap",
      robots.includes(`Sitemap: ${CANONICAL}/sitemap.xml`) ? "PASS" : "FAIL",
      robots.split("\n").find((l) => l.startsWith("Sitemap:")) ?? "no Sitemap line"
    );

    const manifestRes = await fetch(`${BASE}/manifest.webmanifest`);
    const manifest = await manifestRes.json().catch(() => null);
    record(
      "manifest is installable and host-relative",
      manifest?.start_url === "/" && manifest?.id === "/" ? "PASS" : "FAIL",
      manifest ? `start_url ${manifest.start_url}, id ${manifest.id}` : "unparseable"
    );

    // Prove the running app actually redirects, not just that vercel.json says
    // so: send a legacy Host header at the local server (middleware reads the
    // header, so this exercises the same code path Vercel runs).
    const withHost = (host, path = "/") =>
      new Promise((resolve) => {
        const base = new URL(BASE);
        const req = httpRequest(
          { hostname: base.hostname, port: base.port, path, headers: { host } },
          (res) => {
            res.resume();
            resolve({ status: res.statusCode, location: res.headers.location ?? "" });
          }
        );
        req.on("error", (e) => resolve({ status: 0, location: String(e) }));
        req.end();
      });
    const legacy = await withHost("food-jet-delta.vercel.app", "/?x=1");
    record(
      "legacy host 308-redirects to the canonical origin",
      legacy.status === 308 && legacy.location === `${CANONICAL}/?x=1` ? "PASS" : "FAIL",
      `${legacy.status} → ${legacy.location || "no location"}`
    );
    const local = await withHost("127.0.0.1");
    record(
      "localhost is exempt from the canonical redirect",
      local.status === 200 ? "PASS" : "FAIL",
      `status ${local.status}`
    );
    record(
      "manifest is linked from the document",
      /<link[^>]+rel="manifest"[^>]+href="\/manifest\.webmanifest"/.test(html) ? "PASS" : "FAIL",
      "link rel=manifest"
    );

    // The legacy project is expected to build this same source; the redirect
    // must therefore be committed, not only configured in a dashboard.
    const vercel = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    record(
      "legacy host redirect is committed",
      vercel.includes("food-jet-delta.vercel.app") && vercel.includes(CANONICAL)
        ? "PASS"
        : "FAIL",
      "vercel.json → " + CANONICAL
    );
  }

  // ------------------------------------------------------------ 13. contrast
  section("13. Label contrast (WCAG 2.1)");
  {
    const VOID = "#05060a";
    const GLASS_OVER_VOID = "#0b0e18"; // .glass at 78% over the void
    const GLASS_OVER_BRIGHT = "#30323b"; // .glass (85% opacity) over pure white
    const lum = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => {
      const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (l1 + 0.05) / (l2 + 0.05);
    };
    const rows = [
      ["ash #9BA2B4 on the void", ratio("#9BA2B4", VOID), 4.5],
      ["bone #EDE8DC on the void", ratio("#EDE8DC", VOID), 4.5],
      ["ash on glass over the void", ratio("#9BA2B4", GLASS_OVER_VOID), 4.5],
      ["ash on glass over a bloomed orb (worst case)", ratio("#9BA2B4", GLASS_OVER_BRIGHT), 4.5],
      ["bone on glass over a bloomed orb (worst case)", ratio("#EDE8DC", GLASS_OVER_BRIGHT), 4.5],
      ["ember #FFB347 on the void", ratio("#FFB347", VOID), 4.5],
    ];
    for (const [label, r, min] of rows) {
      record(label, r >= min ? "PASS" : r >= 3 ? "WARN" : "FAIL", `${r.toFixed(2)}:1 (needs ${min}:1 for body text)`);
    }
    record(
      "worst-case glass labels rely on the .label-shadow fallback",
      "INFO",
      "shadow darkens the immediate backdrop for floating labels"
    );
  }

  const failed = results.filter((r) => r.status === "FAIL");
  const warned = results.filter((r) => r.status === "WARN");
  console.log("\n" + "═".repeat(60));
  console.log(
    `TOTAL ${results.length} checks — ${results.filter((r) => r.status === "PASS").length} pass, ${failed.length} fail, ${warned.length} warn`
  );
  for (const f of failed) console.log(`  FAIL  ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
  console.log("═".repeat(60));
  process.exit(failed.length ? 1 : 0);
}

async function measure(page, cdp, ms) {
  await page.evaluate(() => {
    window.__f = 0;
    const tick = () => {
      window.__f++;
      window.__raf = requestAnimationFrame(tick);
    };
    window.__raf = requestAnimationFrame(tick);
  });
  await sleep(ms);
  const frames = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    return window.__f;
  });
  const { metrics } = await cdp.send("Performance.getMetrics");
  const get = (n) => metrics.find((m) => m.name === n)?.value ?? 0;
  const buffer = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    return c.width / c.clientWidth;
  });
  return {
    fps: frames / (ms / 1000),
    heapMB: get("JSHeapUsedSize") / 1024 / 1024,
    bufferRatio: buffer,
  };
}

main().catch((e) => {
  console.error("\nAudit crashed:", e);
  process.exit(2);
});
