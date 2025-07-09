import os
import numpy as np
import cv2
import google.generativeai as genai
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Dict, Any, List
from PIL import Image
import io
from color_matcher import ColorMatcher
from color_matcher.io_handler import load_img_file
from color_matcher.normalizer import Normalizer
from skimage import img_as_float, img_as_ubyte
import base64

try:
    import ujson as json
except ImportError:
    import json

# Load environment variables
load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI(
    title="LUTForge AI API",
    description="AI-powered 3D LUT generation with professional color matching",
    version="2.0.0"
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

class CinematicLook(BaseModel):
    name: str
    description: str
    method: str  # color-matcher method
    reference_colors: List[List[float]]  # RGB reference points
    temperature_bias: float
    saturation_factor: float

class ColorMatcherResponse(BaseModel):
    analysis: str
    cinematic_look: str
    method: str
    confidence: float

# Reference cinematic looks with their characteristic color points
CINEMATIC_LOOKS = {
    "orange_teal": CinematicLook(
        name="Orange & Teal",
        description="Hollywood blockbuster look with warm skin tones and cool backgrounds",
        method="mkl",
        reference_colors=[
            [1.0, 0.6, 0.2],  # Strong warm orange highlights
            [0.1, 0.3, 0.5],  # Deep cool teal shadows
            [0.8, 0.5, 0.3],  # Warm midtones
        ],
        temperature_bias=400,  # Warmer
        saturation_factor=1.3
    ),
    "sci_fi_green": CinematicLook(
        name="Sci-Fi Green",
        description="Cyberpunk/sci-fi green tint with cool temperature",
        method="mkl", 
        reference_colors=[
            [0.2, 0.8, 0.3],  # Bright green midtones
            [0.1, 0.4, 0.2],  # Dark green shadows
            [0.3, 1.0, 0.4],  # Very bright green highlights
        ],
        temperature_bias=-800,  # Cooler
        saturation_factor=1.2
    ),
    "film_noir": CinematicLook(
        name="Film Noir", 
        description="High contrast black and white with deep shadows",
        method="reinhard",
        reference_colors=[
            [0.05, 0.05, 0.05],  # Very deep blacks
            [0.95, 0.95, 0.95],  # Bright whites
            [0.4, 0.4, 0.4],  # Mid gray
        ],
        temperature_bias=0,
        saturation_factor=0.3
    ),
    "warm_vintage": CinematicLook(
        name="Warm Vintage",
        description="Nostalgic warm film look with lifted blacks",
        method="mkl",
        reference_colors=[
            [0.9, 0.7, 0.4],  # Very warm highlights
            [0.4, 0.3, 0.2],  # Warm lifted shadows
            [0.7, 0.5, 0.3],  # Warm midtones
        ],
        temperature_bias=800,  # Much warmer
        saturation_factor=1.1
    ),
    "cool_digital": CinematicLook(
        name="Cool Digital",
        description="Modern digital look with cool blue tones",
        method="mkl",
        reference_colors=[
            [0.3, 0.4, 0.9],  # Strong cool highlights
            [0.1, 0.1, 0.4],  # Deep cool shadows
            [0.2, 0.3, 0.6],  # Cool midtones
        ],
        temperature_bias=-600,  # Much cooler
        saturation_factor=1.3
    ),
    "bleach_bypass": CinematicLook(
        name="Bleach Bypass",
        description="High contrast desaturated look with silver retention",
        method="reinhard",
        reference_colors=[
            [0.9, 0.9, 0.8],  # Desaturated highlights with slight warmth
            [0.05, 0.05, 0.05],  # Very deep shadows
            [0.5, 0.5, 0.5],  # Neutral midtones
        ],
        temperature_bias=-100,
        saturation_factor=0.4
    ),
    "warm_red_film": CinematicLook(
        name="Warm Red Film",
        description="Film-like warm red tones reminiscent of classic cinema with enhanced skin tones",
        method="mkl",
        reference_colors=[
            [0.95, 0.4, 0.3],  # Strong red highlights
            [0.6, 0.2, 0.15],  # Deep red shadows
            [0.8, 0.5, 0.4],   # Warm red midtones
            [0.9, 0.7, 0.5],   # Warm skin tone highlights
        ],
        temperature_bias=600,  # Warmer
        saturation_factor=1.4
    )
}

def create_reference_image(look: CinematicLook, size: tuple = (256, 256)) -> np.ndarray:
    """Create a reference image based on cinematic look characteristics using realistic color distributions"""
    ref_img = np.zeros((*size, 3), dtype=np.float32)
    height, width = size
    
    # Create more realistic image-like reference with varied color regions
    # This simulates actual photographic color distribution patterns
    
    if look.name == "Orange & Teal":
        # Create a realistic sunset/urban scene color pattern
        for y in range(height):
            for x in range(width):
                pos_x = x / width
                pos_y = y / height
                
                # Simulate warm highlights (orange) and cool shadows (teal)
                if pos_y < 0.4:  # Sky area - cooler tones
                    ref_img[y, x] = [0.15 + pos_x * 0.1, 0.35 + pos_x * 0.15, 0.55 + pos_x * 0.2]
                elif pos_y < 0.7:  # Mid area - transition
                    warmth = pos_x * 0.6 + 0.2
                    ref_img[y, x] = [warmth, warmth * 0.7, warmth * 0.4]
                else:  # Ground/subject area - warmer tones
                    ref_img[y, x] = [0.85 + pos_x * 0.1, 0.55 + pos_x * 0.1, 0.25 + pos_x * 0.05]
                    
    elif look.name == "Sci-Fi Green":
        # Create a cyberpunk/sci-fi color pattern
        for y in range(height):
            for x in range(width):
                pos_x = x / width
                pos_y = y / height
                
                # Matrix-like green dominance with blue shadows
                if (pos_x + pos_y) % 0.3 < 0.15:  # Grid pattern
                    ref_img[y, x] = [0.1, 0.8 + pos_y * 0.15, 0.2 + pos_y * 0.1]
                else:
                    ref_img[y, x] = [0.05 + pos_x * 0.1, 0.4 + pos_y * 0.3, 0.15 + pos_x * 0.05]
                    
    elif look.name == "Film Noir":
        # Create high contrast B&W with selective color
        for y in range(height):
            for x in range(width):
                pos_x = x / width
                pos_y = y / height
                
                # High contrast with deep shadows and bright highlights
                if pos_y < 0.3 or pos_y > 0.8:  # Extreme zones
                    intensity = 0.9 if pos_y > 0.8 else 0.05
                    ref_img[y, x] = [intensity, intensity * 0.95, intensity * 0.9]
                else:
                    intensity = 0.3 + pos_x * 0.4
                    ref_img[y, x] = [intensity, intensity * 0.95, intensity * 0.9]
                    
    elif look.name == "Warm Vintage":
        # Create warm, faded film look
        for y in range(height):
            for x in range(width):
                pos_x = x / width
                pos_y = y / height
                
                # Warm, lifted shadows with golden highlights
                base_r = 0.7 + pos_y * 0.2
                base_g = 0.6 + pos_y * 0.15
                base_b = 0.4 + pos_y * 0.1
                ref_img[y, x] = [base_r, base_g, base_b]
                
    elif look.name == "Cool Digital":
        # Create modern digital look
        for y in range(height):
            for x in range(width):
                pos_x = x / width
                pos_y = y / height
                
                # Cool blue dominance with clean highlights
                ref_img[y, x] = [0.3 + pos_x * 0.2, 0.4 + pos_x * 0.3, 0.8 + pos_y * 0.15]
                
    elif look.name == "Warm Red Film":
        # Create warm red film look
        for y in range(height):
            for x in range(width):
                pos_x = x / width
                pos_y = y / height
                
                # Strong red dominance with warm undertones
                base_red = 0.8 + pos_y * 0.15  # High red values
                base_green = 0.3 + pos_x * 0.4  # Moderate green for warmth
                base_blue = 0.2 + pos_x * 0.3   # Lower blue for warmth
                
                # Add some variation for skin tones
                if 0.3 < pos_y < 0.7 and 0.2 < pos_x < 0.8:  # Central skin tone area
                    base_red *= 1.1
                    base_green *= 1.2
                    base_blue *= 0.8
                
                ref_img[y, x] = [base_red, base_green, base_blue]
                
    else:  # Bleach Bypass
        # Create desaturated high contrast look
        for y in range(height):
            for x in range(width):
                pos_x = x / width
                pos_y = y / height
                
                # Desaturated with silver retention effect
                intensity = 0.1 + pos_y * 0.8
                ref_img[y, x] = [intensity * 1.05, intensity, intensity * 0.95]
    
    # Add realistic noise and texture variation
    noise = np.random.normal(0, 0.02, ref_img.shape)
    ref_img = np.clip(ref_img + noise, 0, 1)
    
    # Add some color variation to make transfer more effective
    color_variation = np.random.uniform(-0.05, 0.05, ref_img.shape)
    ref_img = np.clip(ref_img + color_variation, 0, 1)
    
    # Enhance color saturation and contrast to ensure strong color transfer
    ref_img = enhance_reference_colors(ref_img, look)
    
    return ref_img

def enhance_reference_colors(ref_img: np.ndarray, look: CinematicLook) -> np.ndarray:
    """Enhance reference image colors to ensure strong color transfer"""
    enhanced = ref_img.copy()
    
    # Apply much more subtle enhancements for realistic color grading
    hsv = cv2.cvtColor((enhanced * 255).astype(np.uint8), cv2.COLOR_RGB2HSV)
    hsv = hsv.astype(np.float32)
    
    # Only slightly increase saturation (10-20% instead of 50%)
    saturation_boost = 1.15 if look.saturation_factor > 1.0 else 1.05
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * saturation_boost, 0, 255)
    
    # Very subtle contrast enhancement (10% instead of 30%)
    hsv[:, :, 2] = np.clip((hsv[:, :, 2] - 127.5) * 1.1 + 127.5, 0, 255)
    
    enhanced = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32) / 255.0
    
    return np.clip(enhanced, 0, 1)

async def analyze_image_for_cinematic_look(image_data: bytes) -> ColorMatcherResponse:
    """Use AI to determine the best cinematic look for the uploaded image"""
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        image_part = {
            "mime_type": "image/jpeg",
            "data": image_data
        }
        
        looks_description = "\n".join([
            f"- {key}: {look.description}" 
            for key, look in CINEMATIC_LOOKS.items()
        ])
        
        prompt = f"""Analyze this image and determine which cinematic color grading style would work best.

Available cinematic looks:
{looks_description}

Consider:
- Current color palette and mood
- Genre/style suggestions (portrait, landscape, urban, etc.)
- Existing color cast or temperature
- Contrast and lighting conditions
- What would enhance the cinematic quality
- If the image already has strong red/warm tones, consider warm_red_film

Return ONLY this JSON:
{{
    "analysis": "brief analysis of the image's current color characteristics and mood",
    "cinematic_look": "one of: orange_teal, sci_fi_green, film_noir, warm_vintage, cool_digital, bleach_bypass, warm_red_film",
    "method": "recommended color-matcher method (mkl, reinhard, hist_match)",
    "confidence": <float 0.0-1.0>
}}

Choose the look that would create the most cinematic and professional result."""

        generation_config = genai.types.GenerationConfig(
            max_output_tokens=300,
            temperature=0.2,
            top_p=0.8
        )

        response = model.generate_content([prompt, image_part], generation_config=generation_config)
        
        if not response.text:
            raise Exception("Empty response from Gemini API")
        
        response_text = response.text.strip()
        
        # Extract JSON
        if response_text.startswith('{') and response_text.endswith('}'):
            json_str = response_text
        else:
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start == -1 or end == 0:
                raise ValueError("No JSON found in response")
            json_str = response_text[start:end]

        result = json.loads(json_str)
        return ColorMatcherResponse(**result)

    except Exception as e:
        # Fallback to warm_vintage for universal appeal
        return ColorMatcherResponse(
            analysis="Fallback analysis - using versatile warm vintage look",
            cinematic_look="warm_vintage",
            method="mkl",
            confidence=0.7
        )

def generate_lut_from_color_transfer(source_img: np.ndarray, reference_img: np.ndarray, method: str = "mkl") -> np.ndarray:
    """Generate 3D LUT using color-matcher for professional color transfer"""
    try:
        # Enhance reference colors for better matching
        from color_matcher.normalizer import Normalizer
        norm = Normalizer()
        
        # Normalize images
        source_norm = norm.type_norm(source_img.copy())
        reference_norm = norm.type_norm(reference_img.copy())
        
        # Apply color matching
        cm = ColorMatcher()
        
        # Perform color transfer
        matched_img = cm.transfer(src=source_norm, ref=reference_norm, method=method)
        
        # Analyze both source and matched images
        source_analysis = analyze_image_characteristics(source_img)
        reference_analysis = analyze_reference_colors(reference_img)
        
        # Generate LUT based on the color transfer
        lut = np.zeros((LUT_SIZE, LUT_SIZE, LUT_SIZE, 3), dtype=np.float32)
        
        for r in range(LUT_SIZE):
            for g in range(LUT_SIZE):
                for b in range(LUT_SIZE):
                    # Normalized input color [0,1]
                    input_color = np.array([
                        r / (LUT_SIZE - 1),
                        g / (LUT_SIZE - 1), 
                        b / (LUT_SIZE - 1)
                    ], dtype=np.float32)
                    
                    # Apply professional color grading transformation
                    output_color = apply_professional_color_grading(
                        input_color, 
                        source_analysis, 
                        reference_analysis
                    )
                    
                    # Store in LUT
                    lut[r, g, b] = output_color
        
        return lut
        
    except Exception as e:
        # Fallback to reference analysis method
        reference_analysis = analyze_reference_colors(reference_img)
        return create_adaptive_lut(reference_analysis)

def analyze_reference_colors(ref_img: np.ndarray) -> dict:
    """Analyze reference image to extract color characteristics"""
    # Convert to different luminance ranges
    luminance = 0.299 * ref_img[:, :, 0] + 0.587 * ref_img[:, :, 1] + 0.114 * ref_img[:, :, 2]
    
    # Analyze shadows, midtones, highlights separately
    shadows_mask = luminance < 0.3
    midtones_mask = (luminance >= 0.3) & (luminance <= 0.7) 
    highlights_mask = luminance > 0.7
    
    analysis = {}
    
    # Get dominant colors for each range
    if np.any(shadows_mask):
        shadows_avg = np.mean(ref_img[shadows_mask], axis=0)
    else:
        shadows_avg = np.array([0.1, 0.1, 0.1])
    
    if np.any(midtones_mask):
        midtones_avg = np.mean(ref_img[midtones_mask], axis=0)
    else:
        midtones_avg = np.array([0.5, 0.5, 0.5])
        
    if np.any(highlights_mask):
        highlights_avg = np.mean(ref_img[highlights_mask], axis=0)
    else:
        highlights_avg = np.array([0.9, 0.9, 0.9])
    
    analysis['dominant_colors'] = {
        'shadows': shadows_avg,
        'midtones': midtones_avg, 
        'highlights': highlights_avg
    }
    
    # Calculate overall color bias
    overall_avg = np.mean(ref_img.reshape(-1, 3), axis=0)
    
    # Determine temperature bias (red vs blue)
    if overall_avg[0] > overall_avg[2]:
        analysis['temperature_bias'] = 'warm'
        analysis['warmth_strength'] = (overall_avg[0] - overall_avg[2]) * 2
    else:
        analysis['temperature_bias'] = 'cool' 
        analysis['warmth_strength'] = (overall_avg[2] - overall_avg[0]) * 2
    
    # Determine color cast
    max_channel = np.argmax(overall_avg)
    if max_channel == 0:
        analysis['color_cast'] = 'red'
    elif max_channel == 1:
        analysis['color_cast'] = 'green'
    else:
        analysis['color_cast'] = 'blue'
        
    analysis['cast_strength'] = np.max(overall_avg) - np.min(overall_avg)
    
    return analysis

def create_adaptive_lut(ref_analysis: dict) -> np.ndarray:
    """Create visible but safe LUT based on reference image"""
    lut = np.zeros((LUT_SIZE, LUT_SIZE, LUT_SIZE, 3), dtype=np.float32)
    
    # Get reference characteristics
    ref_shadows = ref_analysis['dominant_colors']['shadows']
    ref_midtones = ref_analysis['dominant_colors']['midtones']
    ref_highlights = ref_analysis['dominant_colors']['highlights']
    
    # Calculate safe adjustment factors
    is_warm = ref_analysis['temperature_bias'] == 'warm'
    warmth_strength = min(ref_analysis.get('warmth_strength', 0.1), 0.3)
    
    for r in range(LUT_SIZE):
        for g in range(LUT_SIZE):
            for b in range(LUT_SIZE):
                # Create normalized input coordinates [0,1]
                input_r = r / (LUT_SIZE - 1)
                input_g = g / (LUT_SIZE - 1) 
                input_b = b / (LUT_SIZE - 1)
                
                # START WITH IDENTITY
                output_r = input_r
                output_g = input_g
                output_b = input_b
                
                # Calculate luminance to determine tone range
                luminance = 0.299 * input_r + 0.587 * input_g + 0.114 * input_b
                
                # Apply different adjustments based on luminance range
                if luminance > 0.02:  # Skip only pure black
                    
                    # Temperature adjustment based on reference
                    temp_adjustment = 0.05 if is_warm else -0.05  # 5% adjustment
                    
                    if luminance < 0.33:  # Shadows
                        # Shift shadows toward reference shadow color
                        shadow_influence = ref_shadows - np.array([luminance, luminance, luminance])
                        output_r += shadow_influence[0] * 0.15  # 15% influence
                        output_g += shadow_influence[1] * 0.15
                        output_b += shadow_influence[2] * 0.15
                        
                    elif luminance > 0.66:  # Highlights
                        # Shift highlights toward reference highlight color
                        highlight_influence = ref_highlights - np.array([luminance, luminance, luminance])
                        output_r += highlight_influence[0] * 0.12  # 12% influence
                        output_g += highlight_influence[1] * 0.12
                        output_b += highlight_influence[2] * 0.12
                        
                    else:  # Midtones (most important)
                        # Shift midtones toward reference midtone color
                        midtone_influence = ref_midtones - np.array([luminance, luminance, luminance])
                        output_r += midtone_influence[0] * 0.18  # 18% influence
                        output_g += midtone_influence[1] * 0.18
                        output_b += midtone_influence[2] * 0.18
                    
                    # Apply temperature bias
                    if is_warm:
                        output_r *= (1 + temp_adjustment * warmth_strength)
                        output_b *= (1 - temp_adjustment * warmth_strength * 0.7)
                    else:
                        output_b *= (1 + abs(temp_adjustment) * warmth_strength)
                        output_r *= (1 - abs(temp_adjustment) * warmth_strength * 0.7)
                
                # Ensure values stay in valid range [0,1]
                lut[r, g, b] = np.clip([output_r, output_g, output_b], 0, 1)
    return lut

def analyze_image_characteristics(img: np.ndarray) -> dict:
    """Analyze image characteristics like professional color grading software"""
    # Convert to different color spaces for analysis
    img_uint8 = (img * 255).astype(np.uint8)
    hsv = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2HSV).astype(np.float32) / 255.0
    lab = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2LAB).astype(np.float32)
    
    # Calculate luminance (similar to Lightroom/DaVinci)
    luminance = 0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]
    
    # Analyze shadows, midtones, highlights (like professional software)
    shadows_mask = luminance < 0.25
    midtones_mask = (luminance >= 0.25) & (luminance <= 0.75)
    highlights_mask = luminance > 0.75
    
    analysis = {
        'shadows': {
            'rgb_avg': np.mean(img[shadows_mask], axis=0) if np.any(shadows_mask) else np.array([0.1, 0.1, 0.1]),
            'saturation_avg': np.mean(hsv[shadows_mask, 1]) if np.any(shadows_mask) else 0.3,
            'luminance_avg': np.mean(luminance[shadows_mask]) if np.any(shadows_mask) else 0.15
        },
        'midtones': {
            'rgb_avg': np.mean(img[midtones_mask], axis=0) if np.any(midtones_mask) else np.array([0.5, 0.5, 0.5]),
            'saturation_avg': np.mean(hsv[midtones_mask, 1]) if np.any(midtones_mask) else 0.5,
            'luminance_avg': np.mean(luminance[midtones_mask]) if np.any(midtones_mask) else 0.5
        },
        'highlights': {
            'rgb_avg': np.mean(img[highlights_mask], axis=0) if np.any(highlights_mask) else np.array([0.9, 0.9, 0.9]),
            'saturation_avg': np.mean(hsv[highlights_mask, 1]) if np.any(highlights_mask) else 0.2,
            'luminance_avg': np.mean(luminance[highlights_mask]) if np.any(highlights_mask) else 0.85
        },
        'overall': {
            'temperature': estimate_color_temperature(img),
            'tint': estimate_tint(img),
            'contrast': np.std(luminance),
            'saturation_avg': np.mean(hsv[:, :, 1])
        }
    }
    
    return analysis

def estimate_color_temperature(img: np.ndarray) -> float:
    """Estimate color temperature like professional software"""
    # Calculate red/blue ratio (simplified temperature estimation)
    red_avg = np.mean(img[:, :, 0])
    blue_avg = np.mean(img[:, :, 2])
    
    if blue_avg > 0:
        rb_ratio = red_avg / blue_avg
        # Map to approximate temperature scale
        if rb_ratio > 1.1:
            return 3200  # Warm
        elif rb_ratio < 0.9:
            return 6500  # Cool
        else:
            return 5500  # Neutral
    return 5500

def estimate_tint(img: np.ndarray) -> float:
    """Estimate tint like professional software"""
    # Calculate green bias
    green_avg = np.mean(img[:, :, 1])
    rg_avg = (np.mean(img[:, :, 0]) + np.mean(img[:, :, 2])) / 2
    
    return (green_avg - rg_avg) * 100  # Tint offset

def apply_professional_color_grading(input_color: np.ndarray, source_analysis: dict, reference_analysis: dict) -> np.ndarray:
    """Apply conservative professional color grading transformations"""
    r, g, b = input_color
    
    # Calculate luminance to determine shadows/midtones/highlights
    luminance = 0.299 * r + 0.587 * g + 0.114 * b
    
    # Start with the original color
    adjusted_color = input_color.copy()
    
    # Apply very subtle color shifts based on luminance range
    if luminance < 0.25:
        # Shadows - very conservative adjustment
        target_rgb = reference_analysis['shadows']['rgb_avg']
        source_rgb = source_analysis['shadows']['rgb_avg']
        weight = 0.08  # Very subtle adjustment for shadows
    elif luminance > 0.75:
        # Highlights - very conservative adjustment  
        target_rgb = reference_analysis['highlights']['rgb_avg']
        source_rgb = source_analysis['highlights']['rgb_avg']
        weight = 0.06  # Very subtle adjustment for highlights
    else:
        # Midtones - moderate adjustment
        target_rgb = reference_analysis['midtones']['rgb_avg']
        source_rgb = source_analysis['midtones']['rgb_avg']
        weight = 0.12  # Moderate adjustment for midtones
    
    # Calculate and limit color shift to prevent extreme changes
    color_shift = target_rgb - source_rgb
    color_shift = np.clip(color_shift, -0.3, 0.3)  # Limit maximum shift
    
    # Apply very conservative color adjustment
    adjusted_color = input_color + (color_shift * weight)
    
    # Apply subtle temperature adjustments
    temp_diff = reference_analysis['overall']['temperature'] - source_analysis['overall']['temperature']
    tint_diff = reference_analysis['overall']['tint'] - source_analysis['overall']['tint']
    
    # Very subtle temperature adjustment (red/blue balance)
    if abs(temp_diff) > 100:  # Only adjust if significant difference
        if temp_diff > 0:  # Warmer
            adjusted_color[0] *= (1 + temp_diff / 50000)  # Very subtle red boost
            adjusted_color[2] *= (1 - temp_diff / 80000)  # Very subtle blue reduction
        else:  # Cooler
            adjusted_color[2] *= (1 + abs(temp_diff) / 50000)  # Very subtle blue boost
            adjusted_color[0] *= (1 - abs(temp_diff) / 80000)  # Very subtle red reduction
    
    # Very subtle tint adjustment (green/magenta balance)
    if abs(tint_diff) > 0.05:
        adjusted_color[1] += tint_diff / 3000  # Very subtle tint adjustment
    
    # Ensure colors stay in valid range and don't invert
    adjusted_color = np.clip(adjusted_color, 0, 1)
    
    # Prevent extreme color shifts by blending with original
    blend_ratio = 0.85  # Keep 85% of original, 15% adjustment
    final_color = input_color * blend_ratio + adjusted_color * (1 - blend_ratio)
    
    return np.clip(final_color, 0, 1)

def apply_conservative_color_grading(input_color: np.ndarray, source_analysis: dict, reference_analysis: dict) -> np.ndarray:
    """Apply very conservative color grading as a safety fallback"""
    # Only apply minimal temperature and tint adjustments
    adjusted_color = input_color.copy()
    
    # Very subtle temperature adjustment
    temp_diff = reference_analysis['overall']['temperature'] - source_analysis['overall']['temperature']
    if abs(temp_diff) > 500:  # Only adjust if significant difference
        if temp_diff > 0:  # Warmer
            adjusted_color[0] *= 1.02  # 2% red boost
            adjusted_color[2] *= 0.98  # 2% blue reduction
        else:  # Cooler
            adjusted_color[2] *= 1.02  # 2% blue boost
            adjusted_color[0] *= 0.98  # 2% red reduction
    
    # Minimal color adjustment based on overall difference
    source_avg = (source_analysis['shadows']['rgb_avg'] + source_analysis['midtones']['rgb_avg'] + source_analysis['highlights']['rgb_avg']) / 3
    reference_avg = (reference_analysis['shadows']['rgb_avg'] + reference_analysis['midtones']['rgb_avg'] + reference_analysis['highlights']['rgb_avg']) / 3
    
    color_shift = (reference_avg - source_avg) * 0.05  # Only 5% of the difference
    adjusted_color += color_shift
    
    return np.clip(adjusted_color, 0, 1)


def apply_cinematic_adjustments(lut: np.ndarray, look: CinematicLook) -> np.ndarray:
    """Apply minimal cinematic adjustments to the LUT"""
    # For now, return the LUT unchanged to prevent issues
    # The color shift in the main algorithm should be sufficient
    return lut

def lut_to_cube(lut: np.ndarray) -> str:
    """Convert 3D LUT array to .cube file format with correct coordinate ordering"""
    size = lut.shape[0]
    cube = f"# LUTForge AI Generated LUT v2.0\n"
    cube += f"# Created using professional color-matcher algorithms\n"
    cube += f"LUT_3D_SIZE {size}\n\n"

    # IMPORTANT: .cube format uses Blue-fastest ordering: B varies fastest, then G, then R
    # This means the data should be written as: for R, for G, for B
    for r in range(size):
        for g in range(size):
            for b in range(size):
                # Access LUT with [r][g][b] indexing in the order R->G->B
                rgb = lut[r, g, b]
                cube += f"{rgb[0]:.6f} {rgb[1]:.6f} {rgb[2]:.6f}\n"

    return cube

def analyze_lut_content(lut_content: str) -> dict:
    """Analyze LUT content to check for actual transformations"""
    lines = lut_content.split('\n')
    data_lines = [line.strip() for line in lines if line.strip() and not line.startswith('#') and not line.startswith('LUT_3D_SIZE')]
    
    transformations = 0
    identity_count = 0
    max_change = 0.0
    
    for i, line in enumerate(data_lines):
        if line:
            values = [float(x) for x in line.split()]
            if len(values) == 3:
                # Calculate expected identity values for this position
                size = int(round(len(data_lines) ** (1/3)))
                b = i // (size * size)
                g = (i % (size * size)) // size
                r = i % size
                
                expected_r = r / (size - 1)
                expected_g = g / (size - 1)
                expected_b = b / (size - 1)
                
                # Check if this is an identity transformation
                r_diff = abs(values[0] - expected_r)
                g_diff = abs(values[1] - expected_g)
                b_diff = abs(values[2] - expected_b)
                
                max_diff = max(r_diff, g_diff, b_diff)
                max_change = max(max_change, max_diff)
                
                if max_diff > 0.01:  # Significant change threshold
                    transformations += 1
                else:
                    identity_count += 1
    
    return {
        "total_entries": len(data_lines),
        "transformations": transformations,
        "identity_count": identity_count,
        "max_change": max_change,
        "transformation_percentage": (transformations / len(data_lines)) * 100 if data_lines else 0
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "LUTForge AI Backend v2.0 is running"}

@app.get("/test-color-matcher")
async def test_color_matcher():
    """Test color-matcher library installation"""
    try:
        # Create test images
        src_img = np.random.rand(64, 64, 3).astype(np.float32)
        ref_img = np.random.rand(64, 64, 3).astype(np.float32)
        
        # Test color matcher
        cm = ColorMatcher()
        result = cm.transfer(src=src_img, ref=ref_img, method='mkl')
        
        return {
            "status": "success", 
            "message": "Color-matcher library working correctly",
            "result_shape": result.shape,
            "available_methods": ["mkl", "reinhard", "mvgd"]
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.post("/api/generate-lut")
async def generate_lut(file: UploadFile = File(...)):
    """Generate LUT using professional color-matcher algorithms"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        # Read image data
        image_data = await file.read()
        
        # Convert to PIL Image and then numpy array
        pil_img = Image.open(io.BytesIO(image_data))
        if pil_img.mode != 'RGB':
            pil_img = pil_img.convert('RGB')
        
        # Resize for processing (maintain aspect ratio)
        max_size = 512
        pil_img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        source_img = np.array(pil_img, dtype=np.float32) / 255.0
        
        # AI analysis for cinematic look selection
        analysis_result = await analyze_image_for_cinematic_look(image_data)
        
        # Get selected cinematic look
        look = CINEMATIC_LOOKS[analysis_result.cinematic_look]
        
        # Create reference image based on cinematic look
        reference_img = create_reference_image(look, source_img.shape[:2])
        
        # Generate LUT using color transfer
        lut_array = generate_lut_from_color_transfer(
            source_img, 
            reference_img, 
            analysis_result.method
        )
        
        # Apply cinematic adjustments
        lut_array = apply_cinematic_adjustments(lut_array, look)
        
        # Convert to cube format
        cube_content = lut_to_cube(lut_array)
        
        return cube_content

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"LUT generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
