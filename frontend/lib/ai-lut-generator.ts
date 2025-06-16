import getConfig from "next/config";

export async function generateLutFromImage(imageData: string): Promise<string>
{
  try
  {
    const base64Data = imageData.split(",")[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++)
    {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/jpeg" });

    const formData = new FormData();
    formData.append("file", blob, "image.jpg");

    const { publicRuntimeConfig } = getConfig();
    const apiUrl = publicRuntimeConfig?.apiUrl || process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl || apiUrl === "undefined")
    {
      throw new Error(
        "Backend API URL not configured. Please set NEXT_PUBLIC_API_URL environment variable.",
      );
    }

    const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;

    console.log("Using API URL:", baseUrl);

    const response = await fetch(`${baseUrl}/api/generate-lut`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok)
    {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const lutData = await response.text();
    return lutData;
  }
  catch (error)
  {
    console.error("Error generating LUT:", error);
    throw new Error("Failed to analyze image and generate LUT");
  }
}
