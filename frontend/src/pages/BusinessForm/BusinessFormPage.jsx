import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ImagePlus, X, Save, Send, Upload, Star, Loader2, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/lib/ToastContext";
import PageHeader from "@/components/common/PageHeader";
import { listingService, categoryService } from "@/services/listingService";

const YEARS = ["", "0", "1", "2", "3", "4", "5", "6", "7", "8", "10", "12", "15", "20", "25", "30", "40", "50"];
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file

const initialForm = {
  name: "",
  category: "",
  short_description: "",
  description: "",
  city: "",
  state: "",
  location: "",
  established_year: "",
  years_in_operation: "",
  asking_price: "",
  annual_revenue: "",
  annual_profit: "",
  employees: "",
  reason_for_selling: "",
  highlights: "",
  // Handover & Transition Support
  training_provided: false,
  training_duration: "30_days",
  training_duration_custom: "",
  employee_continuity: "open_for_discussion",
  customer_introductions: "yes",
  transition_support_details: "",
};

export default function BusinessFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [loading, setLoading] = useState(!!id);
  const [locked, setLocked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [listingStatus, setListingStatus] = useState("draft");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionFeedback, setRejectionFeedback] = useState("");

  useEffect(() => {
    categoryService
      .getAll()
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : res.data.results || [];
        setCategories(items);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id || !user) return;
    listingService
      .getById(id)
      .then((res) => {
        const b = res.data;
        if (!b) {
          toast({ description: "Listing not found.", variant: "destructive" });
          navigate("/my-listings");
          return;
        }
        setListingStatus(b.status || "draft");
        setRejectionReason(b.rejection_reason || "");
        setRejectionFeedback(b.rejection_feedback || "");

        // Approved and pending review listings are locked from editing
        // Rejected and changes_required listings are unlocked so sellers can fix them
        if (b.status === "approved" || b.status === "pending") {
          setLocked(true);
        } else {
          setLocked(false);
        }

        setForm({
          name: b.name || b.title || "",
          category: b.category || b.category_name || "",
          short_description: b.short_description || "",
          description: b.description || "",
          city: b.city || "",
          state: b.state || "",
          location: b.location || "",
          established_year: b.established_year || "",
          years_in_operation: b.years_in_operation || "",
          asking_price: b.asking_price || "",
          annual_revenue: b.annual_revenue || "",
          annual_profit: b.annual_profit || b.annual_cashflow || "",
          employees: b.employees || b.employees_count || "",
          reason_for_selling: b.reason_for_selling || b.reason_for_sale || "",
          highlights: Array.isArray(b.highlights) ? b.highlights.join("\n") : b.highlights || "",
          training_provided: Boolean(b.training_provided),
          training_duration: b.training_duration || "30_days",
          training_duration_custom: b.training_duration_custom || "",
          employee_continuity: b.employee_continuity || "open_for_discussion",
          customer_introductions: b.customer_introductions || "yes",
          transition_support_details: b.transition_support_details || "",
        });

        // Preserve all existing images from backend
        const existingImages =
          Array.isArray(b.images) && b.images.length > 0
            ? b.images
            : b.featured_image
            ? [b.featured_image]
            : [];
        setImages(existingImages);
        setLoading(false);
      })
      .catch(() => navigate("/my-listings"));
  }, [id, user, navigate, toast]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Trigger computer's file picker
  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Upload handler for selected files
  const handleUploadFiles = async (fileList) => {
    const rawFiles = Array.from(fileList || []);
    if (!rawFiles.length) return;

    // Validate files
    const validFiles = [];
    for (const f of rawFiles) {
      const ext = "." + (f.name.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        toast({
          description: `"${f.name}" is not a supported image. Please upload JPG, JPEG, PNG, or WEBP.`,
          variant: "destructive",
        });
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast({
          description: `"${f.name}" exceeds the 10 MB limit (${(f.size / (1024 * 1024)).toFixed(1)} MB).`,
          variant: "destructive",
        });
        continue;
      }
      validFiles.push(f);
    }

    if (!validFiles.length) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(`Uploading ${validFiles.length} image${validFiles.length > 1 ? "s" : ""}…`);

    try {
      // First try single-batch upload
      const res = await listingService.uploadImages(validFiles);
      const newUrls = res.data?.urls || (res.data?.url ? [res.data.url] : []);

      if (newUrls.length > 0) {
        setImages((prev) => [...prev, ...newUrls]);
        toast({
          description: `Successfully added ${newUrls.length} image${newUrls.length > 1 ? "s" : ""}.`,
        });
      } else {
        throw new Error("No URL returned from server.");
      }
    } catch (batchErr) {
      // Fallback: upload one-by-one if batch encounters an issue
      let successCount = 0;
      const uploadedUrls = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress(`Uploading (${i + 1}/${validFiles.length}): ${file.name}…`);
        try {
          const singleRes = await listingService.uploadImage(file);
          if (singleRes.data?.url) {
            uploadedUrls.push(singleRes.data.url);
            successCount++;
          }
        } catch (singleErr) {
          const errMsg = singleErr?.response?.data?.error || `Failed to upload "${file.name}".`;
          toast({ description: errMsg, variant: "destructive" });
        }
      }

      if (uploadedUrls.length > 0) {
        setImages((prev) => [...prev, ...uploadedUrls]);
        toast({
          description: `Successfully uploaded ${successCount} image${successCount > 1 ? "s" : ""}.`,
        });
      }
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleInputChange = (e) => {
    handleUploadFiles(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!locked && !uploading) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!locked && !uploading && e.dataTransfer?.files) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    toast({ description: "Image removed." });
  };

  const makeCover = (index) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      return [selected, ...copy];
    });
    toast({ description: "Cover photo updated." });
  };

  const buildPayload = (status) => ({
    name: form.name.trim(),
    title: form.name.trim(),
    category: form.category,
    short_description: form.short_description.trim(),
    description: form.description.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    location: form.location.trim(),
    established_year: form.established_year ? Number(form.established_year) : null,
    years_in_operation: form.years_in_operation ? Number(form.years_in_operation) : null,
    asking_price: form.asking_price ? Number(form.asking_price) : null,
    annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : null,
    annual_profit: form.annual_profit ? Number(form.annual_profit) : null,
    annual_cashflow: form.annual_profit ? Number(form.annual_profit) : null,
    employees: form.employees ? Number(form.employees) : null,
    employees_count: form.employees ? Number(form.employees) : null,
    reason_for_selling: form.reason_for_selling.trim(),
    reason_for_sale: form.reason_for_selling.trim(),
    highlights: form.highlights
      .split("\n")
      .map((h) => h.trim())
      .filter(Boolean),
    images: images,
    featured_image: images[0] || "",
    status,
    // Feature 1: Handover & Transition Support
    training_provided: form.training_provided,
    training_duration: form.training_provided ? form.training_duration : "",
    training_duration_custom: form.training_duration === "custom" ? form.training_duration_custom : "",
    employee_continuity: form.employee_continuity,
    customer_introductions: form.customer_introductions,
    transition_support_details: form.transition_support_details.trim(),
  });

  const resubmit = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await listingService.resubmit(id, "Corrections made as per reviewer feedback.");
      toast({ description: "Listing resubmitted for approval." });
      navigate("/my-listings");
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.error || "Could not resubmit. Please try again.";
      toast({ description: errMsg, variant: "destructive" });
      setBusy(false);
    }
  };

  const save = async (status) => {
    if (!form.name.trim()) {
      toast({ description: "Please enter a business name.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const payload = buildPayload(status);
      if (id) {
        await listingService.update(id, payload);
      } else {
        await listingService.create(payload);
      }
      toast({ description: status === "draft" ? "Draft saved successfully." : "Submitted for admin approval." });
      navigate("/my-listings");
    } catch (err) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        (typeof err?.response?.data === "object"
          ? Object.entries(err.response.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
              .join(" | ")
          : null) ||
        "Could not save the listing. Please check the fields and try again.";
      toast({ description: errMsg, variant: "destructive" });
      setBusy(false);
    }
  };

  const field = (key, label, type = "text", extra = {}) => (
    <div>
      <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        disabled={locked}
        className="w-full bg-transparent border-b border-border pb-2 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
        {...extra}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="pt-32 pb-24 px-[4%]">
        <div className="max-w-3xl mx-auto h-10 bg-secondary animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={id ? "Edit Business" : "Add Business"}
        title={id ? "Refine your" : "Present your"}
        titleAccent={id ? "listing" : "business"}
        subtitle="Provide complete, structured information to give serious buyers the confidence to connect."
      />

      {locked && (
        <section className="px-[4%] md:px-[2%] pt-8">
          <div className="max-w-3xl mx-auto bg-secondary/60 border border-border p-4 rounded-sm">
            <p className="font-body text-xs text-muted-foreground">
              This listing is currently <span className="font-medium text-foreground">locked</span> because it is pending review or approved. To request changes, contact an administrator.
            </p>
          </div>
        </section>
      )}

      {/* Rejection / Changes-Required Banner */}
      {(listingStatus === "rejected" || listingStatus === "changes_required") && (
        <section className="px-[4%] md:px-[2%] pt-8">
          <div className="max-w-3xl mx-auto border border-destructive/40 bg-destructive/5 p-6 rounded-sm">
            <p className="font-body text-sm text-destructive font-medium">
              {listingStatus === "changes_required" ? "Changes Required" : "Listing Rejected"}
            </p>
            {rejectionReason && (
              <p className="font-body text-xs text-muted-foreground mt-1">Reason: {rejectionReason}</p>
            )}
            {rejectionFeedback && (
              <p className="font-body text-xs text-muted-foreground mt-2">{rejectionFeedback}</p>
            )}
            <p className="font-body text-xs text-muted-foreground/70 mt-3">
              Please edit the listing and resubmit it for approval once you have addressed the feedback.
            </p>
          </div>
        </section>
      )}

      <section className="px-[4%] md:px-[2%] py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-12">
            {/* 1. Identity */}
            <div className="border border-border p-8 md:p-10">
              <p className="font-body text-xs tracking-label uppercase text-accent mb-8">1. Business Identity</p>
              <div className="space-y-6">
                {field("name", "Business Name", "text", { placeholder: "e.g. Sharma Textiles" })}
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={set("category")}
                    disabled={locked}
                    className="w-full bg-transparent border-b border-border pb-2 font-body text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer disabled:opacity-50"
                  >
                    <option value="" className="bg-background text-foreground">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} className="bg-background text-foreground">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {field("short_description", "One-line summary", "text", {
                  placeholder: "A 25-year-old family textile mill with established distributor network in North India.",
                })}
              </div>
            </div>

            {/* 2. Location */}
            <div className="border border-border p-8 md:p-10">
              <p className="font-body text-xs tracking-label uppercase text-accent mb-8">2. Location</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {field("city", "City", "text", { placeholder: "e.g. Surat" })}
                {field("state", "State", "text", { placeholder: "e.g. Gujarat" })}
                <div className="sm:col-span-2">
                  {field("location", "Area / Landmark (Optional)", "text", {
                    placeholder: "e.g. Ring Road Industrial Estate",
                  })}
                </div>
              </div>
            </div>

            {/* 3. Numbers & History */}
            <div className="border border-border p-8 md:p-10">
              <p className="font-body text-xs tracking-label uppercase text-accent mb-8">3. Numbers &amp; History</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {field("asking_price", "Asking Price (₹)", "number", { placeholder: "e.g. 5000000" })}
                {field("annual_revenue", "Annual Revenue (₹)", "number", { placeholder: "e.g. 12000000" })}
                {field("annual_profit", "Annual Profit (₹)", "number", { placeholder: "e.g. 2400000" })}
                {field("employees", "Total Employees", "number", { placeholder: "e.g. 18" })}
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                    Years in operation
                  </label>
                  <select
                    value={form.years_in_operation}
                    onChange={set("years_in_operation")}
                    disabled={locked}
                    className="w-full bg-transparent border-b border-border pb-2 font-body text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer disabled:opacity-50"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y} className="bg-background text-foreground">
                        {y ? `${y} years` : "Select…"}
                      </option>
                    ))}
                  </select>
                </div>
                {field("established_year", "Established Year", "number", { placeholder: "e.g. 1999" })}
              </div>
            </div>

            {/* 4. Story & Highlights */}
            <div className="border border-border p-8 md:p-10">
              <p className="font-body text-xs tracking-label uppercase text-accent mb-8">4. Story &amp; Details</p>
              <div className="space-y-6">
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                    Detailed Story &amp; Description
                  </label>
                  <textarea
                    rows={6}
                    value={form.description}
                    onChange={set("description")}
                    disabled={locked}
                    placeholder="Describe the journey, customer base, equipment, supply chain, team and legacy…"
                    className="w-full bg-transparent border border-border p-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors disabled:opacity-50 rounded-sm"
                  />
                </div>
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                    Reason for selling
                  </label>
                  <textarea
                    rows={3}
                    value={form.reason_for_selling}
                    onChange={set("reason_for_selling")}
                    disabled={locked}
                    placeholder="e.g. Founder retirement, relocation, pursuing new venture…"
                    className="w-full bg-transparent border border-border p-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors disabled:opacity-50 rounded-sm"
                  />
                </div>
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                    Key Highlights (one per line)
                  </label>
                  <textarea
                    rows={4}
                    value={form.highlights}
                    onChange={set("highlights")}
                    disabled={locked}
                    placeholder="Prime commercial location&#10;Zero outstanding debt&#10;Exclusive regional distribution license"
                    className="w-full bg-transparent border border-border p-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors disabled:opacity-50 rounded-sm"
                  />
                </div>
              </div>
            </div>

            {/* 5. Business Handover & Transition Support */}
            <div className="border border-border p-8 md:p-10">
              <p className="font-body text-xs tracking-label uppercase text-accent mb-2">5. Business Handover &amp; Transition Support</p>
              <p className="font-body text-xs text-muted-foreground mb-8">Let buyers know what kind of transition assistance you will provide after the sale.</p>
              <div className="space-y-6">
                {/* Training */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.training_provided}
                      onChange={(e) => setForm({ ...form, training_provided: e.target.checked })}
                      disabled={locked}
                      className="w-4 h-4 accent-[#8a6a3f]"
                    />
                    <span className="font-body text-sm text-foreground">Will you provide training to the new owner?</span>
                  </label>
                </div>

                {form.training_provided && (
                  <div>
                    <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                      Training Duration
                    </label>
                    <select
                      value={form.training_duration}
                      onChange={set("training_duration")}
                      disabled={locked}
                      className="w-full bg-transparent border-b border-border pb-2 font-body text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer disabled:opacity-50"
                    >
                      <option value="7_days" className="bg-background">7 days</option>
                      <option value="15_days" className="bg-background">15 days</option>
                      <option value="30_days" className="bg-background">30 days</option>
                      <option value="60_days" className="bg-background">60 days</option>
                      <option value="custom" className="bg-background">Custom duration</option>
                    </select>
                  </div>
                )}

                {form.training_provided && form.training_duration === "custom" && (
                  <div>
                    <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                      Specify Custom Training Duration
                    </label>
                    <input
                      type="text"
                      value={form.training_duration_custom}
                      onChange={set("training_duration_custom")}
                      disabled={locked}
                      placeholder="e.g. 90 days, 3 months"
                      className="w-full bg-transparent border-b border-border pb-2 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                    />
                  </div>
                )}

                {/* Employee Continuity */}
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                    Will existing employees continue under new ownership?
                  </label>
                  <select
                    value={form.employee_continuity}
                    onChange={set("employee_continuity")}
                    disabled={locked}
                    className="w-full bg-transparent border-b border-border pb-2 font-body text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer disabled:opacity-50"
                  >
                    <option value="yes" className="bg-background">Yes</option>
                    <option value="no" className="bg-background">No</option>
                    <option value="open_for_discussion" className="bg-background">Open for discussion</option>
                  </select>
                </div>

                {/* Customer Introductions */}
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                    Will you introduce the new owner to existing customers &amp; suppliers?
                  </label>
                  <select
                    value={form.customer_introductions}
                    onChange={set("customer_introductions")}
                    disabled={locked}
                    className="w-full bg-transparent border-b border-border pb-2 font-body text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer disabled:opacity-50"
                  >
                    <option value="yes" className="bg-background">Yes</option>
                    <option value="no" className="bg-background">No</option>
                    <option value="limited" className="bg-background">Limited support</option>
                  </select>
                </div>

                {/* Transition Details */}
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                    Additional Transition Support Details <span className="normal-case">(Optional)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={form.transition_support_details}
                    onChange={set("transition_support_details")}
                    disabled={locked}
                    placeholder="Describe your handover plan, timeline, what's included in the training, key contacts you will introduce, etc."
                    className="w-full bg-transparent border border-border p-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors disabled:opacity-50 rounded-sm"
                  />
                </div>
              </div>
            </div>

            {/* 6. Business Photographs */}
            <div className="border border-border p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="font-body text-xs tracking-label uppercase text-accent">6. Business Photographs</p>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    Upload photos of your storefront, facility, operations, or products. The first photo automatically becomes your cover image.
                  </p>
                </div>
              </div>

              {!locked && (
                <>
                  {/* Hidden file input controlled via ref */}
                  <input
                    ref={fileInputRef}
                    id="business-photographs-upload"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleInputChange}
                    disabled={uploading}
                    className="hidden"
                  />

                  {/* Dropzone & Action Button */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={openFilePicker}
                    className={`border-2 border-dashed p-8 md:p-12 text-center rounded-sm cursor-pointer transition-all ${
                      isDragging
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/70 hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      {uploading ? (
                        <>
                          <Loader2 size={32} strokeWidth={1.5} className="text-accent animate-spin" />
                          <p className="font-body text-sm text-foreground font-medium">{uploadProgress}</p>
                          <p className="font-body text-xs text-muted-foreground">Uploading directly to server storage…</p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-accent">
                            <Upload size={22} strokeWidth={1.5} />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openFilePicker();
                              }}
                              className="font-body text-xs tracking-label uppercase px-6 py-2.5 rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-colors cursor-pointer inline-flex items-center gap-2"
                            >
                              <ImagePlus size={14} /> Add Images
                            </button>
                            <p className="font-body text-xs text-muted-foreground mt-3">
                              or drag and drop files here (JPG, JPEG, PNG, WEBP · up to 10 MB each)
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Uploaded Images Gallery */}
              {images.length > 0 ? (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-body text-xs tracking-label uppercase text-muted-foreground">
                      {images.length} Image{images.length > 1 ? "s" : ""} Added
                    </span>
                    <span className="font-body text-[11px] text-muted-foreground">
                      Hover image to set as cover or remove
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className={`relative aspect-[4/3] bg-secondary border overflow-hidden rounded-sm group transition-all ${
                          i === 0 ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-accent/60"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Business photo ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // If relative path fails, try fallback
                            if (!img.startsWith("http") && !img.startsWith("/")) {
                              e.currentTarget.src = `/media/${img}`;
                            }
                          }}
                        />

                        {/* Badges & Actions Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                          {/* Top row: remove button */}
                          <div className="flex justify-end">
                            {!locked && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(i);
                                }}
                                title="Remove photo"
                                aria-label="Remove photo"
                                className="p-1.5 rounded-full bg-black/70 text-white hover:bg-destructive transition-colors cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          {/* Bottom row: Set as cover button (if not already cover) */}
                          {!locked && i > 0 && (
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  makeCover(i);
                                }}
                                className="font-body text-[10px] tracking-label uppercase px-3 py-1 rounded-full bg-white/90 text-black hover:bg-white transition-colors cursor-pointer inline-flex items-center gap-1 shadow-sm"
                              >
                                <Star size={11} fill="currentColor" /> Set as Cover
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Always visible cover badge on the first image */}
                        {i === 0 && (
                          <div className="absolute bottom-2 left-2 pointer-events-none">
                            <span className="bg-accent text-accent-foreground font-body text-[10px] tracking-label uppercase px-2.5 py-1 rounded-full font-medium shadow-md flex items-center gap-1">
                              <Star size={10} fill="currentColor" /> Cover Photo
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-center py-4 border border-border/50 rounded-sm">
                  <p className="font-body text-xs text-muted-foreground">
                    No photographs attached yet. A listing with clear photographs receives up to 4x more buyer interest.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            {!locked && (
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => save("pending")}
                  disabled={busy || uploading}
                  className="w-full sm:w-auto text-xs px-10 py-4 font-body tracking-widest uppercase rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-all duration-500 disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send size={13} /> Submit for Approval
                </button>
                <button
                  type="button"
                  onClick={() => save("draft")}
                  disabled={busy || uploading}
                  className="ghost-btn text-xs w-full sm:w-auto cursor-pointer"
                >
                  <Save size={13} className="mr-2 inline" /> Save as Draft
                </button>
                {(listingStatus === "rejected" || listingStatus === "changes_required") && id && (
                  <button
                    type="button"
                    onClick={resubmit}
                    disabled={busy}
                    className="w-full sm:w-auto text-xs px-8 py-4 font-body tracking-widest uppercase rounded-full border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-500 disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw size={13} /> Resubmit for Approval
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
