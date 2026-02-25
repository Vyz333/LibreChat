import { useCallback, useEffect, useRef } from 'react';
import { useToastContext } from '@librechat/client';
import { useFormContext, useWatch } from 'react-hook-form';
import { Constants, mergeFileConfig, fileConfig as defaultFileConfig } from 'librechat-data-provider';
import type { AgentAvatar } from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import { useGetFileConfig } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { isEphemeralAgent } from '~/common';
import { processAVIFFileForUpload } from '~/utils/avifConverter';

const MAX_IMAGES = Constants.MAX_AGENT_GALLERY_IMAGES;

export default function AgentGalleryUpload({
  gallery,
}: {
  gallery?: AgentAvatar[] | null;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { control, setValue, getValues } = useFormContext<AgentForm>();
  const galleryPreview = useWatch({ control, name: 'gallery_preview' }) ?? [];
  const galleryAction = useWatch({ control, name: 'gallery_action' });
  const agent_id = useWatch({ control, name: 'id' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: fileConfig = defaultFileConfig } = useGetFileConfig({
    select: (data) => mergeFileConfig(data),
  });

  const hasRemoteGallery = Boolean(gallery?.length);

  useEffect(() => {
    if (galleryAction) {
      return;
    }

    if (gallery?.length && galleryPreview.length === 0) {
      setValue(
        'gallery_preview',
        gallery.map((img) => img.filepath),
        { shouldDirty: false },
      );
    }

    if (!gallery?.length && galleryPreview.length > 0) {
      setValue('gallery_preview', [], { shouldDirty: false });
    }
  }, [gallery, galleryAction, galleryPreview.length, setValue]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawFiles: File[] = Array.from(event.target.files ?? []);
      const sizeLimit = fileConfig.avatarSizeLimit ?? 0;

      if (rawFiles.length === 0) {
        return;
      }

      const currentCount = galleryAction === 'upload' ? galleryPreview.length : (gallery?.length ?? 0);
      const totalCount = currentCount + rawFiles.length;
      if (totalCount > MAX_IMAGES) {
        showToast({
          message: localize('com_agents_gallery_max_count', { 0: String(MAX_IMAGES) }),
          status: 'error',
        });
        return;
      }

      const processedFiles: File[] = [];
      for (const file of rawFiles) {
        try {
          const processed = await processAVIFFileForUpload(file);
          processedFiles.push(processed);
        } catch {
          showToast({
            message: localize('com_error_avif_conversion'),
            status: 'error',
          });
          return;
        }
      }

      const validFiles: File[] = [];
      for (const file of processedFiles) {
        if (sizeLimit && file.size > sizeLimit) {
          const limitInMb = sizeLimit / (1024 * 1024);
          const displayLimit = Number.isInteger(limitInMb)
            ? limitInMb
            : parseFloat(limitInMb.toFixed(1));
          showToast({
            message: localize('com_ui_upload_invalid_var', { 0: displayLimit }),
            status: 'error',
          });
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) {
        return;
      }

      const newPreviews: string[] = [];
      for (const file of validFiles) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) ?? '');
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
        newPreviews.push(dataUrl);
      }

      const existingFiles = galleryAction === 'upload' ? (getValues('gallery_files') ?? []) : [];
      const existingPreviews = galleryAction === 'upload' ? galleryPreview : [];
      const combinedFiles = [...existingFiles, ...validFiles].slice(-MAX_IMAGES);
      const combinedPreviews = [...existingPreviews, ...newPreviews].slice(-MAX_IMAGES);
      setValue('gallery_files', combinedFiles, { shouldDirty: true });
      setValue('gallery_preview', combinedPreviews, { shouldDirty: true });
      setValue('gallery_action', 'upload', { shouldDirty: true });
    },
    [
      fileConfig.avatarSizeLimit,
      gallery?.length,
      galleryAction,
      galleryPreview,
      getValues,
      localize,
      setValue,
      showToast,
    ],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const files = useWatch({ control, name: 'gallery_files' }) ?? [];
      const previews = [...galleryPreview];
      previews.splice(index, 1);

      const newFiles =
        galleryAction === 'upload' ? files.filter((_, i) => i !== index) : [];
      setValue('gallery_files', newFiles, { shouldDirty: true });
      setValue('gallery_preview', previews, { shouldDirty: true });
      setValue('gallery_action', previews.length === 0 && !gallery?.length ? null : 'upload', {
        shouldDirty: true,
      });
    },
    [control, gallery?.length, galleryAction, galleryPreview, setValue],
  );

  const handleReset = useCallback(() => {
    setValue('gallery_files', [], { shouldDirty: true });
    setValue('gallery_preview', [], { shouldDirty: true });
    setValue('gallery_action', hasRemoteGallery ? 'reset' : null, { shouldDirty: true });
  }, [hasRemoteGallery, setValue]);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  };

  const previews =
    galleryAction === 'reset'
      ? []
      : galleryAction === 'upload'
        ? galleryPreview
        : (gallery?.map((img) => img.filepath) ?? []);
  const canAddMore = previews.length < MAX_IMAGES;
  const hasImages = previews.length > 0;
  const showRemoveButtons = galleryAction === 'upload';

  return (
    <div className="mb-4">
      <label className="mb-2 text-token-text-primary block font-medium">
        {localize('com_agents_gallery_label')}
      </label>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {previews.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative group"
            >
              <div className="h-16 w-16 overflow-hidden rounded-lg border border-border-medium">
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              {showRemoveButtons && !isEphemeralAgent(agent_id) && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  aria-label={localize('com_ui_remove')}
                >
                  <span className="text-xs">×</span>
                </button>
              )}
            </div>
          ))}
          {canAddMore && !isEphemeralAgent(agent_id) && (
            <button
              type="button"
              onClick={handleUploadClick}
              className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border-medium hover:border-border-heavy"
              aria-label={localize('com_agents_gallery_upload')}
            >
              <span className="text-2xl text-text-secondary">+</span>
            </button>
          )}
        </div>
        {hasImages && !isEphemeralAgent(agent_id) && (
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            {localize('com_ui_reset_var', { 0: localize('com_agents_gallery_label') })}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,.png,image/jpeg,.jpg,.jpeg,image/gif,.gif,image/webp,.webp,image/avif,.avif"
          multiple
          className="hidden"
          tabIndex={-1}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
