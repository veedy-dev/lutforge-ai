"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Download, RotateCcw, Palette } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ManualControlsProps {
  initialLut: string | null
}

interface ColorAdjustments {
  exposure: number
  contrast: number
  highlights: number
  shadows: number
  whites: number
  blacks: number
  saturation: number
  vibrance: number
  temperature: number
  tint: number
}

export default function ManualControls({ initialLut }: ManualControlsProps) {
  const [adjustments, setAdjustments] = useState<ColorAdjustments>({
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

  const [previewImage, setPreviewImage] = useState<string>("/placeholder.svg?height=400&width=600")
  const [lutFileName, setLutFileName] = useState("")

  const resetAdjustments = () => {
    setAdjustments({
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
  }

  const generateRandomFileName = () => {
    const adjectives = ["Modified", "Custom", "Adjusted", "Enhanced", "Refined", "Tuned", "Balanced", "Perfected"]
    const nouns = ["Grade", "Look", "Style", "Tone", "Edit", "Mix", "Blend", "Touch"]
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    const randomNumber = Math.floor(Math.random() * 999) + 1
    return `${randomAdjective}_${randomNoun}_${randomNumber.toString().padStart(3, "0")}`
  }

  const generateModifiedLut = () => {
    // In a real implementation, this would generate a new LUT based on the adjustments
    const lutData = generateLutFromAdjustments(adjustments)
    const fileName = lutFileName.trim() || generateRandomFileName()

    const blob = new Blob([lutData], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName}.cube`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const updateAdjustment = (key: keyof ColorAdjustments, value: number[]) => {
    setAdjustments((prev) => ({
      ...prev,
      [key]: value[0],
    }))
  }

  return (
    <div className="space-y-6">
      {!initialLut && (
        <div className="text-center py-8 text-muted-foreground">
          <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Generate a LUT first to enable manual controls</p>
        </div>
      )}

      {initialLut && (
        <>
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Live Preview</span>
                <div className="flex gap-2">
                  <Badge variant="outline">Real-time</Badge>
                  <Button onClick={resetAdjustments} variant="outline" size="sm">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={previewImage || "/placeholder.svg"}
                  alt="Preview with LUT applied"
                  className="w-full h-full object-cover"
                  style={{
                    filter: `
                      brightness(${1 + adjustments.exposure / 100})
                      contrast(${1 + adjustments.contrast / 100})
                      saturate(${1 + adjustments.saturation / 100})
                    `,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Adjustments */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Adjustments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Exposure</label>
                    <span className="text-sm text-muted-foreground">{adjustments.exposure}</span>
                  </div>
                  <Slider
                    value={[adjustments.exposure]}
                    onValueChange={(value) => updateAdjustment("exposure", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Contrast</label>
                    <span className="text-sm text-muted-foreground">{adjustments.contrast}</span>
                  </div>
                  <Slider
                    value={[adjustments.contrast]}
                    onValueChange={(value) => updateAdjustment("contrast", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Highlights</label>
                    <span className="text-sm text-muted-foreground">{adjustments.highlights}</span>
                  </div>
                  <Slider
                    value={[adjustments.highlights]}
                    onValueChange={(value) => updateAdjustment("highlights", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Shadows</label>
                    <span className="text-sm text-muted-foreground">{adjustments.shadows}</span>
                  </div>
                  <Slider
                    value={[adjustments.shadows]}
                    onValueChange={(value) => updateAdjustment("shadows", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Whites</label>
                    <span className="text-sm text-muted-foreground">{adjustments.whites}</span>
                  </div>
                  <Slider
                    value={[adjustments.whites]}
                    onValueChange={(value) => updateAdjustment("whites", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Blacks</label>
                    <span className="text-sm text-muted-foreground">{adjustments.blacks}</span>
                  </div>
                  <Slider
                    value={[adjustments.blacks]}
                    onValueChange={(value) => updateAdjustment("blacks", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Color Adjustments */}
            <Card>
              <CardHeader>
                <CardTitle>Color Adjustments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Saturation</label>
                    <span className="text-sm text-muted-foreground">{adjustments.saturation}</span>
                  </div>
                  <Slider
                    value={[adjustments.saturation]}
                    onValueChange={(value) => updateAdjustment("saturation", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Vibrance</label>
                    <span className="text-sm text-muted-foreground">{adjustments.vibrance}</span>
                  </div>
                  <Slider
                    value={[adjustments.vibrance]}
                    onValueChange={(value) => updateAdjustment("vibrance", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <Separator />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Temperature</label>
                    <span className="text-sm text-muted-foreground">{adjustments.temperature}</span>
                  </div>
                  <Slider
                    value={[adjustments.temperature]}
                    onValueChange={(value) => updateAdjustment("temperature", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Tint</label>
                    <span className="text-sm text-muted-foreground">{adjustments.tint}</span>
                  </div>
                  <Slider
                    value={[adjustments.tint]}
                    onValueChange={(value) => updateAdjustment("tint", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <Separator />

                <div>
                  <Label htmlFor="modified-lut-filename" className="text-sm font-medium">
                    Export File Name (optional)
                  </Label>
                  <Input
                    id="modified-lut-filename"
                    type="text"
                    placeholder="Enter custom name or leave blank for random"
                    value={lutFileName}
                    onChange={(e) => setLutFileName(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to generate a random name</p>
                </div>

                <Button onClick={generateModifiedLut} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export Modified LUT
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function generateLutFromAdjustments(adjustments: ColorAdjustments): string {
  // This is a simplified LUT generation - in reality, this would be much more complex
  return `# Generated LUT with manual adjustments
TITLE "Modified LUT"
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0
LUT_3D_SIZE 32

# Sample LUT data (simplified)
0.000000 0.000000 0.000000
0.031250 0.031250 0.031250
0.062500 0.062500 0.062500
# ... (more LUT data would follow)
`
}
