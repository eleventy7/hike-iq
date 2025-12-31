# HikeIQ

> **Note:** This is a sample starter application provided as a self-contained example of what you can build with Tauri + React. I do not actively use this project but offer it as a reference. I have forked this into a more extensive analytics tool that is not open-sourced.

A desktop application for analyzing hiking and fitness activities. Import FIT files from your GPS device, visualize training zones, track elevation gains, and view your routes on interactive maps.

![Screenshot](screenshot.png)

## Features

- **FIT File Import**: Import activity files from Garmin and other fitness devices
- **Heart Rate Zones**: Automatic zone classification and time-in-zone analysis
- **Activity Dashboard**: View total distance, duration, elevation gain, and activity counts
- **Training Trends**: Year-to-date summaries, weekly/monthly charts, and activity heatmaps
- **Interactive Maps**: Visualize GPS tracks with MapLibre GL (supports offline tiles)
- **Activity Details**: Per-activity breakdown with heart rate timelines, elevation profiles, and pace analysis
- **Filtering & Sorting**: Filter by date, country, and elevation; sort by multiple criteria
- **Metric/Imperial Units**: Toggle between kilometers/meters and miles/feet

## Tech Stack

**Frontend**
- React 18 with TypeScript
- Vite for development and builds
- Tailwind CSS for styling
- Recharts and D3 for data visualization
- MapLibre GL for mapping

**Backend**
- Rust with Tauri 2
- SQLite for local data storage
- fitparser for FIT file parsing
- reverse_geocoder for location lookup

## Prerequisites

### macOS

```sh
# Install Xcode Command Line Tools
xcode-select --install

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Bun (or Node.js)
curl -fsSL https://bun.sh/install | bash
```

## Building and Running

### Development

```sh
# Install frontend dependencies
bun install

# Run in development mode (hot reload)
bun run tauri dev
```

### Production Build

```sh
# Build the application
bun run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`:
- **macOS**: `.app` bundle and `.dmg` installer
- **Linux**: `.deb`, `.rpm`, and `.AppImage` packages

## Usage

1. Launch the application
2. Navigate to **Activities** and click **Import** to add FIT files
3. View your training summary on the **Home** dashboard
4. Explore individual activities for detailed metrics
5. Use the **Map** view to visualize your routes

## Data Storage

HikeIQ stores data locally in your system's app data directory:
- **macOS**: `~/Library/Application Support/com.shaunlaurens.hikeiq/`
- **Linux**: `~/.local/share/com.shaunlaurens.hikeiq/`

The SQLite database (`fitness.db`) contains all imported activities. Delete this file to reset all data.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
