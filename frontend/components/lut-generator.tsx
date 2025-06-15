"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, ImageIcon, Download, Sparkles, AlertCircle } from "lucide-react"
import Image from "next/image"
import { generateLutFromImage } from "@/lib/ai-lut-generator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LutGeneratorProps {
  onLutGenerated: (lut: string) => void
  onImageUploaded: (image: string) => void
}

export default function LutGenerator({ onLutGenerated, onImageUploaded }: LutGeneratorProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedLut, setGeneratedLut] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lutFileName, setLutFileName] = useState("")
  const [generatedFileName, setGeneratedFileName] = useState("")

  const generateRandomFileName = () => {
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
    ]
    const nouns = ["Grade", "Look", "Style", "Tone", "Vibe", "Feel", "Mood", "Touch", "Filter", "Effect"]
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    const randomNumber = Math.floor(Math.random() * 999) + 1
    return `${randomAdjective}_${randomNoun}_${randomNumber.toString().padStart(3, "0")}`
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const imageData = reader.result as string
        setUploadedImage(imageData)
        onImageUploaded(imageData)
        setError(null)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".tiff", ".bmp"],
    },
    maxFiles: 1,
  })

  const handleGenerateLut = async () => {
    if (!uploadedImage) return

    setIsAnalyzing(true)
    setProgress(0)
    setError(null)

    // Generate random filename if none provided
    if (!lutFileName.trim()) {
      const randomName = generateRandomFileName()
      setGeneratedFileName(randomName)
    } else {
      setGeneratedFileName(lutFileName.trim())
    }

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const lutData = await generateLutFromImage(uploadedImage)

      clearInterval(progressInterval)
      setProgress(100)

      setGeneratedLut(lutData)
      onLutGenerated(lutData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate LUT")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const downloadLut = () => {
    if (!generatedLut) return

    const fileName = generatedFileName || generateRandomFileName()
    const blob = new Blob([generatedLut], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName}.cube`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-purple-400 bg-purple-50" : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-purple-100 rounded-full">
            <Upload className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <p className="text-lg font-medium">{isDragActive ? "Drop your image here" : "Upload reference image"}</p>
            <p className="text-sm text-muted-foreground">Drag & drop or click to select • JPEG, PNG, TIFF supported</p>
          </div>
        </div>
      </div>

      {/* Preview and Analysis */}
      {uploadedImage && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Reference Image
              </h3>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                <Image src={uploadedImage || "/placeholder.svg"} alt="Reference image" fill className="object-cover" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
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
                        onChange={(e) => setLutFileName(e.target.value)}
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
                      Analyzing color grade...
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                {generatedLut && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Sparkles className="w-4 h-4" />
                      LUT generated successfully!
                    </div>
                    <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
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
  )
}
