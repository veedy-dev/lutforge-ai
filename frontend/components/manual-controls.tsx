"use client"

import { useState, useEffect } from "react"
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
  referenceImage: string | null
  persistentState?: ColorAdjustments
  onStateChange?: (state: ColorAdjustments) => void
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

export default function ManualControls({ initialLut, referenceImage, persistentState, onStateChange }: ManualControlsProps) {
  const [adjustments, setAdjustments] = useState<ColorAdjustments>(persistentState || {
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

  // Update parent state when adjustments change
  useEffect(() => {
    if (onStateChange) {
      onStateChange(adjustments)
    }
  }, [adjustments, onStateChange])

  const [previewImage, setPreviewImage] = useState<string | null>(null)
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

  const resetAdjustmentToZero = (key: keyof ColorAdjustments) => {
    setAdjustments(prev => ({
      ...prev,
      [key]: 0
    }))
  }

  // Custom slider component with double-click reset
  const ResetSlider = ({ 
    label, 
    value, 
    adjustmentKey, 
    min = -100, 
    max = 100, 
    step = 1 
  }: {
    label: string
    value: number
    adjustmentKey: keyof ColorAdjustments
    min?: number
    max?: number
    step?: number
  }) => {
    let clickTimeout: NodeJS.Timeout | null = null

    const handleSliderClick = (e: React.MouseEvent) => {
      if (clickTimeout) {
        // Double click - reset to zero
        clearTimeout(clickTimeout)
        clickTimeout = null
        resetAdjustmentToZero(adjustmentKey)
      } else {
        // Single click - wait for potential double click
        clickTimeout = setTimeout(() => {
          clickTimeout = null
        }, 300)
      }
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">{label}</label>
          <span className="text-sm text-muted-foreground">{value}</span>
        </div>
        <div onClick={handleSliderClick}>
          <Slider
            value={[value]}
            onValueChange={(value) => updateAdjustment(adjustmentKey, value)}
            min={min}
            max={max}
            step={step}
            className="w-full"
          />
        </div>
      </div>
    )
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
                {referenceImage ? (
                  <div className="relative w-full h-full">
                    <img
                      src={referenceImage}
                      alt="Preview with LUT applied"
                      className="w-full h-full object-cover"
                      style={{
                        filter: `
                          brightness(${1 + (adjustments.exposure + adjustments.whites * 0.3) / 100})
                          contrast(${1 + (adjustments.contrast + (adjustments.whites - adjustments.blacks) * 0.4) / 100})
                          saturate(${1 + (adjustments.saturation + adjustments.vibrance * 0.6) / 100})
                        `,
                        borderRadius: '8px',
                      }}
                    />
                    {/* Temperature and Tint overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none rounded-lg"
                      style={{
                        background: `linear-gradient(
                          45deg,
                          rgba(${adjustments.temperature > 0 ? 255 + adjustments.temperature * 0.8 : 255 + adjustments.temperature * 0.5}, 
                               ${255 + adjustments.tint * 0.6}, 
                               ${adjustments.temperature < 0 ? 255 - adjustments.temperature * 0.8 : 255 + adjustments.temperature * 0.3}, 
                               ${(Math.abs(adjustments.temperature) + Math.abs(adjustments.tint)) / 800})
                        )`,
                        mixBlendMode: 'overlay',
                      }}
                    />
                    
                    {/* Highlights and Shadows overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none rounded-lg"
                      style={{
                        background: `
                          radial-gradient(
                            ellipse at center,
                            rgba(${adjustments.highlights < 0 ? '0,0,0' : '255,255,255'}, ${Math.abs(adjustments.highlights) / 400}) 0%,
                            transparent 40%
                          ),
                          radial-gradient(
                            ellipse at center,
                            transparent 60%,
                            rgba(${adjustments.shadows > 0 ? '255,255,255' : '0,0,0'}, ${Math.abs(adjustments.shadows) / 300}) 100%
                          )
                        `,
                        mixBlendMode: 'overlay',
                      }}
                    />
                    
                    {/* Blacks adjustment overlay */}
                    {adjustments.blacks !== 0 && (
                      <div
                        className="absolute inset-0 pointer-events-none rounded-lg"
                        style={{
                          background: `rgba(${adjustments.blacks > 0 ? '255,255,255' : '0,0,0'}, ${Math.abs(adjustments.blacks) / 300})`,
                          mixBlendMode: adjustments.blacks > 0 ? 'screen' : 'multiply',
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Upload an image in the Generate LUT tab to see live preview</p>
                    </div>
                  </div>
                )}
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
                <ResetSlider 
                  label="Exposure" 
                  value={adjustments.exposure} 
                  adjustmentKey="exposure" 
                />
                <ResetSlider 
                  label="Contrast" 
                  value={adjustments.contrast} 
                  adjustmentKey="contrast" 
                />
                <ResetSlider 
                  label="Highlights" 
                  value={adjustments.highlights} 
                  adjustmentKey="highlights" 
                />
                <ResetSlider 
                  label="Shadows" 
                  value={adjustments.shadows} 
                  adjustmentKey="shadows" 
                />
                <ResetSlider 
                  label="Whites" 
                  value={adjustments.whites} 
                  adjustmentKey="whites" 
                />
                <ResetSlider 
                  label="Blacks" 
                  value={adjustments.blacks} 
                  adjustmentKey="blacks" 
                />
              </CardContent>
            </Card>

            {/* Color Adjustments */}
            <Card>
              <CardHeader>
                <CardTitle>Color Adjustments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ResetSlider 
                  label="Saturation" 
                  value={adjustments.saturation} 
                  adjustmentKey="saturation" 
                />
                <ResetSlider 
                  label="Vibrance" 
                  value={adjustments.vibrance} 
                  adjustmentKey="vibrance" 
                />

                <Separator />

                <ResetSlider 
                  label="Temperature" 
                  value={adjustments.temperature} 
                  adjustmentKey="temperature" 
                />
                <ResetSlider 
                  label="Tint" 
                  value={adjustments.tint} 
                  adjustmentKey="tint" 
                />

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
