# LUTForge AI

AI-powered 3D LUT generation from reference images. Upload any image and generate professional .cube LUT files for video editing software.

<div align="center">

![LUTForge AI Banner](frontend/public/banner.svg)

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://lutforge-ai.vercel.app)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![GitHub issues](https://img.shields.io/github/issues/veedy-dev/lutforge-ai)](https://github.com/veedy-dev/lutforge-ai/issues)

</div>

## Features

- 🎨 **Reference-based LUT generation** - Analyze any image to extract color grading characteristics
- 🧠 **AI color analysis** - Automatic detection of shadows, midtones, highlights and color temperature
- 🎬 **Professional output** - Standard 33×33×33 .cube files compatible with DaVinci Resolve, Premiere Pro, Final Cut Pro
- ⚡ **Real-time preview** - Canvas-based processing with instant before/after comparison
- 🎛️ **Manual controls** - Fine-tune exposure, contrast, color balance, and LUT intensity
- 📱 **Responsive design** - Works seamlessly on desktop and mobile devices

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+ and pip
- Google Gemini API key

### Installation

```bash
git clone https://github.com/veedy-dev/lutforge-ai.git
cd lutforge-ai
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

### Run Development Servers

**Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to use the application.

## How It Works

1. **Image Analysis** - Convert reference image to multiple color spaces (RGB, HSV, LAB)
2. **Luminance Segmentation** - Split image into shadows (<25%), midtones (25-75%), highlights (>75%)
3. **Color Extraction** - Calculate dominant colors, temperature bias, and saturation for each range
4. **LUT Generation** - Build 33×33×33 lookup table using trilinear interpolation and color-matcher algorithms

### Technical Details

- **Backend**: FastAPI + OpenCV for image processing, Google Gemini 2.0 for AI analysis
- **Frontend**: Next.js + Canvas API for real-time LUT preview
- **Color Science**: Uses MKL (Monge-Kantorovich Linear) algorithm for natural color transfer
- **Safety**: Conservative blending prevents color inversions and maintains skin tone integrity

## Tech Stack

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Image Processing**: Canvas API

### Backend  
- **API**: FastAPI (Python)
- **Image Processing**: OpenCV, PIL
- **AI**: Google Gemini 2.0 Flash
- **Color Science**: color-matcher library
- **Performance**: ujson, NumPy

### Key Libraries
- `color-matcher` - Professional color transfer algorithms (MKL, Reinhard)
- `opencv-python` - Image processing and analysis
- `numpy` - Mathematical operations for LUT generation
- `fastapi` - Modern Python web framework

## 📁 Project Structure

```
lutforge-ai/
├── backend/                 # FastAPI backend service
│   ├── main.py             # Core API with LUT generation
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile         # Container configuration
│   └── koyeb.yaml         # Deployment configuration
├── frontend/               # Next.js frontend application
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   │   ├── lut-generator.tsx      # AI-powered LUT generation
│   │   ├── manual-controls.tsx    # Manual adjustment controls
│   │   ├── raw-processor.tsx      # Professional LUT processing
│   │   ├── before-after-slider.tsx # Interactive comparison
│   │   └── ui/                    # Reusable UI components
│   ├── lib/               # Utility functions and API clients
│   ├── styles/            # Global styles and themes
│   └── public/            # Static assets and branding
└── debug/                 # Development and testing utilities
```

## Use Cases

- **Film Look Matching** - Recreate color grading from movie stills or reference images
- **Consistent Editing** - Apply uniform color grading across photo/video series  
- **Look Development** - Create custom color palettes for brand consistency
- **Learning Tool** - Analyze professional color grading techniques

## Supported Formats

- **Input**: JPEG, PNG, TIFF
- **Output**: .cube LUT files (33×33×33 resolution)
- **Compatible with**: DaVinci Resolve, Adobe Premiere Pro, Final Cut Pro, After Effects, Photoshop

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support

If this project helps your workflow, consider supporting its development:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-pink?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/veedy-dev)
[![Ko-fi](https://img.shields.io/badge/Buy%20me%20a%20coffee-Ko--fi-orange?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/veedygraph)

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

[🌐 Try It Now](https://lutforge-ai.vercel.app) • [📧 Contact](mailto:veedy.dev@gmail.com) • [🐦 Twitter](https://x.com/veedygraph)

Made with ❤️ by [veedy-dev](https://github.com/veedy-dev)

</div>