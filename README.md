# LutForge AI

LutForge AI is an advanced web application that uses multimodal Large Language Models (LLMs) to analyze the color grade of images and generate professional-quality 3D LUTs (.cube format). This project combines AI vision analysis, parameter reasoning, and mathematical color transformations to create accurate color grading presets.

## Features

- **AI-Powered Color Analysis**: Uses Google Gemini Vision API to analyze color characteristics
- **Mathematical LUT Generation**: Converts AI analysis into precise color transformations
- **Professional .cube Output**: Generates industry-standard 3D LUT files
- **Modern Web Interface**: Clean, responsive UI with drag-and-drop functionality

## Technology Stack

- **Frontend**: Next.js (TypeScript, Tailwind CSS)
- **Backend**: Python (FastAPI)
- **AI**: Google Gemini API
- **Image Processing**: OpenCV, NumPy
- **Libraries**: react-drag-drop-files, Pillow

## Getting Started

### Prerequisites

- Node.js v18+
- Python 3.10+
- Google Gemini API Key

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/lutforge-ai.git
cd lutforge-ai
```

2. **Backend Setup**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Frontend Setup**

```bash
cd ../frontend
npm install
```

4. **Environment Configuration**
   Create a `.env` file in the `backend` directory:

```env
GEMINI_API_KEY=your_api_key_here
```

### Running the Application

1. **Start Backend Server**

```bash
cd backend
uvicorn main:app --reload
```

2. **Start Frontend Development Server**

```bash
cd frontend
npm run dev
```

3. **Access the Application**
   Open `http://localhost:3000` in your browser

## Usage

1. Upload an image with a color grade you want to analyze
2. Click "Generate LUT" to start the AI analysis
3. Download the generated .cube file
4. Import into video editing software (DaVinci Resolve, Premiere Pro, etc.)

## Architecture

LutForge AI uses a three-stage pipeline:

1. **Vision Analysis**: Gemini AI analyzes the image's color characteristics
2. **Parameter Reasoning**: Converts descriptive analysis to mathematical parameters
3. **LUT Generation**: Creates 3D LUT using precise color transformations

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
