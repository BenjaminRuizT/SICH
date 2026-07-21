from PIL import Image, ImageDraw
import numpy as np

src = r"C:\Users\3650428\Downloads\SICH.png"
img = Image.open(src).convert("RGBA")
data = np.array(img)
alpha = data[:, :, 3]

print(f"Image size: {img.size}")
print(f"Alpha range: {alpha.min()} - {alpha.max()}")

for thresh in [200, 150, 100, 50, 10]:
    mask = alpha > thresh
    if mask.any():
        rows = np.where(np.any(mask, axis=1))[0]
        cols = np.where(np.any(mask, axis=0))[0]
        print(f"thresh={thresh}: rows {rows[0]}-{rows[-1]}, cols {cols[0]}-{cols[-1]}, size={cols[-1]-cols[0]+1}x{rows[-1]-rows[0]+1}")

# Sample corners
print("Corner alpha values (5x5):")
print("Top-left:", alpha[:5, :5])
print("Top-right:", alpha[:5, -5:])
