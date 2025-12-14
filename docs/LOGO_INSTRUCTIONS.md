# Knyslys Logo Instructions

The extension is configured to use a wild hog logo. You need to add the following icon files to the `icons/` directory:

## Required Icon Files

- **hog.png** - Main extension icon (the reference in manifest.json)
  - Recommended sizes: 128x128, 48x48, 32x32
  - For best results, also create:
    - `hog-128.png` (128x128) - for Chrome Web Store
    - `hog-48.png` (48x48) - for toolbar
    - `hog-16.png` (16x16) - for favicon

## Icon Guidelines

- Use PNG format for transparency
- The icon should feature a wild hog (knyslys)
- Ensure the hog is recognizable and works well at small sizes
- Consider a simple, bold design for toolbar visibility

## How to Add Icons

1. Create your wild hog artwork or find a royalty-free hog illustration
2. Save as PNG files in the sizes mentioned above
3. Place them in the `icons/` directory
4. Update `manifest.json` if using different filename or adding multiple sizes

## Manifest Configuration

The manifest.json is already configured with:
```json
"action": {
  "default_icon": "icons/hog.png"
}
```

You can also add multiple icon sizes:
```json
"icons": {
  "16": "icons/hog-16.png",
  "48": "icons/hog-48.png",
  "128": "icons/hog-128.png"
}
```
