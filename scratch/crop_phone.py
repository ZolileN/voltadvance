from PIL import Image

img = Image.open('public/iphone-frame.png')
w, h = img.size

# Find the bounding box of non-transparent pixels (alpha > 0)
alpha = img.split()[-1]
bbox = alpha.getbbox()
print("Non-transparent bounding box:", bbox)

if bbox:
    # Crop the image to this bounding box
    cropped = img.crop(bbox)
    cropped.save('public/iphone-frame.png')
    cw, ch = cropped.size
    print(f"Cropped image saved successfully. New size: {cw}x{ch}")
    
    # Now let's calculate the coordinates of the white screen region (which we made transparent previously)
    # The screen region was previously at: left=321, top=92, right=706, bottom=929
    # Since we cropped the image, the new coordinates of the screen are:
    new_left = 321 - bbox[0]
    new_top = 92 - bbox[1]
    new_right = 706 - bbox[0]
    new_bottom = 929 - bbox[1]
    
    print(f"New Screen Coordinates relative to cropped image:")
    print(f"left={new_left}px ({new_left/cw*100:.2f}%)")
    print(f"top={new_top}px ({new_top/ch*100:.2f}%)")
    print(f"width={new_right-new_left}px ({(new_right-new_left)/cw*100:.2f}%)")
    print(f"height={new_bottom-new_top}px ({(new_bottom-new_top)/ch*100:.2f}%)")
else:
    print("No non-transparent pixels found!")
