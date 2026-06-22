
"use client";
import { useCallback } from "react";
import {ModelManagerTable} from "@/components/models/Model_Manager";
export default function ModelsSettingsPage() {

  const handleSaveKey = useCallback(async (providerName, key) => {

    console.log(`[Alfred] Saving API key for ${providerName}`);
  }, []);

  const handleUploadConfig = useCallback(async (fileContents) => {

    console.log("[Alfred] Uploading config file");
  }, []);
  return (
    <ModelManagerTable
      onSaveKey={handleSaveKey}
      onUploadConfig={handleUploadConfig}
    />
  );
}