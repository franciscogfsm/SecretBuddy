/**
 * 🔍 FACE DETECTION SERVICE
 *
 * Detects faces in photos to prevent users from sending identifiable images
 * Uses Azure Face API for accurate, cloud-based face detection
 */

// Azure Face API Configuration
const AZURE_FACE_API_KEY =
  "3H9IRGmtaUEeIcKIK3T4X9MA0y7Eo8LqYvxLSIQhASYPGsqcxeo7JQQJ99BKAC5RqLJXJ3w3AAAKACOG9Mk7";
const AZURE_FACE_ENDPOINT = "https://secretbuddy.cognitiveservices.azure.com/";

export interface FaceDetectionResult {
  hasFaces: boolean;
  faceCount: number;
  confidence?: number;
}

/**
 * Convert image URI to base64 for Azure API
 */
const convertImageToBase64 = async (imageUri: string): Promise<string> => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data.split(",")[1]); // Remove data:image/jpeg;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("❌ Error converting image to base64:", error);
    throw error;
  }
};

/**
 * Detect faces in an image URI using Azure Face API
 * Returns true if faces are detected, false if no faces found
 */
export const detectFacesInImage = async (
  imageUri: string
): Promise<FaceDetectionResult> => {
  try {
    console.log("🔍 Starting Azure face detection...");

    // Read image as blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Call Azure Face API
    const azureResponse = await fetch(
      `${AZURE_FACE_ENDPOINT}face/v1.0/detect?returnFaceId=false&returnFaceLandmarks=false`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Ocp-Apim-Subscription-Key": AZURE_FACE_API_KEY,
        },
        body: blob,
      }
    );

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text();
      console.error("❌ Azure Face API error:", errorText);
      throw new Error(`Azure Face API error: ${azureResponse.status}`);
    }

    const faces = await azureResponse.json();
    const hasFaces = faces.length > 0;
    const faceCount = faces.length;

    console.log(
      `🔍 Azure face detection complete: ${faceCount} face(s) detected`
    );

    return {
      hasFaces,
      faceCount,
      confidence: faces[0]?.faceAttributes?.confidence,
    };
  } catch (error) {
    console.error("❌ Face detection error:", error);

    // If detection fails, err on the side of caution - assume no faces
    // This prevents blocking photos if the detection service has issues
    return {
      hasFaces: false,
      faceCount: 0,
    };
  }
};
/**
 * Validate photo before upload - checks for faces
 * Returns true if photo is valid (no faces), false if faces detected
 */
export const validatePhotoForUpload = async (
  imageUri: string
): Promise<{ isValid: boolean; reason?: string }> => {
  try {
    const result = await detectFacesInImage(imageUri);

    if (result.hasFaces) {
      return {
        isValid: false,
        reason: `${result.faceCount} face${
          result.faceCount > 1 ? "s" : ""
        } detected`,
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error("❌ Photo validation error:", error);

    // If validation fails, allow the photo (don't block user due to technical issues)
    return { isValid: true };
  }
};
