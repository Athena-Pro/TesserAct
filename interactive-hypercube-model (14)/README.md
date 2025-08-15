# TesserAct — Interactive 4D Polytope Viewer & Dimensional Lock Training

This project is a web-based, interactive 4D polytope viewer built with React and TypeScript. It renders a 3D stereographic projection of 4D objects (like a Tesseract) and wraps the experience in a "Dimensional Lock Training" simulation. Users learn to perform standard 3D rotations and are then guided through the process of acquiring a "Secure Key" to unlock rotations into the 4th dimension.

The application is designed to be visually rich and engaging, using SVG for rendering and leveraging advanced effects to create a high-tech, futuristic aesthetic.

## Key Features

*   **Interactive 4D Rotation**:
    *   **3D Planes (XY, XZ, YZ)**: Perform intuitive 3D rotations by clicking and dragging the mouse.
    *   **4D Plane (XW)**: After acquiring a key, hold the `W` key while dragging to rotate the polytope through the 4th dimension.
*   **Guided Training Simulation**:
    *   An on-screen tutorial guides the user through the steps of learning 3D rotation, attempting a locked 4D rotation, acquiring a key, and finally succeeding.
    *   Rich visual feedback for user actions, including access denial effects, key acquisition ripples, and contextual HUD elements.
*   **Advanced Visual Effects**:
    *   **Glow/Bloom**: A configurable bloom filter provides a luminous, sci-fi aesthetic.
    *   **Braided Strands**: Edges can be rendered as dynamic, interwoven energy strands.
    *   **Data Packets**: Animated pulses travel along the polytope's edges, simulating data flow in a network.
    *   **"Dimensions Behind Glass"**: Subtle, luminous parallax veils create a sense of depth and hint at the locked, hidden dimensions.
    *   **Cell Halos**: Soft glows emanate from the center of each of the Tesseract's 8 constituent cells.
*   **Highly Customizable Experience**:
    *   Switch between different 4D polytopes (**Tesseract** and **16-Cell**).
    *   Choose from multiple color themes (**Cyber**, **Aurora**, **Mono**).
    *   Fine-tune all visual effects in real-time through a comprehensive control panel.

## How to Interact

*   **3D Rotation**: Click and drag with the mouse.
*   **4D Rotation**: Hold the **W** key and drag the mouse. This requires the "Secure Key" to be acquired.
*   **Zoom**: Use the mouse wheel to zoom in and out.
*   **Acquire Secure Key**:
    *   Follow the on-screen tutorial prompts. A floating key icon 🔑 will appear in the scene.
    *   Alternatively, you can drag-and-drop a valid key file (like the included `/public/sample-key.json`) onto the application window.
*   **Controls**: Use the panel on the bottom-left to toggle features and adjust visual parameters.

## Technical Stack

*   **Framework**: React
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Rendering**: SVG, including `<filter>` elements for effects like bloom and glow.
*   **Styling**: Tailwind CSS

## Project Structure

```
.
├── src/
│   ├── App.tsx               # Main application component, manages state
│   ├── index.tsx             # React application bootstrap
│   ├── components/
│   │   ├── HypercubeViewer.tsx # Core SVG rendering and interaction logic
│   │   ├── Controls.tsx        # UI panel for controls
│   │   └── CarvedObjectViewer.tsx # 3D viewer for carved objects
│   └── lib/
│       ├── polytopes.ts      # Data definitions for 4D shapes
│       ├── security.ts       # Defines the "Dimensional Key" logic
│       ├── rotation.ts       # Rotation intent mapping logic
│       └── keyVerification.ts  # Key file validation logic
├── public/
│   └── sample-key.json     # A sample key for drag-and-drop testing
├── package.json
└── vite.config.ts
```

## Running Locally

This project uses Vite for development and building.

1.  **Clone the repository.**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run the development server**:
    ```bash
    npm run dev
    ```
4.  Open your web browser and navigate to the local address provided by Vite (e.g., `http://localhost:5173`).

## Available Scripts

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm run preview`: Serves the production build locally.
*   `npm run test`: Runs unit tests with Vitest.
*   `npm run lint`: Lints the codebase with ESLint.
*   `npm run typecheck`: Checks for TypeScript errors.
