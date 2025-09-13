# Browser Setup for Grind75 Feature

The Grind75 question fetching feature requires a headless browser (Chrome/Chromium) to scrape questions from the Grind75 website.

## Installation

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install chromium-browser
```

### CentOS/RHEL/Fedora
```bash
sudo yum install chromium
# or for newer versions:
sudo dnf install chromium
```

### WSL (Windows Subsystem for Linux)

**Complete Chrome dependencies for WSL (recommended):**
```bash
sudo apt update
sudo apt install -y \
  libasound2t64 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libatspi2.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libexpat1 \
  libgbm1 \
  libglib2.0-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libudev1 \
  libuuid1 \
  libx11-6 \
  libx11-xcb1 \
  libxcb-dri3-0 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxkbcommon0 \
  libxrandr2 \
  libxrender1 \
  libxshmfence1 \
  libxss1 \
  libxtst6
```

**Optional: Install Chromium browser as well:**
```bash
sudo apt install chromium-browser
```

### Alternative: Use system Chrome
If you have Chrome installed on your system, you can also install the dependencies:
```bash
sudo apt install libnss3 libgconf-2-4 libxss1 libxtst6 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libcairo-gobject2 libgtk-3-0 libgdk-pixbuf2.0-0
```

## Troubleshooting

If you encounter issues:

1. **Missing shared libraries**: Install the Chrome dependencies above
2. **Permission issues**: Add `--no-sandbox` flag (already included in the code)
3. **Memory issues**: The code includes `--disable-dev-shm-usage` for low-memory environments

## Skip Grind75 Feature

If you cannot install Chrome/Chromium, you can still use the application for:
- Fetching all LeetCode questions
- Fetching company-specific questions

The Grind75 feature will show a helpful error message if the browser cannot be launched.