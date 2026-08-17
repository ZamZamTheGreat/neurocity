from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
SOURCE = ROOT / "public" / "branding" / "neurocity-brand-board.png"
OUT.mkdir(parents=True, exist_ok=True)

MARK = ROOT / "public" / "branding" / "neurocity-mark.png"

def extract_mark():
    board = Image.open(SOURCE).convert("RGB")
    board.crop((0, 0, 1254, 690)).save(ROOT / "public" / "branding" / "neurocity-social.png", optimize=True)
    # The supplied identity board's primary rounded-square mark.
    mark = board.crop((80, 118, 540, 578))
    mark.save(MARK, optimize=True)
    return mark

def create(mark: Image.Image, size: int, filename: str):
    mark.resize((size, size), Image.Resampling.LANCZOS).save(OUT / filename, optimize=True)

mark = extract_mark()
create(mark, 180, "neurocity-180.png")
create(mark, 192, "neurocity-192.png")
create(mark, 512, "neurocity-512.png")
create(mark, 512, "neurocity-maskable-512.png")
