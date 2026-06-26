from PIL import Image
from scipy import ndimage
import numpy as np

src = r"C:\Users\3650428\Downloads\SICH.png"
img = Image.open(src).convert("RGBA")
data = np.array(img).astype(float)
h, w = data.shape[:2]

# Step 1: Remove baked-in checkerboard via flood fill from image edges
# Threshold 176 empirically found to cleanly separate bg (gray ~197) from logo content
r_ch, g_ch, b_ch = data[:,:,0], data[:,:,1], data[:,:,2]
brightness = (r_ch + g_ch + b_ch) / 3
max_chan = np.maximum(np.maximum(r_ch, g_ch), b_ch)
min_chan = np.minimum(np.minimum(r_ch, g_ch), b_ch)
saturation = np.where(max_chan > 0, (max_chan - min_chan) / max_chan, 0)
is_bg_candidate = (brightness > 176) & (saturation < 0.15)

seed = np.zeros((h, w), dtype=bool)
seed[0, :] = is_bg_candidate[0, :]
seed[-1, :] = is_bg_candidate[-1, :]
seed[:, 0] = is_bg_candidate[:, 0]
seed[:, -1] = is_bg_candidate[:, -1]
bg_mask = ndimage.binary_propagation(seed, mask=is_bg_candidate)

out = np.array(img)
out[:, :, 3] = np.where(bg_mask, 0, 255).astype(np.uint8)

# Step 2: Tight bounding box of visible pixels
vis = out[:, :, 3] > 128
rows = np.where(np.any(vis, axis=1))[0]
cols = np.where(np.any(vis, axis=0))[0]
if len(rows) == 0:
    raise ValueError("No visible pixels found after background removal")

r_min, r_max = int(rows[0]), int(rows[-1])
c_min, c_max = int(cols[0]), int(cols[-1])
print(f"Visible bounds: rows {r_min}-{r_max} ({r_max-r_min}px), cols {c_min}-{c_max} ({c_max-c_min}px)")

# Step 3: Circle center and radius from bounding box
cx = (c_min + c_max) // 2
cy = (r_min + r_max) // 2
best_r = min(c_max - c_min, r_max - r_min) // 2
print(f"Circle center: ({cx}, {cy}), radius: {best_r}px")

# Step 4: Apply clean circular mask with feathered edge
Y, X = np.ogrid[:h, :w]
dist = np.sqrt((X - cx)**2 + (Y - cy)**2)
feather = 4
alpha_float = np.clip((best_r - dist) / feather, 0.0, 1.0)
out[:, :, 3] = (alpha_float * 255).astype(np.uint8)

# Step 5: Tight crop around circle
pad = 4
crop_box = (
    max(0, cx - best_r - pad),
    max(0, cy - best_r - pad),
    min(w, cx + best_r + pad),
    min(h, cy + best_r + pad),
)
result = Image.fromarray(out).crop(crop_box)

# Square canvas → resize to 512×512
rw, rh = result.size
side = max(rw, rh)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(result, ((side - rw) // 2, (side - rh) // 2))
sq = sq.resize((512, 512), Image.LANCZOS)

dst = r"C:\Users\3650428\source\repos\SICHE\frontend\public\logo.png"
sq.save(dst, "PNG", optimize=True)
print(f"Saved: {sq.size}, crop={crop_box}")
