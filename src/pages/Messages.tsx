import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TuitionRequest, Message as MessageType } from "@/types/database";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, Check, X, ArrowLeft, Reply, Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface EnrichedMessage extends MessageType {
  reactions?: MessageReaction[];
  reply_to?: MessageType | null;
}

const Messages = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<(TuitionRequest & { other_name?: string })[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<TuitionRequest | null>(null);
  const [messages, setMessages] = useState<EnrichedMessage[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<EnrichedMessage | null>(null);
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch requests
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

  // Fetch messages & reactions for selected request
  useEffect(() => {
    if (!selectedRequest) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("request_id", selectedRequest.id)
        .order("created_at", { ascending: true });
      if (data) {
        setMessages(data as EnrichedMessage[]);
        // Fetch reactions for all messages
        const msgIds = data.map((m: any) => m.id);
        if (msgIds.length > 0) {
          const { data: rxns } = await supabase
            .from("message_reactions")
            .select("*")
            .in("message_id", msgIds);
          if (rxns) setReactions(rxns as MessageReaction[]);
        }
      }
    };
    fetchMessages();

    // Real-time messages
    const msgChannel = supabase
      .channel(`messages-${selectedRequest.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `request_id=eq.${selectedRequest.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as EnrichedMessage]);
      })
      .subscribe();

    // Real-time reactions
    const rxnChannel = supabase
      .channel(`reactions-${selectedRequest.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "message_reactions",
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setReactions((prev) => [...prev, payload.new as MessageReaction]);
        } else if (payload.eventType === "DELETE") {
          setReactions((prev) => prev.filter((r) => r.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(rxnChannel);
    };
  }, [selectedRequest]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedRequest || !user) return;

    const contactPattern = /(\+?\d{10,}|01\d{9}|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.\w{2,}\b)/;
    if (contactPattern.test(newMessage)) {
      toast.error("Sharing contact information is not allowed in chat.");
      return;
    }

    setSending(true);
    const insertData: any = {
      request_id: selectedRequest.id,
      sender_id: user.id,
      content: newMessage.trim(),
    };
    if (replyTo) {
      insertData.reply_to_id = replyTo.id;
    }

    const { error } = await supabase.from("messages").insert(insertData);
    setSending(false);

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
      setReplyTo(null);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find(
      (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji
    );
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      } as any);
    }
    setShowEmojiFor(null);
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
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: "accepted" } : r)));
      if (selectedRequest?.id === req.id) setSelectedRequest({ ...req, status: "accepted" });
    }
  };

  const handleRejectRequest = async (req: TuitionRequest) => {
    const { error } = await supabase
      .from("tuition_requests")
      .update({ status: "rejected" } as any)
      .eq("id", req.id);
    if (!error) {
      toast.success("Request rejected");
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: "rejected" } : r)));
    }
  };

  const selectConversation = (req: TuitionRequest) => {
    setSelectedRequest(req);
    setShowMobileChat(true);
    setReplyTo(null);
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

  const getReactionsForMessage = (msgId: string) => {
    const msgReactions = reactions.filter((r) => r.message_id === msgId);
    const grouped: Record<string, { emoji: string; count: number; hasOwn: boolean }> = {};
    msgReactions.forEach((r) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, hasOwn: false };
      grouped[r.emoji].count++;
      if (r.user_id === user?.id) grouped[r.emoji].hasOwn = true;
    });
    return Object.values(grouped);
  };

  const getReplyMessage = (replyToId: string | null | undefined) => {
    if (!replyToId) return null;
    return messages.find((m) => m.id === replyToId) || null;
  };

  // Chat area component
  const ChatArea = () => (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {selectedRequest ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMobileChat(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary lg:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground sm:text-base">
                  {(selectedRequest as any).other_name}
                </h3>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  {selectedRequest.subject} • {selectedRequest.class_level}
                </p>
              </div>
            </div>
            {role === "tutor" && selectedRequest.status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleAcceptRequest(selectedRequest)} className="gap-1 bg-green-600 text-primary-foreground hover:bg-green-700 text-xs">
                  <Check className="h-3 w-3" /> Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleRejectRequest(selectedRequest)} className="gap-1 text-destructive text-xs">
                  <X className="h-3 w-3" /> Reject
                </Button>
              </div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3 sm:p-4">
            {selectedRequest.status !== "accepted" ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {selectedRequest.status === "pending"
                  ? "Waiting for acceptance to start chatting..."
                  : "This conversation has been " + selectedRequest.status}
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === user.id;
                  const replyMsg = getReplyMessage(msg.reply_to_id);
                  const msgReactions = getReactionsForMessage(msg.id);

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`group/msg flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div className="relative max-w-[80%] sm:max-w-[75%]">
                        {/* Reply preview */}
                        {replyMsg && (
                          <div className={`mb-1 rounded-lg px-3 py-1.5 text-[10px] sm:text-xs border-l-2 ${
                            isMine ? "border-primary-foreground/40 bg-primary/10 text-primary-foreground/70" : "border-muted-foreground/40 bg-secondary/80 text-muted-foreground"
                          }`}>
                            <span className="font-medium">
                              {replyMsg.sender_id === user.id ? "You" : (selectedRequest as any).other_name}
                            </span>
                            <p className="truncate">{replyMsg.content}</p>
                          </div>
                        )}

                        {/* Message bubble */}
                        <div className={`rounded-2xl px-3.5 py-2 text-sm sm:px-4 sm:py-2.5 ${
                          isMine
                            ? "bg-coral-gradient text-primary-foreground rounded-br-md"
                            : "bg-secondary text-foreground rounded-bl-md"
                        }`}>
                          {msg.content}
                          <div className={`mt-0.5 text-[9px] sm:text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>

                        {/* Reactions display */}
                        {msgReactions.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {msgReactions.map((r) => (
                              <button
                                key={r.emoji}
                                onClick={() => handleReact(msg.id, r.emoji)}
                                className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] transition-colors ${
                                  r.hasOwn ? "border-primary/30 bg-primary/10" : "border-border bg-card"
                                }`}
                              >
                                {r.emoji} {r.count > 1 && <span>{r.count}</span>}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Hover actions */}
                        <div className={`absolute top-0 hidden group-hover/msg:flex gap-1 ${
                          isMine ? "-left-16" : "-right-16"
                        }`}>
                          <button
                            onClick={() => setReplyTo(msg)}
                            className="rounded-full bg-card p-1.5 shadow-sm border border-border hover:bg-secondary"
                            title="Reply"
                          >
                            <Reply className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id)}
                            className="rounded-full bg-card p-1.5 shadow-sm border border-border hover:bg-secondary"
                            title="React"
                          >
                            <Smile className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>

                        {/* Emoji picker */}
                        <AnimatePresence>
                          {showEmojiFor === msg.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className={`absolute z-10 flex gap-1 rounded-full border border-border bg-card px-2 py-1.5 shadow-elevated ${
                                isMine ? "right-0 -top-10" : "left-0 -top-10"
                              }`}
                            >
                              {EMOJI_LIST.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(msg.id, emoji)}
                                  className="text-base transition-transform hover:scale-125 sm:text-lg"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Reply indicator + Input */}
          {selectedRequest.status === "accepted" && (
            <div className="border-t border-border">
              {/* Reply indicator */}
              <AnimatePresence>
                {replyTo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2">
                      <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="flex-1 truncate text-xs text-muted-foreground">
                        Replying to: {replyTo.content}
                      </div>
                      <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="p-3 sm:p-4">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="bg-coral-gradient text-primary-foreground"
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <p className="mt-1.5 text-[9px] text-muted-foreground sm:text-[10px]">
                  ⚠️ Sharing phone numbers or contact info is not allowed.
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <MessageCircle className="mb-3 h-10 w-10 sm:h-12 sm:w-12" />
          <p className="text-sm">Select a conversation to start chatting</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <div className="container py-4 px-4 sm:py-6">
          <h1 className="mb-4 font-display text-xl font-bold text-foreground sm:mb-6 sm:text-2xl">
            <MessageCircle className="mr-2 inline h-5 w-5 sm:h-6 sm:w-6" />
            Messages
          </h1>

          <div className="grid h-[calc(100vh-10rem)] gap-4 lg:grid-cols-3">
            {/* Conversations List - hide on mobile when chat is open */}
            <div className={`overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:col-span-1 ${
              showMobileChat ? "hidden lg:block" : ""
            }`}>
              <div className="border-b border-border p-3 sm:p-4">
                <h2 className="font-display text-sm font-semibold text-foreground">Conversations</h2>
              </div>
              <ScrollArea className="h-[calc(100%-3rem)]">
                {requests.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No conversations yet.
                  </div>
                ) : (
                  requests.map((req) => (
                    <button
                      key={req.id}
                      onClick={() => selectConversation(req)}
                      className={`w-full border-b border-border p-3 text-left transition-colors hover:bg-secondary/50 sm:p-4 ${
                        selectedRequest?.id === req.id ? "bg-secondary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{(req as any).other_name}</span>
                        <Badge className={`text-[10px] ${statusColor(req.status)}`}>
                          {req.status}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground sm:text-xs">
                        {req.subject} • {req.class_level}
                      </p>
                    </button>
                  ))
                )}
              </ScrollArea>
            </div>

            {/* Chat Area - show full on mobile when selected */}
            <div className={`lg:col-span-2 ${!showMobileChat ? "hidden lg:block" : ""}`}>
              <ChatArea />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
