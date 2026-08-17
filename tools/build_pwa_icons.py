from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

def font(size: int):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()

def create(size: int, filename: str, maskable: bool = False):
    image = Image.new("RGB", (size, size), "#17131f")
    draw = ImageDraw.Draw(image)
    margin = int(size * (0.18 if maskable else 0.09))
    draw.rounded_rectangle((margin, margin, size - margin, size - margin), radius=int(size * 0.2), fill="#241b31", outline="#5a3ca0", width=max(2, size // 80))
    label_font = font(int(size * 0.27))
    label = "NC"
    box = draw.textbbox((0, 0), label, font=label_font)
    x = (size - (box[2] - box[0])) / 2
    y = (size - (box[3] - box[1])) / 2 - int(size * 0.025)
    draw.text((x, y), label, font=label_font, fill="#f2b632", stroke_width=max(1, size // 170), stroke_fill="#9d6b10")
    dot = max(3, size // 48)
    draw.ellipse((size / 2 - dot, size * 0.72 - dot, size / 2 + dot, size * 0.72 + dot), fill="#8b63d8")
    image.save(OUT / filename, optimize=True)

create(180, "neurocity-180.png")
create(192, "neurocity-192.png")
create(512, "neurocity-512.png")
create(512, "neurocity-maskable-512.png", maskable=True)
