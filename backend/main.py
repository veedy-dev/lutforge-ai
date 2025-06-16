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


def analyze_image_with_gemini(image_data: bytes) -> Dict[str, Any]:
    """Send image to Gemini for color analysis"""
    model = genai.GenerativeModel('gemini-1.5-flash')

    # Create prompt for professional color analysis
    prompt = """
    You are a professional Hollywood colorist. Analyze the provided image and describe its color grade in precise, technical terms. 
    Your output must be a JSON object with the following structure:
    {
        "shadows": "Detailed description of shadow characteristics",
        "midtones": "Detailed description of midtone characteristics",
        "highlights": "Detailed description of highlight characteristics",
        "saturation": "Description of saturation levels and any selective adjustments",
        "contrast": "Description of contrast characteristics",
        "color_balance": "Description of overall color balance and any color shifts",
        "film_emulation": "Any film stock emulation noticed"
    }
    
    Be extremely detailed and technical in your analysis. Focus on:
    - Color shifts in shadows, midtones, highlights
    - Black point and white point characteristics
    - Contrast curve (S-curve, linear, etc.)
    - Saturation levels and any selective saturation adjustments
    - Color balance and tint
    - Any noticeable film emulation characteristics
    
    Example:
    {
        "shadows": "Slightly crushed with a strong push towards cyan and reduced saturation",
        "midtones": "High contrast with a focus on preserving natural skin tones while slightly warming them",
        "highlights": "Soft and slightly rolled off, with a subtle yellow/gold tint",
        "saturation": "Overall saturation is moderately high, but greens and blues are selectively desaturated by 20-30%",
        "contrast": "Medium-high contrast with lifted blacks and slightly compressed highlights",
        "color_balance": "Overall cool color balance with a cyan/teal bias in shadows and warm highlights",
        "film_emulation": "Similar to Kodak Vision3 500T film stock with teal/orange color contrast"
    }
    """

    # Send image with prompt
    response = model.generate_content(
        contents=[prompt, {"mime_type": "image/jpeg", "data": image_data}],
        generation_config={"response_mime_type": "application/json"}
    )

    try:
        # Extract JSON from response
        json_str = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(json_str)
    except Exception as e:
        raise ValueError(f"Failed to parse Gemini response: {str(e)}")


def generate_parameters_with_gemini(analysis: Dict[str, Any]) -> ColorParams:
    """Convert color analysis to mathematical parameters"""
    model = genai.GenerativeModel('gemini-1.5-flash')

    # Create prompt for parameter generation
    prompt = f"""
    Based on the following professional color analysis, generate a JSON object with specific parameters to replicate this look.
    Use the exact structure shown in the example below.
    
    Color Analysis:
    {json.dumps(analysis, indent=2)}
    
    Output JSON Structure:
    {{
        "black_point": float (0.0-0.1),
        "white_point": float (0.9-1.0),
        "shadow_tint": {{
            "color": string ("cyan", "teal", "blue", "orange", "gold", "red", "magenta", "green", "neutral"),
            "balance": [float, float, float] (RGB multipliers, each 0.0-2.0)
        }},
        "highlight_tint": {{
            "color": string ("cyan", "teal", "blue", "orange", "gold", "red", "magenta", "green", "neutral"),
            "balance": [float, float, float] (RGB multipliers)
        }},
        "contrast": float (0.8-1.5),
        "saturation": float (0.5-1.5),
        "channel_adjustments": {{
            "red_gamma": float (0.7-1.3, optional),
            "green_gamma": float (0.7-1.3, optional),
            "blue_gamma": float (0.7-1.3, optional),
            "green_saturation": float (0.5-1.5, optional),
            "blue_saturation": float (0.5-1.5, optional)
        }}
    }}
    
    Example Output:
    {{
        "black_point": 0.05,
        "white_point": 0.98,
        "shadow_tint": {{"color": "cyan", "balance": [0.9, 1.0, 1.1]}},
        "highlight_tint": {{"color": "gold", "balance": [1.1, 1.05, 0.95]}},
        "contrast": 1.2,
        "saturation": 1.1,
        "channel_adjustments": {{"green_saturation": 0.8, "blue_gamma": 1.1}}
    }}
    
    Important:
    - Convert the descriptive analysis into precise numerical values
    - Only include parameters that are explicitly mentioned in the analysis
    - Use your expertise in color science to determine appropriate values
    """

    # Send prompt to Gemini
    response = model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json"}
    )

    try:
        # Extract JSON from response
        json_str = response.text.strip().replace('```json', '').replace('```', '')
        params_dict = json.loads(json_str)
        return ColorParams(**params_dict)
    except Exception as e:
        raise ValueError(f"Failed to parse parameters from Gemini: {str(e)}")


@app.post("/api/generate-lut")
async def generate_lut(file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        # Read image data
        image_data = await file.read()

        # Step 1: Analyze image with Gemini Vision
        print("Analyzing image with Gemini Vision...")
        analysis = analyze_image_with_gemini(image_data)
        print("Color Analysis:", analysis)

        # Step 2: Generate parameters with Gemini
        print("Generating color parameters...")
        params = generate_parameters_with_gemini(analysis)
        print("Color Parameters:", params.model_dump())

        # Step 3: Generate LUT from parameters
        print("Generating 3D LUT...")
        try:
            lut_array = params_to_lut(params)
            print("LUT array generated successfully, shape:", lut_array.shape)
        except Exception as e:
            print("Error in params_to_lut:", str(e))
            raise

        try:
            cube_content = lut_to_cube(lut_array)
            print("Cube content generated, length:", len(cube_content))
        except Exception as e:
            print("Error in lut_to_cube:", str(e))
            raise

        # Create response with .cube file
        try:
            cube_bytes = io.BytesIO(cube_content.encode('utf-8'))
            print("BytesIO created successfully")
            return StreamingResponse(
                cube_bytes,
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": "attachment; filename=lutforge_ai_generated.cube"}
            )
        except Exception as e:
            print("Error creating StreamingResponse:", str(e))
            raise

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"LUT generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
