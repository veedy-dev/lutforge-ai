"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Download, ImageIcon, Upload } from "lucide-react";
import { useCallback, useState } from "react";
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
        setProcessedImage(null);

        if (rawImage)
        {
          setTimeout(() => applyLut(), 100);
        }

        toast.success(`Custom LUT imported: ${filename}.lut`);
      };
      reader.readAsText(file);
    }
  }, [rawImage]);

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

    setTimeout(() =>
    {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () =>
      {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        if (ctx)
        {
          let filterString = `opacity(${lutIntensity[0] / 100})`;

          if (customLutData)
          {
            filterString +=
              ` contrast(1.3) saturate(1.4) hue-rotate(15deg) brightness(1.1) sepia(0.1)`;
          }
          else if (manualAdjustments && Object.values(manualAdjustments).some(val => val !== 0))
          {
            const brightness = 1
              + (manualAdjustments.exposure + manualAdjustments.whites * 0.3) / 100;
            const contrast = 1
              + (manualAdjustments.contrast
                  + (manualAdjustments.whites - manualAdjustments.blacks) * 0.4) / 100;
            const saturation = 1
              + (manualAdjustments.saturation + manualAdjustments.vibrance * 0.6) / 100;

            filterString +=
              ` brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
          }
          else
          {
            filterString += ` contrast(1.1) saturate(1.2) brightness(1.05)`;
          }

          ctx.filter = filterString;
          ctx.drawImage(img, 0, 0);
        }

        const processedData = canvas.toDataURL();
        setProcessedImage(processedData);
        updateState({ processedImage: processedData });
        setIsProcessing(false);
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

  return (
    <div className="space-y-6">
      {getCurrentLut().lut === null && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Generate a LUT first or import your own LUT file to process images</p>
        </div>
      )}

      {getCurrentLut().lut !== null && (
        <>
          {/* Information Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <ImageIcon className="-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Professional Workflow Note</h4>
                  <p className="text-sm text-blue-700 mb-2">
                    <strong>For Quick Preview:</strong>{" "}
                    This JPEG/PNG workflow is convenient for testing and visualization.
                  </p>
                  <p className="text-sm text-blue-700">
                    <strong>For Professional Results:</strong>{" "}
                    LUT preview is limited to JPEG/PNG formats. For best results, apply LUTs to RAW
                    files using dedicated photo or video editing software to fully utilize your
                    image data and achieve high-quality color grading.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current LUT Info */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <ImageIcon className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900 mb-1">Current LUT</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      {getCurrentLut().source}
                    </Badge>
                    {getCurrentLut().filename && (
                      <span className="text-sm text-green-700 font-medium">
                        {getCurrentLut().source === "Custom Imported LUT"
                          ? `${getCurrentLut().filename}.lut`
                          : `${getCurrentLut().filename}.cube`}
                      </span>
                    )}
                  </div>
                  {!getCurrentLut().filename && getCurrentLut().source !== "No LUT Available" && (
                    <p className="text-sm text-green-600 mt-1">Ready to apply</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Areas */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Image Upload */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Upload className="w-6 h-6 text-blue-600" />
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
                isLutDragActive ? "border-purple-400 bg-purple-50"
                  : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
              }`}
            >
              <input {...getLutInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-full">
                  <ImageIcon className="w-6 h-6 text-purple-600" />
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
          {rawImage && (
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
                  {manualLutData && !customLutData && (
                    <Button
                      onClick={() =>
                      {
                        setCustomLutData(null);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Use Manual LUT
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
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={rawImage}
                    alt="Original image"
                    className="w-full h-full object-cover"
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
        </>
      )}
    </div>
  );
}
