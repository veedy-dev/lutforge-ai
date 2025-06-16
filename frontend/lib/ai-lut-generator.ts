import getConfig from "next/config";

async function getApiUrl(): Promise<string>
{
  let apiUrl: string | undefined;

  // Method 1: Try environment variable (should be available via Docker)
  apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Method 2: Try runtime config as fallback
  if (!apiUrl || apiUrl === "undefined")
  {
    try
    {
      const { publicRuntimeConfig } = getConfig() || {};
      apiUrl = publicRuntimeConfig?.apiUrl;
    }
    catch (error)
    {
      // Runtime config failed
    }
  }

  // Method 3: Try fetching from our config API endpoint as last resort
  if ((!apiUrl || apiUrl === "undefined") && typeof window !== "undefined")
  {
    try
    {
      const response = await fetch("/api/config");
      if (response.ok)
      {
        const config = await response.json();
        apiUrl = config.apiUrl;
      }
    }
    catch (e)
    {
      // API config failed
    }
  }

  if (!apiUrl || apiUrl === "undefined")
  {
    throw new Error(
      "Backend API URL not configured. Please set NEXT_PUBLIC_API_URL environment variable in Koyeb dashboard.",
    );
  }

  return apiUrl;
}

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

    const apiUrl = await getApiUrl();
    const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;

    const response = await fetch(`${baseUrl}/api/generate-lut`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok)
    {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
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
