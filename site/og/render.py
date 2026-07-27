from playwright.sync_api import sync_playwright
import pathlib, json

HERE = pathlib.Path(__file__).parent.resolve()
OUT  = pathlib.Path("/home/claude/site/public")
OUT.mkdir(parents=True, exist_ok=True)

CARDS = [
    {
        "file": "og.png",
        "eyebrow": "reubendorje.com",
        "title": 'I build software by myself, and I <span class="grad">give away the map</span>.',
        "cls": "mid",
        "sub": "Free playbooks for solo founders building with AI.",
    },
    {
        "file": "og-playbook.png",
        "eyebrow": "free · 40 pages · no upsell",
        "title": 'The Solo Builder&rsquo;s <span class="grad">Playbook</span>',
        "cls": "big",
        "sub": "Everything I wish someone handed me before I wasted years figuring it out.",
    },
]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width":1200,"height":630}, device_scale_factor=2)
    pg.goto((HERE/"card.html").as_uri())
    for c in CARDS:
        pg.evaluate("""(c)=>{
            document.getElementById('eyebrow').textContent = c.eyebrow;
            const t = document.getElementById('title');
            t.innerHTML = c.title; t.className = 'title ' + c.cls;
            document.getElementById('sub').textContent = c.sub;
        }""", c)
        pg.wait_for_timeout(350)
        pg.screenshot(path=str(OUT/c["file"]))
        print("rendered", c["file"])
    b.close()
