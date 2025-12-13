import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportProgress {
  fileIndex: number;
  totalFiles: number;
  filename: string;
  status: "parsing" | "saving" | "done" | "error";
  error: string | null;
}

interface FileStatus {
  filename: string;
  status: "pending" | "parsing" | "saving" | "done" | "error";
  error?: string;
}

interface ImportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalFiles: number;
  onComplete: () => void;
}

export function ImportProgressDialog({
  open,
  onOpenChange,
  totalFiles,
  onComplete,
}: ImportProgressDialogProps) {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setFiles([]);
      setCurrentIndex(0);
      setCompletedCount(0);
      setErrorCount(0);
      return;
    }

    const unlisten = listen<ImportProgress>("import-progress", (event) => {
      const progress = event.payload;

      setFiles((prev) => {
        const newFiles = [...prev];
        // Ensure we have enough slots
        while (newFiles.length <= progress.fileIndex) {
          newFiles.push({ filename: "", status: "pending" });
        }
        newFiles[progress.fileIndex] = {
          filename: progress.filename,
          status: progress.status,
          error: progress.error ?? undefined,
        };
        return newFiles;
      });

      setCurrentIndex(progress.fileIndex);

      if (progress.status === "done") {
        setCompletedCount((prev) => prev + 1);
      } else if (progress.status === "error") {
        setErrorCount((prev) => prev + 1);
      }

      // Check if all files are processed
      if (progress.fileIndex === progress.totalFiles - 1 &&
          (progress.status === "done" || progress.status === "error")) {
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [open, onComplete]);

  const overallProgress = totalFiles > 0
    ? ((completedCount + errorCount) / totalFiles) * 100
    : 0;

  const StatusIcon = ({ status }: { status: FileStatus["status"] }) => {
    switch (status) {
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "parsing":
      case "saving":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusText = (status: FileStatus["status"]) => {
    switch (status) {
      case "parsing":
        return "Parsing...";
      case "saving":
        return "Saving...";
      case "done":
        return "Done";
      case "error":
        return "Error";
      default:
        return "Pending";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importing Activities</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>
                {completedCount + errorCount} of {totalFiles} files
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            {errorCount > 0 && (
              <p className="text-sm text-destructive">
                {errorCount} file{errorCount > 1 ? "s" : ""} failed
              </p>
            )}
          </div>

          {/* File List */}
          <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
            {files.map((file, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between py-1.5 px-2 rounded text-sm",
                  index === currentIndex && file.status !== "done" && file.status !== "error"
                    ? "bg-muted"
                    : ""
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <StatusIcon status={file.status} />
                  <span className="truncate font-mono text-xs">
                    {file.filename || `File ${index + 1}`}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-xs ml-2 whitespace-nowrap",
                    file.status === "error" ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {file.error ? file.error.substring(0, 30) : statusText(file.status)}
                </span>
              </div>
            ))}
            {files.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Starting import...
              </div>
            )}
          </div>

          {/* Summary */}
          {overallProgress === 100 && (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">
                Import complete: {completedCount} succeeded, {errorCount} failed
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
