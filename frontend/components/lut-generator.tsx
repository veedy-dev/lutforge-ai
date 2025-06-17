"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { generateLutFromImage } from "@/lib/ai-lut-generator";
import { AlertCircle, Download, Image as ImageIcon, Sparkles, Upload } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

interface LutGeneratorState
{
  lutFileName: string;
  generatedFileName: string;
  isAnalyzing: boolean;
  progress: number;
  error: string | null;
  uploadedImage: string | null;
  generatedLut: string | null;
}

interface LutGeneratorProps
{
  onLutGenerated: (lut: string) => void;
  onImageUploaded: (image: string) => void;
  persistentState?: LutGeneratorState;
  onStateChange?: (state: Omit<LutGeneratorState, "uploadedImage">) => void;
}

export default function LutGenerator(
  { onLutGenerated, onImageUploaded, persistentState, onStateChange }: LutGeneratorProps,
)
{
  const [uploadedImage, setUploadedImage] = useState<string | null>(
    persistentState?.uploadedImage || null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(persistentState?.isAnalyzing || false);
  const [progress, setProgress] = useState(persistentState?.progress || 0);
  const [generatedLut, setGeneratedLut] = useState<string | null>(
    persistentState?.generatedLut || null,
  );
  const [error, setError] = useState<string | null>(persistentState?.error || null);
  const [lutFileName, setLutFileName] = useState(persistentState?.lutFileName || "");
  const [generatedFileName, setGeneratedFileName] = useState(
    persistentState?.generatedFileName || "",
  );
  const [analysisText, setAnalysisText] = useState("Analyzing color grade...");

  const analysisMessages = [
    "Analyzing color grade...",
    "Examining tone curves...",
    "Detecting color palette...",
    "Mapping shadows and highlights...",
    "Analyzing saturation levels...",
    "Processing color temperature...",
    "Evaluating contrast ratios...",
    "Identifying color cast...",
    "Measuring exposure levels...",
    "Calculating color harmony...",
    "Analyzing RGB channels...",
    "Processing tonal balance...",
    "Detecting color grading style...",
    "Computing LUT parameters...",
    "Generating color transformation...",
  ];

  useEffect(() =>
  {
    let textInterval: NodeJS.Timeout;

    if (isAnalyzing)
    {
      textInterval = setInterval(() =>
      {
        const randomMessage = analysisMessages[Math.floor(Math.random() * analysisMessages.length)];
        setAnalysisText(randomMessage);
      }, 800);
    }
    else
    {
      setAnalysisText("Analyzing color grade...");
    }

    return () =>
    {
      if (textInterval)
      {
        clearInterval(textInterval);
      }
    };
  }, [isAnalyzing]);

  useEffect(() =>
  {
    if (persistentState)
    {
      const updates: (() => void)[] = [];

      if (persistentState.isAnalyzing !== isAnalyzing)
      {
        updates.push(() => setIsAnalyzing(persistentState.isAnalyzing));
      }

      if (persistentState.progress !== progress)
      {
        updates.push(() => setProgress(persistentState.progress));
      }

      if (persistentState.generatedLut !== generatedLut)
      {
        updates.push(() => setGeneratedLut(persistentState.generatedLut));
      }

      if (persistentState.error !== error)
      {
        updates.push(() => setError(persistentState.error));
      }

      if (persistentState.lutFileName !== lutFileName)
      {
        updates.push(() => setLutFileName(persistentState.lutFileName));
      }

      if (persistentState.generatedFileName !== generatedFileName)
      {
        updates.push(() => setGeneratedFileName(persistentState.generatedFileName));
      }

      updates.forEach(update => update());
    }
  }, [persistentState]);

  useEffect(() =>
  {
    if (onStateChange)
    {
      onStateChange({
        lutFileName,
        generatedFileName,
        isAnalyzing,
        progress,
        error,
        generatedLut,
      });
    }
  }, [lutFileName, generatedFileName, isAnalyzing, progress, error, generatedLut, onStateChange]);

  const generateRandomFileName = () =>
  {
    const adjectives = [
      "Cinematic",
      "Vintage",
      "Moody",
      "Bright",
      "Warm",
      "Cool",
      "Dramatic",
      "Soft",
      "Bold",
      "Natural",
    ];
    const nouns = [
      "Grade",
      "Look",
      "Style",
      "Tone",
      "Vibe",
      "Feel",
      "Mood",
      "Touch",
      "Filter",
      "Effect",
    ];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 999) + 1;
    return `${randomAdjective}_${randomNoun}_${randomNumber.toString().padStart(3, "0")}`;
  };

  const onDrop = useCallback((acceptedFiles: File[]) =>
  {
    const file = acceptedFiles[0];
    if (file)
    {
      setGeneratedLut(null);
      setGeneratedFileName("");
      setProgress(0);
      setIsAnalyzing(false);
      setError(null);

      if (onStateChange)
      {
        onStateChange({
          lutFileName,
          generatedFileName: "",
          isAnalyzing: false,
          progress: 0,
          error: null,
          generatedLut: null,
        });
      }

      const reader = new FileReader();
      reader.onload = () =>
      {
        const imageData = reader.result as string;
        setUploadedImage(imageData);
        onImageUploaded(imageData);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUploaded, onStateChange, lutFileName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".tiff", ".bmp"],
    },
    maxFiles: 1,
  });

  const handleGenerateLut = async () =>
  {
    if (!uploadedImage) return;

    setIsAnalyzing(true);
    setProgress(0);
    setError(null);
    setGeneratedLut(null);

    const finalFileName = !lutFileName.trim()
      ? generateRandomFileName()
      : lutFileName.trim();

    setGeneratedFileName(finalFileName);

    let progressInterval: NodeJS.Timeout | null = null;

    try
    {
      progressInterval = setInterval(() =>
      {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const lutData = await generateLutFromImage(uploadedImage);

      if (progressInterval) clearInterval(progressInterval);
      setProgress(100);

      setGeneratedLut(lutData);
      setIsAnalyzing(false);

      if (onStateChange)
      {
        onStateChange({
          lutFileName,
          generatedFileName: finalFileName,
          isAnalyzing: false,
          progress: 100,
          error: null,
          generatedLut: lutData,
        });
      }

      onLutGenerated(lutData);
    }
    catch (err)
    {
      if (progressInterval) clearInterval(progressInterval);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate LUT";

      setIsAnalyzing(false);
      setError(errorMessage);
      setProgress(0);

      if (onStateChange)
      {
        onStateChange({
          lutFileName,
          generatedFileName: finalFileName,
          isAnalyzing: false,
          progress: 0,
          error: errorMessage,
          generatedLut: null,
        });
      }
    }
  };

  const downloadLut = () =>
  {
    if (!generatedLut) return;

    const fileName = generatedFileName || generateRandomFileName();
    const blob = new Blob([generatedLut], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.cube`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 sm:p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-purple-400 bg-purple-50 dark:bg-purple-900/30"
            : "border-gray-300 hover:border-purple-400 hover:bg-gray-50 dark:border-gray-400 dark:hover:border-purple-400 dark:hover:bg-gray-900"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-purple-100 dark:bg-purple-800 rounded-full">
            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-300" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-medium">
              {isDragActive ? "Drop your image here" : "Upload reference image"}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-0">
              Drag & drop or click to select • JPEG, PNG, TIFF supported
            </p>
          </div>
        </div>
      </div>

      {/* Preview and Analysis */}
      {uploadedImage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <h3 className="font-medium mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                <ImageIcon className="w-4 h-4 flex-shrink-0" />
                Reference Image
              </h3>
              <div
                className="relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-black border border-gray-300 dark:border-zinc-700"
                style={{ aspectRatio: "16/9" }}
              >
                <Image
                  src={uploadedImage || "/placeholder.svg"}
                  alt="Reference image"
                  fill
                  className="object-contain"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <h3 className="font-medium mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                AI Analysis
              </h3>
              <div className="space-y-4">
                {!isAnalyzing && !generatedLut && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="lut-filename" className="text-sm font-medium">
                        LUT File Name (optional)
                      </Label>
                      <Input
                        id="lut-filename"
                        type="text"
                        placeholder="Enter custom name or leave blank for random"
                        value={lutFileName}
                        onChange={e => setLutFileName(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to generate a random creative name
                      </p>
                    </div>
                    <Button onClick={handleGenerateLut} className="w-full">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze & Generate LUT
                    </Button>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span className="animate-pulse">{analysisText}</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                {generatedLut && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Sparkles className="w-4 h-4" />
                      LUT generated successfully!
                    </div>
                    <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900 dark:border dark:border-gray-700 p-2 rounded">
                      File name: <span className="font-mono">{generatedFileName}.cube</span>
                    </div>
                    <Button onClick={downloadLut} variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Download LUT (.cube)
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
