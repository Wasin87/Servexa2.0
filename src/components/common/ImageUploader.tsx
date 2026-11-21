import React, { useRef, useState } from 'react';
import { Camera, Upload, Check, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ImageUploaderProps {
  currentImage: string;
  onImageChange: (base64OrUrl: string) => void;
  onRemove?: () => void;
  label?: string;
  shape?: 'circle' | 'square' | 'banner';
  className?: string;
  showPresets?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentImage,
  onImageChange,
  onRemove,
  label,
  shape = 'square',
  className = '',
  showPresets = false
}) => {
  const { isBangla } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string>(currentImage);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Synchronize preview if currentImage changes externally
  React.useEffect(() => {
    setPreview(currentImage);
  }, [currentImage]);

  const processFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError(isBangla ? 'অনুগ্রহ করে একটি বৈধ ছবি ফাইল নির্বাচন করুন।' : 'Please select a valid image file.');
      return;
    }

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(isBangla ? 'ছবির সাইজ ১০ মেগাবাইটের কম হতে হবে।' : 'Image size must be less than 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        // Compress/Resize image in browser canvas to stay fast and well within Firestore 1MB doc limits
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const isAvatar = shape === 'circle';
          const maxDim = isAvatar ? 360 : 560;
          const maxBase64Length = isAvatar ? 95000 : 140000;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Fill white background so transparent PNGs render cleanly as JPEG
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            let quality = 0.8;
            let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            while (compressedBase64.length > maxBase64Length && quality > 0.52) {
              quality -= 0.08;
              compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            }
            setPreview(compressedBase64);
            onImageChange(compressedBase64);
          } else {
            setPreview(result);
            onImageChange(result);
          }
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const samplePresets = [
    { label: 'Pro 1', url: '/src/assets/images/tech_portrait_senior_1794936426060.jpg' },
    { label: 'Pro 2', url: '/src/assets/images/tech_portrait_specialist_1794936426858.jpg' },
    { label: 'Work 1', url: '/src/assets/images/service_ac_electrical_1794936425375.jpg' },
    { label: 'Work 2', url: '/src/assets/images/service_plumbing_home_1794936425180.jpg' }
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="font-bold text-zinc-700 dark:text-zinc-300 block text-xs">
          {label}
        </label>
      )}

      {/* Hidden native file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png, image/jpeg, image/webp, image/jpg"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all ${
          isDragging
            ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 ring-4 ring-orange-500/20'
            : 'border-zinc-200 dark:border-zinc-700 bg-stone-50/80 dark:bg-zinc-800/80 hover:border-orange-500/50'
        } flex flex-col sm:flex-row items-center sm:items-center gap-4`}
      >
        {/* Preview Thumbnail */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative group cursor-pointer shrink-0"
          title={isBangla ? 'ছবি পরিবর্তন করতে ক্লিক করুন' : 'Click to change photo'}
        >
          {preview ? (
            <img
              src={preview}
              alt="Upload Preview"
              className={`object-cover border-2 border-orange-500 shadow-md transition-transform group-hover:scale-105 ${
                shape === 'circle'
                  ? 'w-20 h-20 rounded-full'
                  : shape === 'banner'
                  ? 'w-32 h-20 rounded-xl'
                  : 'w-20 h-20 rounded-2xl'
              }`}
            />
          ) : (
            <div
              className={`bg-stone-200 dark:bg-zinc-700 border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-zinc-500 dark:text-zinc-300 transition-transform group-hover:scale-105 ${
                shape === 'circle'
                  ? 'w-20 h-20 rounded-full'
                  : shape === 'banner'
                  ? 'w-32 h-20 rounded-xl'
                  : 'w-20 h-20 rounded-2xl'
              }`}
            >
              <ImageIcon className="w-7 h-7" />
            </div>
          )}
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white ${
            shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
          }`}>
            <Camera className="w-5 h-5" />
          </div>
          <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-orange-600 text-white shadow-xs">
            <Upload className="w-3 h-3" />
          </span>
        </div>

        {/* Action Controls & Description */}
        <div className="flex-1 min-w-0 text-center sm:text-left space-y-2 w-full">
          <div>
            <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
              <span>{isBangla ? 'ডিভাইস থেকে সরাসরি ছবি আপলোড করুন' : 'Direct Photo Upload from Device'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 font-bold">
                JPG, PNG, WebP
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {isBangla
                ? 'কম্পিউটার বা মোবাইল থেকে যেকোনো স্পষ্ট ছবি সিলেক্ট করুন বা ড্র্যাগ অ্যান্ড ড্রপ করুন।'
                : 'Click choose file to upload directly from phone or desktop camera/gallery.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isBangla ? 'ডিভাইস থেকে ছবি বেছে নিন' : 'Choose Photo File'}</span>
            </button>

            {onRemove && preview && (
              <button
                type="button"
                onClick={() => {
                  setPreview('');
                  setUploadError(null);
                  onRemove();
                }}
                className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-xs cursor-pointer"
              >
                {isBangla ? 'মুছে ফেলুন' : 'Remove'}
              </button>
            )}

            {showPresets && (
              <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                <span className="hidden sm:inline">বা ডেমো:</span>
                {samplePresets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPreview(p.url);
                      setUploadError(null);
                      onImageChange(p.url);
                    }}
                    className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold hover:border-orange-500 hover:text-orange-600 cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {uploadError && (
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 pt-1">
              ⚠️ {uploadError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
