"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Upload, ImageIcon, Download, Eye, EyeOff } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RawProcessorProps {
  lutData: string | null
}

export default function RawProcessor({ lutData }: RawProcessorProps) {
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [lutIntensity, setLutIntensity] = useState([100])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedFileName, setProcessedFileName] = useState("")

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setRawImage(reader.result as string)
        // Simulate processing
        setTimeout(() => {
          setProcessedImage(reader.result as string)
        }, 1000)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".raw", ".cr2", ".nef", ".arw", ".dng", ".jpg", ".jpeg", ".png", ".tiff"],
    },
    maxFiles: 1,
  })

  const applyLut = async () => {
    if (!rawImage || !lutData) return

    setIsProcessing(true)

    // Simulate LUT processing
    setTimeout(() => {
      setProcessedImage(rawImage) // In reality, this would apply the LUT
      setIsProcessing(false)
    }, 2000)
  }

  const generateRandomFileName = () => {
    const adjectives = ["Processed", "Enhanced", "Graded", "Styled", "Refined", "Polished", "Finished", "Pro"]
    const formats = ["Image", "Photo", "Shot", "Frame", "Pic", "Visual", "Render", "Export"]
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomFormat = formats[Math.floor(Math.random() * formats.length)]
    const randomNumber = Math.floor(Math.random() * 9999) + 1
    return `${randomAdjective}_${randomFormat}_${randomNumber.toString().padStart(4, "0")}`
  }

  const downloadProcessed = () => {
    if (!processedImage) return

    const fileName = processedFileName.trim() || generateRandomFileName()

    // In a real implementation, this would download the processed image
    const link = document.createElement("a")
    link.href = processedImage
    link.download = `${fileName}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {!lutData && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Generate a LUT first to process RAW images</p>
        </div>
      )}

      {lutData && (
        <>
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-blue-100 rounded-full">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-medium">{isDragActive ? "Drop your RAW image here" : "Upload RAW image"}</p>
                <p className="text-sm text-muted-foreground">RAW, CR2, NEF, ARW, DNG, JPEG, PNG, TIFF supported</p>
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
                    <Badge variant="outline">LUT Ready</Badge>
                    <Button onClick={() => setShowComparison(!showComparison)} variant="outline" size="sm">
                      {showComparison ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showComparison ? "Hide" : "Show"} Comparison
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">LUT Intensity</label>
                    <span className="text-sm text-muted-foreground">{lutIntensity[0]}%</span>
                  </div>
                  <Slider
                    value={lutIntensity}
                    onValueChange={setLutIntensity}
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
                    onChange={(e) => setProcessedFileName(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to generate a random creative name</p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={applyLut} disabled={isProcessing} className="flex-1">
                    {isProcessing ? "Processing..." : "Apply LUT"}
                  </Button>
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
          {rawImage && (
            <div className="grid gap-6">
              {showComparison ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Original</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={rawImage || "/placeholder.svg"}
                          alt="Original RAW image"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">With LUT Applied</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                        {processedImage ? (
                          <img
                            src={processedImage || "/placeholder.svg"}
                            alt="Processed image with LUT"
                            className="w-full h-full object-cover"
                            style={{
                              filter: `contrast(1.1) saturate(1.2) opacity(${lutIntensity[0] / 100})`,
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            Apply LUT to see processed image
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{processedImage ? "Processed Image" : "Original Image"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={processedImage || rawImage}
                        alt="Image preview"
                        className="w-full h-full object-cover"
                        style={
                          processedImage
                            ? {
                                filter: `contrast(1.1) saturate(1.2) opacity(${lutIntensity[0] / 100})`,
                              }
                            : {}
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
