import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, FileSignature, Upload, Check, ShoppingBag } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { formatINR, formatDate } from "@/lib/format";
import { NDA_VERSION, buildNdaDocument } from "@/lib/nda";
import EmptyState from "@/components/common/EmptyState";
import { listingService } from "@/services/listingService";
import { requestService } from "@/services/requestService";

export default function BuyRequestForm() {
  const { id } = useParams();
  const { user, isLoadingAuth, navigateToLogin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [existing, setExisting] = useState(null);
  const [checking, setChecking] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [ndaOpen, setNdaOpen] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !user && navigateToLogin) {
      navigateToLogin(`/business/${id}/request`);
    }
  }, [isLoadingAuth, user, navigateToLogin, id]);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      try {
        const [bRes, reqRes] = await Promise.all([
          listingService.getById(id),
          requestService.getAll(),
        ]);
        const b = bRes.data;
        if (!b) {
          setNotFound(true);
          setChecking(false);
          return;
        }
        setBusiness(b);
        const reqs = Array.isArray(reqRes.data) ? reqRes.data : reqRes.data.results || [];
        const dup = reqs.find(
          (r) =>
            String(r.business_id || r.business?.id || r.listing) === String(id) &&
            !["rejected", "cancelled", "withdrawn"].includes(r.status)
        );
        if (dup) setExisting(dup);
      } catch {
        setNotFound(true);
      } finally {
        setChecking(false);
      }
    };
    load();
  }, [id, user]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setEmail(user.email || "");
      setPhone(user.phone || user.phone_number || "");
    }
  }, [user]);

  const onSignatureChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setErrors((prev) => ({ ...prev, signature: "Please upload a PNG, JPG, or WEBP image." }));
      return;
    }
    setSignatureFile(file);
    setErrors((prev) => ({ ...prev, signature: undefined }));
    const reader = new FileReader();
    reader.onload = () => setSignaturePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Valid email is required.";
    if (!phone.trim()) errs.phone = "Phone number is required.";
    if (!purpose.trim()) errs.purpose = "Please state the purpose of your purchase request.";
    if (!ndaAccepted) errs.nda = "You must read and accept the NDA terms.";
    if (!signatureFile) errs.signature = "Please upload an image of your signature.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);

    try {
      let signatureUrl = "";
      if (signatureFile) {
        const sigRes = await requestService.uploadSignature(signatureFile);
        signatureUrl = sigRes.data?.url || sigRes.data?.path || "";
      }

      const ndaDocText = buildNdaDocument({
        buyerName: fullName.trim(),
        buyerEmail: email.trim(),
        sellerName: business.seller_name || business.owner_name || "The Seller",
        businessName: business.name,
        city: business.city,
        acceptedAtIso: new Date().toISOString(),
      });

      await requestService.create({
        business_id: business.id,
        listing_id: business.id,
        request_type: "buy",
        buyer_name: fullName.trim(),
        buyer_email: email.trim(),
        buyer_phone: phone.trim(),
        purpose: purpose.trim(),
        nda_version: NDA_VERSION,
        nda_document: ndaDocText,
        nda_signed: true,
        nda_accepted_at: new Date().toISOString(),
        signature_file: signatureUrl,
      });

      toast({ description: "Request submitted — the seller has been notified." });
      navigate("/requests");
    } catch (err) {
      console.error("Submission error:", err);
      const backendErr = err?.response?.data;
      let msg = "Could not submit your request. Please try again.";
      if (typeof backendErr === "string") {
        msg = backendErr;
      } else if (Array.isArray(backendErr) && backendErr.length > 0) {
        msg = backendErr[0];
      } else if (backendErr && typeof backendErr === "object") {
        if (backendErr.error) msg = backendErr.error;
        else if (backendErr.detail) msg = backendErr.detail;
        else {
          const firstKey = Object.keys(backendErr)[0];
          const val = backendErr[firstKey];
          if (Array.isArray(val) && val.length > 0) msg = `${firstKey}: ${val[0]}`;
          else if (typeof val === "string") msg = val;
        }
      }
      toast({ description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!isLoadingAuth && !user) {
    return (
      <div className="pt-40 pb-24 text-center">
        <p className="font-body text-sm text-muted-foreground">Redirecting you to sign in…</p>
      </div>
    );
  }

  if (checking || !user) {
    return (
      <div className="pt-32 pb-24 px-[4%]">
        <div className="max-w-3xl mx-auto h-96 bg-secondary animate-pulse" />
      </div>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        title="Business not found."
        subtitle="This listing may have been removed or is not yet approved."
        action="Explore Businesses"
        actionTo="/businesses"
        icon={ArrowLeft}
      />
    );
  }

  const appRole = user.app_role || user.role?.toLowerCase();
  if (appRole && appRole !== "buyer" && appRole !== "admin") {
    return (
      <EmptyState
        title="Purchase requests are for buyer accounts."
        subtitle={`You're signed in as a ${appRole}. Switch to a buyer role to send purchase requests.`}
        action="Change Role"
        actionTo="/select-role"
        icon={ShoppingBag}
      />
    );
  }

  if (existing) {
    return (
      <EmptyState
        title="You already have an active request for this business."
        subtitle={`Request status: ${existing.status}. Submitted ${formatDate(existing.created_at || existing.created_date)}.`}
        action="View My Requests"
        actionTo="/requests"
        icon={FileSignature}
      />
    );
  }

  const inputCls = "w-full border border-border bg-background px-4 py-3 rounded-md text-sm focus:outline-none focus:border-accent";
  const labelCls = "block font-body text-xs tracking-label uppercase text-muted-foreground mb-2";
  const errCls = "text-xs text-destructive mt-1";

  return (
    <div className="pt-20 md:pt-24 pb-24 md:pb-32">
      <div className="px-[4%] md:px-[2%]">
        <div className="max-w-3xl mx-auto">
          <Link
            to={`/business/${id}`}
            className="inline-flex items-center gap-2 font-body text-xs tracking-label uppercase text-muted-foreground hover:text-foreground transition-colors mb-10"
          >
            <ArrowLeft size={14} /> Back to business
          </Link>

          <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Purchase request</p>
          <h1 className="font-display text-display-md font-light text-foreground">Request to Buy</h1>

          {/* Business summary */}
          <div className="border border-border mt-10 flex flex-col sm:flex-row overflow-hidden">
            <div className="sm:w-56 h-40 sm:h-auto bg-secondary shrink-0">
              {business.featured_image || business.images?.[0] ? (
                <img src={business.featured_image || business.images[0]} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-display text-5xl text-muted-foreground/30">{business.name?.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="p-6 flex-1">
              <h2 className="font-display text-2xl font-light text-foreground">{business.name}</h2>
              <p className="font-body text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <MapPin size={12} /> {[business.location, business.city, business.state].filter(Boolean).join(", ") || "—"}
              </p>
              <p className="font-body text-sm text-foreground mt-3">
                Asking price: <span className="text-accent">{formatINR(business.asking_price)}</span>
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-12 space-y-8" noValidate>
            {/* Buyer details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="req-name" className={labelCls}>Your full name</label>
                <input id="req-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
                {errors.fullName && <p className={errCls}>{errors.fullName}</p>}
              </div>
              <div>
                <label htmlFor="req-email" className={labelCls}>Email address</label>
                <input id="req-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                {errors.email && <p className={errCls}>{errors.email}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="req-phone" className={labelCls}>Phone number</label>
                <input id="req-phone" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" className={inputCls} />
                {errors.phone && <p className={errCls}>{errors.phone}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="req-business" className={labelCls}>Business</label>
                <input id="req-business" value={business.name} readOnly disabled className={`${inputCls} opacity-70`} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="req-purpose" className={labelCls}>Purpose of the purchase request</label>
                <textarea
                  id="req-purpose"
                  rows={4}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Acquiring an established retail business to continue and grow its operations in my region…"
                  className={`${inputCls} resize-none`}
                />
                {errors.purpose && <p className={errCls}>{errors.purpose}</p>}
              </div>
            </div>

            {/* NDA */}
            <div className="border border-border p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileSignature size={18} strokeWidth={1.25} className="text-accent" />
                  <div>
                    <p className="font-body text-sm text-foreground">Non-Disclosure Acknowledgement</p>
                    <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mt-0.5">Version {NDA_VERSION}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNdaOpen(!ndaOpen)}
                  className="font-body text-xs tracking-label uppercase text-accent hover:underline shrink-0 cursor-pointer"
                >
                  {ndaOpen ? "Hide" : "Read NDA"}
                </button>
              </div>
              {ndaOpen && (
                <pre className="mt-6 border-t border-border pt-6 font-body text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {buildNdaDocument({
                    buyerName: fullName.trim() || "The Buyer",
                    buyerEmail: email.trim(),
                    sellerName: business.owner_name || "The Seller",
                    businessName: business.name,
                    city: business.city,
                    acceptedAtIso: "on submission of this request",
                  })}
                </pre>
              )}
              <label className="flex items-start gap-3 cursor-pointer select-none mt-6">
                <input
                  type="checkbox"
                  checked={ndaAccepted}
                  onChange={(e) => setNdaAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#8a6a3f]"
                />
                <span className="font-body text-xs text-foreground">
                  I confirm I have read and accepted NDA {NDA_VERSION}. The exact accepted version and timestamp will be stored with my request.
                </span>
              </label>
              {errors.nda && <p className={errCls}>{errors.nda}</p>}
            </div>

            {/* Signature */}
            <div>
              <label className={labelCls}>Signature image (PNG / JPG / JPEG / WEBP)</label>
              <div className="border border-dashed border-border p-6 flex items-center gap-6 flex-wrap">
                {signaturePreview ? (
                  <img src={signaturePreview} alt="Signature preview" className="h-16 bg-secondary border border-border px-4 object-contain" />
                ) : (
                  <div className="h-16 w-40 bg-secondary flex items-center justify-center">
                    <span className="font-body text-[10px] tracking-label uppercase text-muted-foreground">Preview</span>
                  </div>
                )}
                <label className="ghost-btn text-xs cursor-pointer inline-flex items-center gap-2">
                  <Upload size={13} /> {signatureFile ? "Replace" : "Upload signature"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onSignatureChange} className="hidden" />
                </label>
                <p className="font-body text-[10px] text-muted-foreground w-full sm:w-auto leading-relaxed">
                  Stored privately. Viewable only by the seller of this business and platform admins — it is a workflow record, not a certified electronic signature.
                </p>
              </div>
              {errors.signature && <p className={errCls}>{errors.signature}</p>}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full text-xs px-8 py-4 font-body tracking-widest uppercase rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {busy ? (
                "Submitting…"
              ) : (
                <>
                  <Check size={14} /> Submit Request
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
