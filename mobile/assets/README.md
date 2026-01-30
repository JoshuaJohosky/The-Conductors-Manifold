# Mobile App Assets

Place the following image assets in this directory:

- `icon.png` - App icon (1024x1024px recommended)
- `splash.png` - Splash screen image (1284x2778px for iPhone)
- `adaptive-icon.png` - Android adaptive icon foreground (1024x1024px)
- `favicon.png` - Web favicon (48x48px)

## Recommended Design

- Use dark background (#0f172a) to match the app theme
- The Conductor's Manifold logo/wordmark centered
- Consider using geometric/manifold visual elements

## Placeholder Generation

For development, you can use placeholder images:

```bash
# Using ImageMagick to generate placeholders
convert -size 1024x1024 xc:#0f172a -fill "#3b82f6" -gravity center \
  -pointsize 72 -annotate 0 "CM" icon.png

convert -size 1284x2778 xc:#0f172a -fill "#3b82f6" -gravity center \
  -pointsize 96 -annotate 0 "The Conductor's\nManifold" splash.png
```
