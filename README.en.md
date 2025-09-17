# Bluesky-comic-uploader
**Languages:** [日本語](README.md) | [English](README.en.md)

A client-side web application for posting Clip Studio (CLIP STUDIO PAINT) manga pages to Bluesky as a threaded series. The live site is hosted on [GitHub Pages](https://tohu-sand.github.io/Bluesky-comic-uploader/).

## Features
- Works with Bluesky App Password sign-in (OAuth currently unavailable)
- Drag-and-drop entire Clip Studio export folders or multiple files with automatic natural sorting
- Automatically batches four images per post and links them into a reply thread
- Provides text/ALT templates, blank-page hints, and in-browser scheduling (while the tab stays open)

## Usage
1. Export your pages from Clip Studio Paint (e.g., `manga_001.png`, `manga_002.png`, ...)
2. Sign in with your PDS URL, handle/DID, and Bluesky App Password
3. Drop the exported images, remove unnecessary pages
4. Adjust the first-post body and templates, confirm structure and scheduling
5. Run the post immediately or queue a reservation

## License
This project is released under the MIT License. See [LICENSE](LICENSE) for details.
