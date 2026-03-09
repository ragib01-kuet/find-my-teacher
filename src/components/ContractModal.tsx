import { useEffect, useState } from "react";
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

const ContractModal = ({ open, onOpenChange, contract, classroomCode }: Props) => {
  const { user, role } = useAuth();
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [signing, setSigning] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleSign = async () => {
    setSigning(true);
    const sigRole = iAmStudent ? "student" : iAmTutor ? "tutor" : role || "unknown";
    const { error } = await supabase.from("contract_signatures").insert({
      contract_id: contract.id,
      user_id: user.id,
      role: sigRole,
      signature_data: `Digitally signed by ${user.email} on ${new Date().toISOString()}`,
    } as any);
    setSigning(false);
    if (error) {
      toast.error("Failed to sign contract");
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
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-foreground whitespace-pre-line font-mono">
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
                  <p className="text-sm font-semibold text-foreground">🎉 Contract Fully Signed!</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-muted-foreground">Room Code:</span>
                    <code className="rounded-lg bg-primary/10 px-3 py-1.5 font-mono text-lg font-bold text-primary">
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
