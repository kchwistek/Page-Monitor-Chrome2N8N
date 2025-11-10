#!/usr/bin/env python3
"""
Generate PNG icons from SVG design
Combines n8n network motif with eye symbol for monitoring
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
except ImportError:
    print("PIL/Pillow not installed. Installing...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'Pillow'])
    from PIL import Image, ImageDraw, ImageFont
    import os

def create_icon(size):
    """Create an icon at the specified size"""
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # n8n brand colors (purple/violet gradient)
    purple_dark = (110, 65, 226)  # #6E41E2
    purple_light = (139, 92, 246)  # #8B5CF6
    purple_lighter = (167, 139, 250)  # #A78BFA
    purple_darker = (76, 29, 149)  # #4C1D95
    
    center = size // 2
    radius = int(size * 0.47)  # 47% of size for main circle
    
    # Draw background circle with gradient effect
    # Using a simple radial gradient approximation
    for i in range(radius, 0, -1):
        ratio = i / radius
        r = int(purple_dark[0] * (1 - ratio * 0.3) + purple_light[0] * ratio * 0.3)
        g = int(purple_dark[1] * (1 - ratio * 0.3) + purple_light[1] * ratio * 0.3)
        b = int(purple_dark[2] * (1 - ratio * 0.3) + purple_light[2] * ratio * 0.3)
        draw.ellipse([center - i, center - i, center + i, center + i], 
                    fill=(r, g, b, 255), outline=(purple_darker[0], purple_darker[1], purple_darker[2], 255))
    
    # Draw eye shape (white ellipse)
    eye_width = int(size * 0.27)  # 27% of size
    eye_height = int(size * 0.20)  # 20% of size
    draw.ellipse([center - eye_width, center - eye_height, 
                  center + eye_width, center + eye_height], 
                fill=(255, 255, 255, 240))
    
    # Draw iris (purple circle)
    iris_radius = int(size * 0.16)  # 16% of size
    draw.ellipse([center - iris_radius, center - iris_radius, 
                  center + iris_radius, center + iris_radius], 
                fill=purple_light)
    
    # Draw pupil (black circle)
    pupil_radius = int(size * 0.09)  # 9% of size
    draw.ellipse([center - pupil_radius, center - pupil_radius, 
                  center + pupil_radius, center + pupil_radius], 
                fill=(31, 31, 31, 255))
    
    # Draw highlight on pupil (white small circle)
    highlight_offset = int(size * 0.03)  # 3% offset
    highlight_radius = int(size * 0.03)  # 3% of size
    draw.ellipse([center + highlight_offset - highlight_radius, 
                  center - highlight_offset - highlight_radius,
                  center + highlight_offset + highlight_radius, 
                  center - highlight_offset + highlight_radius], 
                fill=(255, 255, 255, 200))
    
    # Draw n8n network nodes (small circles at corners)
    node_radius = max(2, int(size * 0.03))  # 3% of size, minimum 2px
    node_positions = [
        (int(size * 0.23), int(size * 0.23)),  # Top-left
        (int(size * 0.77), int(size * 0.23)),  # Top-right
        (int(size * 0.23), int(size * 0.77)),  # Bottom-left
        (int(size * 0.77), int(size * 0.77)),  # Bottom-right
    ]
    
    for pos in node_positions:
        draw.ellipse([pos[0] - node_radius, pos[1] - node_radius,
                     pos[0] + node_radius, pos[1] + node_radius],
                    fill=purple_lighter)
    
    # Draw connection lines (representing n8n workflow connections)
    if size >= 32:  # Only draw lines for larger icons
        line_width = max(1, int(size * 0.015))  # 1.5% of size, minimum 1px
        connection_points = [
            # From top-left node to eye
            (node_positions[0][0], node_positions[0][1], 
             center - eye_width, center - eye_height),
            # From top-right node to eye
            (node_positions[1][0], node_positions[1][1],
             center + eye_width, center - eye_height),
            # From bottom-left node to eye
            (node_positions[2][0], node_positions[2][1],
             center - eye_width, center + eye_height),
            # From bottom-right node to eye
            (node_positions[3][0], node_positions[3][1],
             center + eye_width, center + eye_height),
        ]
        
        for x1, y1, x2, y2 in connection_points:
            draw.line([x1, y1, x2, y2], fill=purple_lighter, width=line_width)
    
    return img

def main():
    """Generate all required icon sizes"""
    sizes = [16, 32, 48, 128]
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("Generating icons...")
    for size in sizes:
        icon = create_icon(size)
        filename = f"icon{size}.png"
        filepath = os.path.join(output_dir, filename)
        icon.save(filepath, 'PNG', optimize=True)
        print(f"✓ Created {filename} ({size}x{size})")
    
    print("\nAll icons generated successfully!")
    print(f"Output directory: {output_dir}")

if __name__ == "__main__":
    main()

