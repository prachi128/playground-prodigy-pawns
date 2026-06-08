from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw


@dataclass(frozen=True)
class Grid:
    cols: int
    rows: int


def _circle_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    return mask


def _center_crop_square(im: Image.Image) -> Image.Image:
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return im.crop((left, top, left + side, top + side))


def _estimate_background_rgb(rgb_cell: Image.Image) -> tuple[int, int, int]:
    """Estimate the 'outside circle' background color using the four corners."""
    w, h = rgb_cell.size
    px = rgb_cell.load()
    corners = [
        px[0, 0],
        px[w - 1, 0],
        px[0, h - 1],
        px[w - 1, h - 1],
    ]
    r = sum(p[0] for p in corners) / len(corners)
    g = sum(p[1] for p in corners) / len(corners)
    b = sum(p[2] for p in corners) / len(corners)
    return int(r), int(g), int(b)


def _bbox_of_non_background(
    cell: Image.Image,
    *,
    tolerance: int = 35,
    min_pixels: int = 200,
) -> tuple[tuple[int, int, int, int], tuple[int, int, int]] | None:
    """
    Return bounding box around pixels that differ from the sheet background.
    BBox is in PIL coordinates: (left, top, right_exclusive, bottom_exclusive).
    """
    rgb_cell = cell.convert("RGB")
    w, h = rgb_cell.size
    px = rgb_cell.load()
    bg_r, bg_g, bg_b = _estimate_background_rgb(rgb_cell)

    tol2 = tolerance * tolerance
    min_x, min_y = w, h
    max_x, max_y = -1, -1
    count = 0

    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            dr = r - bg_r
            dg = g - bg_g
            db = b - bg_b
            if (dr * dr + dg * dg + db * db) > tol2:
                count += 1
                if x < min_x:
                    min_x = x
                if y < min_y:
                    min_y = y
                if x > max_x:
                    max_x = x
                if y > max_y:
                    max_y = y

    if count < min_pixels or max_x < min_x or max_y < min_y:
        return None

    return (min_x, min_y, max_x + 1, max_y + 1), (bg_r, bg_g, bg_b)


def _pad_to_square(im: Image.Image, bg_rgb: tuple[int, int, int]) -> Image.Image:
    """Pad image to a square canvas by centering it."""
    w, h = im.size
    side = max(w, h)
    out = Image.new("RGB", (side, side), bg_rgb)
    ox = (side - w) // 2
    oy = (side - h) // 2
    out.paste(im, (ox, oy))
    return out


def slice_sheet(
    sheet_path: Path,
    out_dir: Path,
    grid: Grid,
    *,
    out_size: int = 256,
    prefix: str = "kid",
    bg_tolerance: int = 35,
) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)

    sheet = Image.open(sheet_path).convert("RGB")
    W, H = sheet.size

    # Use proportional boundaries to handle sheets not divisible by rows.
    xs = [round(i * W / grid.cols) for i in range(grid.cols + 1)]
    ys = [round(i * H / grid.rows) for i in range(grid.rows + 1)]

    mask = _circle_mask(out_size)

    out_paths: list[Path] = []
    idx = 1
    for r in range(grid.rows):
        for c in range(grid.cols):
            cell = sheet.crop((xs[c], ys[r], xs[c + 1], ys[r + 1]))
            bbox_info = _bbox_of_non_background(cell, tolerance=bg_tolerance)
            if bbox_info is None:
                square = _center_crop_square(cell)
            else:
                bbox, bg_rgb = bbox_info
                cropped = cell.crop(bbox)
                square = _pad_to_square(cropped, bg_rgb=bg_rgb)

            square = square.resize((out_size, out_size), Image.Resampling.LANCZOS)
            rgba = square.convert("RGBA")
            rgba.putalpha(mask)

            out_path = out_dir / f"{prefix}-{idx:02d}.png"
            rgba.save(out_path, format="PNG", optimize=True)
            out_paths.append(out_path)
            idx += 1

    return out_paths


if __name__ == "__main__":
    # Default to the sheet image saved from chat
    default_sheet = Path(
        r"C:\Users\prach\.cursor\projects\c-Users-prach-Documents-Prodigy-Pawns-Playground-ProdigyPawns\assets\c__Users_prach_AppData_Roaming_Cursor_User_workspaceStorage_a62e69b1e7b781b4b9c5a5c052075218_images_image-7b6d1389-39e3-44ee-804b-0c41ea30a464.png"
    )
    repo_root = Path(__file__).resolve().parents[1]
    out = repo_root / "frontend" / "public" / "avatars"

    paths = slice_sheet(default_sheet, out, Grid(cols=4, rows=3), out_size=256, prefix="kid")
    print(f"Wrote {len(paths)} avatars to {out}")
