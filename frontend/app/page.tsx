"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Palette, Upload, Settings, ImageIcon } from "lucide-react"
import LutGenerator from "@/components/lut-generator"
import ManualControls from "@/components/manual-controls"
import RawProcessor from "@/components/raw-processor"

export default function Home() {
  const [generatedLut, setGeneratedLut] = useState<string | null>(null)
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
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
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Palette className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              LutForge AI
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered color grading with intelligent 3D LUT generation. Upload an image, let AI analyze the color
            grade, and generate professional-quality LUTs for your workflow.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              Multimodal AI
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              3D LUT Generation
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Live Preview
            </Badge>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Generate LUT
            </TabsTrigger>
            <TabsTrigger value="adjust" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Manual Controls
            </TabsTrigger>
            <TabsTrigger value="apply" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Apply to Image
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
                  Upload a reference image and let our AI analyze its color grade to generate a matching 3D LUT
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LutGenerator onLutGenerated={setGeneratedLut} onImageUploaded={setReferenceImage} />
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
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apply">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Apply LUT to Images
                </CardTitle>
                <CardDescription>
                  Apply your generated LUT to JPEG/PNG images for quick preview and workflow testing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RawProcessor lutData={generatedLut} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
