#!/usr/bin/env python3
"""binder.json'daki tüm kartların resimlerini cards/<id>.<uzantı> olarak indirir.
Site bu dosyaları otomatik kullanır (garanti yedek). Kullanım:  python3 fetch_cards.py
Zaten inenleri atlar; bulunamayanları sonda listeler."""
import json, os, re, sys, urllib.request, urllib.parse

UA = {"User-Agent": "Mozilla/5.0 DreamBinder"}
OUT = "cards"
os.makedirs(OUT, exist_ok=True)

def get(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get("Content-Type", "")

def jget(url):
    try:
        return json.loads(get(url)[0])
    except Exception:
        return None

def norm(s): return re.sub(r"[^a-z0-9]+", "", str(s or "").lower())
def zn(s): return re.sub(r"^0+(?=\d)", "", str(s or "").split("/")[0].strip().lower())

def tp_urls(pid):
    return [f"https://product-images.tcgplayer.com/fit-in/437x610/{pid}.jpg",
            f"https://tcgplayer-cdn.tcgplayer.com/product/{pid}_400w.jpg"]

GROUPS, PRODS = {}, {}
def via_tcgplayer(c, lang):
    sid, sn, nm, num = norm(c["setId"]), norm(c["setName"]), norm(c["name"]), zn(c["number"])
    nm1 = norm(c["name"].split(" ")[0])
    for cat in ([85, 3] if lang == "ja" else [3, 85]):
        if cat not in GROUPS:
            d = jget(f"https://tcgcsv.com/tcgplayer/{cat}/groups")
            GROUPS[cat] = (d or {}).get("results", [])
        cand = []
        for g in GROUPS[cat]:
            a, n = norm(g.get("abbreviation")), norm(g.get("name"))
            s = 3 if (a == sid or n == sn) else 1 if (len(sn) > 3 and sn in n) or (len(sid) > 3 and sid in n) else 0
            if s: cand.append((s, g))
        cand.sort(key=lambda x: -x[0])
        for _, g in cand[:5]:
            k = (cat, g["groupId"])
            if k not in PRODS:
                d = jget(f"https://tcgcsv.com/tcgplayer/{cat}/{g['groupId']}/products")
                PRODS[k] = (d or {}).get("results", [])
            by = [p for p in PRODS[k] if any(e.get("name") == "Number" and zn(e.get("value")) == num
                                              for e in p.get("extendedData", []))]
            hit = next((p for p in by if nm in norm(p["name"])), None) or \
                  next((p for p in by if len(nm1) > 2 and nm1 in norm(p["name"])), None)
            if hit: return tp_urls(hit["productId"])
    return []

def via_pokemontcg(c, lang):
    if lang != "en": return []
    q = f'set.name:"{c["setName"]}" number:{re.sub(r"^0+(?=\d)", "", c["number"])}'
    d = jget("https://api.pokemontcg.io/v2/cards?select=id,name,images&q=" + urllib.parse.quote(q))
    for x in (d or {}).get("data", []):
        if norm(x["name"]) == norm(c["name"]) or norm(c["name"].split(" ")[0]) in norm(x["name"]):
            return [u for u in (x["images"].get("large"), x["images"].get("small")) if u]
    return []

def via_tcgdex(c, lang):
    d = jget(f"https://api.tcgdex.net/v2/{lang}/cards/{urllib.parse.quote(c['id'])}")
    base = (d or {}).get("image") or c.get("image")
    return [f"{base}/{q}.{e}" for q in ("high", "low") for e in ("webp", "png")] if base else []

def save(cid, url):
    try:
        data, ct = get(url)
        if len(data) < 2000 or not ct.startswith("image"): return False
        ext = "webp" if "webp" in ct else "png" if "png" in ct else "jpg"
        open(os.path.join(OUT, f"{cid}.{ext}"), "wb").write(data); return True
    except Exception:
        return False

j = json.load(open("binder.json", encoding="utf-8"))
ovr = j.get("overrides", {})
cards = {}
for p in j["state"]["pages"]:
    for c in p["cards"].values(): cards[c["id"]] = c

have = lambda cid: any(os.path.exists(os.path.join(OUT, f"{cid}.{e}")) for e in ("webp", "png", "jpg"))
bad = []
for i, (cid, c) in enumerate(cards.items(), 1):
    if have(cid): continue
    m = re.search(r"tcgdex\.net/([\w-]+)/", c.get("image", "")); lang = m.group(1) if m else "en"
    o = ovr.get(cid, {})
    srcs = ([o["u"]] if o.get("u") else tp_urls(o["tp"]) if o.get("tp") else [])
    ok = any(save(cid, u) for u in srcs)
    for f in (via_tcgdex, via_tcgplayer, via_pokemontcg):
        if ok: break
        ok = any(save(cid, u) for u in f(c, lang))
    print(f"[{i}/{len(cards)}] {'OK  ' if ok else 'YOK '} {cid}  {c['name']} ({c['setName']})", flush=True)
    if not ok: bad.append(c)

print(f"\nBitti. Bulunamayan: {len(bad)}")
for c in bad: print("  ", c["id"], c["name"], c["setName"], "#" + c["number"])
if bad: print("Bunlar için sitede 'Cards → No image → Add link' ile TCGplayer linkini yapıştırın,\nveya resmi cards/<id>.jpg olarak elle koyun.")
