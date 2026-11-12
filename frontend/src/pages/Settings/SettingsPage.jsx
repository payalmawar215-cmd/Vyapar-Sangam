import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Film, ImageIcon } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";
import VideoHero from "@/components/common/VideoHero";
import { authService } from "@/services/authService";

export default function SettingsPage() {
  const { user, updateRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);

  const role = user?.app_role || (user?.role ? user.role.toLowerCase() : "");
  const isAdmin = role === "admin" || user?.role === "ADMIN" || user?.is_staff;

  useEffect(() => {
    authService
      .getPlatformSettings()
      .then((data) => setSettings(data))
      .catch(() => setSettings(null));
  }, []);

  const uploadVideo = async (file) => {
    if (!file) return;
    if (!/video\/mp4|video\/quicktime/.test(file.type) && !file.name.endsWith(".mp4")) {
      toast({ description: "Please upload an MP4 video.", variant: "destructive" });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast({ description: "Video must be under 100 MB.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const data = await authService.uploadVideo(file);
      toast({ description: "Intro video updated. It will play on the home page." });
      setSettings((prev) => ({ ...(prev || {}), intro_video_url: data.url || data.file_url }));
    } catch {
      toast({ description: "Upload failed. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const uploadPoster = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const data = await authService.uploadPoster(file);
      toast({ description: "Poster image updated." });
      setSettings((prev) => ({ ...(prev || {}), intro_video_poster: data.url || data.file_url }));
    } catch {
      toast({ description: "Upload failed. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const switchRole = async (newRole) => {
    try {
      if (updateRole) {
        await updateRole(newRole);
      }
      toast({ description: `You are now using Vyapar Sangam as a ${newRole}.` });
      navigate(newRole === "buyer" ? "/buyer" : newRole === "seller" ? "/seller" : "/admin");
    } catch {
      toast({ description: "Could not change your role.", variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        titleAccent=""
        subtitle="Manage your role on the platform. Administrators also manage the site intro video here."
      />
      <section className="px-[4%] md:px-[2%] pb-24 md:pb-32">
        <div className="max-w-2xl mx-auto space-y-12">
          {/* Role section */}
          <div className="border border-border p-8 md:p-12">
            <p className="font-body text-xs tracking-label uppercase text-accent mb-8">Role</p>
            <p className="font-body text-sm text-muted-foreground mb-6">
              You are currently registered as a{" "}
              <span className="text-foreground capitalize">{role || "— user with no role yet"}</span>. Switch your
              workspace if your focus has changed.
            </p>
            <div className="flex flex-wrap gap-3">
              {["buyer", "seller"].map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  disabled={role === r}
                  className={`font-body text-xs tracking-label uppercase px-6 py-2.5 rounded-full border transition-colors ${
                    role === r
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:border-accent hover:text-accent"
                  }`}
                >
                  {r === "buyer" ? "Use as Buyer" : "Use as Seller"}
                </button>
              ))}
            </div>
          </div>

          {/* Admin: Intro video */}
          {isAdmin && (
            <div className="border border-border p-8 md:p-12">
              <p className="font-body text-xs tracking-label uppercase text-accent mb-3">Home page video</p>
              <p className="font-body text-sm text-muted-foreground mb-8">
                The intro video that sits above the home page footer. Upload an MP4 (max 100 MB) and an optional poster image.
              </p>

              {settings?.intro_video_url && (
                <div className="mb-8">
                  <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-3">Live preview</p>
                  <VideoHero src={settings.intro_video_url} poster={settings.intro_video_poster} />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="border border-dashed border-border p-6 text-center cursor-pointer hover:border-accent transition-colors block">
                  <Film size={20} strokeWidth={1.25} className="text-accent mx-auto mb-2" />
                  <span className="font-body text-xs text-foreground block">
                    {busy ? "Uploading…" : "Upload video (MP4)"}
                  </span>
                  <span className="font-body text-[10px] text-muted-foreground block mt-1">Up to 100 MB</span>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime"
                    onChange={(e) => uploadVideo(e.target.files?.[0])}
                    disabled={busy}
                    className="hidden"
                  />
                </label>

                <label className="border border-dashed border-border p-6 text-center cursor-pointer hover:border-accent transition-colors block">
                  <ImageIcon size={20} strokeWidth={1.25} className="text-accent mx-auto mb-2" />
                  <span className="font-body text-xs text-foreground block">
                    {busy ? "Uploading…" : "Upload poster image"}
                  </span>
                  <span className="font-body text-[10px] text-muted-foreground block mt-1">Shows while loading</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadPoster(e.target.files?.[0])}
                    disabled={busy}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
