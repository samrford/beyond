"use client";

import { useState } from "react";
import { apiUpload, API_BASE_URL } from "@/lib/api";

export const useUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const upload = async (file: File): Promise<string | null> => {
    setUploading(true);
    
    // Create local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await apiUpload<{ url: string }>("/v1/upload", formData);
      return data.url;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, previewUrl };
};
