export async function generateLutFromImage(imageData: string): Promise<string> {
  try {
    // Convert base64 to blob
    const base64Data = imageData.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', blob, 'image.jpg');

    // Send image file to our FastAPI backend
    const response = await fetch('http://localhost:8000/api/generate-lut', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // The backend returns the LUT data directly as text
    const lutData = await response.text();
    return lutData;
  } catch (error) {
    console.error("Error generating LUT:", error);
    throw new Error("Failed to analyze image and generate LUT");
  }
}
