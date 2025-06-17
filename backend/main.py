import os
import numpy as np
import cv2
import google.generativeai as genai
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Dict, Any

try:
    import ujson as json
    print("✅ Using ujson for faster JSON parsing")
except ImportError:
    import json
    print("⚠️ ujson not found, using standard json library. Install with: pip install ujson")

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
    # Basic adjustments
    black_point: float = 0.0
    white_point: float = 1.0
    contrast: float = 1.0
    saturation: float = 1.0
    
    # Professional color grading controls
    lift: Dict[str, float] = {"r": 0.0, "g": 0.0, "b": 0.0}  # Shadows
    gamma: Dict[str, float] = {"r": 1.0, "g": 1.0, "b": 1.0}  # Midtones  
    gain: Dict[str, float] = {"r": 1.0, "g": 1.0, "b": 1.0}  # Highlights
    
    # Color temperature and tint
    temperature: float = 6500.0  # Kelvin
    tint: float = 0.0  # Magenta-Green bias
    
    # Channel curves
    red_curve: Dict[str, float] = {"shadows": 1.0, "midtones": 1.0, "highlights": 1.0}
    green_curve: Dict[str, float] = {"shadows": 1.0, "midtones": 1.0, "highlights": 1.0}
    blue_curve: Dict[str, float] = {"shadows": 1.0, "midtones": 1.0, "highlights": 1.0}
    
    # Legacy parameters for compatibility
    shadow_tint: Dict[str, Any] = {"color": "neutral", "balance": [1.0, 1.0, 1.0]}
    highlight_tint: Dict[str, Any] = {"color": "neutral", "balance": [1.0, 1.0, 1.0]}
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


def kelvin_to_rgb(kelvin: float) -> tuple[float, float, float]:
    """Convert color temperature in Kelvin to RGB multipliers"""
    temp = max(1000, min(40000, kelvin)) / 100
    
    # Calculate red component
    if temp <= 66:
        red = 1.0
    else:
        red = temp - 60
        red = 329.698727446 * (red ** -0.1332047592) / 255.0
        red = max(0.0, min(1.0, red))
    
    # Calculate green component  
    if temp <= 66:
        green = temp
        green = (99.4708025861 * np.log(green) - 161.1195681661) / 255.0
        green = max(0.0, min(1.0, green))
    else:
        green = temp - 60
        green = 288.1221695283 * (green ** -0.0755148492) / 255.0
        green = max(0.0, min(1.0, green))
    
    # Calculate blue component
    if temp >= 66:
        blue = 1.0
    elif temp <= 19:
        blue = 0.0
    else:
        blue = temp - 10
        blue = (138.5177312231 * np.log(blue) - 305.0447927307) / 255.0
        blue = max(0.0, min(1.0, blue))
    
    return red, green, blue


def apply_lift_gamma_gain(lut: np.ndarray, lift: Dict[str, float], 
                         gamma: Dict[str, float], gain: Dict[str, float]) -> np.ndarray:
    """Apply professional lift/gamma/gain color correction"""
    result = lut.copy()
    
    # Apply lift (affects shadows/blacks)
    lift_r, lift_g, lift_b = lift["r"], lift["g"], lift["b"]
    result[..., 0] = result[..., 0] + lift_r * (1.0 - result[..., 0])
    result[..., 1] = result[..., 1] + lift_g * (1.0 - result[..., 1])  
    result[..., 2] = result[..., 2] + lift_b * (1.0 - result[..., 2])
    
    # Apply gamma (affects midtones)
    gamma_r, gamma_g, gamma_b = gamma["r"], gamma["g"], gamma["b"]
    result[..., 0] = np.power(np.clip(result[..., 0], 0.001, 1.0), 1.0/gamma_r)
    result[..., 1] = np.power(np.clip(result[..., 1], 0.001, 1.0), 1.0/gamma_g)
    result[..., 2] = np.power(np.clip(result[..., 2], 0.001, 1.0), 1.0/gamma_b)
    
    # Apply gain (affects highlights/whites) 
    gain_r, gain_g, gain_b = gain["r"], gain["g"], gain["b"]
    result[..., 0] = result[..., 0] * gain_r
    result[..., 1] = result[..., 1] * gain_g
    result[..., 2] = result[..., 2] * gain_b
    
    return np.clip(result, 0, 1)


def apply_temperature_tint(lut: np.ndarray, temperature: float, tint: float) -> np.ndarray:
    """Apply color temperature and tint adjustments"""
    result = lut.copy()
    
    # Get RGB multipliers for temperature
    temp_r, temp_g, temp_b = kelvin_to_rgb(temperature)
    
    # Normalize to maintain brightness
    neutral_r, neutral_g, neutral_b = kelvin_to_rgb(6500.0)  # D65 standard
    temp_r /= neutral_r
    temp_g /= neutral_g  
    temp_b /= neutral_b
    
    # Apply temperature adjustment
    result[..., 0] *= temp_r
    result[..., 1] *= temp_g
    result[..., 2] *= temp_b
    
    # Apply tint (magenta-green bias)
    tint_factor = tint / 100.0
    if tint_factor != 0:
        # Positive tint = more magenta, negative = more green
        result[..., 0] += tint_factor * 0.1  # Slight red boost for magenta
        result[..., 1] -= abs(tint_factor) * 0.1  # Reduce green
        result[..., 2] += tint_factor * 0.05  # Slight blue boost for magenta
    
    return np.clip(result, 0, 1)


def apply_channel_curves(lut: np.ndarray, red_curve: Dict[str, float], 
                        green_curve: Dict[str, float], blue_curve: Dict[str, float]) -> np.ndarray:
    """Apply channel-specific curve adjustments"""
    result = lut.copy()
    luminance = 0.299 * result[..., 0] + 0.587 * result[..., 1] + 0.114 * result[..., 2]
    
    # Create masks for tonal regions
    shadow_mask = np.exp(-((luminance - 0.0) ** 2) / (2 * 0.15 ** 2))
    midtone_mask = np.exp(-((luminance - 0.5) ** 2) / (2 * 0.25 ** 2))  
    highlight_mask = np.exp(-((luminance - 1.0) ** 2) / (2 * 0.15 ** 2))
    
    # Normalize masks
    total_mask = shadow_mask + midtone_mask + highlight_mask
    shadow_mask /= total_mask
    midtone_mask /= total_mask
    highlight_mask /= total_mask
    
    # Apply red channel curve
    red_adjustment = (shadow_mask * red_curve["shadows"] + 
                     midtone_mask * red_curve["midtones"] + 
                     highlight_mask * red_curve["highlights"])
    result[..., 0] = np.power(result[..., 0], 1.0 / red_adjustment)
    
    # Apply green channel curve
    green_adjustment = (shadow_mask * green_curve["shadows"] + 
                       midtone_mask * green_curve["midtones"] + 
                       highlight_mask * green_curve["highlights"])
    result[..., 1] = np.power(result[..., 1], 1.0 / green_adjustment)
    
    # Apply blue channel curve  
    blue_adjustment = (shadow_mask * blue_curve["shadows"] + 
                      midtone_mask * blue_curve["midtones"] + 
                      highlight_mask * blue_curve["highlights"])
    result[..., 2] = np.power(result[..., 2], 1.0 / blue_adjustment)
    
    return np.clip(result, 0, 1)


def params_to_lut(params: ColorParams) -> np.ndarray:
    """Convert color parameters to 3D LUT"""
    lut = generate_identity_lut(LUT_SIZE)

    # Apply transformations in proper order
    lut = apply_contrast(lut, params.black_point, params.white_point)
    lut = apply_color_tint(lut, params.shadow_tint, "shadows")
    lut = apply_color_tint(lut, params.highlight_tint, "highlights")
    lut = apply_saturation(lut, params.saturation)
    lut = apply_channel_adjustments(lut, params.channel_adjustments)
    lut = apply_lift_gamma_gain(lut, params.lift, params.gamma, params.gain)
    lut = apply_temperature_tint(lut, params.temperature, params.tint)
    lut = apply_channel_curves(lut, params.red_curve, params.green_curve, params.blue_curve)

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


async def analyze_image_with_gemini(image_data: bytes) -> Dict[str, Any]:
    """Fast AI analysis using latest Gemini model with combined analysis and parameter generation"""
    try:
        print("Starting fast AI analysis with Gemini 2.0 Flash...")
        model = genai.GenerativeModel('gemini-2.0-flash')
        image_part = {
            "mime_type": "image/jpeg",
            "data": image_data
        }
        prompt = """You are a professional colorist analyzing this image's cinematic color grading. Examine the color characteristics carefully and provide precise LUT parameters to recreate this look.

Analyze specifically:
- Color temperature (warm vs cool tones) 
- Shadow/midtone/highlight color shifts
- Overall color bias (green/magenta tint, orange/teal, etc.)
- Contrast and saturation characteristics
- Film emulation or digital grade style

Return ONLY this JSON object:
{
    "analysis": "detailed color analysis focusing on cinematic characteristics",
    "black_point": <float 0.0-0.15>,
    "white_point": <float 0.85-1.0>,
    "contrast": <float 0.7-1.8>,
    "saturation": <float 0.6-1.6>,
    "temperature": <float 2000-12000>,
    "tint": <float -50 to 50>,
    "lift": {"r": <-0.3 to 0.3>, "g": <-0.3 to 0.3>, "b": <-0.3 to 0.3>},
    "gamma": {"r": <0.4 to 2.5>, "g": <0.4 to 2.5>, "b": <0.4 to 2.5>},
    "gain": {"r": <0.7 to 1.5>, "g": <0.7 to 1.5>, "b": <0.7 to 1.5>},
    "red_curve": {"shadows": <0.5-2.0>, "midtones": <0.5-2.0>, "highlights": <0.5-2.0>},
    "green_curve": {"shadows": <0.5-2.0>, "midtones": <0.5-2.0>, "highlights": <0.5-2.0>},
    "blue_curve": {"shadows": <0.5-2.0>, "midtones": <0.5-2.0>, "highlights": <0.5-2.0>},
    "shadow_tint": {"color": "neutral", "balance": [1.0, 1.0, 1.0]},
    "highlight_tint": {"color": "neutral", "balance": [1.0, 1.0, 1.0]},
    "channel_adjustments": {}
}

Key cinematic characteristics to detect:
- Orange/Teal: Warm highlights, cool shadows (common in blockbusters)
- Film emulation: Lifted blacks, rolled highlights, specific color casts
- Temperature shifts: Tungsten (3200K), Daylight (5600K), or stylized temps
- Green bias: Common in sci-fi/thriller genres (2500-4000K range)
- Bleach bypass: Desaturated, high contrast
- Cross-processing: Unusual color curves, inverted midtones

For cinematic green tint (like your reference): Use temperature 3200-4500K, negative tint (-20 to -40), boost green in gamma and midtones."""

        generation_config = genai.types.GenerationConfig(
            max_output_tokens=1000,  # Limit output for faster response
            temperature=0.1,         # Lower temperature for more consistent output
            top_p=0.8,              # Focused sampling for speed
            top_k=10                # Reduced candidate pool for speed
        )

        print("Sending optimized request to Gemini 2.0 Flash...")
        response = model.generate_content(
            [prompt, image_part],
            generation_config=generation_config
        )
        
        if not response.text:
            raise Exception("Empty response from Gemini API")
            
        print(f"✅ Fast analysis completed, response length: {len(response.text)}")
        
        response_text = response.text.strip()
        
        if response_text.startswith('{') and response_text.endswith('}'):
            json_str = response_text
        else:
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start == -1 or end == 0:
                raise ValueError("No JSON found in response")
            json_str = response_text[start:end]

        # Parse with ujson (much faster than standard json)
        result = json.loads(json_str)
        print("✅ JSON parsed successfully with ujson")
        return result

    except Exception as e:
        print(f"❌ Error in fast AI analysis: {str(e)}")
        raise


def params_from_response(response_data: Dict[str, Any]) -> ColorParams:
    """Convert the combined response to ColorParams object"""
    try:
        # Extract the analysis text for logging
        analysis = response_data.get("analysis", "No analysis provided")
        print(f"Color Analysis: {analysis}")
        
        # Remove the analysis field before creating ColorParams
        params_dict = {k: v for k, v in response_data.items() if k != "analysis"}
        
        print(f"Extracted parameters: {params_dict}")
        return ColorParams(**params_dict)
        
    except Exception as e:
        print(f"❌ Error creating ColorParams: {str(e)}")
        # Fallback to neutral parameters
        print("Using neutral fallback parameters")
        return ColorParams()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "LUTForge AI Backend is running"}

@app.get("/test-gemini")
async def test_gemini():
    """Test Gemini 2.0 Flash API connection"""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content("Say 'Hello from Gemini 2.0 Flash API - Lightning Fast!'")
        return {"status": "success", "model": "gemini-2.0-flash", "gemini_response": response.text}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.post("/api/generate-lut")
async def generate_lut(file: UploadFile = File(...)):
    """Fast LUT generation with optimized AI pipeline"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        # Read image data
        print(f"📁 Reading file: {file.filename}, content_type: {file.content_type}")
        image_data = await file.read()
        print(f"✅ Image data read successfully, size: {len(image_data)} bytes")
        print("🚀 Starting optimized AI analysis...")
        try:
            response_data = await analyze_image_with_gemini(image_data)
            print("✅ Fast AI analysis completed successfully")
        except Exception as e:
            print(f"❌ AI analysis failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

        # Convert response to parameters
        print("🔧 Converting to LUT parameters...")
        try:
            params = params_from_response(response_data)
            print("✅ Parameters extracted successfully")
            print("Color Parameters:", params.model_dump())
        except Exception as e:
            print(f"❌ Parameter extraction failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Parameter extraction failed: {str(e)}")
        print("⚡ Generating LUT array...")
        try:
            lut_array = params_to_lut(params)
            print(f"✅ LUT array generated successfully, shape: {lut_array.shape}")
        except Exception as e:
            print(f"❌ LUT generation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"LUT generation failed: {str(e)}")
        print("📄 Converting to .cube format...")
        try:
            cube_content = lut_to_cube(lut_array)
            print(f"✅ Cube content generated successfully, length: {len(cube_content)}")
        except Exception as e:
            print(f"❌ Cube conversion failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Cube conversion failed: {str(e)}")
        print("🎉 Fast LUT generation completed successfully!")
        return cube_content

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error in generate_lut: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        raise HTTPException(
            status_code=500, detail=f"LUT generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
