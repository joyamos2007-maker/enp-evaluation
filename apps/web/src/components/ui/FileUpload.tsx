import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import { Button } from './Button';

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeBytes?: number;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  selectedFile?: File | null;
  onClear?: () => void;
}

export function FileUpload({
  onFileSelect,
  accept = '.csv',
  maxSizeBytes = 2 * 1024 * 1024, // 2MB
  label,
  helperText = 'Fichiers CSV uniquement, jusqu\'à 2 Mo',
  error,
  disabled = false,
  selectedFile,
  onClear,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (file.size > maxSizeBytes) {
      alert(`Fichier trop volumineux. Taille max : ${(maxSizeBytes / 1024 / 1024).toFixed(1)} Mo`);
      return;
    }
    onFileSelect(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  return (
    <div className="w-full">
      {label && (
        <span className="block text-xs font-semibold uppercase tracking-wider text-enp-gray-dark mb-1.5">
          {label}
        </span>
      )}

      {selectedFile ? (
        <div className="border border-enp-border bg-enp-blue-ice/50 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 w-full">
            <div className="w-10 h-10 bg-white border border-enp-border flex items-center justify-center text-enp-blue-primary shrink-0">
              <FileText className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-enp-blue-deep truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-enp-gray-medium">
                {(selectedFile.size / 1024).toFixed(1)} Ko • Prêt pour analyse
              </p>
            </div>
          </div>
          {onClear && !disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              aria-label="Supprimer le fichier sélectionné"
              leftIcon={<X className="w-4 h-4" />}
              className="w-full sm:w-auto justify-center"
            >
              Retirer
            </Button>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-colors bg-white select-none ${
            isDragOver
              ? 'border-enp-blue-primary bg-enp-blue-ice/50'
              : 'border-enp-border hover:border-enp-blue-primary/60'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-enp-bg' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            className="sr-only"
          />
          <div className="w-12 h-12 mx-auto mb-3 bg-enp-blue-ice border border-enp-border flex items-center justify-center text-enp-blue-primary">
            <UploadCloud className="w-6 h-6 stroke-[1.5]" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-enp-blue-deep mb-1">
            Glissez-déposez votre fichier ici, ou <span className="text-enp-blue-primary underline">parcourez vos dossiers</span>
          </p>
          <p className="text-xs text-enp-gray-medium">{helperText}</p>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-enp-red-error font-medium">{error}</p>}
    </div>
  );
}

