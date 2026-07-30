from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUTPUT = ASSETS / "shop-products"


def trim_with_padding(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value >= 8 else 0).getbbox()
    if not bbox:
        raise ValueError("Product image is fully transparent")

    content = rgba.crop(bbox)
    padding = max(10, round(max(content.size) * 0.055))
    result = Image.new(
        "RGBA",
        (content.width + padding * 2, content.height + padding * 2),
        (0, 0, 0, 0),
    )
    result.alpha_composite(content, (padding, padding))
    return result


def save_product(source: Image.Image, filename: str) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    trim_with_padding(source).save(OUTPUT / filename, optimize=True)


atlas = Image.open(ASSETS / "merch-pixel-atlas-v1.png").convert("RGBA")

# These six source items were previously sliced at fixed 512 px boundaries,
# which left neighboring fragments or clipped the object at the canvas edge.
atlas_products = {
    "merch-keychain-pixel-v1.png": (118, 18, 425, 526),
    "merch-tape-pixel-v1.png": (548, 145, 942, 463),
    "merch-badges-pixel-v1.png": (1028, 138, 1488, 470),
    "merch-patch-pixel-v1.png": (84, 560, 425, 924),
    "merch-memo-pixel-v1.png": (532, 548, 949, 950),
    "merch-stickers-pixel-v1.png": (990, 604, 1518, 912),
}

for filename, crop_box in atlas_products.items():
    save_product(atlas.crop(crop_box), filename)

for filename in (
    "merch-sticker-world-pixel.png",
    "merch-sticker-companions.png",
    "merch-sticker-map.png",
    "merch-keychain-pixel-v2.png",
    "merch-patch-pixel-v2.png",
    "merch-memo-pixel-v2.png",
    "merch-stickers-pixel-v2.png",
    "merch-figure-pixel-v1.png",
    "merch-card-sleeve-pixel-v1.png",
):
    save_product(Image.open(ASSETS / filename), filename)
