"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Download, Palette, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

interface ManualControlsProps
{
  initialLut: string | null;
  referenceImage: string | null;
  persistentState?: ColorAdjustments;
  onStateChange?: (state: ColorAdjustments) => void;
}

interface ColorAdjustments
{
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  saturation: number;
  vibrance: number;
  temperature: number;
  tint: number;
}

export default function ManualControls(
  { initialLut, referenceImage, persistentState, onStateChange }: ManualControlsProps,
)
{
  const [adjustments, setAdjustments] = useState<ColorAdjustments>(
    persistentState || {
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
    },
  );

  useEffect(() =>
  {
    if (onStateChange)
    {
      onStateChange(adjustments);
    }
  }, [adjustments, onStateChange]);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lutFileName, setLutFileName] = useState("");

  const resetAdjustments = () =>
  {
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
    });
  };

  const generateRandomFileName = () =>
  {
    const adjectives = [
      "Modified",
      "Custom",
      "Adjusted",
      "Enhanced",
      "Refined",
      "Tuned",
      "Balanced",
      "Perfected",
    ];
    const nouns = ["Grade", "Look", "Style", "Tone", "Edit", "Mix", "Blend", "Touch"];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 999) + 1;
    return `${randomAdjective}_${randomNoun}_${randomNumber.toString().padStart(3, "0")}`;
  };

  const generateModifiedLut = () =>
  {
    const lutData = generateLutFromAdjustments(adjustments);
    const fileName = lutFileName.trim() || generateRandomFileName();
    const blob = new Blob([lutData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${fileName}.cube`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateAdjustment = (key: keyof ColorAdjustments, value: number[]) =>
  {
    setAdjustments(prev => ({
      ...prev,
      [key]: value[0],
    }));
  };

  // Convert temperature slider value (-100 to +100) to Kelvin (2000K to 10000K)
  const temperatureToKelvin = (tempValue: number): number =>
  {
    // Map -100 to +100 range to 2000K to 10000K range
    // -100 = 2000K (very warm), 0 = 5500K (daylight), +100 = 10000K (very cool)
    const minKelvin = 2000;
    const maxKelvin = 10000;
    const neutralKelvin = 5500;

    if (tempValue === 0) return neutralKelvin;

    if (tempValue < 0)
    {
      // Map -100 to 0 -> 2000K to 5500K
      return minKelvin + ((tempValue + 100) / 100) * (neutralKelvin - minKelvin);
    }
    else
    {
      // Map 0 to 100 -> 5500K to 10000K
      return neutralKelvin + (tempValue / 100) * (maxKelvin - neutralKelvin);
    }
  };

  // Get color for temperature gradient based on Kelvin value
  const getTemperatureColor = (kelvin: number): string =>
  {
    if (kelvin <= 2000) return "#ff6b35"; // Candlelight - warm orange
    if (kelvin <= 3000) return "#ff8c42"; // Tungsten - orange
    if (kelvin <= 4000) return "#ffb366"; // Warm white - light orange
    if (kelvin <= 5000) return "#fff2e6"; // Neutral warm - very light orange
    if (kelvin <= 6000) return "#ffffff"; // Daylight - white
    if (kelvin <= 7000) return "#e6f3ff"; // Cool white - very light blue
    if (kelvin <= 8000) return "#b3d9ff"; // Cool - light blue
    if (kelvin <= 9000) return "#80c5ff"; // Very cool - blue
    return "#4da6ff"; // Sky blue - deep blue
  };

  const resetAdjustmentToZero = (key: keyof ColorAdjustments) =>
  {
    setAdjustments(prev => ({
      ...prev,
      [key]: 0,
    }));
  };

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
                          contrast(${
                          1
                          + (adjustments.contrast + (adjustments.whites - adjustments.blacks) * 0.4)
                            / 100
                        })
                          saturate(${
                          1 + (adjustments.saturation + adjustments.vibrance * 0.6) / 100
                        })
                        `,
                        borderRadius: "8px",
                      }}
                    />
                    {/* Temperature and Tint overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none rounded-lg"
                      style={{
                        background: `linear-gradient(
                          45deg,
                          rgba(${
                          adjustments.temperature > 0 ? 255 + adjustments.temperature * 0.8
                            : 255 + adjustments.temperature * 0.5
                        }, 
                               ${255 + adjustments.tint * 0.6}, 
                               ${
                          adjustments.temperature < 0 ? 255 - adjustments.temperature * 0.8
                            : 255 + adjustments.temperature * 0.3
                        }, 
                               ${
                          (Math.abs(adjustments.temperature) + Math.abs(adjustments.tint)) / 800
                        })
                        )`,
                        mixBlendMode: "overlay",
                      }}
                    />
                    {/* Highlights and Shadows overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none rounded-lg"
                      style={{
                        background: `
                          radial-gradient(
                            ellipse at center,
                            rgba(${adjustments.highlights < 0 ? "0,0,0" : "255,255,255"}, ${
                          Math.abs(adjustments.highlights) / 400
                        }) 0%,
                            transparent 40%
                          ),
                          radial-gradient(
                            ellipse at center,
                            transparent 60%,
                            rgba(${adjustments.shadows > 0 ? "255,255,255" : "0,0,0"}, ${
                          Math.abs(adjustments.shadows) / 300
                        }) 100%
                          )
                        `,
                        mixBlendMode: "overlay",
                      }}
                    />
                    {/* Blacks adjustment overlay */}
                    {adjustments.blacks !== 0 && (
                      <div
                        className="absolute inset-0 pointer-events-none rounded-lg"
                        style={{
                          background: `rgba(${adjustments.blacks > 0 ? "255,255,255" : "0,0,0"}, ${
                            Math.abs(adjustments.blacks) / 300
                          })`,
                          mixBlendMode: adjustments.blacks > 0 ? "screen" : "multiply",
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
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Exposure</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{adjustments.exposure}</span>
                      {adjustments.exposure !== 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetAdjustmentToZero("exposure")}
                          className="h-6 w-6 p-0 hover:bg-muted"
                          title="Reset to 0"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Slider
                    value={[adjustments.exposure]}
                    onValueChange={value => updateAdjustment("exposure", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Contrast</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{adjustments.contrast}</span>
                      {adjustments.contrast !== 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetAdjustmentToZero("contrast")}
                          className="h-6 w-6 p-0 hover:bg-muted"
                          title="Reset to 0"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Slider
                    value={[adjustments.contrast]}
                    onValueChange={value => updateAdjustment("contrast", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Highlights</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {adjustments.highlights}
                      </span>
                      {adjustments.highlights !== 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetAdjustmentToZero("highlights")}
                          className="h-6 w-6 p-0 hover:bg-muted"
                          title="Reset to 0"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Slider
                    value={[adjustments.highlights]}
                    onValueChange={value => updateAdjustment("highlights", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Shadows</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{adjustments.shadows}</span>
                      {adjustments.shadows !== 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetAdjustmentToZero("shadows")}
                          className="h-6 w-6 p-0 hover:bg-muted"
                          title="Reset to 0"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Slider
                    value={[adjustments.shadows]}
                    onValueChange={value => updateAdjustment("shadows", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Whites</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{adjustments.whites}</span>
                      {adjustments.whites !== 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetAdjustmentToZero("whites")}
                          className="h-6 w-6 p-0 hover:bg-muted"
                          title="Reset to 0"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Slider
                    value={[adjustments.whites]}
                    onValueChange={value => updateAdjustment("whites", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Blacks</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{adjustments.blacks}</span>
                      {adjustments.blacks !== 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetAdjustmentToZero("blacks")}
                          className="h-6 w-6 p-0 hover:bg-muted"
                          title="Reset to 0"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Slider
                    value={[adjustments.blacks]}
                    onValueChange={value => updateAdjustment("blacks", value)}
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {adjustments.saturation}
                      </span>
                      {adjustments.saturation !== 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetAdjustmentToZero("saturation")}
                          className="h-6 w-6 p-0 hover:bg-muted"
                          title="Reset to 0"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Slider
                    value={[adjustments.saturation]}
                    onValueChange={value => updateAdjustment("saturation", value)}
                    min={-100}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Vibrance</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{adjustments.vibrance}</span>
                      {adjustments.vibrance !== 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetAdjustmentToZero("vibrance")}
                          className="h-6 w-6 p-0 hover:bg-muted"
                          title="Reset to 0"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Slider
                    value={[adjustments.vibrance]}
                    onValueChange={value => updateAdjustment("vibrance", value)}
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground">
                        {Math.round(temperatureToKelvin(adjustments.temperature))}K
                      </span>
                      {adjustments.temperature !== 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetAdjustmentToZero("temperature")}
                          className="h-6 w-6 p-0 hover:bg-muted"
                          title="Reset to 5500K (Daylight)"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Professional Kelvin temperature slider */}
                  <div className="relative w-full">
                    <div
                      className="absolute inset-0 h-2 rounded-full"
                      style={{
                        background:
                          "linear-gradient(to right, #ff6b35 0%, #ff8c42 12.5%, #ffb366 25%, #fff2e6 37.5%, #ffffff 50%, #e6f3ff 62.5%, #b3d9ff 75%, #80c5ff 87.5%, #4da6ff 100%)",
                      }}
                    />
                    <Slider
                      value={[adjustments.temperature]}
                      onValueChange={value => updateAdjustment("temperature", value)}
                      min={-100}
                      max={100}
                      step={1}
                      className="w-full relative z-10 [&>*:first-child]:bg-transparent [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-gray-800 [&_[role=slider]]:shadow-lg"
                    />
                    {/* Kelvin temperature scale labels */}
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <div className="text-left">
                        <div className="text-orange-500 font-medium">2000K</div>
                        <div>Candlelight</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-600 font-medium">5500K</div>
                        <div>Daylight</div>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-500 font-medium">10000K</div>
                        <div>Blue Sky</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Tint</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground">
                        {adjustments.tint > 0 ? `+${adjustments.tint}` : adjustments.tint}
                      </span>
                      {adjustments.tint !== 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetAdjustmentToZero("tint")}
                          className="h-6 w-6 p-0 hover:bg-muted"
                          title="Reset to 0 (Neutral)"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Professional Magenta-Green tint slider */}
                  <div className="relative w-full">
                    <div
                      className="absolute inset-0 h-2 rounded-full"
                      style={{
                        background:
                          "linear-gradient(to right, #00ff00 0%, #80ff80 25%, #e6ffe6 45%, #ffffff 50%, #ffe6ff 55%, #ff80ff 75%, #ff00ff 100%)",
                      }}
                    />
                    <Slider
                      value={[-adjustments.tint]}
                      onValueChange={value => updateAdjustment("tint", [-value[0]])}
                      min={-100}
                      max={100}
                      step={1}
                      className="w-full relative z-10 [&>*:first-child]:bg-transparent [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-gray-800 [&_[role=slider]]:shadow-lg"
                    />
                    {/* Magenta-Green tint scale labels */}
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <div className="text-left">
                        <div className="text-green-500 font-medium">Green</div>
                        <div>-100</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-600 font-medium">Neutral</div>
                        <div>0</div>
                      </div>
                      <div className="text-right">
                        <div className="text-pink-500 font-medium">Magenta</div>
                        <div>+100</div>
                      </div>
                    </div>
                  </div>
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
                    onChange={e => setLutFileName(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to generate a random name
                  </p>
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
  );
}

function generateLutFromAdjustments(adjustments: ColorAdjustments): string
{
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
`;
}
