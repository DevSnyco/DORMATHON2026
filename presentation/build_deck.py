#!/usr/bin/env python3
# presentation/build_deck.py
# Builds the IRYS pitch deck, speaker script and demo runbook as PDFs in the
# uwitz.org design system (dark #0D0D0F surfaces, red #DA2A1C accent, hairline grid +
# top vignette, Geist/Geist Mono, the 8-point star mark). Fonts in presentation/fonts/.
#
#   python presentation/build_deck.py
#     -> IRYS_pitch_deck.pdf        (16:9 slides)
#     -> IRYS_speaker_script.pdf    (A4, per-slide narration + pitches)
#     -> IRYS_demo_runbook.pdf      (A4, what to run/show/say + fallbacks)

import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, 'fonts')
OUT_DECK = os.path.join(HERE, 'IRYS_pitch_deck.pdf')
OUT_SCRIPT = os.path.join(HERE, 'IRYS_speaker_script.pdf')
OUT_RUNBOOK = os.path.join(HERE, 'IRYS_demo_runbook.pdf')

# ---- design tokens (uwitz ds.css) ----
BG0, BG1, BG2, BG3, BG4 = '#09090A', '#0D0D0F', '#141416', '#1A1A1D', '#222225'
LINE1, LINE2, LINE3 = '#202023', '#2C2C30', '#3D3D42'
FG0, FG1, FG2, FG3 = '#F3F1EF', '#BDB9B6', '#8A8683', '#5C5957'
RED300, RED400, RED500, RED600, RED700 = '#F17A6A', '#E8543F', '#DA2A1C', '#B8210F', '#931A0D'
OK400, AMBER400, BLUE400, CYAN400, WHITE = '#46C95F', '#E9B23C', '#4D9FFF', '#2FD3C9', '#FFFFFF'

def C(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16)/255 for i in (0, 2, 4))

STAR_PTS = [(139.09,460.17),(226.13,340.44),(85.56,294.26),(114.16,205.59),(255.14,251.77),
            (254.32,103.43),(348.72,103.43),(347.90,251.77),(489.29,206.00),(518.30,294.67),
            (377.73,340.44),(463.54,460.17),(388.35,514.93),(301.72,394.79),(214.28,514.52)]

for fname, fam in [('Geist-400.ttf','Geist'), ('Geist-500.ttf','GeistMedium'),
                   ('Geist-600.ttf','GeistSemi'), ('Geist-700.ttf','GeistBold'),
                   ('GeistMono-400.ttf','GeistMono'), ('GeistMono-500.ttf','GeistMonoMedium'),
                   ('GeistMono-600.ttf','GeistMonoSemi')]:
    pdfmetrics.registerFont(TTFont(fam, os.path.join(FONTS, fname)))

SANS, SANSM, SANSB, SANSX = 'Geist', 'GeistMedium', 'GeistSemi', 'GeistBold'
MONO, MONOM, MONOB = 'GeistMono', 'GeistMonoMedium', 'GeistMonoSemi'


# ============================ primitives ==================================
def star(c, cx, cy, size, color, alpha=None):
    xs=[p[0] for p in STAR_PTS]; ys=[p[1] for p in STAR_PTS]
    minx,maxx,miny,maxy=min(xs),max(xs),min(ys),max(ys)
    sc=size/(maxx-minx)
    c.setFillColor(C(color) if isinstance(color,str) else color)
    if alpha is not None: c.setFillAlpha(alpha)
    p=c.beginPath()
    for i,(x,y) in enumerate(STAR_PTS):
        nx=cx-size/2+(x-minx)*sc; ny=cy+size/2-(y-miny)*sc
        (p.moveTo if i==0 else p.lineTo)(nx,ny)
    p.close(); c.drawPath(p,stroke=0,fill=1)
    if alpha is not None: c.setFillAlpha(1)


def glow(c, cx, cy, r, color=RED500, alpha=0.08):
    """Soft radial glow."""
    steps = max(12, int(r/6))
    for i in range(steps, 0, -1):
        a = alpha * (i/steps)
        c.setFillColor(C(color)); c.setFillAlpha(a)
        c.circle(cx, cy, r*(i/steps), stroke=0, fill=1)
    c.setFillAlpha(1)


def bg(c, W, H, watermark=False):
    c.setFillColor(C(BG1)); c.rect(0,0,W,H,stroke=0,fill=1)
    if watermark:
        # large soft bloom in upper right
        glow(c, W*0.85, H*0.22, W*0.9, RED500, alpha=0.006)
        star(c, W*0.82, H*0.30, W*0.62, RED500, alpha=0.002)
    # soft red top glow
    glow(c, W/2, H*0.92, W*1.25, RED500, alpha=0.006)
    # top vignette (softer)
    cx,cy=W/2,H+H*0.04
    for i in range(28,0,-1):
        r=i*(W*0.05)
        c.setFillColor(C(RED500)); c.setFillAlpha(0.0004)
        c.ellipse(cx-r,cy-r*0.68,cx+r,cy+r*0.68,stroke=0,fill=1)
    c.setFillAlpha(1)
    # refined red hairline grid, fades quickly downward
    step=40; c.setLineWidth(0.5); fade_end=H*0.48
    x=0
    while x<=W:
        a = 0.03 * max(0.0, 1 - (0)/(fade_end))  # keep minimal
        for s in range(10):
            y0=H-(H*s/10); y1=H-(H*(s+1)/10)
            a=0.003 * max(0.0,1-(H-y0)/fade_end)
            if a<=0.002: break
            c.setStrokeAlpha(a); c.setStrokeColor(C(RED500)); c.line(x,y0,x,y1)
        x+=step
    y=0
    while y<=H:
        for s in range(14):
            x0=(W*s/14); x1=(W*(s+1)/14)
            a=0.003 * max(0.0,1-(H-y)/fade_end)
            if a<=0.002: break
            c.setStrokeAlpha(a); c.setStrokeColor(C(RED500)); c.line(x0,y,x1,y)
        y+=step
    c.setStrokeAlpha(1)


def mono_label(c, x, y, text, font=MONOB, size=10.5, color=RED300, track=1.4):
    """Letter-spaced mono label. ALWAYS resets Tc — it persists past ET."""
    t=c.beginText(x,y)
    t.setFont(font,size); t.setCharSpace(track); t.setFillColor(C(color))
    t.textOut(text)
    t.setCharSpace(0)
    c.drawText(t)


def eyebrow(c, x, y, text, color=RED300, size=10.5):
    star(c, x+5, y-1, 9, RED500)
    mono_label(c, x+16, y, text.upper(), size=size, color=color, track=1.6)


def headline(c, x, y, text, size=34, maxw=848, color=FG0, font=None):
    font = font or SANSB
    while size>22 and pdfmetrics.stringWidth(text,font,size)>maxw:
        size-=1
    c.setFont(font,size); c.setFillColor(C(color)); c.drawString(x,y,text)
    return size


def wrap(c, text, font, size, maxw):
    words,lines,cur=text.split(),[],''
    for w in words:
        t=(cur+' '+w).strip()
        if c.stringWidth(t,font,size)<=maxw or not cur: cur=t
        else: lines.append(cur); cur=w
    if cur: lines.append(cur)
    return lines


def para(c, x, y, text, maxw, size=12, font=SANS, color=FG1, lh=1.42):
    for ln in wrap(c,text,font,size,maxw):
        c.setFont(font,size); c.setFillColor(C(color)); c.drawString(x,y,ln); y-=size*lh
    return y


def card(c, x, y, w, h, fill=BG2, stroke=LINE2, radius=14, lw=1, accent=None):
    c.setFillColor(C(fill)); c.setStrokeColor(C(stroke)); c.setLineWidth(lw)
    c.roundRect(x,y,w,h,radius,stroke=1,fill=1)
    if accent:  # top accent bar
        c.setFillColor(C(accent)); c.roundRect(x+14,y+h-3,w-28,3,1.5,stroke=0,fill=1)


def chip(c, x, y, text, tone='red', h=22, pad=10, fsize=9.5):
    w=c.stringWidth(text.upper(),MONOB,fsize)+(len(text)-1)*1.4+pad*2
    tones={'red':(RED500,RED300,'#3D1712'),'ok':(OK400,OK400,'#1c3a24'),
           'plain':(LINE3,FG1,BG3),'amber':(AMBER400,AMBER400,'#3a2f12'),
           'blue':(BLUE400,BLUE400,'#16283f')}
    fillc,txtc,strokec=tones[tone]
    c.setFillColor(C(fillc)); c.setFillAlpha(0.12)
    c.setStrokeColor(C(strokec)); c.setLineWidth(1)
    c.roundRect(x,y,w,h,h/2,stroke=1,fill=1); c.setFillAlpha(1)
    mono_label(c,x+pad,y+h/2-fsize*0.36,text,size=fsize,color=txtc,track=1.0)
    return w


def num_circle(c, cx, cy, r, n, fill=RED500, txt=WHITE):
    c.setFillColor(C(fill)); c.circle(cx,cy,r,stroke=0,fill=1)
    c.setFont(MONOB, r*1.05); c.setFillColor(C(txt))
    c.drawCentredString(cx, cy-r*0.35, str(n))


def flow_arrow(c, x1, x2, y, color=LINE3):
    c.setStrokeColor(C(color)); c.setLineWidth(1.5); c.setLineCap(1)
    c.line(x1,y,x2-7,y)
    p=c.beginPath(); p.moveTo(x2,y); p.lineTo(x2-8,y+4.5); p.lineTo(x2-8,y-4.5); p.close()
    c.setFillColor(C(color)); c.drawPath(p,stroke=0,fill=1)


def hairline(c, x1, x2, y, color=LINE1):
    c.setStrokeColor(C(color)); c.setLineWidth(1); c.line(x1,y,x2,y)


def slide_header(c, W, H, eb, title, subtitle=None, rule=True):
    """Standardised slide header. Returns content-top y."""
    eyebrow(c, 56, H-62, eb)
    headline(c, 56, H-104, title, size=33, maxw=W-112)
    y=H-132
    if subtitle:
        y=para(c,56,y,subtitle,W-112,size=13.5,color=FG2,font=SANSM)
        y-=4
    if rule:
        hairline(c,56,W-56,y+2); y-=22
    return y


def footer(c, W, H, n, total):
    hairline(c,48,W-48,40,LINE1)
    star(c,54,26,8,FG3)
    mono_label(c,66,23,'IRYS — AI governance & server access',font=MONO,size=8.5,color=FG3,track=0)
    mono_label(c,W-48-c.stringWidth(f'{n:02d} / {total:02d}',MONOM,8.5),23,f'{n:02d} / {total:02d}',font=MONOM,size=8.5,color=FG3,track=0)


def bullets(c, x, y, items, maxw, size=14, gap=13, lh=1.30, color=FG1, bcolor=RED500):
    for item in items:
        star(c,x+5,y-4.5,8.5,bcolor)
        for ln in wrap(c,item,SANS,size,maxw-18):
            c.setFont(SANS,size); c.setFillColor(C(color)); c.drawString(x+18,y,ln); y-=size*lh
        y-=gap
    return y


# ---- simple line-art icons (drawn in a colored tile) ----
def icon_tile(c, x, y, s, tone):
    c.setFillColor(C(tone)); c.setFillAlpha(0.12)
    c.setStrokeColor(C(tone)); c.setStrokeAlpha(0.4); c.setLineWidth(1)
    c.roundRect(x,y,s,s,10,stroke=1,fill=1)
    c.setFillAlpha(1); c.setStrokeAlpha(1)
    return x+s/2, y+s/2   # center


def icon_doc(c, cx, cy, col):
    c.setStrokeColor(C(col)); c.setLineWidth(1.6); c.setLineCap(1)
    c.roundRect(cx-7,cy-10,14,20,2,stroke=1,fill=0)
    for i,dy in enumerate([5,1,-3]):
        c.line(cx-4,cy+dy,cx+4-(2 if i==2 else 0),cy+dy)


def icon_key(c, cx, cy, col):
    c.setStrokeColor(C(col)); c.setLineWidth(1.6)
    c.rect(cx-8,cy-3,11,9,stroke=1,fill=0)          # lock body
    c.arc(cx-6,cy+4,cx+0,cy+10,0,180)               # shackle (arc just strokes)
    c.setFillColor(C(col)); c.circle(cx-2.5,cy+1.5,1.6,stroke=0,fill=1)


def icon_deploy(c, cx, cy, col):
    c.setStrokeColor(C(col)); c.setLineWidth(1.6); c.setLineCap(1); c.setLineJoin(1)
    p=c.beginPath(); p.moveTo(cx-8,cy-6); p.lineTo(cx-2,cy+0); p.lineTo(cx-8,cy+6)
    c.drawPath(p,stroke=1,fill=0)      # chevron up-left
    c.line(cx-2,cy,cx+8,cy)            # shaft


def icon_audit(c, cx, cy, col):
    c.setStrokeColor(C(col)); c.setLineWidth(1.6); c.setLineCap(1); c.setLineJoin(1)
    c.circle(cx,cy,9,stroke=1,fill=0)
    p=c.beginPath(); p.moveTo(cx-4,cy); p.lineTo(cx-1,cy-3.5); p.lineTo(cx+4.5,cy+3.5)
    c.drawPath(p,stroke=1,fill=0)


# ============================ SLIDE DECK ==================================
W, H = 960, 540
TOTAL = 10

def s01_title(c):
    bg(c, W, H, watermark=True)
    tile=76; tx=W/2-168; ty=H-208
    c.setFillColor(C(RED500)); c.roundRect(tx,ty,tile,tile,18,stroke=0,fill=1)
    star(c, tx+tile/2, ty+tile/2, 36, WHITE)
    c.setFont(SANSX, 74); c.setFillColor(C(FG0))
    c.drawString(tx+tile+22, ty+10, 'IRYS')
    eyebrow(c, tx+tile+26, ty+tile-4, 'hackathon mvp')
    # tagline
    c.setFont(SANSM, 18); c.setFillColor(C(FG1))
    yy=ty-40
    for ln in wrap(c,'AI governance & server access — one control plane for provider organisations.',SANSM,18,520):
        c.drawString(tx+tile+22,yy,ln); yy-=25
    # capability pills
    cx=tx+tile+22
    for label,tone in [('dashboard','red'),('mcp server','plain'),('cli','plain'),('ssh agent','plain')]:
        cx+=chip(c,cx,yy-30,label,tone)+8
    # bottom meta
    mono_label(c,48,44,'governance files  ·  scoped ssh keys  ·  deployment procedures  ·  audit',font=MONO,size=10,color=FG3,track=0.6)
    footer(c,W,H,1,TOTAL); c.showPage()


def s02_problem(c):
    bg(c, W, H)
    y=slide_header(c,W,H,'the problem','AI agents ship faster than governance.',
                   'The rules exist — but they never travel with the work.')
    y-=8
    bullets(c,56,y,[
        'Compliance lives in wikis and senior engineers’ heads — not in the tools people actually use.',
        'Even experienced engineers forget a crucial control; interns and new hires never learned them.',
        'Server access is shared keys and stale authorized_keys — no per-project scope, no revocation.',
        'Your AI agent knows none of your standards — so it cannot possibly follow them.',
    ],520,size=14.5,gap=17)
    sx,sw=634,270
    stats=[('0','source of truth for AI rules','the agent improvises'),
           ('N×','checklists redone per dev','same rules, re-litigated'),
           ('?','who had prod access last month','no scope, no audit')]
    sy=H-150
    for big,cap,sub in stats:
        card(c,sx,sy-104,sw,104,accent=RED500)
        c.setFont(SANSX,38); c.setFillColor(C(RED300)); c.drawString(sx+20,sy-50,big)
        c.setFont(SANSB,12); c.setFillColor(C(FG0)); c.drawString(sx+20,sy-72,cap)
        mono_label(c,sx+20,sy-90,sub,font=MONO,size=8.5,color=FG3,track=0.3)
        sy-=116
    footer(c,W,H,2,TOTAL); c.showPage()


def s03_idea(c):
    bg(c, W, H)
    y=slide_header(c,W,H,'the idea','Define once. Enforce everywhere.',
                   'One source of truth for agent behaviour AND server access — not another policy doc.')
    cols=[('Define','Describe the project in plain language, or write rules by hand. Toggles, compliance checklists and quality bars become the source of truth.',icon_doc,RED500),
          ('Distribute','IRYS generates AGENTS.md / COMMANDCODE.md / IRYS.md. CLI syncs them into repos; MCP serves them to any AI coding harness.',icon_key,AMBER400),
          ('Enforce','Scoped SSH keys reach only in-scope servers. Deployments follow the reviewed procedure — and every action is audited.',icon_deploy,OK400)]
    cw,gap=268,22; x=56; cy=y-176; ch=168
    for i,(title,desc,icon,tone) in enumerate(cols):
        card(c,x,cy,cw,ch)
        num_circle(c,x+30,cy+ch-28,13,i+1)
        ccx,ccy=icon_tile(c,x+cw-58,cy+ch-64,42,tone)
        icon(c,ccx,ccy,tone)
        c.setFont(SANSB,17); c.setFillColor(C(FG0)); c.drawString(x+20,cy+ch-72,title)
        para(c,x+20,cy+ch-100,desc,cw-40,size=11.5,color=FG1)
        if i<2: flow_arrow(c,x+cw+2,x+cw+gap-2,cy+ch/2)
        x+=cw+gap
    # bottom flow strip
    strip=cy-40
    hairline(c,56,W-56,strip+22,LINE1)
    mono_label(c,56,strip,'dashboard  →  governance files + scope  →  cli / mcp  →  agent ssh  →  scoped server',font=MONOM,size=11,color=FG2,track=0.2)
    footer(c,W,H,3,TOTAL); c.showPage()


def s04_pillars(c):
    bg(c, W, H)
    # minimal, low
    c.setFont(SANSX, 36)
    c.setFillColor(C(FG0))
    c.drawString(56, H-110, 'What IRYS does')
    c.setFont(SANSM, 16)
    c.setFillColor(C(FG1))
    c.drawString(56, H-140, 'Four surfaces, one control plane.')
    hairline(c, 56, W-56, H-156)
    items = [
        ('AI governance files', icon_doc, RED500, 'AGENTS.md / COMMANDCODE.md / IRYS.md generated from toggles, compliance & quality controls — describe mode or fully manual.'),
        ('Scoped SSH access', icon_key, OK400, 'Members scoped project-by-project. authorized_keys recomputed per scope; keys added and removed from the dashboard.'),
        ('Deployment procedures', icon_deploy, AMBER400, 'Free-text guideline + optional steps → generated bash script and systemd unit at /services/{project}.'),
        ('Audit everything', icon_audit, BLUE400, 'Logins, key syncs, scope changes, deploys — every governed action recorded and queryable via CLI / MCP.'),
    ]
    cw, ch = 420, 116
    gx, gy = 20, 10
    x0, y0 = 56, H-240
    for i, (title, icon_fn, tone, desc) in enumerate(items):
        x = x0 + (i % 2)*(cw+gx)
        yy = y0 - (i//2)*(ch+gy)
        card(c,x,yy,cw,ch,accent=tone)
        cx,cy = icon_tile(c,x+12,yy+ch-42,32,tone)
        icon_fn(c,cx,cy,tone)
        c.setFont(SANSB,13)
        c.setFillColor(C(FG0))
        c.drawString(x+54,yy+ch-26,title)
        para(c,x+14,yy+ch-56,desc,cw-28,size=10,color=FG1,lh=1.28)
    footer(c,W,H,4,TOTAL)
    c.showPage()
def s05_how(c):
    """CORRECTED SSH story: keys pull (no inbound SSH from IRYS); deploys act (agent SSHes in)."""
    bg(c, W, H)
    y=slide_header(c,W,H,'how it works','Keys pull. Deploys act.',
                   'IRYS never SSHes into your hosts to manage keys — but the agent it keys CAN ssh in to deploy.')
    # --- PLANE 1: key sync (pull) ---
    mono_label(c,56,y,'plane 1 — key sync · pull-based',size=10.5,color=CYAN400,track=1.5)
    ry=y-70
    steps=[('register','Admin adds a server in the dashboard → one-time bootstrap token issued.'),
           ('bootstrap','One curl command on the host: creates the irys user, links, installs a 60s timer.'),
           ('pull','Agent pulls authorized_keys per scope. IRYS never needs inbound SSH.')]
    cw,gap=268,22; x=56
    for i,(k,v) in enumerate(steps):
        card(c,x,ry-56,cw,56,fill=BG3)
        num_circle(c,x+24,ry-28,11,i+1,fill=CYAN400)
        mono_label(c,x+44,ry-22,k.upper(),size=9.5,color=CYAN400,track=1.2)
        para(c,x+44,ry-38,v,cw-58,size=9.8,color=FG1,lh=1.3)
        if i<2: flow_arrow(c,x+cw+2,x+cw+gap-2,ry-28)
        x+=cw+gap
    # --- PLANE 2: deployment (agent acts) ---
    dy=ry-96
    mono_label(c,56,dy,'plane 2 — deployment · your agent acts',size=10.5,color=RED300,track=1.5)
    dy2=dy-70
    steps2=[('keyed','The agent holds an SSH key IRYS provisioned — only because its project is in scope.'),
            ('ssh in','Agent SSHes into the scoped server with that key and runs the IRYS deploy procedure.'),
            ('apply','git pull → build → /services/{project} → systemd unit installed & restarted → audited.')]
    x=56
    for i,(k,v) in enumerate(steps2):
        card(c,x,dy2-56,cw,56,fill=BG2,accent=RED500 if i==1 else None)
        num_circle(c,x+24,dy2-28,11,i+1,fill=RED500)
        mono_label(c,x+44,dy2-22,k.upper(),size=9.5,color=RED300,track=1.2)
        para(c,x+44,dy2-38,v,cw-58,size=9.8,color=FG1,lh=1.3)
        if i<2: flow_arrow(c,x+cw+2,x+cw+gap-2,dy2-28,color=RED700)
        x+=cw+gap
    # takeaway
    ty=dy2-84
    card(c,56,ty,W-112,44,fill=BG3,stroke=RED700)
    star(c,78,ty+22,11,RED500)
    c.setFont(SANSB,13); c.setFillColor(C(FG0))
    c.drawString(96,ty+26,'IRYS doesn’t SSH in — your agent does. Scoped, keyed and audited by IRYS.')
    footer(c,W,H,5,TOTAL); c.showPage()


def s06_demo(c):
    bg(c, W, H)
    y=slide_header(c,W,H,'live demo','Five minutes. Five proofs.',
                   'Each beat maps to a step in the demo runbook.')
    beats=[('login','irys login','Local SSH key discovered, fingerprinted, auto-registered to scope.'),
           ('govern','describe → AGENTS.md','Real rules, GDPR checklist, quality bar — generated live.'),
           ('cli + mcp','same file, twice','CLI and MCP return the exact governance the provider authored.'),
           ('scope','keys recompute','Add server to scope → authorized_keys rebuilt for that scope only.'),
           ('audit','full trail','Every step above lands in the audit log — queryable, attributable.')]
    cw,gap=161,16; x=56; cy=y-130; ch=118
    for i,(tag,cmd,desc) in enumerate(beats):
        card(c,x,cy,cw,ch)
        num_circle(c,x+22,cy+ch-24,11,i+1)
        mono_label(c,x+40,cy+ch-28,tag.upper(),size=8.5,color=RED300,track=1.0)
        c.setFont(MONOM,10.5); c.setFillColor(C(FG0))
        for j,ln in enumerate(wrap(c,cmd,MONOM,10.5,cw-28)[:2]):
            c.drawString(x+14,cy+ch-52-j*14,ln)
        para(c,x+14,cy+ch-84,desc,cw-28,size=9.5,color=FG2,lh=1.32)
        if i<4: flow_arrow(c,x+cw+1,x+cw+gap-1,cy+ch/2)
        x+=cw+gap
    # timing strip
    hairline(c,56,W-56,cy-28,LINE1)
    mono_label(c,56,cy-48,'~25s each  ·  dashboard + terminal side by side  ·  fallbacks in the runbook',font=MONO,size=9.5,color=FG3,track=0.4)
    footer(c,W,H,6,TOTAL); c.showPage()


def s07_uni(c):
    bg(c, W, H)
    y=slide_header(c,W,H,'for universities','Set the standard once — every project inherits it.',rule=True)
    bullets(c,56,y,[
        'Professors define what students CAN and CANNOT do on each assigned project — inside the tools students already use.',
        'Code-quality bars, submission rules and compliance become the project’s AGENTS.md — the student’s AI follows them by default.',
        'No more “the agent wrote it, not me”: every agent action on lab infra is scoped and audited.',
        'Per-team SSH scope on shared lab servers — granted at kickoff, revoked at the deadline.',
        'TAs stop policing the same ten violations; the standard is encoded once, enforced everywhere.',
    ],548,size=13.5,gap=14)
    # right: course setup panel
    px,pw=634,270; py=y-262; ph=262
    card(c,px,py,pw,ph,fill=BG3)
    mono_label(c,px+20,py+ph-26,'course setup',size=10,color=RED300,track=1.5)
    c.setFont(SANSB,15); c.setFillColor(C(FG0)); c.drawString(px+20,py+ph-52,'CS-3010 · capstone')
    hairline(c,px+20,px+pw-20,py+ph-66,LINE2)
    rows=[('project','atlas-platform'),('scope','team 4 (5 students)'),
          ('server','lab-staging (scoped)'),('expiry','scope ends May 12')]
    ry=py+ph-90
    for k,v in rows:
        mono_label(c,px+20,ry,k.upper(),size=8.5,color=FG3,track=1.0)
        c.setFont(MONOM,10.5); c.setFillColor(C(FG1)); c.drawString(px+20,ry-15,v)
        ry-=38
    mono_label(c,px+20,ry-2,'rules',size=8.5,color=FG3,track=1.0)
    ry-=18
    for r in ['no prod writes without CI','PII encrypted at rest','80% test coverage']:
        star(c,px+24,ry-3,7,OK400)
        c.setFont(SANS,10); c.setFillColor(C(FG1)); c.drawString(px+36,ry,r)
        ry-=16
    footer(c,W,H,7,TOTAL); c.showPage()


def s08_smb(c):
    bg(c, W, H)
    y=slide_header(c,W,H,'for small businesses','Compliance by default — nobody has to remember it.')
    bullets(c,56,y,[
        'GDPR, secret-handling and PII rules are baked into every agent by default — not re-checked per developer, per ticket.',
        'Experienced devs forget crucial controls too; new interns never knew them. With IRYS they don’t have to think about it.',
        'The agent already knows what the company needs, wants and prefers — from IRYS instructions, guidelines and documents.',
        'Day-one productivity: a new hire’s AI is onboarded the moment they log in through the CLI.',
        'Scoped server access replaces shared root keys — remove someone, their access disappears with them.',
    ],548,size=13.5,gap=14)
    px,pw=634,270; py=y-262; ph=262
    card(c,px,py,pw,ph,fill=BG3)
    mono_label(c,px+20,py+ph-26,'on by default',size=10,color=OK400,track=1.5)
    checks=[('GDPR','PII encrypted, never logged'),('SOC2','all prod access audited'),
            ('Secrets','scanned on every commit'),('Review','no merge without approval')]
    ry=py+ph-58
    for k,v in checks:
        c.setStrokeColor(C(OK400)); c.setLineWidth(1.7); c.setLineCap(1); c.setLineJoin(1)
        c.roundRect(px+20,ry-10,16,16,4,stroke=1,fill=0)
        c.line(px+24,ry-2,px+27,ry-5.5); c.line(px+27,ry-5.5,px+32.5,ry+2.5)
        c.setFont(SANSB,13); c.setFillColor(C(FG0)); c.drawString(px+46,ry,k)
        c.setFont(SANS,10.5); c.setFillColor(C(FG2)); c.drawString(px+46,ry-15,v)
        ry-=52
    hairline(c,px+20,px+pw-20,ry+22,LINE2)
    mono_label(c,px+20,ry+4,'the agent knows your standards',size=8.5,color=FG3,track=0.8)
    footer(c,W,H,8,TOTAL); c.showPage()


def s09_stack(c):
    bg(c, W, H)
    y=slide_header(c,W,H,'under the hood','Built lean. Shown honestly.')
    rows=[('api & dashboard','Node + Express · JSON store · JWT/bcrypt · React 18 SPA (uwitz design system)'),
          ('mcp server','10 tools + governance resources over stdio — Claude Code, Cursor, CodeBuddy connect as-is'),
          ('cli','irys login / sync-key / governance / sync / deploy / scope / audit — same shared client'),
          ('key agent','POSIX bash · systemd timer (cron fallback) · host pulls keys — no inbound SSH from IRYS'),
          ('deploy','your agent SSHes in with the IRYS-provisioned key, runs the reviewed procedure, audits it')]
    ry=y-6
    for k,v in rows:
        card(c,56,ry-52,W-112,52)
        mono_label(c,76,ry-31,k.upper(),size=10.5,color=RED300,track=1.2)
        c.setFont(SANS,12.5); c.setFillColor(C(FG1)); c.drawString(288,ry-31,v)
        ry-=62
    footer(c,W,H,9,TOTAL); c.showPage()


def s10_ask(c):
    bg(c, W, H, watermark=True)
    star(c,W/2,H-158,58,RED500)
    c.setFont(SANSX,50); c.setFillColor(C(FG0))
    w=c.stringWidth('Thank you.',SANSX,50); c.drawString((W-w)/2,H-244,'Thank you.')
    c.setFont(SANSM,16); c.setFillColor(C(FG1))
    msg='Pilots wanted: one course, one small team. If your agents ship to real servers — let’s talk.'
    w=c.stringWidth(msg,SANSM,16); c.drawString((W-w)/2,H-282,msg)
    cx=W/2-160
    for label,tone in [('localhost:4000','red'),('irys cli + mcp','plain'),('demo runbook','plain')]:
        cx+=chip(c,cx,H-336,label,tone)+10
    footer(c,W,H,10,TOTAL); c.showPage()


def build_deck():
    c=canvas.Canvas(OUT_DECK,pagesize=(W,H))
    c.setTitle('IRYS — Pitch Deck'); c.setAuthor('IRYS')
    for fn in [s01_title,s02_problem,s03_idea,s04_pillars,s05_how,
               s06_demo,s07_uni,s08_smb,s09_stack,s10_ask]:
        fn(c)
    c.save(); print('wrote',OUT_DECK)


# ======================= A4 document base (script/runbook) ================
PW, PH = A4
M = 56
usable = PW-2*M

class Doc:
    def __init__(self, out, title, footer_label):
        self.c=canvas.Canvas(out,pagesize=A4)
        self.c.setTitle(title)
        self.fl=footer_label
        self.y=0; self.page=1
        self._new_page(first=True)

    def _new_page(self, first=False):
        c=self.c
        if not first: c.showPage()
        self.page+=1
        bg(c,PW,PH)
        hairline(c,M,PW-M,44,LINE1)
        star(c,M+6,30,8,FG3)
        mono_label(c,M+18,27,self.fl,font=MONO,size=8,color=FG3,track=0)
        mono_label(c,PW-M-40,27,f'p. {self.page-1}',font=MONOM,size=8,color=FG3,track=0)
        self.y=PH-64

    def _need(self,h):
        if self.y-h<60: self._new_page()

    def doc_title(self,sub):
        c=self.c
        star(c,M+12,self.y-6,20,RED500)
        c.setFont(SANSX,25); c.setFillColor(C(FG0))
        c.drawString(M+34,self.y-14,self.title_text)
        self.y-=38
        self.y=para(c,M,self.y,sub,usable,size=11.5,color=FG2)
        self.y-=6
        hairline(c,M,PW-M,self.y,RED700); self.y-=24

    def h(self,text):
        self._need(56)
        star(self.c,M+5,self.y-2,9,RED500)
        mono_label(self.c,M+16,self.y,text.upper(),track=1.6)
        self.y-=26

    def h2(self,text):
        self._need(34)
        self.c.setFont(SANSB,14.5); self.c.setFillColor(C(FG0))
        self.c.drawString(M,self.y,text); self.y-=21

    def body(self,text,size=11,color=FG1,font=SANS,gap=7):
        self._need(size*1.45+gap)
        self.y=para(c=self.c,x=M,y=self.y,text=text,maxw=usable,size=size,font=font,color=color)
        self.y-=gap

    def cue(self,text):
        self._need(30)
        for ln in wrap(self.c,text,MONOM,9.5,usable-16):
            self._need(14)
            self.c.setFont(MONOM,9.5); self.c.setFillColor(C(AMBER400))
            self.c.drawString(M+10,self.y,ln); self.y-=13.5
        self.y-=5

    def speak(self,text):
        self._need(40)
        lines=wrap(self.c,text,SANS,11,usable-20)
        top=self.y
        for ln in lines:
            self._need(15.5)
            self.c.setFont(SANS,11); self.c.setFillColor(C(FG1))
            self.c.drawString(M+20,self.y,ln); self.y-=15.5
        self.c.setStrokeColor(C(RED600)); self.c.setLineWidth(2)
        self.c.line(M+6,top+4,M+6,self.y+11)
        self.y-=10

    def bullets(self,items,size=10.5):
        for it in items:
            self._need(size*1.45)
            star(self.c,M+5,self.y-2,7.5,RED500)
            for ln in wrap(self.c,it,SANS,size,usable-18):
                self._need(size*1.45)
                self.c.setFont(SANS,size); self.c.setFillColor(C(FG1))
                self.c.drawString(M+16,self.y,ln); self.y-=size*1.45
            self.y-=4
        self.y-=4

    def code(self,text,head=None):
        """Mono command block on an inset background."""
        lines=[]
        for seg in text.split('\n'):
            lines+=wrap(self.c,seg,MONOM,9.5,usable-28) or ['']
        h=len(lines)*13.5+16+(16 if head else 0)
        self._need(h+10)
        c=self.c
        c.setFillColor(C(BG0)); c.setStrokeColor(C(LINE2)); c.setLineWidth(1)
        c.roundRect(M,self.y-h+12,usable,h,8,stroke=1,fill=1)
        yy=self.y-4
        if head:
            mono_label(c,M+14,yy,head.upper(),size=8,color=FG3,track=1.2); yy-=16
        for ln in lines:
            c.setFont(MONOM,9.5); c.setFillColor(C(OK400 if ln.strip().startswith('$') else FG1))
            c.drawString(M+14,yy,ln); yy-=13.5
        self.y-=h+10

    def note(self,text):
        self._need(30)
        top=self.y
        self.y=para(self.c,M+12,self.y,text,usable-12,size=10,color=FG2,font=SANS)
        self.c.setStrokeColor(C(RED700)); self.c.setLineWidth(2)
        self.c.line(M+2,top+4,M+2,self.y+8)
        self.y-=8

    def rule(self):
        self._need(22)
        hairline(self.c,M,PW-M,self.y,LINE1); self.y-=22

    def save(self):
        self.c.save(); print('wrote',self.out)


# ============================ SPEAKER SCRIPT ==============================
class ScriptDoc(Doc):
    title_text='IRYS — speaker script'
    def __init__(self):
        super().__init__(OUT_SCRIPT,'IRYS — Speaker Script','IRYS — speaker script')
        self.out=OUT_SCRIPT


def build_script():
    d=ScriptDoc()
    d.doc_title('≈3 minute pitch + 2 minute demo. Brackets = stage directions. Each slide: cue → spoken script.')

    d.h('slide 1 — title · 0:00–0:20')
    d.cue('[Walk on. Pause. Let the logo sit for a beat.]')
    d.speak('“This is IRYS — a control plane for AI governance and server access. One place where an organisation defines what its AI agents may do, and who may reach its servers — and every harness and every host obeys it.”')

    d.h('slide 2 — the problem · 0:20–0:50')
    d.bullets([
        'Compliance knowledge lives in wikis and senior engineers’ heads — not in the tools people actually use.',
        'Even experienced developers forget a crucial control; interns and new hires never learned them at all.',
        'Server access = shared keys, stale authorized_keys, no per-project scope or revocation.',
    ])
    d.speak('“Ask anyone here when they last re-read the compliance checklist before shipping. That’s the problem: the rules exist, but they don’t travel with the work. And SSH access is still shared keys nobody rotates.”')

    d.h('slide 3 — the idea · 0:50–1:20')
    d.speak('“IRYS inverts it. You define the rules once, in a dashboard — in plain language, or by hand. IRYS turns them into the files AI harnesses already read: AGENTS.md, COMMANDCODE.md, IRYS.md. The CLI syncs them into repos, the MCP server feeds them to any coding agent. And on the server side, scoped SSH keys are provisioned and revoked from the same place.”')

    d.h('slide 4 — four surfaces · 1:20–1:40')
    d.bullets(['Governance files · scoped SSH keys · deployment procedures · full audit trail.'])

    d.h('slide 5 — how it works · 1:40–2:10')
    d.speak('“Two planes. For keys, the host pulls: a one-line bootstrap installs a tiny agent that fetches authorized_keys every minute — so IRYS never needs inbound SSH to manage access. For deploys, your agent acts: it holds the key IRYS provisioned — only because its project is in scope — SSHes into that server, and runs the reviewed deployment procedure. So IRYS doesn’t SSH in; your agent does — scoped, keyed and audited by us.”')

    d.h('slide 6 — live demo · 2:10–4:00')
    d.cue('[Dashboard at localhost:4000 + terminal side by side. Log in: admin@irys.dev / demo1234.]')
    d.speak('“Let’s prove it. I log in — IRYS discovers my local SSH key, fingerprints it, registers it for my scoped projects. I describe the project — real rules, GDPR checklist, quality bar — and it generates AGENTS.md. Same file comes back through the CLI and through MCP. Add a server to scope and only then do its keys include me. And every step lands in the audit log.”')

    d.rule()
    d.h('who it’s for')
    d.h2('Universities')
    d.cue('[Slide 7] The teaching side.')
    d.speak('“For universities: the module already defines what students can and cannot do — what libraries are banned, how code must be reviewed, what compliance a project must meet. Today that lives in a PDF. With IRYS, the university sets those standards once, per assigned project, and every student’s AI agent follows them by default. Quality and compliance stop being per-student checkboxes and become the environment itself. Lab access is scoped per team and expires at the deadline — no key-hygiene homework, and every agent action on shared infrastructure is attributable.”')

    d.h2('Small businesses')
    d.cue('[Slide 8] The shipping side.')
    d.speak('“For a five-person company, IRYS is the compliance team you don’t have. GDPR, secret handling, review gates — encoded once, on by default, for every developer and every agent. The new intern’s AI already knows what the company needs, wants and prefers, straight from the IRYS guidelines — they don’t have to remember it, and they can’t quietly skip it. Log in through the CLI on day one and you’re onboarded: right rules, right scope, nothing shared, everything audited.”')

    d.rule()
    d.h('close · 4:00–4:30')
    d.speak('“Under the hood it’s deliberately lean — Node, React, a bash agent — and what’s new is the control plane: one source of truth for AI behaviour and server access, with the audit trail to prove it. We’re looking for pilots — one course, one small team. Thank you.”')

    d.h('anticipated questions')
    d.bullets([
        '“Is this another policy doc generator?” — No: it is the enforcement path too — files, scope, keys, audit.',
        '“How do agents authenticate?” — CLI stores a JWT at ~/.irys; the MCP server reuses it. One login.',
        '“Does IRYS SSH into my servers?” — Not to manage keys: hosts pull. Your agent SSHes in to deploy — with an IRYS-scoped key, following the reviewed procedure, fully audited.',
        '“What about secrets?” — IRYS governs access and behaviour; secrets stay in your vault, referenced by policy.',
    ], size=10.5)

    d.out=OUT_SCRIPT
    d.save()


# ============================== DEMO RUNBOOK ==============================
class RunbookDoc(Doc):
    title_text='IRYS — demo runbook'
    def __init__(self):
        super().__init__(OUT_RUNBOOK,'IRYS — Demo Runbook','IRYS — demo runbook')
        self.out=OUT_RUNBOOK


def build_runbook():
    d=RunbookDoc()
    d.doc_title('What to run, show and say during the live demo (~5 min). '
                'Commands are real and verified against the repo. Keep a terminal and the dashboard side by side.')

    d.h('0 · before you present (t-15 min)')
    d.body('From the repo root, in order. The seed wipes and rebuilds demo data — do it fresh so the audit log starts clean.')
    d.code('$ npm install\n$ npm run build:frontend     # only if you edited app.jsx\n$ rm -f data/db.json && npm run seed\n$ npm start                 # API + dashboard on http://localhost:4000', head='setup')
    d.body('Verify it is up, then open http://localhost:4000 in your browser (login: admin@irys.dev / demo1234). '
           'Open a second terminal for the CLI. Optional pre-flight: npm run smoke (9 checks) must print 9 passed.')
    d.note('The seeded demo has: project atlas-platform, members Ada + Grace + admin (all scoped), servers staging-01 and prod-edge-01 (linked, in scope), build-runner (unscoped).')

    d.rule()
    d.h('1 · beat 1 — login & key auto-sync  (~25s)')
    d.cue('[Terminal. Shows CLI auth + local SSH key discovery.]')
    d.code('$ node cli/irys.js login --email admin@irys.dev --password demo1234', head='run')
    d.body('What the audience sees: “Found ssh-ed25519 key SHA256:…”, then “Key → 1 project(s)” and both in-scope servers re-synced. '
           'Say: “my local key is now registered for exactly the projects I’m scoped to — nothing shared, nothing manual.”')

    d.rule()
    d.h('2 · beat 2 — governance from a description  (~25s)')
    d.cue('[Dashboard. Projects → atlas-platform → Governance tab.]')
    d.body('Show the describe box, the governance toggles, the GDPR/SOC2 checklist and the quality bar. '
           'Click “Generate & sync AI files”, then flip through the generated AGENTS.md preview. '
           'Say: “the provider’s standards — in plain language — became the file the agent reads. Manual mode is there too, for authors who want full control.”')

    d.rule()
    d.h('3 · beat 3 — same file via CLI and MCP  (~30s)')
    d.cue('[Terminal. Proves the harness-facing path.]')
    d.code('$ node cli/irys.js governance atlas-platform --file AGENTS.md\n$ node mcp/showcase.cjs        # initialize → tools/list → irys_get_governance', head='run')
    d.body('Both return the identical AGENTS.md the provider authored (the MCP run prints 9–10 tools and a ~4.9k-char governance file). '
           'Say: “CLI for repos and CI, MCP for the agent itself — one source of truth, two distribution paths.”')

    d.rule()
    d.h('4 · beat 4 — scoped keys  (~25s)')
    d.cue('[Dashboard. Servers tab → any in-scope server → Sync keys.]')
    d.body('Show the computed authorized_keys: one line per scoped user, each tagged irys:<email>:<project>. '
           'Point out build-runner is unscoped and therefore gets nobody’s keys. '
           'Say: “scope first, access second — the key only exists on the server because the project is in scope.” '
           'Optional: open the Bootstrap modal to show the one-line host enrolment command.')

    d.rule()
    d.h('5 · beat 5 — the audit trail  (~20s)')
    d.cue('[Dashboard. Audit tab.]')
    d.body('Scroll the log: logins, sshkey.selfsync, server.link, server.sync, governance.save. '
           'Say: “every step I just did is in here — attributable and queryable from the CLI too (irys audit).”')

    d.rule()
    d.h('6 · the ssh question (expect it)')
    d.body('If asked “doesn’t this need inbound SSH / doesn’t the agent SSH in?” — answer with the two planes:')
    d.bullets([
        'Keys: pull-based. The host agent fetches authorized_keys every 60s. IRYS never SSHes in to manage keys.',
        'Deploys: the developer’s AI agent SSHes in — with the key IRYS provisioned (scope-gated) — and runs the IRYS deploy procedure (git pull → build → /services/{project} → systemd).',
        'So: IRYS doesn’t SSH in; the agent does — scoped, keyed and audited by IRYS.',
    ])
    d.code('$ node cli/irys.js deploy atlas-platform --script   # what the agent runs on the host', head='show the artifact')

    d.rule()
    d.h('7 · if something breaks (fallbacks)')
    d.bullets([
        'Server not responding: check it is running (npm start), then curl http://localhost:4000/api/health → {"ok":true}.',
        'Dashboard looks wrong/blank: npm run build:frontend, hard-refresh the browser.',
        'Messy data / want a clean slate: rm -f data/db.json && npm run seed, restart, log in again.',
        'No local SSH key for the auto-sync beat: ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N "" then retry login.',
        'CLI/MCP path slow to demo: npm run showcase:cli and npm run showcase:mcp are scripted end-to-end proofs.',
        'Total fallback: npm run smoke prints 9/9 PASS — say “here’s the green suite” and move on.',
    ], size=10.5)

    d.rule()
    d.h('8 · timing summary')
    d.body('Beats 1–5 ≈ 25s each (~2 min total). Governance (beat 2) and the SSH answer (section 6) are where questions cluster — '
           'budget extra time there and trim beat 4 if pressed. Full arc: login → govern → distribute → scope → audit.')
    d.note('Demo credentials: admin@irys.dev / demo1234 · dashboard http://localhost:4000 · everything runs locally, no external services.')

    d.save()


if __name__=='__main__':
    build_deck()
    build_script()
    build_runbook()
