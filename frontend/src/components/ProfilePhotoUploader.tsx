import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { uploadImageFile } from "@/lib/api";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

async function canvasFromCrop(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Could not export image"));
      },
      "image/jpeg",
      0.92
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.addEventListener("load", () => resolve(i));
    i.addEventListener("error", () => reject(new Error("Image load failed")));
    i.setAttribute("crossOrigin", "anonymous");
    i.src = src;
  });
}

type Props = {
  name: string;
  photoUrl?: string | null;
  onSavedUrl: (url: string | null) => void;
  disabled?: boolean;
};

export function ProfilePhotoUploader({ name, photoUrl, onSavedUrl, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_a: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      toast.error("Use JPG, PNG, or WEBP under 5MB.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(String(reader.result));
      setOpen(true);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const handleSaveCrop = async () => {
    if (!imgSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await canvasFromCrop(imgSrc, croppedAreaPixels);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const { url } = await uploadImageFile("avatar", file);
      onSavedUrl(url);
      toast.success("Photo updated");
      setOpen(false);
      setImgSrc(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    onSavedUrl(null);
    toast.success("Photo removed");
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <UserAvatar name={name} photoUrl={photoUrl} size="md" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} className="gap-1.5" asChild>
          <label className="cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            {photoUrl ? "Replace" : "Upload"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickFile} disabled={disabled} />
          </label>
        </Button>
        {photoUrl ? (
          <Button type="button" variant="ghost" size="sm" className="text-destructive gap-1.5" onClick={handleRemove} disabled={disabled}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setImgSrc(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop profile photo</DialogTitle>
          </DialogHeader>
          {imgSrc ? (
            <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
              <Cropper
                image={imgSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveCrop} disabled={saving || !croppedAreaPixels}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
