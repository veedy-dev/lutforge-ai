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
  onReset?: () => void;
  onLutGenerated?: (lut: string) => void;
  onExportToApply?: () => void;
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
  {
    initialLut,
    referenceImage,
    persistentState,
    onStateChange,
    onReset,
    onLutGenerated,
    onExportToApply,
  }: ManualControlsProps,
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

    if (onLutGenerated)
    {
      const hasAdjustments = Object.values(adjustments).some(val => val !== 0);

      if (hasAdjustments)
      {
        const lutData = generateLutFromAdjustments(adjustments, initialLut);
        onLutGenerated(lutData);
      }
      else if (initialLut)
      {
        onLutGenerated(initialLut);
      }
    }
  }, [adjustments, onStateChange, onLutGenerated, initialLut]);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lutFileName, setLutFileName] = useState("");

  const resetAdjustments = () =>
  {
    const resetState = {
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
    };
    setAdjustments(resetState);
    if (onReset)
    {
      onReset();
    }
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
    const hasAdjustments = Object.values(adjustments).some(val => val !== 0);

    const lutData = hasAdjustments
      ? generateLutFromAdjustments(adjustments, initialLut)
      : initialLut || generateLutFromAdjustments(adjustments, null);

    const fileName = lutFileName.trim() || generateRandomFileName();

    if (onLutGenerated)
    {
      onLutGenerated(lutData);
    }

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

  const temperatureToKelvin = (tempValue: number): number =>
  {
    const minKelvin = 2000;
    const maxKelvin = 10000;
    const neutralKelvin = 5500;

    if (tempValue === 0) return neutralKelvin;

    if (tempValue < 0)
    {
      return minKelvin + ((tempValue + 100) / 100) * (neutralKelvin - minKelvin);
    }
    else
    {
      return neutralKelvin + (tempValue / 100) * (maxKelvin - neutralKelvin);
    }
  };

  const kelvinToRGB = (kelvin: number): { r: number; g: number; b: number; } =>
  {
    const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;

    let red: number, green: number, blue: number;

    if (temp <= 66)
    {
      red = 255;
    }
    else
    {
      red = temp - 60;
      red = 329.698727446 * Math.pow(red, -0.1332047592);
      red = Math.max(0, Math.min(255, red));
    }

    if (temp <= 66)
    {
      green = temp;
      green = 99.4708025861 * Math.log(green) - 161.1195681661;
      green = Math.max(0, Math.min(255, green));
    }
    else
    {
      green = temp - 60;
      green = 288.1221695283 * Math.pow(green, -0.0755148492);
      green = Math.max(0, Math.min(255, green));
    }

    if (temp >= 66)
    {
      blue = 255;
    }
    else if (temp <= 19)
    {
      blue = 0;
    }
    else
    {
      blue = temp - 10;
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
      blue = Math.max(0, Math.min(255, blue));
    }

    return {
      r: Math.round(red),
      g: Math.round(green),
      b: Math.round(blue),
    };
  };

  const getTemperatureColor = (kelvin: number): string =>
  {
    const rgb = kelvinToRGB(kelvin);
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  };

  const getTemperatureAdjustment = (tempValue: number) =>
  {
    if (tempValue === 0) return { r: 0, g: 0, b: 0, intensity: 0 };

    const kelvin = temperatureToKelvin(tempValue);
    const neutralRGB = kelvinToRGB(5500);
    const targetRGB = kelvinToRGB(kelvin);

    const rDiff = (targetRGB.r - neutralRGB.r) * 2;
    const gDiff = (targetRGB.g - neutralRGB.g) * 1.5;
    const bDiff = (targetRGB.b - neutralRGB.b) * 2;

    const intensity = Math.abs(tempValue) / 100;

    return {
      r: rDiff,
      g: gDiff,
      b: bDiff,
      intensity: intensity * 0.6,
    };
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
              <div
                className="relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-black border border-gray-300 dark:border-zinc-700"
                style={{ aspectRatio: "16/9" }}
              >
                {referenceImage ? (
                  <div className="relative w-full h-full">
                    <img
                      src={referenceImage}
                      alt="Preview with LUT applied"
                      className="w-full h-full object-contain"
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
                    {/* Professional Temperature and Tint overlay - Using proper color temperature calculation */}
                    {(adjustments.temperature !== 0 || adjustments.tint !== 0) && (
                      <div
                        className="absolute inset-0 pointer-events-none rounded-lg"
                        style={{
                          background: (() =>
                          {
                            let rAdjust = 0;
                            let gAdjust = 0;
                            let bAdjust = 0;

                            if (adjustments.temperature !== 0)
                            {
                              const tempAdj = getTemperatureAdjustment(adjustments.temperature);
                              rAdjust += tempAdj.r;
                              gAdjust += tempAdj.g;
                              bAdjust += tempAdj.b;
                            }

                            if (adjustments.tint !== 0)
                            {
                              const tintIntensity = adjustments.tint / 100;
                              if (adjustments.tint < 0)
                              {
                                rAdjust += adjustments.tint * 0.5;
                                gAdjust += adjustments.tint * -0.8;
                                bAdjust += adjustments.tint * 0.3;
                              }
                              else
                              {
                                rAdjust += adjustments.tint * 0.8;
                                gAdjust += adjustments.tint * -0.5;
                                bAdjust += adjustments.tint * 0.8;
                              }
                            }

                            const baseColor = 128;
                            const finalR = Math.max(0, Math.min(255, baseColor + rAdjust));
                            const finalG = Math.max(0, Math.min(255, baseColor + gAdjust));
                            const finalB = Math.max(0, Math.min(255, baseColor + bAdjust));

                            const intensity = Math.max(
                              Math.abs(adjustments.temperature),
                              Math.abs(adjustments.tint),
                            ) / 100;
                            const opacity = intensity * 0.25;

                            return `rgba(${Math.round(finalR)}, ${Math.round(finalG)}, ${
                              Math.round(finalB)
                            }, ${opacity})`;
                          })(),
                          mixBlendMode: "color",
                        }}
                      />
                    )}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                        background: (() =>
                        {
                          const steps = [
                            { pos: 0, kelvin: 2000 },
                            { pos: 12.5, kelvin: 2500 },
                            { pos: 25, kelvin: 3200 },
                            { pos: 37.5, kelvin: 4000 },
                            { pos: 50, kelvin: 5500 },
                            { pos: 62.5, kelvin: 6500 },
                            { pos: 75, kelvin: 7500 },
                            { pos: 87.5, kelvin: 8500 },
                            { pos: 100, kelvin: 10000 },
                          ];

                          const gradientStops = steps.map(step =>
                          {
                            const color = getTemperatureColor(step.kelvin);
                            return `${color} ${step.pos}%`;
                          }).join(", ");

                          return `linear-gradient(to right, ${gradientStops})`;
                        })(),
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
                        background: (() =>
                        {
                          const steps = [
                            { pos: 0, color: "rgb(0, 255, 0)" },
                            { pos: 20, color: "rgb(128, 255, 128)" },
                            { pos: 40, color: "rgb(230, 255, 230)" },
                            { pos: 50, color: "rgb(255, 255, 255)" },
                            { pos: 60, color: "rgb(255, 230, 255)" },
                            { pos: 80, color: "rgb(255, 128, 255)" },
                            { pos: 100, color: "rgb(255, 0, 255)" },
                          ];

                          const gradientStops = steps.map(step => `${step.color} ${step.pos}%`)
                            .join(", ");

                          return `linear-gradient(to right, ${gradientStops})`;
                        })(),
                      }}
                    />
                    <Slider
                      value={[adjustments.tint]}
                      onValueChange={value => updateAdjustment("tint", value)}
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

                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                    {
                      const hasAdjustments = Object.values(adjustments).some(val => val !== 0);
                      const lutData = hasAdjustments
                        ? generateLutFromAdjustments(adjustments, initialLut)
                        : initialLut || generateLutFromAdjustments(adjustments, null);

                      if (onLutGenerated)
                      {
                        onLutGenerated(lutData);
                      }
                      if (onExportToApply)
                      {
                        onExportToApply();
                      }
                    }}
                    className="flex-1"
                    disabled={!initialLut}
                  >
                    Export to Apply
                  </Button>
                  <Button
                    onClick={generateModifiedLut}
                    variant="outline"
                    disabled={!initialLut}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download LUT
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function generateLutFromAdjustments(
  adjustments: ColorAdjustments,
  initialLut?: string | null,
): string
{
  const size = 33;
  let lutData = `# Generated LUT with manual adjustments
TITLE "Modified LUT"
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0
LUT_3D_SIZE ${size}

`;

  for (let r = 0; r < size; r++)
  {
    for (let g = 0; g < size; g++)
    {
      for (let b = 0; b < size; b++)
      {
        let red = r / (size - 1);
        let green = g / (size - 1);
        let blue = b / (size - 1);

        if (adjustments.exposure !== 0)
        {
          const exposureFactor = Math.pow(2, adjustments.exposure / 100);
          red *= exposureFactor;
          green *= exposureFactor;
          blue *= exposureFactor;
        }

        if (adjustments.contrast !== 0)
        {
          const contrastFactor = 1 + adjustments.contrast / 100;
          red = ((red - 0.5) * contrastFactor) + 0.5;
          green = ((green - 0.5) * contrastFactor) + 0.5;
          blue = ((blue - 0.5) * contrastFactor) + 0.5;
        }

        const luminance = red * 0.299 + green * 0.587 + blue * 0.114;

        if (adjustments.highlights !== 0 && luminance > 0.7)
        {
          const highlightFactor = adjustments.highlights / 400;
          const strength = (luminance - 0.7) / 0.3;
          const adjustment = highlightFactor * strength;
          red += adjustment;
          green += adjustment;
          blue += adjustment;
        }

        if (adjustments.shadows !== 0 && luminance < 0.3)
        {
          const shadowFactor = adjustments.shadows / 300;
          const strength = (0.3 - luminance) / 0.3;
          const adjustment = shadowFactor * strength;
          red += adjustment;
          green += adjustment;
          blue += adjustment;
        }

        if (adjustments.whites !== 0)
        {
          const whitesAdjustment = adjustments.whites / 400;
          red = red + (1 - red) * whitesAdjustment;
          green = green + (1 - green) * whitesAdjustment;
          blue = blue + (1 - blue) * whitesAdjustment;
        }

        if (adjustments.blacks !== 0)
        {
          const blacksAdjustment = adjustments.blacks / 400;
          red = red + red * blacksAdjustment;
          green = green + green * blacksAdjustment;
          blue = blue + blue * blacksAdjustment;
        }

        if (adjustments.saturation !== 0)
        {
          const satFactor = 1 + adjustments.saturation / 100;
          const gray = red * 0.299 + green * 0.587 + blue * 0.114;
          red = gray + (red - gray) * satFactor;
          green = gray + (green - gray) * satFactor;
          blue = gray + (blue - gray) * satFactor;
        }

        if (adjustments.vibrance !== 0)
        {
          const vibFactor = adjustments.vibrance / 100;
          const gray = red * 0.299 + green * 0.587 + blue * 0.114;
          const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
          const vibAdjustment = vibFactor * (1 - saturation);
          red = gray + (red - gray) * (1 + vibAdjustment);
          green = gray + (green - gray) * (1 + vibAdjustment);
          blue = gray + (blue - gray) * (1 + vibAdjustment);
        }

        if (adjustments.temperature !== 0)
        {
          const tempAdj = getTemperatureAdjustmentForLut(adjustments.temperature);
          red += tempAdj.r / 255 * 0.5;
          green += tempAdj.g / 255 * 0.5;
          blue += tempAdj.b / 255 * 0.5;
        }

        if (adjustments.tint !== 0)
        {
          const tintIntensity = adjustments.tint / 200;
          if (adjustments.tint < 0)
          {
            red += tintIntensity * 0.3;
            green += tintIntensity * -0.5;
            blue += tintIntensity * 0.2;
          }
          else
          {
            red += tintIntensity * 0.5;
            green += tintIntensity * -0.3;
            blue += tintIntensity * 0.5;
          }
        }

        red = Math.max(0, Math.min(1, red));
        green = Math.max(0, Math.min(1, green));
        blue = Math.max(0, Math.min(1, blue));

        lutData += `${red.toFixed(6)} ${green.toFixed(6)} ${blue.toFixed(6)}\n`;
      }
    }
  }

  return lutData;
}

function getTemperatureAdjustmentForLut(tempValue: number)
{
  if (tempValue === 0) return { r: 0, g: 0, b: 0 };

  const kelvin = tempValue < 0
    ? 2000 + ((tempValue + 100) / 100) * (5500 - 2000)
    : 5500 + (tempValue / 100) * (10000 - 5500);

  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let red, green, blue;

  if (temp <= 66)
  {
    red = 255;
  }
  else
  {
    red = temp - 60;
    red = 329.698727446 * Math.pow(red, -0.1332047592);
    red = Math.max(0, Math.min(255, red));
  }

  if (temp <= 66)
  {
    green = temp;
    green = 99.4708025861 * Math.log(green) - 161.1195681661;
    green = Math.max(0, Math.min(255, green));
  }
  else
  {
    green = temp - 60;
    green = 288.1221695283 * Math.pow(green, -0.0755148492);
    green = Math.max(0, Math.min(255, green));
  }

  if (temp >= 66)
  {
    blue = 255;
  }
  else if (temp <= 19)
  {
    blue = 0;
  }
  else
  {
    blue = temp - 10;
    blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
    blue = Math.max(0, Math.min(255, blue));
  }

  const targetRGB = { r: Math.round(red), g: Math.round(green), b: Math.round(blue) };

  const neutralTemp = 5500 / 100;
  const neutralRed = 255;
  const neutralGreen = 99.4708025861 * Math.log(neutralTemp) - 161.1195681661;
  const neutralBlue = 138.5177312231 * Math.log(neutralTemp - 10) - 305.0447927307;
  const neutralRGB = { r: neutralRed, g: neutralGreen, b: neutralBlue };

  const intensity = Math.abs(tempValue) / 100 * 0.3;

  return {
    r: (targetRGB.r - neutralRGB.r) * intensity,
    g: (targetRGB.g - neutralRGB.g) * intensity,
    b: (targetRGB.b - neutralRGB.b) * intensity,
  };
}
