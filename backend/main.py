import os
import io
import json
import numpy as np
import cv2
import google.generativeai as genai
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Dict, Any

# Load environment variables
load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI(
    title="LUTForge AI API",
    description="AI-powered 3D LUT generation from image analysis",
    version="1.0.0"
)

# Get allowed origins from environment variable or use defaults
allowed_origins = os.getenv("CORS_ORIGINS", "*").split(",")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Constants
LUT_SIZE = 33


class ColorParams(BaseModel):
    black_point: float = 0.0
    white_point: float = 1.0
    contrast: float = 1.0
    saturation: float = 1.0
    shadow_tint: Dict[str, Any] = {
        "color": "neutral", "balance": [1.0, 1.0, 1.0]}
    highlight_tint: Dict[str, Any] = {
        "color": "neutral", "balance": [1.0, 1.0, 1.0]}
    channel_adjustments: Dict[str, float] = {}


def generate_identity_lut(size: int) -> np.ndarray:
    """Generate a 3D identity LUT cube"""
    lut = np.zeros((size, size, size, 3), dtype=np.float32)
    for r in range(size):
        for g in range(size):
            for b in range(size):
                lut[r, g, b] = [r/(size-1), g/(size-1), b/(size-1)]
    return lut


def apply_contrast(lut: np.ndarray, black_point: float, white_point: float) -> np.ndarray:
    """Apply contrast adjustment to LUT"""
    # Scale and offset to adjust contrast
    scale = 1.0 / (white_point - black_point)
    offset = -black_point * scale
    lut = lut * scale + offset
    return np.clip(lut, 0, 1)


def apply_saturation(lut: np.ndarray, saturation: float) -> np.ndarray:
    """Apply saturation adjustment to LUT"""
    # Ensure the LUT is in the correct data type for OpenCV (float32)
    lut_f32 = lut.astype(np.float32)

    # Convert to HSV, adjust saturation, convert back to RGB
    hsv = cv2.cvtColor(lut_f32.reshape(-1, 1, 3), cv2.COLOR_RGB2HSV)
    hsv[..., 1] = np.clip(hsv[..., 1] * saturation, 0, 1.0)
    result = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB).reshape(lut.shape)

    # Convert back to original data type
    return result.astype(lut.dtype)


def apply_color_tint(lut: np.ndarray, tint: Dict[str, Any], region: str) -> np.ndarray:
    """Apply color tint to specific tonal regions"""
    if tint["color"] == "neutral":
        return lut

    # Handle unknown colors gracefully
    valid_colors = ["cyan", "teal", "blue",
                    "orange", "gold", "red", "magenta", "green"]
    if tint["color"] not in valid_colors:
        print(f"Warning: Unknown color '{tint['color']}', treating as neutral")
        return lut

    # Calculate luminance to identify regions
    luminance = 0.299 * lut[..., 0] + 0.587 * lut[..., 1] + 0.114 * lut[..., 2]

    # Create mask based on region
    if region == "shadows":
        mask = np.where(luminance < 0.3, 1.0, 0.0)
    elif region == "highlights":
        mask = np.where(luminance > 0.7, 1.0, 0.0)
    else:  # midtones
        mask = np.where((luminance >= 0.3) & (luminance <= 0.7), 1.0, 0.0)

    # Apply tint with smooth transition
    tint_strength = np.array(tint["balance"], dtype=np.float32)
    tinted = lut * tint_strength
    return lut * (1 - mask[..., np.newaxis]) + tinted * mask[..., np.newaxis]


def apply_channel_adjustments(lut: np.ndarray, adjustments: Dict[str, float]) -> np.ndarray:
    """Apply channel-specific adjustments"""
    if "red_gamma" in adjustments:
        lut[..., 0] = np.power(lut[..., 0], adjustments["red_gamma"])
    if "green_gamma" in adjustments:
        lut[..., 1] = np.power(lut[..., 1], adjustments["green_gamma"])
    if "blue_gamma" in adjustments:
        lut[..., 2] = np.power(lut[..., 2], adjustments["blue_gamma"])
    return np.clip(lut, 0, 1)


def params_to_lut(params: ColorParams) -> np.ndarray:
    """Convert color parameters to 3D LUT"""
    lut = generate_identity_lut(LUT_SIZE)

    # Apply transformations in proper order
    lut = apply_contrast(lut, params.black_point, params.white_point)
    lut = apply_color_tint(lut, params.shadow_tint, "shadows")
    lut = apply_color_tint(lut, params.highlight_tint, "highlights")
    lut = apply_saturation(lut, params.saturation)
    lut = apply_channel_adjustments(lut, params.channel_adjustments)

    return lut


def lut_to_cube(lut: np.ndarray) -> str:
    """Convert 3D LUT array to .cube file format"""
    size = lut.shape[0]
    cube = f"# LUTForge AI Generated LUT\n"
    cube += f"# Created by AI color analysis\n"
    cube += f"LUT_3D_SIZE {size}\n\n"

    # Flatten the LUT to write in row-major order
    for r in range(size):
        for g in range(size):
            for b in range(size):
                # .cube format expects values in [0,1] range
                rgb = lut[r, g, b]
                cube += f"{rgb[0]:.6f} {rgb[1]:.6f} {rgb[2]:.6f}\n"

    return cube


def analyze_image_with_gemini(image_data: bytes) -> str:
    try:
        # Configure Gemini API with your key
        print("Configuring Gemini API...")
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        print("✅ API key configured")

        # Create the model
        print("Creating Gemini Pro Vision model...")
        model = genai.GenerativeModel('gemini-1.5-flash')
        print("✅ Model created")

        # Prepare the image part
        print("Preparing image for Gemini...")
        image_part = {
            "mime_type": "image/jpeg",  # Assuming JPEG, adjust if needed
            "data": image_data
        }
        print("✅ Image prepared")

        # Create the prompt
        prompt = """
        Analyze this image and describe the current color grading characteristics. 
        Focus on:
        1. Color temperature (warm/cool)
        2. Contrast levels
        3. Saturation
        4. Shadow/highlight characteristics
        5. Overall mood/style
        
        Provide specific recommendations for LUT adjustments.
        """

        # Generate content with the model
        print("Sending request to Gemini Vision API...")
        response = model.generate_content([prompt, image_part])
        print("✅ Received response from Gemini Vision API")
        
        if not response.text:
            print("❌ Empty response from Gemini")
            raise Exception("Empty response from Gemini Vision API")
            
        print(f"✅ Analysis completed, response length: {len(response.text)}")
        return response.text

    except Exception as e:
        print(f"❌ Error in analyze_image_with_gemini: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        if hasattr(e, 'response'):
            print(f"API Response: {e.response}")
        raise


def generate_parameters_with_gemini(analysis: str) -> ColorParameters:
    """Convert the color analysis into specific numeric parameters"""
    try:
        print("Converting analysis to parameters...")
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Based on this color analysis:
        {analysis}
        
        Generate specific numeric parameters for a 3D LUT. Return a JSON object with these exact fields:
        {{
            "exposure": <float between -2.0 and 2.0>,
            "contrast": <float between 0.5 and 2.0>,
            "highlights": <float between -100 and 100>,
            "shadows": <float between -100 and 100>,
            "whites": <float between -100 and 100>,
            "blacks": <float between -100 and 100>,
            "saturation": <float between 0.0 and 2.0>,
            "warmth": <float between -100 and 100>
        }}
        
        Base values should be around:
        - exposure: 0.0 (neutral)
        - contrast: 1.0 (neutral)
        - highlights/shadows/whites/blacks: 0 (neutral)
        - saturation: 1.0 (neutral)
        - warmth: 0 (neutral)
        
        Only deviate from neutral when the analysis specifically suggests adjustments.
        """
        
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Parse JSON response
        json_str = response.text.strip().replace('```json', '').replace('```', '')
        params_dict = json.loads(json_str)
        
        print("✅ Parameters generated from analysis")
        return ColorParameters(**params_dict)
        
    except Exception as e:
        print(f"❌ Error generating parameters: {str(e)}")
        # Fallback to neutral parameters
        print("Using neutral fallback parameters")
        return ColorParameters()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "LutForge AI Backend is running"}

@app.get("/test-gemini")
async def test_gemini():
    """Test Gemini API connection"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Simple test prompt
        response = model.generate_content("Say 'Hello from Gemini API'")
        return {"status": "success", "gemini_response": response.text}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.post("/api/generate-lut")
async def generate_lut(file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        # Read image data
        print(f"Reading file: {file.filename}, content_type: {file.content_type}")
        image_data = await file.read()
        print(f"Image data read successfully, size: {len(image_data)} bytes")

        # Step 1: Analyze image with Gemini Vision
        print("Starting Gemini Vision analysis...")
        try:
            analysis = analyze_image_with_gemini(image_data)
            print("✅ Gemini Vision analysis completed successfully")
            print("Color Analysis:", analysis)
        except Exception as e:
            print(f"❌ Gemini Vision analysis failed: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            raise HTTPException(status_code=500, detail=f"Gemini Vision analysis failed: {str(e)}")

        # Step 2: Generate parameters with Gemini
        print("Starting parameter generation...")
        try:
            params = generate_parameters_with_gemini(analysis)
            print("✅ Parameter generation completed successfully")
            print("Color Parameters:", params.model_dump())
        except Exception as e:
            print(f"❌ Parameter generation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Parameter generation failed: {str(e)}")

        # Step 3: Generate LUT from parameters
        print("Starting LUT generation...")
        try:
            lut_array = params_to_lut(params)
            print(f"✅ LUT array generated successfully, shape: {lut_array.shape}")
        except Exception as e:
            print(f"❌ LUT generation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"LUT generation failed: {str(e)}")

        # Step 4: Convert to cube format
        print("Converting to .cube format...")
        try:
            cube_content = lut_to_cube(lut_array)
            print(f"✅ Cube content generated successfully, length: {len(cube_content)}")
        except Exception as e:
            print(f"❌ Cube conversion failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Cube conversion failed: {str(e)}")

        print("🎉 LUT generation completed successfully!")
        return cube_content

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"❌ Unexpected error in generate_lut: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        raise HTTPException(
            status_code=500, detail=f"LUT generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
