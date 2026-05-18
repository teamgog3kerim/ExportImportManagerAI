from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from lxml import etree
from PIL import Image
import os

# Peach palette
BG        = RGBColor(0xFF, 0xF4, 0xED)
BG_SOFT   = RGBColor(0xFD, 0xE7, 0xD8)
PEACH     = RGBColor(0xFF, 0xB0, 0x88)
PEACH_DK  = RGBColor(0xE0, 0x78, 0x56)
INK       = RGBColor(0x3D, 0x28, 0x17)
MUTED     = RGBColor(0x8B, 0x76, 0x65)
LINE      = RGBColor(0xE9, 0xCF, 0xBC)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)

W, H = Inches(13.333), Inches(7.5)

prs = Presentation()
prs.slide_width  = W
prs.slide_height = H
blank = prs.slide_layouts[6]

def add_rect(s, x, y, w, h, fill=None, line=None, line_w=None):
    shp = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    shp.shadow.inherit = False
    if fill is None:
        shp.fill.background()
    else:
        shp.fill.solid()
        shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        if line_w is not None:
            shp.line.width = line_w
    return shp

def add_text(s, x, y, w, h, text, size=18, bold=False, color=INK, align=PP_ALIGN.LEFT, font="Calibri", anchor=MSO_ANCHOR.TOP, italic=False, tracking=None):
    tb = s.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.margin_left = tf.margin_right = 0
    tf.margin_top = tf.margin_bottom = 0
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    lines = text.split("\n") if isinstance(text, str) else text
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run()
        r.text = line
        r.font.name = font
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.italic = italic
        r.font.color.rgb = color
        if tracking is not None:
            rPr = r._r.get_or_add_rPr()
            rPr.set("spc", str(tracking))
    return tb

def bg(s, color=BG):
    add_rect(s, 0, 0, W, H, fill=color)

def page_chrome(s, page_num, total=15, section=""):
    # Top thin peach bar
    add_rect(s, 0, 0, W, Inches(0.05), fill=PEACH)
    # Bottom footer area
    add_text(s, Inches(0.6), Inches(7.05), Inches(4), Inches(0.3),
             "EXIMMAN  ·  My Import & Export Manager", size=9, color=MUTED, tracking=200)
    if section:
        add_text(s, Inches(5), Inches(7.05), Inches(4), Inches(0.3),
                 section.upper(), size=9, color=MUTED, align=PP_ALIGN.CENTER, tracking=300)
    add_text(s, Inches(11.5), Inches(7.05), Inches(1.2), Inches(0.3),
             f"{page_num:02d} / {total:02d}", size=9, color=MUTED, align=PP_ALIGN.RIGHT)

def title_block(s, eyebrow, title, subtitle=None, x=Inches(0.7), y=Inches(0.7), w=Inches(11.9)):
    add_text(s, x, y, w, Inches(0.35), eyebrow.upper(), size=10, bold=True, color=PEACH_DK, tracking=400)
    add_text(s, x, y + Inches(0.35), w, Inches(1.0), title, size=36, bold=True, color=INK, font="Georgia")
    # accent underline
    add_rect(s, x, y + Inches(1.25), Inches(0.6), Inches(0.04), fill=PEACH_DK)
    if subtitle:
        add_text(s, x, y + Inches(1.35), w, Inches(0.6), subtitle, size=14, color=MUTED)

def add_image_panel(s, path, x, y, w, h, radius=True):
    # White card under the image to give a clean inset frame
    card = add_rect(s, x - Inches(0.08), y - Inches(0.08), w + Inches(0.16), h + Inches(0.16),
                    fill=WHITE, line=LINE, line_w=Pt(0.75))
    # crop image to the panel aspect ratio so it fills cleanly
    try:
        img = Image.open(path)
        iw, ih = img.size
        panel_ratio = w / h
        img_ratio = iw / ih
        if img_ratio > panel_ratio:
            new_w = int(ih * panel_ratio)
            left = (iw - new_w) // 2
            img = img.crop((left, 0, left + new_w, ih))
        else:
            new_h = int(iw / panel_ratio)
            img = img.crop((0, 0, iw, new_h))
        tmp = path.replace(".jpg", "_crop.jpg")
        img.save(tmp, quality=92)
        s.shapes.add_picture(tmp, x, y, w, h)
    except Exception:
        s.shapes.add_picture(path, x, y, w, h)

def feature_card(s, x, y, w, h, icon_letter, title, body):
    add_rect(s, x, y, w, h, fill=WHITE, line=LINE, line_w=Pt(0.75))
    # Icon chip
    add_rect(s, x + Inches(0.3), y + Inches(0.3), Inches(0.5), Inches(0.5), fill=BG_SOFT, line=None)
    add_text(s, x + Inches(0.3), y + Inches(0.3), Inches(0.5), Inches(0.5),
             icon_letter, size=18, bold=True, color=PEACH_DK,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font="Georgia")
    add_text(s, x + Inches(0.3), y + Inches(0.95), w - Inches(0.6), Inches(0.4),
             title, size=14, bold=True, color=INK)
    add_text(s, x + Inches(0.3), y + Inches(1.35), w - Inches(0.6), h - Inches(1.5),
             body, size=10.5, color=MUTED)

SHOTS = "screenshots"

# ============ SLIDE 1 — COVER ============
s = prs.slides.add_slide(blank)
bg(s)
# left peach band
add_rect(s, 0, 0, Inches(4.6), H, fill=BG_SOFT)
# brand mark area
add_rect(s, Inches(0.7), Inches(0.7), Inches(0.55), Inches(0.55), fill=PEACH_DK)
add_text(s, Inches(0.7), Inches(0.7), Inches(0.55), Inches(0.55),
         "E", size=22, bold=True, color=WHITE, font="Georgia",
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
add_text(s, Inches(1.4), Inches(0.7), Inches(3), Inches(0.55),
         "EXIMMAN", size=18, bold=True, color=INK, anchor=MSO_ANCHOR.MIDDLE, tracking=300)

add_text(s, Inches(0.7), Inches(2.4), Inches(6), Inches(0.3),
         "FOR ETHIOPIAN IMPORTERS & EXPORTERS", size=10, bold=True, color=PEACH_DK, tracking=400)
add_text(s, Inches(0.7), Inches(2.85), Inches(6), Inches(2.2),
         "My Import\n& Export\nManager.",
         size=54, bold=True, color=INK, font="Georgia")
add_rect(s, Inches(0.7), Inches(5.7), Inches(0.6), Inches(0.05), fill=PEACH_DK)
add_text(s, Inches(0.7), Inches(5.85), Inches(5), Inches(0.5),
         "One operating system for trade.", size=14, italic=True, color=MUTED)
add_text(s, Inches(0.7), Inches(6.3), Inches(5), Inches(0.4),
         "LC · Customs · Logistics · Inventory · Finance · FX", size=11, color=MUTED, tracking=150)

# Right hero — landing screenshot
add_image_panel(s, f"{SHOTS}/landing.jpg", Inches(5.3), Inches(1.4), Inches(7.4), Inches(4.7))
add_text(s, Inches(5.3), Inches(6.3), Inches(7.4), Inches(0.4),
         "Product preview · v1.0", size=9, color=MUTED, align=PP_ALIGN.CENTER, tracking=200)

# footer page number
add_text(s, Inches(11.5), Inches(7.05), Inches(1.2), Inches(0.3),
         "01 / 15", size=9, color=MUTED, align=PP_ALIGN.RIGHT)

# ============ SLIDE 2 — THE CHALLENGE ============
s = prs.slides.add_slide(blank); bg(s)
title_block(s, "The Challenge", "Trade is fragmented.\nTools are not.",
            "Ethiopian importers and exporters juggle banks, customs, freight forwarders,\nspreadsheets and WhatsApp threads — across five currencies and three time zones.")
y = Inches(3.4)
pain_points = [
    ("Letters of Credit",  "Drafted in Word, tracked in email, signed off in person."),
    ("Customs & Duties",   "Tax assessments calculated by hand for every declaration."),
    ("Shipment Tracking",  "No single view from supplier to warehouse — only screenshots."),
    ("FX & Cash Flow",     "Bank rates change hourly; petty cash lives on paper."),
]
cw = Inches(2.95); gap = Inches(0.15); x = Inches(0.7)
for t, b in pain_points:
    feature_card(s, x, y, cw, Inches(2.6), "·", t, b)
    x += cw + gap
page_chrome(s, 2, section="Why we built it")

# ============ SLIDE 3 — THE PRODUCT ============
s = prs.slides.add_slide(blank); bg(s)
title_block(s, "The Product", "One workspace,\nfront-to-back.",
            "EXIMMAN unifies every step of an import or export flow into a single,\ncalm, role-aware workspace — built for Ethiopian regulation and global trade.")
# Highlight stat row
y = Inches(3.8)
stats = [("11", "Connected modules"),
         ("26", "Ethiopian banks tracked live"),
         ("UCP 600", "Compliant LC workflows"),
         ("ETB · USD\nEUR · AED · CNY", "Native multi-currency")]
xw = (W - Inches(1.4) - Inches(0.45)) / 4
cx = Inches(0.7)
for big, label in stats:
    add_rect(s, cx, y, xw, Inches(2.4), fill=WHITE, line=LINE, line_w=Pt(0.75))
    add_text(s, cx + Inches(0.3), y + Inches(0.35), xw - Inches(0.6), Inches(1.1),
             big, size=28, bold=True, color=PEACH_DK, font="Georgia")
    add_text(s, cx + Inches(0.3), y + Inches(1.6), xw - Inches(0.6), Inches(0.6),
             label, size=11, color=MUTED)
    cx += xw + Inches(0.15)
page_chrome(s, 3, section="What it is")

# ============ SLIDE 4 — KEY FEATURES GRID ============
s = prs.slides.add_slide(blank); bg(s)
title_block(s, "What's inside", "Eleven modules.\nOne calm surface.", None)
y = Inches(2.55)
features = [
    ("LC", "Letters of Credit",  "UCP 600 ready. Draft, track, settle — with bank-by-bank logic."),
    ("CU", "Customs Engine",     "CIF, duty, VAT, surtax and withholding — auto-calculated."),
    ("SH", "Shipments",          "End-to-end tracking from supplier yard to your warehouse."),
    ("IN", "Inventory",          "Post-clearance stock, warehouse utilization, reorder alerts."),
    ("CA", "Cash Against Docs",  "Export-side payment instruments and NBE forex preview."),
    ("FN", "Finance",            "Expenses, petty cash, payables and receivables in ETB."),
    ("FX", "Exchange Rates",     "Live ETB rates from 26 banks, refreshed every five minutes."),
    ("AI", "AI Insights",        "Risk scoring, FX hedging hints and shipment consolidation."),
]
cols = 4; rows = 2
cw = (W - Inches(1.4) - Inches(0.45)) / cols
ch = Inches(2.05)
gap_x = Inches(0.15); gap_y = Inches(0.15)
for i, (ic, t, b) in enumerate(features):
    cx = Inches(0.7) + (i % cols) * (cw + gap_x)
    cy = y + (i // cols) * (ch + gap_y)
    feature_card(s, cx, cy, cw, ch, ic, t, b)
page_chrome(s, 4, section="Capabilities")

# ============ SLIDE 5–13 — SCREENSHOT TOURS ============
def shot_slide(num, eyebrow, title, body, bullets, image, section):
    s = prs.slides.add_slide(blank); bg(s)
    # left content column
    add_text(s, Inches(0.7), Inches(0.7), Inches(5.3), Inches(0.35),
             eyebrow.upper(), size=10, bold=True, color=PEACH_DK, tracking=400)
    add_text(s, Inches(0.7), Inches(1.05), Inches(5.3), Inches(1.4),
             title, size=30, bold=True, color=INK, font="Georgia")
    add_rect(s, Inches(0.7), Inches(2.5), Inches(0.5), Inches(0.04), fill=PEACH_DK)
    add_text(s, Inches(0.7), Inches(2.65), Inches(5.3), Inches(1.4),
             body, size=12, color=MUTED)
    by = Inches(4.0)
    for bt in bullets:
        # dot
        add_rect(s, Inches(0.7), by + Inches(0.12), Inches(0.08), Inches(0.08), fill=PEACH_DK)
        add_text(s, Inches(0.95), by, Inches(4.9), Inches(0.5),
                 bt, size=11, color=INK)
        by += Inches(0.5)
    # right image panel
    add_image_panel(s, image, Inches(6.3), Inches(0.95), Inches(6.4), Inches(5.65))
    page_chrome(s, num, section=section)

shot_slide(5, "Module 01 · Command Center", "Executive Dashboard",
           "A real-time overview of every active LC, shipment, customs case and inventory line — built for daily review.",
           ["Live KPI cards across the entire operation",
            "Monthly trade volume trend & FX averages",
            "Recent shipments and AI risk feed",
            "One-click report generation"],
           f"{SHOTS}/dashboard.jpg", "For Importers & Exporters")

shot_slide(6, "Module 02 · Import", "Letters of Credit",
           "Manage every bank-issued LC from draft to settlement — without leaving the platform.",
           ["Proforma, supplier, bank and Incoterms in one record",
            "Auto-calculated FOB + freight + insurance",
            "Partial shipment and transshipment logic",
            "Expiry watch and document checklist"],
           f"{SHOTS}/lc.jpg", "For Importers")

shot_slide(7, "Module 03 · Import", "Shipment Tracking",
           "From supplier loading bay to your Addis warehouse — six-stage live tracking with port-level intelligence.",
           ["Six-stage route progress per shipment",
            "Bill of lading and declaration numbers",
            "Djibouti port congestion updates",
            "Demurrage and document alerts"],
           f"{SHOTS}/shipments.jpg", "For Importers")

shot_slide(8, "Module 04 · Import", "Inventory & Warehouse",
           "Post-clearance stock, warehouse utilization and forecasting — kept honest by your shipment data.",
           ["SKU-level stock across multiple warehouses",
            "Low-stock and reservation alerts",
            "Per-warehouse capacity utilization",
            "AI-suggested reorder plans"],
           f"{SHOTS}/inventory.jpg", "For Importers")

shot_slide(9, "Module 05 · Import", "Customs & Tax Engine",
           "Compute CIF, item taxes and the total assessed amount for any import declaration — print-ready notices included.",
           ["CIF auto-build from FOB, freight, insurance",
            "Duty, VAT, surtax, withholding lines",
            "Inland costs and exchange-rate aware",
            "Save as PDF or print directly"],
           f"{SHOTS}/customs.jpg", "For Importers")

shot_slide(10, "Module 06 · Export", "Cash Against Documents",
           "Manage outbound payment instruments and preview NBE forex settlement in real time.",
           ["CAD register with buyer, bank, terms",
            "Status flow: draft → sent → settled",
            "FOB and total contract value tracking",
            "Per-CAD product and document lineage"],
           f"{SHOTS}/cads.jpg", "For Exporters")

shot_slide(11, "Module 07 · Export", "Export Shipments",
           "Track outbound consignments from Ethiopian origins through transit ports to international destinations.",
           ["Vessel, BL number, ETD and ETA",
            "Buyer, route and transit port view",
            "FOB value and weight per shipment",
            "Status from preparing to delivered"],
           f"{SHOTS}/export_shipments.jpg", "For Exporters")

shot_slide(12, "Module 08 · Finance", "Financial Operations",
           "Expenses, petty cash, supplier payables and customer receivables — all in Ethiopian Birr, all in one tab.",
           ["Six tabs · dashboard to reports",
            "Low petty cash alerts and progress bars",
            "A/P and A/R with multi-currency",
            "Expense-by-category and trade-position charts"],
           f"{SHOTS}/finance.jpg", "For Importers & Exporters")

shot_slide(13, "Module 09 · Markets", "Live Exchange Rates",
           "Live USD/ETB rates from every major Ethiopian bank — refreshed every five minutes with a built-in converter.",
           ["Buy and sell rates from 26 banks",
            "Best transaction and cash buy spotlights",
            "Market mid-rate and average spread",
            "Currency converter for instant quotes"],
           f"{SHOTS}/rates.jpg", "For Importers & Exporters")

# ============ SLIDE 14 — AI INSIGHTS + WHO IT'S FOR ============
s = prs.slides.add_slide(blank); bg(s)
title_block(s, "Module 10 · Intelligence", "AI Insights Engine.", None)
add_text(s, Inches(0.7), Inches(2.55), Inches(5.7), Inches(0.6),
         "Risk scoring, FX hedging hints and shipment consolidation suggestions —\npowered by GPT-4o, tuned for Ethiopian trade context.",
         size=12, color=MUTED)

# Mini "Who it's for" panel
y = Inches(3.8)
add_rect(s, Inches(0.7), y, Inches(5.7), Inches(2.95), fill=WHITE, line=LINE, line_w=Pt(0.75))
add_text(s, Inches(1.0), y + Inches(0.25), Inches(5.0), Inches(0.4),
         "WHO IT'S FOR", size=10, bold=True, color=PEACH_DK, tracking=400)
# importer column
add_text(s, Inches(1.0), y + Inches(0.7), Inches(2.5), Inches(0.4),
         "Importers", size=15, bold=True, color=INK, font="Georgia")
imp_items = ["Open and settle LCs", "Customs & duty filing", "Inland logistics", "Inventory control"]
iy = y + Inches(1.2)
for it in imp_items:
    add_rect(s, Inches(1.0), iy + Inches(0.1), Inches(0.06), Inches(0.06), fill=PEACH_DK)
    add_text(s, Inches(1.18), iy, Inches(2.4), Inches(0.35), it, size=10.5, color=INK)
    iy += Inches(0.38)
# exporter column
add_text(s, Inches(3.7), y + Inches(0.7), Inches(2.5), Inches(0.4),
         "Exporters", size=15, bold=True, color=INK, font="Georgia")
exp_items = ["Sourcing & purchases", "CAD instruments", "Outbound shipments", "FX & receivables"]
iy = y + Inches(1.2)
for it in exp_items:
    add_rect(s, Inches(3.7), iy + Inches(0.1), Inches(0.06), Inches(0.06), fill=PEACH_DK)
    add_text(s, Inches(3.88), iy, Inches(2.4), Inches(0.35), it, size=10.5, color=INK)
    iy += Inches(0.38)

add_image_panel(s, f"{SHOTS}/ai.jpg", Inches(6.8), Inches(1.0), Inches(5.9), Inches(5.5))
page_chrome(s, 14, section="Smart by default")

# ============ SLIDE 15 — CTA ============
s = prs.slides.add_slide(blank); bg(s)
# Big peach pane
add_rect(s, Inches(0.7), Inches(0.7), W - Inches(1.4), H - Inches(1.4), fill=BG_SOFT)
add_rect(s, Inches(0.7), Inches(0.7), Inches(0.15), H - Inches(1.4), fill=PEACH_DK)
add_text(s, Inches(1.2), Inches(1.3), Inches(11), Inches(0.4),
         "READY WHEN YOU ARE", size=11, bold=True, color=PEACH_DK, tracking=400)
add_text(s, Inches(1.2), Inches(1.8), Inches(11), Inches(1.6),
         "Run your import\nand export business\nfrom one place.",
         size=46, bold=True, color=INK, font="Georgia")
add_text(s, Inches(1.2), Inches(4.7), Inches(11), Inches(0.6),
         "Open your first LC, file a customs declaration, track a shipment to Modjo,\nor reconcile a CAD — all in your first afternoon with EXIMMAN.",
         size=14, color=MUTED, italic=True)
# CTA chips
add_rect(s, Inches(1.2), Inches(5.7), Inches(2.6), Inches(0.7), fill=PEACH_DK)
add_text(s, Inches(1.2), Inches(5.7), Inches(2.6), Inches(0.7),
         "Sign in to dashboard  →", size=13, bold=True, color=WHITE,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
add_rect(s, Inches(4.0), Inches(5.7), Inches(2.6), Inches(0.7), fill=BG, line=PEACH_DK, line_w=Pt(1.0))
add_text(s, Inches(4.0), Inches(5.7), Inches(2.6), Inches(0.7),
         "Request a demo", size=13, bold=True, color=PEACH_DK,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
add_text(s, Inches(1.2), Inches(6.7), Inches(11), Inches(0.4),
         "EXIMMAN  ·  My Import & Export Manager  ·  Addis Ababa, Ethiopia",
         size=10, color=MUTED, tracking=200)

add_text(s, Inches(11.5), Inches(7.05), Inches(1.2), Inches(0.3),
         "15 / 15", size=9, color=MUTED, align=PP_ALIGN.RIGHT)

out = "exports/EXIMMAN_Pitch_Deck.pptx"
os.makedirs("exports", exist_ok=True)
prs.save(out)
print("Saved:", out, "slides:", len(prs.slides.__iter__.__self__._sldIdLst))
