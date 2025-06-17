"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Box, Download, FileText, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import BeforeAfterSlider from "./before-after-slider";

interface RawProcessorState
{
  rawImage: string | null;
  processedImage: string | null;
  lutIntensity: number[];
  processedFileName: string;
}

interface RawProcessorProps
{
  lutData: string | null;
  persistentState?: RawProcessorState;
  onStateChange?: (state: RawProcessorState) => void;
  manualAdjustments?: any;
  manualLutData?: string | null;
  generatedLutFileName?: string;
  manualLutFileName?: string | null;
}

export default function RawProcessor(
  {
    lutData,
    persistentState,
    onStateChange,
    manualAdjustments,
    manualLutData,
    generatedLutFileName,
    manualLutFileName,
  }: RawProcessorProps,
)
{
  const [rawImage, setRawImage] = useState<string | null>(persistentState?.rawImage || null);
  const [processedImage, setProcessedImage] = useState<string | null>(
    persistentState?.processedImage || null,
  );
  const [lutIntensity, setLutIntensity] = useState(persistentState?.lutIntensity || [100]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFileName, setProcessedFileName] = useState(
    persistentState?.processedFileName || "",
  );
  const [customLutData, setCustomLutData] = useState<string | null>(null);
  const [customLutFileName, setCustomLutFileName] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const prevManualAdjustmentsRef = useRef(manualAdjustments);

  useEffect(() =>
  {
    // Only reapply if we already have a processed image and user changed intensity
    if (rawImage && processedImage && getCurrentLut().lut && !isProcessing)
    {
      // Add a small delay to debounce intensity changes
      const timeoutId = setTimeout(() =>
      {
        applyLut();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [lutIntensity]);

  // Don't auto-apply LUT when props change, let user control when to apply
  useEffect(() =>
  {
    // Only clear processed image if manual adjustments actually changed
    if (rawImage && manualLutData && processedImage && prevManualAdjustmentsRef.current)
    {
      const hasActualChange =
        JSON.stringify(manualAdjustments) !== JSON.stringify(prevManualAdjustmentsRef.current);
      if (hasActualChange)
      {
        // Only clear the processed image, don't auto-reapply
        setProcessedImage(null);
        updateState({ processedImage: null });
      }
    }
    prevManualAdjustmentsRef.current = manualAdjustments;
  }, [manualAdjustments, manualLutData]);

  const updateState = (updates: Partial<RawProcessorState>) =>
  {
    if (onStateChange)
    {
      onStateChange({
        rawImage,
        processedImage,
        lutIntensity,
        processedFileName,
        ...updates,
      });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) =>
  {
    const file = acceptedFiles[0];
    if (file)
    {
      const isWebCompatible = file.type.startsWith("image/")
        && (file.type.includes("jpeg") || file.type.includes("jpg")
          || file.type.includes("png") || file.type.includes("webp")
          || file.type.includes("tiff"));

      if (!isWebCompatible)
      {
        alert(
          `RAW files (${file.name}) cannot be previewed directly in browsers. Please upload a JPEG/PNG version of your image for preview. The LUT will still work with your RAW processing software.`,
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () =>
      {
        const imageData = reader.result as string;
        setRawImage(imageData);
        updateState({ rawImage: imageData, processedImage: null });

        setProcessedImage(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const onLutDrop = useCallback((acceptedFiles: File[]) =>
  {
    const file = acceptedFiles[0];
    if (file)
    {
      const filename = file.name.replace(/\.[^/.]+$/, "");
      setCustomLutFileName(filename);

      const reader = new FileReader();
      reader.onload = () =>
      {
        setCustomLutData(reader.result as string);
        // Clear processed image so user can explicitly apply the new LUT
        setProcessedImage(null);
        updateState({ processedImage: null });

        toast.success(`Custom LUT imported: ${filename}.lut`);
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [
        ".jpg",
        ".jpeg",
        ".png",
        ".tiff",
        ".webp",
        ".raw",
        ".cr2",
        ".nef",
        ".arw",
        ".dng",
      ],
    },
    maxFiles: 1,
  });

  const {
    getRootProps: getLutRootProps,
    getInputProps: getLutInputProps,
    isDragActive: isLutDragActive,
  } = useDropzone({
    onDrop: onLutDrop,
    accept: {
      "text/*": [".cube", ".3dl", ".lut"],
      "application/octet-stream": [".cube", ".3dl", ".lut"],
    },
    maxFiles: 1,
  });

  const getCurrentLut = () =>
  {
    if (customLutData)
    {
      return { lut: customLutData, source: "Custom Imported LUT", filename: customLutFileName };
    }
    if (manualLutData)
    {
      return { lut: manualLutData, source: "Manual Controls LUT", filename: manualLutFileName };
    }
    if (lutData)
    {
      return { lut: lutData, source: "AI Generated LUT", filename: generatedLutFileName };
    }
    return { lut: null, source: "No LUT Available", filename: null };
  };

  const applyLut = async () =>
  {
    const { lut: currentLut } = getCurrentLut();
    if (!rawImage || !currentLut) return;

    setIsProcessing(true);
    setProcessingProgress(20);

    setProcessedImage(null);
    updateState({ processedImage: null });

    setTimeout(() =>
    {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () =>
      {
        // Start processing when image loads
        setIsProcessing(true);
        setProcessingProgress(20);

        // Create canvas and context
        canvas.width = img.width;
        canvas.height = img.height;

        if (!ctx)
        {
          setError("Failed to create canvas context");
          setIsProcessing(false);
          return;
        }

        // Set processing progress
        setProcessingProgress(40);

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);

        // Set processing progress
        setProcessingProgress(60);

        // Apply LUT with proper intensity
        const intensity = lutIntensity[0] / 100; // Convert percentage to 0-1 range
        applyLutToCanvas(ctx, img, currentLut, intensity);

        // Set processing progress
        setProcessingProgress(80);

        // Convert to data URL
        const processedDataUrl = canvas.toDataURL("image/jpeg", 0.9);

        // Set processed image and stop processing
        setProcessedImage(processedDataUrl);
        updateState({ processedImage: processedDataUrl });
        setIsProcessing(false);
        setProcessingProgress(100);
      };

      img.src = rawImage;
    }, 1500);
  };

  const generateRandomFileName = () =>
  {
    const adjectives = [
      "Processed",
      "Enhanced",
      "Graded",
      "Styled",
      "Refined",
      "Polished",
      "Finished",
      "Pro",
    ];
    const formats = ["Image", "Photo", "Shot", "Frame", "Pic", "Visual", "Render", "Export"];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomFormat = formats[Math.floor(Math.random() * formats.length)];
    const randomNumber = Math.floor(Math.random() * 9999) + 1;
    return `${randomAdjective}_${randomFormat}_${randomNumber.toString().padStart(4, "0")}`;
  };

  const downloadProcessed = () =>
  {
    if (!processedImage) return;

    const fileName = processedFileName.trim() || generateRandomFileName();

    const link = document.createElement("a");
    link.href = processedImage;
    link.download = `${fileName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyLutToCanvas = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    lutData: string,
    intensity: number,
  ) =>
  {
    // Clear canvas first
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const parsedLut = parseCubeLut(lutData);
    if (!parsedLut)
    {
      // Draw original image if LUT parsing fails
      ctx.drawImage(img, 0, 0);
      return;
    }


    // Draw original image first
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;

    let sampleCount = 0;
    let colorChangeCount = 0;
    let totalPixels = data.length / 4;


    for (let i = 0; i < data.length; i += 4)
    {
      const originalR = data[i];
      const originalG = data[i + 1];
      const originalB = data[i + 2];

      // Convert to [0,1] range for LUT lookup
      const r = originalR / 255;
      const g = originalG / 255;
      const b = originalB / 255;

      // Apply LUT transformation
      const newColor = lookupColorInLut(r, g, b, parsedLut);

      // Sample first few pixels for detailed debugging
      if (sampleCount < 3)
      {
        // Sample tracking for debugging purposes
        sampleCount++;
      }

      // Check if color actually changed
      const colorChanged = Math.abs(newColor.r - r) > 0.01 || Math.abs(newColor.g - g) > 0.01
        || Math.abs(newColor.b - b) > 0.01;
      if (colorChanged) colorChangeCount++;

      // Apply intensity blending: blend original with LUT result
      const blendedR = (newColor.r * intensity) + (r * (1 - intensity));
      const blendedG = (newColor.g * intensity) + (g * (1 - intensity));
      const blendedB = (newColor.b * intensity) + (b * (1 - intensity));

      // Convert back to [0,255] range and ensure valid bounds
      data[i] = Math.round(Math.max(0, Math.min(255, blendedR * 255)));
      data[i + 1] = Math.round(Math.max(0, Math.min(255, blendedG * 255)));
      data[i + 2] = Math.round(Math.max(0, Math.min(255, blendedB * 255)));
      // Alpha channel (data[i + 3]) remains unchanged
    }


    ctx.putImageData(imageData, 0, 0);
  };

  const parseCubeLut = (lutString: string) =>
  {

    // Check if the string is JSON-encoded (contains escaped newlines)
    let processedString = lutString;
    if (lutString.startsWith("\"") && lutString.endsWith("\""))
    {
      try
      {
        processedString = JSON.parse(lutString);
      }
      catch (e)
      {
      }
    }

    // Also handle escaped newlines in regular strings
    if (processedString.includes("\\n"))
    {
      processedString = processedString.replace(/\\n/g, "\n");
    }


    // Handle different line ending formats and split properly
    const normalizedLutString = processedString.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const allLines = normalizedLutString.split("\n").map(line => line.trim());


    // Filter header lines but keep all data lines
    const lines = allLines.filter(line =>
      line.length > 0
      && !line.startsWith("#")
      && !line.startsWith("LUT_3D_SIZE")
      && !line.startsWith("TITLE")
      && !line.startsWith("DOMAIN_MIN")
      && !line.startsWith("DOMAIN_MAX")
    );


    let size = 32;

    // Find LUT size from header
    for (const line of allLines)
    {
      if (line.startsWith("LUT_3D_SIZE"))
      {
        size = parseInt(line.split(" ")[1]);
        break;
      }
    }

    const lutData: [number, number, number][][][] = [];

    for (let r = 0; r < size; r++)
    {
      lutData[r] = [];
      for (let g = 0; g < size; g++)
      {
        lutData[r][g] = [];
      }
    }

    let dataIndex = 0;
    let identityCount = 0;
    let transformedCount = 0;

    // Process only the data lines
    for (let i = 0; i < lines.length; i++)
    {
      const line = lines[i];
      const values = line.split(/\s+/).map(v => parseFloat(v));

      if (values.length === 3 && !isNaN(values[0]) && !isNaN(values[1]) && !isNaN(values[2]))
      {
        // IMPORTANT: .cube format uses blue-fastest ordering (B varies fastest, then G, then R)
        // So dataIndex maps to: b = dataIndex % size, g = floor((dataIndex % (size*size)) / size), r = floor(dataIndex / (size*size))
        const b = dataIndex % size;
        const g = Math.floor((dataIndex % (size * size)) / size);
        const r = Math.floor(dataIndex / (size * size));

        if (r < size && g < size && b < size)
        {
          lutData[r][g][b] = [values[0], values[1], values[2]];

          // Check if this is an identity transformation
          const expectedR = r / (size - 1);
          const expectedG = g / (size - 1);
          const expectedB = b / (size - 1);

          const diff = Math.abs(values[0] - expectedR) + Math.abs(values[1] - expectedG)
            + Math.abs(values[2] - expectedB);
          if (diff > 0.01)
          {
            transformedCount++;
            // Log first few transformations for debugging
          }
          else
          {
            identityCount++;
          }
        }
        dataIndex++;
      }
      else if (line.length > 0)
      {
      }
    }

    const totalEntries = transformedCount + identityCount;
    const transformationPercentage = totalEntries > 0 ? (transformedCount / totalEntries) * 100 : 0;


    if (transformationPercentage < 10)
    {
    }

    if (transformedCount + identityCount === 0)
    {
      return null;
    }

    return { size, data: lutData };
  };

  const lookupColorInLut = (
    r: number,
    g: number,
    b: number,
    lut: { size: number; data: [number, number, number][][][]; },
  ) =>
  {
    const size = lut.size;
    const data = lut.data;

    // Ensure input values are in valid range [0,1]
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    b = Math.max(0, Math.min(1, b));

    // Scale to LUT coordinates (0 to size-1)
    const rScaled = r * (size - 1);
    const gScaled = g * (size - 1);
    const bScaled = b * (size - 1);

    // Get integer coordinates
    const r0 = Math.floor(rScaled);
    const g0 = Math.floor(gScaled);
    const b0 = Math.floor(bScaled);

    const r1 = Math.min(r0 + 1, size - 1);
    const g1 = Math.min(g0 + 1, size - 1);
    const b1 = Math.min(b0 + 1, size - 1);

    // Calculate fractional parts for interpolation
    const rFrac = rScaled - r0;
    const gFrac = gScaled - g0;
    const bFrac = bScaled - b0;

    try
    {
      // Get the 8 corner values for trilinear interpolation
      // IMPORTANT: LUT data should be indexed as [r][g][b] not [b][g][r]
      const c000 = data[r0]?.[g0]?.[b0] || [r, g, b];
      const c001 = data[r0]?.[g0]?.[b1] || [r, g, b];
      const c010 = data[r0]?.[g1]?.[b0] || [r, g, b];
      const c011 = data[r0]?.[g1]?.[b1] || [r, g, b];
      const c100 = data[r1]?.[g0]?.[b0] || [r, g, b];
      const c101 = data[r1]?.[g0]?.[b1] || [r, g, b];
      const c110 = data[r1]?.[g1]?.[b0] || [r, g, b];
      const c111 = data[r1]?.[g1]?.[b1] || [r, g, b];

      // Perform trilinear interpolation
      const c00 = [
        c000[0] * (1 - rFrac) + c100[0] * rFrac,
        c000[1] * (1 - rFrac) + c100[1] * rFrac,
        c000[2] * (1 - rFrac) + c100[2] * rFrac,
      ];

      const c01 = [
        c001[0] * (1 - rFrac) + c101[0] * rFrac,
        c001[1] * (1 - rFrac) + c101[1] * rFrac,
        c001[2] * (1 - rFrac) + c101[2] * rFrac,
      ];

      const c10 = [
        c010[0] * (1 - rFrac) + c110[0] * rFrac,
        c010[1] * (1 - rFrac) + c110[1] * rFrac,
        c010[2] * (1 - rFrac) + c110[2] * rFrac,
      ];

      const c11 = [
        c011[0] * (1 - rFrac) + c111[0] * rFrac,
        c011[1] * (1 - rFrac) + c111[1] * rFrac,
        c011[2] * (1 - rFrac) + c111[2] * rFrac,
      ];

      const c0 = [
        c00[0] * (1 - gFrac) + c10[0] * gFrac,
        c00[1] * (1 - gFrac) + c10[1] * gFrac,
        c00[2] * (1 - gFrac) + c10[2] * gFrac,
      ];

      const c1 = [
        c01[0] * (1 - gFrac) + c11[0] * gFrac,
        c01[1] * (1 - gFrac) + c11[1] * gFrac,
        c01[2] * (1 - gFrac) + c11[2] * gFrac,
      ];

      const result = [
        c0[0] * (1 - bFrac) + c1[0] * bFrac,
        c0[1] * (1 - bFrac) + c1[1] * bFrac,
        c0[2] * (1 - bFrac) + c1[2] * bFrac,
      ];

      // Ensure result is in valid range and not inverted
      const finalResult = {
        r: Math.max(0, Math.min(1, result[0])),
        g: Math.max(0, Math.min(1, result[1])),
        b: Math.max(0, Math.min(1, result[2])),
      };

      // Safety check: if the transformation is too extreme, fall back to original
      const maxChange = Math.max(
        Math.abs(finalResult.r - r),
        Math.abs(finalResult.g - g),
        Math.abs(finalResult.b - b),
      );

      if (maxChange > 0.8)
      {
        // Transformation too extreme, use original color
        return { r, g, b };
      }

      return finalResult;
    }
    catch (e)
    {
      // If anything goes wrong, return original color
      return { r, g, b };
    }
  };

  return (
    <div className="space-y-6">
      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/60 dark:border-blue-700/80 dark:backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-300 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Professional Workflow Note
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-200 mb-2">
                <strong>For Quick Preview:</strong>{" "}
                This JPEG/PNG workflow is convenient for testing and visualization.
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-200">
                <strong>For Professional Results:</strong>{" "}
                LUT preview is limited to JPEG/PNG formats. For best results, apply LUTs to RAW
                files using dedicated photo or video editing software to fully utilize your image
                data and achieve high-quality color grading.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current LUT Info */}
      {getCurrentLut().lut !== null && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Box className="w-5 h-5 text-green-600 dark:text-green-300 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">Current LUT</h4>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-green-700 border-green-300 dark:text-green-200 dark:border-green-600 dark:bg-green-800"
                  >
                    {getCurrentLut().source}
                  </Badge>
                  {getCurrentLut().filename && (
                    <span className="text-sm text-green-700 dark:text-green-200 font-medium">
                      {getCurrentLut().source === "Custom Imported LUT"
                        ? `${getCurrentLut().filename}.lut`
                        : `${getCurrentLut().filename}.cube`}
                    </span>
                  )}
                </div>
                {!getCurrentLut().filename && getCurrentLut().source !== "No LUT Available" && (
                  <p className="text-sm text-green-600 dark:text-green-300 mt-1">Ready to apply</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No LUT Available Message */}
      {getCurrentLut().lut === null && (
        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Box className="w-5 h-5 text-amber-600 dark:text-amber-300 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  Getting Started
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  Upload your image and import a LUT file to get started. You can generate LUTs
                  using the "Generate LUT" or "Manual Controls" tabs, or import your own
                  .cube/.3dl/.lut files below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Areas */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Image Upload */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30"
              : "border-gray-300 hover:border-blue-400 hover:bg-gray-50 dark:border-gray-400 dark:hover:border-blue-400 dark:hover:bg-gray-900"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
              <Upload className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="font-medium">
                {isDragActive ? "Drop your image here" : "Upload Image"}
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, TIFF for preview
              </p>
            </div>
          </div>
        </div>

        {/* LUT File Upload */}
        <div
          {...getLutRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isLutDragActive ? "border-purple-400 bg-purple-50 dark:bg-purple-900/30"
              : "border-gray-300 hover:border-purple-400 hover:bg-gray-50 dark:border-gray-400 dark:hover:border-purple-400 dark:hover:bg-gray-900"
          }`}
        >
          <input {...getLutInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full">
              <Box className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="font-medium">
                {isLutDragActive ? "Drop LUT file here" : "Import LUT File"}
              </p>
              <p className="text-xs text-muted-foreground">
                .cube, .3dl, .lut files
              </p>
              {customLutData && (
                <p className="text-xs text-green-600 font-medium mt-1">
                  ✓ Custom LUT loaded
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Processing Controls */}
      {rawImage && getCurrentLut().lut && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>LUT Processing</span>
              <div className="flex gap-2">
                <Badge variant="outline">{getCurrentLut().source}</Badge>
                <Badge variant="outline">LUT Ready</Badge>
              </div>
            </CardTitle>
            {getCurrentLut().filename && (
              <div className="text-sm">
                <span className="text-green-600 font-medium">
                  File name: {getCurrentLut().filename}.cube
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">LUT Intensity</label>
                <span className="text-sm text-muted-foreground">{lutIntensity[0]}%</span>
              </div>
              <Slider
                value={lutIntensity}
                onValueChange={value =>
                {
                  setLutIntensity(value);
                  updateState({ lutIntensity: value });
                }}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="processed-filename" className="text-sm font-medium">
                Export File Name (optional)
              </Label>
              <Input
                id="processed-filename"
                type="text"
                placeholder="Enter custom name or leave blank for random"
                value={processedFileName}
                onChange={e =>
                {
                  setProcessedFileName(e.target.value);
                  updateState({ processedFileName: e.target.value });
                }}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to generate a random creative name
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={applyLut} disabled={isProcessing} className="flex-1">
                {isProcessing ? "Processing..." : "Apply LUT"}
              </Button>
              {manualLutData && customLutData && (
                <Button
                  onClick={() =>
                  {
                    setCustomLutData(null);
                    setCustomLutFileName(null);

                    setTimeout(() => applyLut(), 100);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Switch to Manual LUT
                </Button>
              )}
              {processedImage && (
                <Button onClick={downloadProcessed} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Preview */}
      {rawImage && !processedImage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Image Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 border dark:border-gray-700"
              style={{ aspectRatio: "16/9" }}
            >
              <img
                src={rawImage}
                alt="Original image"
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
                Original
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Before/After Comparison (only show after LUT is applied) */}
      {rawImage && processedImage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Before/After Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <BeforeAfterSlider
              beforeImage={rawImage}
              afterImage={processedImage}
              initialPosition={50}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
