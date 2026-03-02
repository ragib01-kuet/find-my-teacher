import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TuitionRequest, Message as MessageType } from "@/types/database";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, Check, X, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Link, Navigate } from "react-router-dom";

const Messages = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<(TuitionRequest & { other_name?: string })[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<TuitionRequest | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch requests (conversations)
  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      const col = role === "tutor" ? "tutor_id" : "student_id";
      const { data } = await supabase
        .from("tuition_requests")
        .select("*")
        .eq(col, user.id)
        .order("updated_at", { ascending: false });

      if (data) {
        // Fetch other party names
        const enriched = await Promise.all(
          (data as TuitionRequest[]).map(async (req) => {
            const otherId = role === "tutor" ? req.student_id : req.tutor_id;
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", otherId)
              .single();
            return { ...req, other_name: profile?.full_name || "Anonymous" };
          })
        );
        setRequests(enriched);
      }
    };
    fetchRequests();
  }, [user, role]);

  // Fetch messages for selected request
  useEffect(() => {
    if (!selectedRequest) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("request_id", selectedRequest.id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as MessageType[]);
    };
    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`messages-${selectedRequest.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${selectedRequest.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as MessageType]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRequest]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedRequest || !user) return;

    // Basic contact info detection
    const contactPattern = /(\+?\d{10,}|01\d{9}|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.\w{2,}\b)/;
    if (contactPattern.test(newMessage)) {
      toast.error("Sharing contact information is not allowed in chat. This will be flagged.");
      return;
    }

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      request_id: selectedRequest.id,
      sender_id: user.id,
      content: newMessage.trim(),
    } as any);
    setSending(false);

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
    }
  };

  const handleAcceptRequest = async (req: TuitionRequest) => {
    const { error } = await supabase
      .from("tuition_requests")
      .update({ status: "accepted" } as any)
      .eq("id", req.id);
    if (error) {
      toast.error("Failed to accept");
    } else {
      toast.success("Request accepted! You can now chat.");
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: "accepted" } : r))
      );
      if (selectedRequest?.id === req.id) {
        setSelectedRequest({ ...req, status: "accepted" });
      }
    }
  };

  const handleRejectRequest = async (req: TuitionRequest) => {
    const { error } = await supabase
      .from("tuition_requests")
      .update({ status: "rejected" } as any)
      .eq("id", req.id);
    if (!error) {
      toast.success("Request rejected");
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: "rejected" } : r))
      );
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center pt-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  const statusColor = (s: string) => {
    switch (s) {
      case "accepted": return "bg-green-100 text-green-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "rejected": return "bg-red-100 text-red-700";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <div className="container py-6">
          <h1 className="mb-6 font-display text-2xl font-bold text-foreground">
            <MessageCircle className="mr-2 inline h-6 w-6" />
            Messages
          </h1>

          <div className="grid h-[calc(100vh-12rem)] gap-4 lg:grid-cols-3">
            {/* Conversations List */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:col-span-1">
              <div className="border-b border-border p-4">
                <h2 className="font-display text-sm font-semibold text-foreground">Conversations</h2>
              </div>
              <ScrollArea className="h-[calc(100%-3.5rem)]">
                {requests.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No conversations yet.
                  </div>
                ) : (
                  requests.map((req) => (
                    <button
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className={`w-full border-b border-border p-4 text-left transition-colors hover:bg-secondary/50 ${
                        selectedRequest?.id === req.id ? "bg-secondary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{(req as any).other_name}</span>
                        <Badge className={`text-xs ${statusColor(req.status)}`}>
                          {req.status}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {req.subject} • {req.class_level}
                      </p>
                    </button>
                  ))
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:col-span-2">
              {selectedRequest ? (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <div>
                      <h3 className="font-display font-semibold text-foreground">
                        {(selectedRequest as any).other_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedRequest.subject} • {selectedRequest.class_level}
                      </p>
                    </div>
                    {role === "tutor" && selectedRequest.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(selectedRequest)}
                          className="gap-1 bg-green-600 text-primary-foreground hover:bg-green-700"
                        >
                          <Check className="h-3 w-3" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(selectedRequest)}
                          className="gap-1 text-destructive"
                        >
                          <X className="h-3 w-3" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {selectedRequest.status !== "accepted" ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        {selectedRequest.status === "pending"
                          ? "Waiting for acceptance to start chatting..."
                          : "This conversation has been " + selectedRequest.status}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                                msg.sender_id === user.id
                                  ? "bg-coral-gradient text-primary-foreground"
                                  : "bg-secondary text-foreground"
                              }`}
                            >
                              {msg.content}
                              <div className={`mt-1 text-[10px] ${msg.sender_id === user.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Input */}
                  {selectedRequest.status === "accepted" && (
                    <div className="border-t border-border p-4">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSend();
                        }}
                        className="flex gap-2"
                      >
                        <Input
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="submit"
                          disabled={sending || !newMessage.trim()}
                          className="bg-coral-gradient text-primary-foreground"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        ⚠️ Sharing phone numbers or contact info is not allowed and will be flagged.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                  <MessageCircle className="mb-3 h-12 w-12" />
                  <p className="text-sm">Select a conversation to start chatting</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
