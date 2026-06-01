# FaceUp

FaceUp is a browser-based Face Mesh Studio built with MediaPipe. It lets you upload a portrait, detect 468 facial landmarks, inspect landmark coordinates, filter facial regions, and export the result as JSON or PNG.

## Features

- Face landmark detection with MediaPipe Face Mesh
- Default sample image plus local image upload
- Interactive canvas with hover tooltips and focused landmark selection
- Region-aware overlays for face oval, eyes, lips, and nose
- Toggleable landmarks, mesh lines, labels, mirror mode, and point size
- Landmark inspector with search and region filtering
- Metrics panel for detected faces, landmark count, and canvas size
- Export analyzed landmark data as JSON
- Export the annotated canvas as PNG

## Tech Stack

- HTML5 Canvas
- Vanilla JavaScript
- MediaPipe Face Mesh via CDN
- Responsive CSS without a build step

## Getting Started

Open `index.html` in a browser, or serve the folder with any static file server.

```bash
npx serve .
```

The app loads `human.png` by default. Use **Upload Image** to analyze your own face image locally in the browser.

## Project Structure

```text
FaceUp/
+-- index.html   # Application layout and styling
+-- script.js    # Face Mesh processing, rendering, controls, export logic
+-- human.png    # Default sample image
+-- README.md
```

## Notes

FaceUp runs entirely in the browser. Uploaded images are read with the FileReader API and are not sent to a custom backend.
