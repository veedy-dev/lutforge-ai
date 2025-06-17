# 🎨 LutForge AI

**AI-powered color grading with intelligent 3D LUT generation**

Transform your images with professional-quality color grading powered by artificial intelligence. Upload an image, let AI analyze the color grade, and generate professional-quality LUTs for your workflow.

![LutForge AI Banner](frontend/public/banner.svg)

## ✨ Features

### 🤖 **AI-Powered LUT Generation**
- **Multimodal AI Analysis**: Advanced AI examines your reference images to understand color grading intent
- **Intelligent Color Mapping**: Automatically detects tone curves, saturation levels, and color temperature
- **Professional 3D LUTs**: Generates industry-standard .cube files compatible with all major editing software

### 🎛️ **Manual Controls**
- **Precision Adjustments**: Fine-tune exposure, contrast, highlights, shadows, and color balance
- **Real-time Preview**: See changes instantly as you adjust parameters
- **Custom LUT Export**: Generate personalized LUTs from your manual adjustments

### 🖼️ **Live Preview System**
- **Before/After Comparison**: Interactive slider to compare original vs processed images
- **Mobile Optimized**: Responsive design that works perfectly on all devices
- **Professional Workflow**: Supports RAW file workflows for maximum quality

### 🌗 **Dark Mode Support**
- **High-Contrast Interface**: Professional dark theme optimized for long editing sessions
- **System Integration**: Automatically adapts to your system's theme preferences
- **Accessibility First**: Designed with professional colorists in mind

## 🚀 Getting Started

### Prerequisites
- Node.js v18.x+
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/lutforge-ai.git
cd lutforge-ai/frontend

# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

### Development

```bash
# Start the development server
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🎯 How It Works

1. **Upload Reference Image**: Drag & drop your reference image (JPEG, PNG, TIFF supported)
2. **AI Analysis**: Our multimodal AI analyzes color grading, tone curves, and styling
3. **LUT Generation**: Generate professional 3D LUTs in industry-standard .cube format
4. **Apply & Export**: Apply LUTs to your images or export for use in professional software

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **AI Processing**: Custom multimodal AI for color analysis
- **UI Components**: Radix UI, Lucide Icons
- **Theme System**: next-themes with system detection
- **File Processing**: Advanced LUT generation algorithms

## 📁 Project Structure

```
frontend/
├── app/                 # Next.js App Router
├── components/          # React components
│   ├── lut-generator.tsx    # AI LUT generation
│   ├── manual-controls.tsx  # Manual adjustment controls
│   ├── raw-processor.tsx    # Image processing pipeline
│   └── ui/                  # Reusable UI components
├── lib/                 # Utility functions
├── styles/              # Global styles
└── public/              # Static assets
```

## 🎨 Professional Workflow

LutForge AI is designed for professional colorists and content creators:

- **For Quick Preview**: Test and visualize color grades with JPEG/PNG workflow
- **For Professional Results**: Export LUTs for use with RAW files in dedicated photo/video editing software
- **Industry Standard**: Generate .cube files compatible with DaVinci Resolve, Premiere Pro, Final Cut Pro, and more

## 🌟 Support the Project

If you find LutForge AI helpful for your color grading workflow, consider supporting its development:

### ❤️ Sponsors & Donations

[![GitHub Sponsors](https://img.shields.io/badge/GitHub-Sponsors-pink?style=for-the-badge&logo=github)](https://github.com/sponsors/veedy-dev)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-orange?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/veedygraph)

Your support helps maintain and improve LutForge AI, add new features, and keep it free for the creative community!

## 🤝 Contributing

We welcome contributions! Whether it's bug reports, feature requests, or code contributions:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org) and [Tailwind CSS](https://tailwindcss.com)
- UI components powered by [Radix UI](https://radix-ui.com)
- Icons by [Lucide](https://lucide.dev)
- Font optimization with [Geist](https://vercel.com/font)

---

<div align="center">

**Made with ❤️ for the creative community**

[🌐 Website](https://lutforge-ai.vercel.app) • [📧 Contact](mailto:veedy.dev@gmail.com) • [🐦 Twitter/X](https://x.com/veedygraph)

</div>