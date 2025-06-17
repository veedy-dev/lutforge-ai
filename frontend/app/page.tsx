"use client";

import LutGenerator from "@/components/lut-generator";
import ManualControls from "@/components/manual-controls";
import RawProcessor from "@/components/raw-processor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Coffee,
  ExternalLink,
  FileText,
  Github,
  Heart,
  Image,
  Settings,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const LUTForgeLogo = ({ className = "w-8 h-8" }: { className?: string; }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#a855f7", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#ec4899", stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="15" fill="url(#gradient)" />
    <path d="M8 12 L16 8 L24 12 L16 16 Z" fill="white" opacity="0.9" />
    <path d="M16 16 L24 12 L24 20 L16 24 Z" fill="white" opacity="0.7" />
    <path d="M8 12 L16 16 L16 24 L8 20 Z" fill="white" opacity="0.5" />
    <circle cx="12" cy="14" r="1" fill="white" opacity="0.8" />
    <circle cx="20" cy="14" r="1" fill="white" opacity="0.8" />
    <circle cx="16" cy="20" r="1" fill="white" opacity="0.8" />
  </svg>
);

export default function Home()
{
  const [generatedLut, setGeneratedLut] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [lutGeneratorState, setLutGeneratorState] = useState({
    lutFileName: "",
    generatedFileName: "",
    isAnalyzing: false,
    progress: 0,
    error: null as string | null,
    generatedLut: null as string | null,
  });
  const [manualControlsState, setManualControlsState] = useState({
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    saturation: 0,
    vibrance: 0,
    temperature: 0,
    tint: 0,
  });
  const [rawProcessorState, setRawProcessorState] = useState({
    rawImage: null as string | null,
    processedImage: null as string | null,
    lutIntensity: [100],
    processedFileName: "",
  });
  const [manualLutData, setManualLutData] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("generate");
  const [manualLutFileName, setManualLutFileName] = useState<string | null>(null);

  const handleLutGenerated = (lut: string | null) =>
  {
    setGeneratedLut(lut);

    if (activeTab === "generate")
    {
      setManualControlsState({
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        whites: 0,
        blacks: 0,
        saturation: 0,
        vibrance: 0,
        temperature: 0,
        tint: 0,
      });
    }
  };

  const handleManualControlsReset = () =>
  {
    setManualControlsState({
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      saturation: 0,
      vibrance: 0,
      temperature: 0,
      tint: 0,
    });
  };

  const handleExportToApply = () =>
  {
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, "");
    const filename = `Manual_LUT_${timestamp}`;
    setManualLutFileName(filename);

    setActiveTab("apply");

    toast.success("LUT exported successfully!", {
      description: `${filename}.cube is now ready in Apply to Image tab`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-950 dark:to-black">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 relative">
          <div className="absolute top-0 right-0 z-10">
            <ThemeToggle />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 px-8 sm:px-0">
            <LUTForgeLogo className="w-10 h-10 sm:w-12 sm:h-12" />
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              LUTForge AI
            </h1>
          </div>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2 sm:px-0 leading-relaxed">
            AI-powered color grading with intelligent 3D LUT generation. Upload an image, let AI
            analyze the color grade, and generate professional-quality LUTs for your workflow.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 px-2">
            <Badge
              variant="secondary"
              className="bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 dark:border dark:border-purple-600 text-xs sm:text-sm"
            >
              Multimodal AI
            </Badge>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 dark:border dark:border-blue-600 text-xs sm:text-sm"
            >
              3D LUT Generation
            </Badge>
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 dark:border dark:border-green-600 text-xs sm:text-sm"
            >
              Live Preview
            </Badge>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 h-auto p-1">
            <TabsTrigger
              value="generate"
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 text-xs sm:text-sm"
            >
              <Upload className="w-4 h-4 flex-shrink-0" />
              <span className="text-center leading-tight">Generate LUT</span>
            </TabsTrigger>
            <TabsTrigger
              value="adjust"
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 text-xs sm:text-sm"
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className="text-center leading-tight">Manual Controls</span>
            </TabsTrigger>
            <TabsTrigger
              value="apply"
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 text-xs sm:text-sm"
            >
              <Image className="w-4 h-4 flex-shrink-0" />
              <span className="text-center leading-tight">Apply to Image</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  AI LUT Generation
                </CardTitle>
                <CardDescription>
                  Upload a reference image and let our AI analyze its color grade to generate a
                  matching 3D LUT
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LutGenerator
                  onLutGenerated={handleLutGenerated}
                  onImageUploaded={image =>
                  {
                    setReferenceImage(image);
                    setUploadedImage(image);
                  }}
                  persistentState={{
                    uploadedImage,
                    ...lutGeneratorState,
                  }}
                  onStateChange={setLutGeneratorState}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adjust">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Manual LUT Controls
                </CardTitle>
                <CardDescription>
                  Fine-tune your generated LUT with manual controls for precise color grading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ManualControls
                  initialLut={generatedLut}
                  referenceImage={referenceImage}
                  persistentState={manualControlsState}
                  onStateChange={setManualControlsState}
                  onReset={handleManualControlsReset}
                  onLutGenerated={setManualLutData}
                  onExportToApply={handleExportToApply}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apply">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Apply LUT to Image
                </CardTitle>
                <CardDescription>
                  Apply generated or custom LUTs to your images with adjustable intensity. Upload
                  images and LUT files directly to get started.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RawProcessor
                  lutData={generatedLut}
                  persistentState={rawProcessorState}
                  onStateChange={setRawProcessorState}
                  manualAdjustments={manualControlsState}
                  manualLutData={manualLutData}
                  generatedLutFileName={lutGeneratorState.generatedFileName}
                  manualLutFileName={manualLutFileName}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Support Project Card */}
        <Card className="mt-6 sm:mt-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 dark:from-purple-950/30 dark:to-pink-950/30 dark:border-purple-800/50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex-shrink-0">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Support This Project
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Help us continue developing LUTForge AI! Your support enables us to improve
                    features, add new capabilities, and keep this tool free for the community.
                  </p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-2 flex-wrap justify-center sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/30 flex-1 sm:flex-none min-w-0 text-xs sm:text-sm"
                  onClick={() => window.open("https://github.com/sponsors/veedy-dev", "_blank")}
                >
                  <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-pink-500 flex-shrink-0" />
                  <span className="truncate">Sponsor</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/30 flex-1 sm:flex-none min-w-0 text-xs sm:text-sm"
                  onClick={() => window.open("https://ko-fi.com/veedygraph", "_blank")}
                >
                  <Coffee className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-orange-500 flex-shrink-0" />
                  <span className="truncate">Ko-fi</span>
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex-1 sm:flex-none min-w-0 text-xs sm:text-sm"
                  onClick={() => window.open("https://github.com/veedy-dev/lutforge-ai", "_blank")}
                >
                  <Github className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">Repository</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
