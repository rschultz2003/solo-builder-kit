/* Render the playbook to PDF.
 *
 * The PDF is generated from public/playbook/index.html via its print
 * stylesheet, so the document has one source of truth. See DECISIONS.md.
 *
 * No dependencies. Node's built-in WebSocket drives Chrome's DevTools
 * Protocol directly, because the repo has none and og/render.py's Playwright
 * install is not present. Page.printToPDF is used rather than Chrome's
 * --print-to-pdf CLI flag because only the protocol call accepts a custom
 * footer template, and the running footer is what carries reubendorje.com
 * onto every page.
 *
 *   node og/render-pdf.mjs [url] [outfile]
 */
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const URL_IN = process.argv[2] || "http://127.0.0.1:8765/playbook/";
const OUT = resolve(process.argv[3] || "public/the-solo-builders-playbook.pdf");

const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => existsSync(p));
if (!CHROME) { console.error("no Chrome or Chromium found"); process.exit(1); }

const FOOT = `
<div style="width:100%;font:8pt -apple-system,system-ui,sans-serif;color:#6E6860;
            padding:0 18mm;display:flex;justify-content:space-between;">
  <span>The Solo Builder&rsquo;s Playbook</span>
  <span>reubendorje.com &middot; @reubendorje &middot; <span class="pageNumber"></span></span>
</div>`;
const EMPTY = `<div style="display:none"></div>`;

const profile = mkdtempSync(join(tmpdir(), "pdf-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=0", "--no-first-run", "--no-default-browser-check",
  "--disable-extensions", "--hide-scrollbars", `--user-data-dir=${profile}`, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

const wsUrl = await new Promise((res, rej) => {
  let buf = "";
  const t = setTimeout(() => rej(new Error("chrome did not report a debugging port")), 20000);
  chrome.stderr.on("data", (d) => {
    buf += d;
    const m = buf.match(/ws:\/\/[^\s]+/);
    if (m) { clearTimeout(t); res(m[0]); }
  });
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((res, rej) => {
    const m = { id: ++id, method, params };
    if (sessionId) m.sessionId = sessionId;
    pending.set(m.id, { res, rej });
    ws.send(JSON.stringify(m));
  });

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const call = (m, p) => send(m, p, sessionId);

await call("Page.enable");
await call("Runtime.enable");
await call("Emulation.setEmulatedMedia", { media: "print" });
await call("Page.navigate", { url: URL_IN });
await new Promise((r) => setTimeout(r, 2500));

/* Belt and braces: the print stylesheet already forces panels open, but inert
   is cleared and aria state made honest so the PDF's accessibility tree and
   text extraction match what is on the page. */
await call("Runtime.evaluate", {
  expression: `
    document.querySelectorAll('.acc-panel').forEach(p => { p.inert = false; p.style.height = 'auto'; });
    document.querySelectorAll('.acc-btn').forEach(b => b.setAttribute('aria-expanded','true'));
    document.querySelectorAll('.reveal').forEach(e => e.classList.add('in'));
    if (window.buildPrintScaffold) window.buildPrintScaffold();
    document.fonts ? document.fonts.ready.then(()=>1) : 1;
  `,
  awaitPromise: true,
});
await new Promise((r) => setTimeout(r, 1200));

const { data } = await call("Page.printToPDF", {
  format: undefined,
  paperWidth: 8.27, paperHeight: 11.69,          // A4 in inches
  marginTop: 0.787, marginBottom: 0.866,          // 20mm / 22mm
  marginLeft: 0.709, marginRight: 0.709,          // 18mm
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: EMPTY,
  footerTemplate: FOOT,
  generateTaggedPDF: true,
  generateDocumentOutline: true,
});

/* Chrome sets /Title from the page's <title> ("Start here") and leaves author,
   subject and keywords empty, and printToPDF takes no metadata options. The
   PDF is meant to travel, so the fields a mail client, a Finder preview or a
   Google Drive listing shows have to say what the file is.

   Rather than reserialise the whole document, append an incremental update: a
   fresh version of the /Info object, a one-entry xref section pointing at it,
   and a trailer chaining to the previous one via /Prev. That is exactly the
   mechanism PDF 32000-1 §7.5.6 defines for this, and it leaves every byte
   Chrome wrote untouched. */
function setMetadata(buf, meta) {
  const tail = buf.subarray(buf.lastIndexOf(Buffer.from("trailer"))).toString("latin1");
  const prev = /startxref\s+(\d+)/.exec(tail);
  const root = /\/Root\s+(\d+\s+\d+\s+R)/.exec(tail);
  const size = /\/Size\s+(\d+)/.exec(tail);
  const info = /\/Info\s+(\d+)\s+\d+\s+R/.exec(tail);
  if (!prev || !root || !size || !info) throw new Error("could not read the PDF trailer");

  const num = Number(info[1]);
  // ( ) and \ are the only characters that need escaping inside a literal string
  const str = (s) => "(" + s.replace(/([\\()])/g, "\\$1") + ")";
  const body =
    `${num} 0 obj\n<< /Title ${str(meta.title)} /Author ${str(meta.author)}\n` +
    `   /Subject ${str(meta.subject)} /Keywords ${str(meta.keywords)}\n` +
    `   /Creator ${str(meta.creator)} /Producer ${str(meta.producer)} >>\nendobj\n`;

  const head = buf[buf.length - 1] === 0x0a ? buf : Buffer.concat([buf, Buffer.from("\n")]);
  const objAt = head.length;
  const xrefAt = objAt + Buffer.byteLength(body, "latin1");
  const update =
    body +
    `xref\n${num} 1\n${String(objAt).padStart(10, "0")} 00000 n \n` +
    `trailer\n<< /Size ${size[1]} /Root ${root[1]} /Info ${num} 0 R /Prev ${prev[1]} >>\n` +
    `startxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.concat([head, Buffer.from(update, "latin1")]);
}

const pdf = setMetadata(Buffer.from(data, "base64"), {
  title: "The Solo Builder's Playbook",
  author: "Reuben Dorje",
  subject: "Five parts on picking one thing, building it with AI, and outlasting everyone else.",
  keywords: "solo founder, indie hacker, building with AI, discipline, first 30 days",
  creator: "reubendorje.com",
  producer: "reubendorje.com",
});

writeFileSync(OUT, pdf);
ws.close();
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
console.log("wrote", OUT, (pdf.length / 1024).toFixed(0) + "K");
