import { useState } from "react";

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // In production, we'd use the actual API URL. For now, assume it's relative or handled by proxy.
      const response = await fetch("http://localhost:8080/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading };
}
