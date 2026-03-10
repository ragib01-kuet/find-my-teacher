import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FileText, PenTool, ExternalLink, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface ContractData {
  id: string;
  deal_id: string;
  contract_text: string;
  subject: string | null;
  student_id: string;
  tutor_id: string;
  created_at: string;
}

interface SignatureData {
  id: string;
  contract_id: string;
  user_id: string;
  role: string;
  signature_data: string;
  signed_at: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractData | null;
  classroomCode: string | null;
}

type StoredSignature =
  | { type: "drawn"; dataUrl: string; signedBy: string | null; signedAt: string }
  | { type: "text"; text: string; signedBy: string | null; signedAt: string };

function safeParseSignature(signature_data: string): StoredSignature | null {
  const trimmed = (signature_data || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as any;
      if (parsed?.type === "drawn" && typeof parsed?.dataUrl === "string") return parsed as StoredSignature;
      if (parsed?.type === "text" && typeof parsed?.text === "string") return parsed as StoredSignature;
    } catch {
      // fall through
    }
  }
  if (trimmed.startsWith("data:image/")) {
    return { type: "drawn", dataUrl: trimmed, signedBy: null, signedAt: new Date(0).toISOString() };
  }
  return { type: "text", text: trimmed, signedBy: null, signedAt: new Date(0).toISOString() };
}

const ContractModal = ({ open, onOpenChange, contract, classroomCode }: Props) => {
  const { user, role } = useAuth();
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [signing, setSigning] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    if (!contract || !open) return;

    const fetchSignatures = async () => {
      const { data } = await supabase
        .from("contract_signatures")
        .select("*")
        .eq("contract_id", contract.id);
      if (data) setSignatures(data as SignatureData[]);
    };
    fetchSignatures();

    // Realtime subscription for signatures
    const channel = supabase
      .channel(`contract-sigs-${contract.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "contract_signatures",
        filter: `contract_id=eq.${contract.id}`,
      }, (payload) => {
        setSignatures((prev) => [...prev, payload.new as SignatureData]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contract?.id, open]);

  if (!contract || !user) return null;

  const studentSigned = signatures.some(s => s.user_id === contract.student_id);
  const tutorSigned = signatures.some(s => s.user_id === contract.tutor_id);
  const bothSigned = studentSigned && tutorSigned;
  const iAmStudent = user.id === contract.student_id;
  const iAmTutor = user.id === contract.tutor_id;
  const iHaveSigned = signatures.some(s => s.user_id === user.id);

  const myExistingSig = useMemo(() => {
    const mine = signatures.find(s => s.user_id === user.id);
    return mine ? safeParseSignature(mine.signature_data) : null;
  }, [signatures, user.id]);

  const resizeCanvasToContainer = () => {
    const canvas = canvasRef.current;
    const wrap = canvasWrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = 160;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    // Preserve existing drawing by snapshotting before resize
    const prev = document.createElement("canvas");
    prev.width = canvas.width;
    prev.height = canvas.height;
    const prevCtx = prev.getContext("2d");
    if (prevCtx && canvas.width && canvas.height) prevCtx.drawImage(canvas, 0, 0);

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.2;

    // redraw previous snapshot scaled to new canvas (CSS pixels space)
    if (prev.width && prev.height) {
      ctx.drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, cssW, cssH);
    }
  };

  useEffect(() => {
    if (!open) return;
    resizeCanvasToContainer();
    const ro = new ResizeObserver(() => resizeCanvasToContainer());
    if (canvasWrapRef.current) ro.observe(canvasWrapRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const getPoint = (e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (iHaveSigned) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPoint(e.nativeEvent);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || iHaveSigned) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const p = getPoint(e.nativeEvent);
    const last = lastPointRef.current;
    if (!p || !last) return;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
    if (!hasInk) setHasInk(true);
  };

  const endStroke = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const exportSignatureDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    // Export at native resolution; PNG preserves transparency
    return canvas.toDataURL("image/png");
  };

  const handleSign = async () => {
    if (iHaveSigned) return;
    const dataUrl = exportSignatureDataUrl();
    if (!dataUrl || !hasInk) {
      toast.error("Please draw your signature before signing.");
      return;
    }
    setSigning(true);
    const sigRole = iAmStudent ? "student" : iAmTutor ? "tutor" : role || "unknown";
    const signedAt = new Date().toISOString();
    const payload: StoredSignature = {
      type: "drawn",
      dataUrl,
      signedBy: user.email ?? null,
      signedAt,
    };
    const { error } = await supabase.from("contract_signatures").insert({
      contract_id: contract.id,
      user_id: user.id,
      role: sigRole,
      signature_data: JSON.stringify(payload),
    } as any);
    setSigning(false);
    if (error) {
      toast.error(error.message || "Failed to sign contract");
    } else {
      toast.success("Contract signed successfully!");
    }
  };

  const handleCopyCode = () => {
    if (classroomCode) {
      navigator.clipboard.writeText(classroomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Room code copied!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Tutoring Agreement
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[65vh]">
          <div className="space-y-4 p-1">
            {/* Contract text */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap font-mono break-words [overflow-wrap:anywhere] max-w-full">
              {contract.contract_text}
            </div>

            {/* Signature status */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Signatures</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className={`rounded-xl border-2 p-3 ${studentSigned ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-dashed border-border"}`}>
                  <p className="text-xs font-medium text-muted-foreground">Student</p>
                  {studentSigned ? (
                    <div className="mt-1 flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Signed</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground italic">Awaiting signature...</p>
                  )}
                </div>
                <div className={`rounded-xl border-2 p-3 ${tutorSigned ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-dashed border-border"}`}>
                  <p className="text-xs font-medium text-muted-foreground">Tutor</p>
                  {tutorSigned ? (
                    <div className="mt-1 flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Signed</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground italic">Awaiting signature...</p>
                  )}
                </div>
              </div>

              {/* Signature pad */}
              {(iAmStudent || iAmTutor) && !iHaveSigned && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">Draw your signature</p>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={clearSignature} disabled={signing}>
                      Clear
                    </Button>
                  </div>
                  <div
                    ref={canvasWrapRef}
                    className="rounded-lg border border-border bg-white overflow-hidden"
                  >
                    <canvas
                      ref={canvasRef}
                      className="block w-full h-[160px] touch-none"
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={endStroke}
                      onPointerCancel={endStroke}
                      onPointerLeave={endStroke}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tip: use your finger on mobile. Make sure to draw inside the box.
                  </p>
                </div>
              )}

              {/* Existing signature preview */}
              {myExistingSig?.type === "drawn" && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">Your signature</p>
                  <img
                    src={myExistingSig.dataUrl}
                    alt="Your signature"
                    className="w-full max-h-40 object-contain rounded-lg bg-white border border-border"
                  />
                </div>
              )}

              {/* Sign button */}
              {(iAmStudent || iAmTutor) && !iHaveSigned && (
                <Button onClick={handleSign} disabled={signing} className="w-full gap-2">
                  <PenTool className="h-4 w-4" />
                  {signing ? "Signing..." : "Sign Contract"}
                </Button>
              )}

              {iHaveSigned && !bothSigned && (
                <p className="text-center text-sm text-muted-foreground">
                  ✅ You've signed. Waiting for the other party...
                </p>
              )}

              {/* Classroom code - only after both sign */}
              {bothSigned && classroomCode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border-2 border-primary bg-primary/5 p-4 text-center space-y-3"
                >
                  <p className="text-sm font-semibold text-foreground">Contract Fully Signed!</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-muted-foreground">Room Code:</span>
                    <code className="rounded-lg bg-primary/10 px-3 py-1.5 font-mono text-lg font-bold text-primary break-all max-w-[60vw] sm:max-w-none">
                      {classroomCode}
                    </code>
                    <button onClick={handleCopyCode} className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <a
                    href="https://noescape-rw.netlify.app/landing"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="gap-2 w-full">
                      <ExternalLink className="h-4 w-4" /> Open Classroom
                    </Button>
                  </a>
                </motion.div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ContractModal;
