"""Generator potret ilustrasi dokter fiktif JanjiCare (SVG orisinal, latar klinik seragam).

Pemakaian: python3 scripts/generate-doctor-portraits.py <folder-output>
Menghasilkan file SVG; ubah ke JPG 600x750 (mis. lewat browser/Playwright) sebelum diunggah.
Gambar ini ilustrasi, bukan potret orang sungguhan.
"""
import json, sys, os

W, H = 600, 750
OUT = sys.argv[1]

SKIN = {"light": ("#F1C9A5", "#DDAE88"), "medium": ("#D9A47A", "#C08A61"), "tan": ("#C18A5E", "#A57149"), "deep": ("#9C6B47", "#83583A")}
HAIR = {"black": "#1F1A1D", "dark": "#2E2326", "brown": "#4A3328", "gray": "#6F6A6C"}

def background():
    return f'''
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F3E6EC"/><stop offset="1" stop-color="#E6D3DC"/>
    </linearGradient>
    <linearGradient id="win" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FBF7F9"/><stop offset="1" stop-color="#EFE4E9"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="coat" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ECE8EA"/><stop offset="0.5" stop-color="#FCFBFB"/><stop offset="1" stop-color="#E9E4E7"/>
    </linearGradient>
  </defs>
  <rect width="{W}" height="{H}" fill="url(#wall)"/>
  <!-- jendela -->
  <rect x="34" y="70" width="190" height="400" rx="6" fill="url(#win)" stroke="#D9C4CE" stroke-width="6"/>
  <line x1="129" y1="70" x2="129" y2="470" stroke="#D9C4CE" stroke-width="5"/>
  <line x1="34" y1="250" x2="224" y2="250" stroke="#D9C4CE" stroke-width="5"/>
  <!-- lemari & rak -->
  <rect x="420" y="120" width="150" height="330" rx="6" fill="#DCC6D0"/>
  <rect x="432" y="134" width="126" height="138" rx="4" fill="#E9DAE1"/>
  <rect x="432" y="290" width="126" height="146" rx="4" fill="#E9DAE1"/>
  <rect x="446" y="232" width="22" height="40" rx="3" fill="#C9AEBA"/>
  <rect x="474" y="244" width="18" height="28" rx="3" fill="#BFA1AE"/>
  <rect x="498" y="226" width="26" height="46" rx="3" fill="#D3BBC6"/>
  <!-- tanaman -->
  <ellipse cx="372" cy="430" rx="34" ry="12" fill="#CDB3BF"/>
  <path d="M372 425 C350 380 330 370 322 340 C350 350 366 380 372 410 C376 372 392 340 418 330 C410 364 392 392 372 425Z" fill="#A9B5A2"/>
  <rect x="0" y="560" width="{W}" height="{H-560}" fill="#DCC6D0" opacity="0.55"/>
  <rect width="{W}" height="{H}" fill="url(#glow)"/>'''

def body(p):
    skin, shade = SKIN[p["skin"]]
    inner = p.get("inner", "#5E7F95")
    neck = f'<path d="M262 370 L338 370 L344 470 L256 470Z" fill="{skin}"/><path d="M262 392 C285 412 315 412 338 392 L338 420 C315 440 285 440 262 420Z" fill="{shade}" opacity="0.7"/>'
    if p.get("hijab"):
        neck = ""
    return f'''
  {neck}
  <!-- bahu / jas -->
  <path d="M70 {H} C78 560 140 505 228 480 L300 520 L372 480 C460 505 522 560 530 {H}Z" fill="url(#coat)"/>
  <!-- baju dalam (V) -->
  <path d="M240 476 L300 600 L360 476 L338 466 L300 520 L262 466Z" fill="{inner}"/>
  <!-- kerah jas -->
  <path d="M228 480 L262 466 L300 600 L282 640 L250 560Z" fill="#F7F5F6" stroke="#DCD6D9" stroke-width="2"/>
  <path d="M372 480 L338 466 L300 600 L318 640 L350 560Z" fill="#F7F5F6" stroke="#DCD6D9" stroke-width="2"/>
  <line x1="300" y1="640" x2="300" y2="{H}" stroke="#DCD6D9" stroke-width="3"/>
  <!-- saku & badge polos -->
  <rect x="378" y="610" width="70" height="8" rx="3" fill="#E1DBDE"/>
  <rect x="160" y="604" width="58" height="34" rx="5" fill="#FFFFFF" stroke="#D3CCD0" stroke-width="2"/>
  <rect x="168" y="612" width="18" height="18" rx="3" fill="#C1A0AC"/>
  <rect x="190" y="614" width="22" height="4" rx="2" fill="#D6CED2"/><rect x="190" y="622" width="16" height="4" rx="2" fill="#D6CED2"/>
  <!-- stetoskop -->
  <path d="M252 476 C228 540 236 600 266 628" fill="none" stroke="#3B3438" stroke-width="7" stroke-linecap="round"/>
  <path d="M348 476 C372 540 360 590 334 612" fill="none" stroke="#3B3438" stroke-width="7" stroke-linecap="round"/>
  <path d="M266 628 C280 650 300 652 312 640" fill="none" stroke="#3B3438" stroke-width="6" stroke-linecap="round"/>
  <circle cx="334" cy="620" r="15" fill="#8B8488" stroke="#3B3438" stroke-width="5"/>
  <circle cx="334" cy="620" r="6" fill="#C9C3C6"/>'''

def head(p):
    skin, shade = SKIN[p["skin"]]
    hair = HAIR[p.get("hairColor", "black")]
    g = p["gender"]
    jaw = "M222 250 C222 350 260 398 300 398 C340 398 378 350 378 250 C378 175 345 140 300 140 C255 140 222 175 222 250Z"
    if g == "m":
        jaw = "M220 248 C220 352 256 402 300 402 C344 402 380 352 380 248 C380 172 346 138 300 138 C254 138 220 172 220 248Z"
    parts = []
    style = "none" if p.get("hijab") else p["hair"]
    # rambut belakang
    if style == "long":
        parts.append(f'<path d="M206 250 C196 150 250 108 300 108 C352 108 404 150 394 250 L410 470 C380 500 220 500 190 470Z" fill="{hair}"/>')
    elif style == "ponytail":
        parts.append(f'<path d="M370 170 C430 190 440 290 410 380 C398 320 392 260 364 220Z" fill="{hair}"/>')
    elif style == "bob":
        parts.append(f'<path d="M204 250 C196 150 250 110 300 110 C352 110 404 150 396 250 L398 360 C370 380 230 380 202 360Z" fill="{hair}"/>')
    elif style == "bun":
        parts.append(f'<circle cx="300" cy="104" r="40" fill="{hair}"/>')
    if p.get("hijab"):
        hc = p.get("hijabColor", "#8E6F7D")
        parts.append(f'<path d="M196 260 C186 140 246 96 300 96 C356 96 414 140 404 260 L414 420 C400 470 360 492 300 494 C240 492 200 470 186 420Z" fill="{hc}"/>')
        parts.append(f'<path d="M168 520 C190 450 240 440 300 446 C360 440 410 450 432 520 C390 540 210 540 168 520Z" fill="{hc}"/>')
    # telinga
    if not p.get("hijab"):
        parts.append(f'<ellipse cx="220" cy="262" rx="16" ry="26" fill="{shade}"/><ellipse cx="380" cy="262" rx="16" ry="26" fill="{shade}"/>')
    parts.append(f'<path d="{jaw}" fill="{skin}"/>')
    if p.get("hijab"):
        # bingkai wajah hijab
        hc = p.get("hijabColor", "#8E6F7D")
        parts.append(f'<path d="M214 250 C210 160 256 128 300 128 C344 128 390 160 386 250 C386 200 350 156 300 156 C250 156 214 200 214 250Z" fill="{hc}"/>')
        parts.append(f'<path d="M222 300 C226 380 262 410 300 412 C338 410 374 380 378 300 L388 330 C380 410 340 440 300 442 C260 440 220 410 212 330Z" fill="{hc}"/>')
    # rambut depan
    if not p.get("hijab"):
        if style == "short":
            parts.append(f'<path d="M216 236 C206 150 254 116 304 118 C356 120 394 152 386 236 C374 196 350 176 318 172 C290 186 250 186 228 200 C222 210 218 222 216 236Z" fill="{hair}"/>')
        elif style == "sidepart":
            parts.append(f'<path d="M214 240 C204 148 258 112 306 114 C360 116 398 156 388 240 C382 200 368 180 346 170 C300 196 248 176 232 210 C224 222 218 230 214 240Z" fill="{hair}"/>')
            parts.append(f'<path d="M282 132 C300 120 330 120 350 134" fill="none" stroke="#000" stroke-opacity="0.15" stroke-width="3"/>')
        elif style == "crop":
            parts.append(f'<path d="M222 222 C220 160 258 128 300 128 C344 128 382 160 378 222 C368 190 340 170 300 170 C260 170 232 190 222 222Z" fill="{hair}"/>')
        elif style == "wavy":
            parts.append(f'<path d="M214 236 C204 146 256 112 304 114 C356 116 398 150 388 236 C376 206 362 186 340 178 C330 196 306 186 296 176 C280 194 252 182 240 196 C228 208 220 220 214 236Z" fill="{hair}"/>')
        elif style in ("long", "bob", "ponytail", "bun"):
            parts.append(f'<path d="M212 250 C204 150 254 116 302 116 C356 116 400 150 390 250 C384 210 362 176 330 166 C300 196 252 196 226 214 C218 226 214 238 212 250Z" fill="{hair}"/>')
    # wajah
    brow = hair if not p.get("hijab") else "#2E2326"
    eye_y = 262
    parts.append(f'<path d="M244 236 C256 228 272 228 282 234" fill="none" stroke="{brow}" stroke-width="6" stroke-linecap="round"/>')
    parts.append(f'<path d="M318 234 C328 228 344 228 356 236" fill="none" stroke="{brow}" stroke-width="6" stroke-linecap="round"/>')
    if p.get("smile", "soft") == "warm":
        parts.append(f'<path d="M248 {eye_y} C256 {eye_y-9} 270 {eye_y-9} 278 {eye_y}" fill="none" stroke="#2A2226" stroke-width="5" stroke-linecap="round"/>')
        parts.append(f'<path d="M322 {eye_y} C330 {eye_y-9} 344 {eye_y-9} 352 {eye_y}" fill="none" stroke="#2A2226" stroke-width="5" stroke-linecap="round"/>')
    else:
        parts.append(f'<ellipse cx="263" cy="{eye_y}" rx="8" ry="9" fill="#2A2226"/><ellipse cx="337" cy="{eye_y}" rx="8" ry="9" fill="#2A2226"/>')
        parts.append(f'<circle cx="266" cy="{eye_y-3}" r="2.5" fill="#fff"/><circle cx="340" cy="{eye_y-3}" r="2.5" fill="#fff"/>')
    if p.get("glasses"):
        parts.append('<g fill="none" stroke="#3B3438" stroke-width="4"><rect x="236" y="240" width="56" height="42" rx="14"/><rect x="308" y="240" width="56" height="42" rx="14"/><path d="M292 258 C296 252 304 252 308 258"/><path d="M236 256 L222 250"/><path d="M364 256 L378 250"/></g>')
    parts.append(f'<path d="M300 272 C296 296 292 308 300 314 C306 316 310 314 312 310" fill="none" stroke="{shade}" stroke-width="5" stroke-linecap="round"/>')
    mouth = "M272 342 C288 358 312 358 328 342" if p.get("smile", "soft") != "neutral" else "M278 346 C292 352 308 352 322 346"
    parts.append(f'<path d="{mouth}" fill="none" stroke="#9A4E57" stroke-width="6" stroke-linecap="round"/>')
    if g == "f" or p.get("smile") == "warm":
        parts.append('<ellipse cx="248" cy="312" rx="16" ry="9" fill="#E98C8C" opacity="0.28"/><ellipse cx="352" cy="312" rx="16" ry="9" fill="#E98C8C" opacity="0.28"/>')
    if p.get("beard"):
        parts.append(f'<path d="M240 330 C250 390 280 404 300 404 C320 404 350 390 360 330 C350 360 330 372 300 372 C270 372 250 360 240 330Z" fill="{hair}" opacity="0.35"/>')
    return "\n  ".join(parts)

def svg(p):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{background()}{body(p)}\n  {head(p)}\n</svg>'

DOCTORS = {
    "andi":      {"gender": "m", "skin": "medium", "hair": "sidepart", "hairColor": "black", "inner": "#5E7F95", "smile": "soft"},
    "nadia":     {"gender": "f", "skin": "light", "hair": "long", "hairColor": "dark", "inner": "#7FA3B6", "smile": "warm"},
    "raka":      {"gender": "m", "skin": "tan", "hair": "crop", "hairColor": "black", "inner": "#4A3F4B", "glasses": True, "smile": "neutral"},
    "citra":     {"gender": "f", "skin": "light", "hair": "bob", "hairColor": "brown", "inner": "#806C79", "glasses": True, "smile": "soft"},
    "bima":      {"gender": "m", "skin": "deep", "hair": "short", "hairColor": "gray", "inner": "#3F5E6E", "beard": True, "smile": "soft"},
    "salsabila": {"gender": "f", "skin": "medium", "hair": "long", "hijab": True, "hijabColor": "#8E6F7D", "inner": "#C1A0AC", "smile": "soft"},
    "farhan":    {"gender": "m", "skin": "medium", "hair": "wavy", "hairColor": "dark", "inner": "#6C8C7E", "smile": "warm"},
    "maya":      {"gender": "f", "skin": "tan", "hair": "long", "hijab": True, "hijabColor": "#4A3F4B", "inner": "#7FA3B6", "smile": "warm"},
    "reza":      {"gender": "m", "skin": "light", "hair": "short", "hairColor": "black", "inner": "#2F4858", "glasses": True, "smile": "soft"},
    "intan":     {"gender": "f", "skin": "medium", "hair": "ponytail", "hairColor": "black", "inner": "#5E7F95", "smile": "soft"},
}

os.makedirs(OUT, exist_ok=True)
for k, p in DOCTORS.items():
    open(os.path.join(OUT, f"{k}.svg"), "w").write(svg(p))
print("ok", len(DOCTORS))
