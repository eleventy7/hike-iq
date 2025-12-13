import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { ImportProgressDialog } from "@/components/ImportProgressDialog";
import { api } from "@/lib/api";
import type { Activity } from "@/lib/types";
import { Upload } from "lucide-react";

interface ImportButtonProps {
  onImport: (activities: Activity[]) => void;
}

export function ImportButton({ onImport }: ImportButtonProps) {
  const [showProgress, setShowProgress] = useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  const [importedActivities, setImportedActivities] = useState<Activity[]>([]);

  async function handleClick() {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "FIT Files", extensions: ["fit", "FIT"] }],
      });

      if (!selected || selected.length === 0) return;

      const paths = Array.isArray(selected) ? selected : [selected];
      setTotalFiles(paths.length);
      setImportedActivities([]);
      setShowProgress(true);

      // Start the import - progress will be tracked via events
      const results = await api.importFitFiles(paths);
      setImportedActivities(results);
    } catch (error) {
      console.error("Import failed:", error);
      setShowProgress(false);
    }
  }

  function handleComplete() {
    setShowProgress(false);
    if (importedActivities.length > 0) {
      onImport(importedActivities);
    }
  }

  return (
    <>
      <Button onClick={handleClick}>
        <Upload className="w-4 h-4 mr-2" />
        Import FIT Files
      </Button>

      <ImportProgressDialog
        open={showProgress}
        onOpenChange={setShowProgress}
        totalFiles={totalFiles}
        onComplete={handleComplete}
      />
    </>
  );
}
