import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TuitionRequest, Message as MessageType } from "@/types/database";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, Check, CheckCheck, X, ArrowLeft, Reply, Smile, Search, Video } from "lucide-react";
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

interface EnrichedRequest extends TuitionRequest {
  other_name?: string;
  other_avatar?: string;
  last_message?: string;
  unread_count?: number;
}

const Messages = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EnrichedRequest | null>(null);
  const [messages, setMessages] = useState<EnrichedMessage[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<EnrichedMessage | null>(null);
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
              .select("full_name, avatar_url")
              .eq("user_id", otherId)
              .single();

            // Get last message
            const { data: lastMsg } = await supabase
              .from("messages")
              .select("content")
              .eq("request_id", req.id)
              .order("created_at", { ascending: false })
              .limit(1);

            return {
              ...req,
              other_name: profile?.full_name || "Anonymous",
              other_avatar: profile?.avatar_url || undefined,
              last_message: lastMsg?.[0]?.content || req.message || "No messages yet",
            } as EnrichedRequest;
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
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `request_id=eq.${selectedRequest.id}`,
      }, (payload) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === (payload.new as any).id ? { ...m, ...(payload.new as any) } : m))
        );
      })
      .subscribe();

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
  }, [selectedRequest?.id]);

  // Scroll to bottom + mark unread messages as read
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    if (!user || !selectedRequest || selectedRequest.status !== "accepted") return;
    const unreadIds = messages
      .filter((m) => m.sender_id !== user.id && !m.is_read)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      supabase
        .from("messages")
        .update({ is_read: true } as any)
        .in("id", unreadIds)
        .then();
    }
  }, [messages, user?.id, selectedRequest?.id]);

  // Typing indicator via Realtime Presence
  useEffect(() => {
    if (!selectedRequest || !user || selectedRequest.status !== "accepted") {
      setOtherTyping(false);
      return;
    }

    const channel = supabase.channel(`typing-${selectedRequest.id}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const otherId = role === "tutor" ? selectedRequest.student_id : selectedRequest.tutor_id;
        const otherPresence = state[otherId];
        const isTyping = otherPresence?.some((p: any) => p.is_typing === true) ?? false;
        setOtherTyping(isTyping);
      })
      .subscribe();

    presenceChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [selectedRequest?.id, selectedRequest?.status, user?.id, role]);

  const broadcastTyping = (isTyping: boolean) => {
    presenceChannelRef.current?.track({ is_typing: isTyping });
  };

  const handleTyping = () => {
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 2000);
  };

  // Focus input when chat opens
  useEffect(() => {
    if (selectedRequest?.status === "accepted") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedRequest]);

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
      broadcastTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      inputRef.current?.focus();
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
      if (selectedRequest?.id === req.id) setSelectedRequest({ ...selectedRequest, status: "accepted" } as EnrichedRequest);
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

  const selectConversation = (req: EnrichedRequest) => {
    setSelectedRequest(req);
    setShowMobileChat(true);
    setReplyTo(null);
    setShowEmojiFor(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
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
      case "accepted": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "pending": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "rejected": return "bg-red-500/10 text-red-600 border-red-500/20";
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

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const filteredRequests = requests.filter((req) =>
    !searchQuery || (req.other_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (days === 1) return "Yesterday";
    if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <div className="mx-auto h-[calc(100vh-4rem)] max-w-6xl">
          <div className="grid h-full lg:grid-cols-[340px_1fr]">

            {/* ─── Sidebar ─── */}
            <div className={`flex flex-col border-r border-border bg-card ${showMobileChat ? "hidden lg:flex" : "flex"}`}>
              {/* Sidebar header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h1 className="text-xl font-bold text-foreground">Chats</h1>
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Search */}
              <div className="px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full bg-secondary py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Conversations list */}
              <ScrollArea className="flex-1">
                {filteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <MessageCircle className="mb-3 h-10 w-10 opacity-40" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  filteredRequests.map((req) => (
                    <button
                      key={req.id}
                      onClick={() => selectConversation(req)}
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-secondary/60 ${
                        selectedRequest?.id === req.id ? "bg-secondary" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {req.other_avatar ? (
                          <img src={req.other_avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-sm font-semibold text-primary-foreground">
                            {getInitials(req.other_name || "A")}
                          </div>
                        )}
                        {req.status === "accepted" && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-green-500" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground truncate">{req.other_name}</span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                            {formatTime(req.updated_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="truncate text-xs text-muted-foreground">{req.last_message}</p>
                          <Badge variant="outline" className={`ml-2 flex-shrink-0 text-[9px] px-1.5 py-0 ${statusColor(req.status)}`}>
                            {req.status}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </div>

            {/* ─── Chat Area ─── */}
            <div className={`flex flex-col bg-background ${!showMobileChat ? "hidden lg:flex" : "flex"}`}>
              {selectedRequest ? (
                <>
                  {/* Chat header */}
                  <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
                    <button
                      onClick={() => setShowMobileChat(false)}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-secondary lg:hidden"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    {selectedRequest.other_avatar ? (
                      <img src={selectedRequest.other_avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-semibold text-primary-foreground">
                        {getInitials(selectedRequest.other_name || "A")}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground">
                        {selectedRequest.other_name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedRequest.subject} • {selectedRequest.class_level}
                      </p>
                    </div>
                    {role === "tutor" && selectedRequest.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAcceptRequest(selectedRequest)} className="gap-1 bg-green-600 hover:bg-green-700 text-xs h-8">
                          <Check className="h-3.5 w-3.5" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRejectRequest(selectedRequest)} className="gap-1 text-destructive text-xs h-8">
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    )}
                    {role === "student" && selectedRequest.status === "accepted" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8 border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        onClick={async () => {
                          // Check if already requested
                          const { data: existing } = await supabase
                            .from("demo_video_views")
                            .select("id")
                            .eq("tutor_id", selectedRequest.tutor_id)
                            .eq("student_id", user.id)
                            .maybeSingle();

                          if (!existing) {
                            // Create demo request record
                            await supabase.from("demo_video_views").insert({
                              tutor_id: selectedRequest.tutor_id,
                              student_id: user.id,
                            } as any);

                            // Get student name for notification
                            const { data: profile } = await supabase
                              .from("profiles")
                              .select("full_name")
                              .eq("user_id", user.id)
                              .single();
                            const studentName = profile?.full_name || "A student";

                            // Notify tutor
                            await supabase.from("notifications").insert({
                              user_id: selectedRequest.tutor_id,
                              title: "Demo Class Requested",
                              message: `${studentName} requested to watch your demo class`,
                              type: "demo_request",
                              metadata: { student_id: user.id, student_name: studentName },
                            } as any);
                          }

                          toast.success("Demo request sent! Go to your Dashboard to watch the video.", {
                            duration: 6000,
                            action: {
                              label: "Go to Dashboard",
                              onClick: () => { window.location.href = "/dashboard"; },
                            },
                          });
                        }}
                      >
                        <Video className="h-3.5 w-3.5" /> Request Demo
                      </Button>
                    )}
                  </div>

                  {/* Messages area */}
                  <ScrollArea className="flex-1 px-4 py-3">
                    {selectedRequest.status !== "accepted" ? (
                      <div className="flex h-full flex-col items-center justify-center py-20 text-muted-foreground">
                        <div className="mb-4 rounded-full bg-secondary p-4">
                          <MessageCircle className="h-8 w-8 opacity-50" />
                        </div>
                        <p className="text-sm">
                          {selectedRequest.status === "pending"
                            ? "Waiting for acceptance to start chatting..."
                            : "This conversation has been " + selectedRequest.status}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {messages.map((msg) => {
                          const isMine = msg.sender_id === user.id;
                          const replyMsg = getReplyMessage(msg.reply_to_id);
                          const msgReactions = getReactionsForMessage(msg.id);

                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15 }}
                              className={`group/msg flex ${isMine ? "justify-end" : "justify-start"}`}
                            >
                              <div className="relative max-w-[70%]">
                                {/* Reply preview */}
                                {replyMsg && (
                                  <div className={`mb-0.5 rounded-xl px-3 py-1.5 text-[11px] ${
                                    isMine
                                      ? "bg-primary/15 text-foreground/70 rounded-br-sm"
                                      : "bg-secondary text-muted-foreground rounded-bl-sm"
                                  }`}>
                                    <span className="font-semibold text-[10px]">
                                      {replyMsg.sender_id === user.id ? "You" : selectedRequest.other_name}
                                    </span>
                                    <p className="truncate">{replyMsg.content}</p>
                                  </div>
                                )}

                                {/* Bubble */}
                                <div className={`rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed ${
                                  isMine
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-secondary text-foreground rounded-bl-md"
                                }`}>
                                  {msg.content}
                                  <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${isMine ? "text-primary-foreground/50" : "text-muted-foreground/70"}`}>
                                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                    {isMine && (
                                      msg.is_read
                                        ? <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                                        : <Check className="h-3.5 w-3.5" />
                                    )}
                                  </div>
                                </div>

                                {/* Reactions */}
                                {msgReactions.length > 0 && (
                                  <div className={`mt-0.5 flex flex-wrap gap-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                                    {msgReactions.map((r) => (
                                      <button
                                        key={r.emoji}
                                        onClick={() => handleReact(msg.id, r.emoji)}
                                        className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] transition-colors ${
                                          r.hasOwn ? "border-primary/40 bg-primary/10" : "border-border bg-card"
                                        }`}
                                      >
                                        {r.emoji} {r.count > 1 && <span>{r.count}</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Hover actions */}
                                <div className={`absolute top-1 hidden group-hover/msg:flex gap-0.5 ${
                                  isMine ? "-left-14" : "-right-14"
                                }`}>
                                  <button
                                    onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                                    className="rounded-full bg-card p-1.5 shadow-sm border border-border hover:bg-secondary transition-colors"
                                  >
                                    <Reply className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                  <button
                                    onClick={() => setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id)}
                                    className="rounded-full bg-card p-1.5 shadow-sm border border-border hover:bg-secondary transition-colors"
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
                                      className={`absolute z-10 flex gap-1 rounded-full border border-border bg-card px-2 py-1 shadow-lg ${
                                        isMine ? "right-0 -top-9" : "left-0 -top-9"
                                      }`}
                                    >
                                      {EMOJI_LIST.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleReact(msg.id, emoji)}
                                          className="text-base transition-transform hover:scale-125"
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
                        {/* Typing indicator */}
                        <AnimatePresence>
                          {otherTyping && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              className="flex justify-start"
                            >
                              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-secondary px-4 py-2.5">
                                <div className="flex gap-1">
                                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Input area */}
                  {selectedRequest.status === "accepted" && (
                    <div className="border-t border-border bg-card">
                      <AnimatePresence>
                        {replyTo && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 border-l-2 border-primary">
                              <Reply className="h-3.5 w-3.5 text-primary" />
                              <div className="flex-1 truncate text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {replyTo.sender_id === user.id ? "You" : selectedRequest.other_name}
                                </span>
                                <p className="truncate">{replyTo.content}</p>
                              </div>
                              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground p-0.5">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="flex items-center gap-2 px-3 py-2.5"
                      >
                        <input
                          ref={inputRef}
                          type="text"
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
                          }}
                          className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                        />
                        <Button
                          type="submit"
                          disabled={sending || !newMessage.trim()}
                          size="icon"
                          className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 flex-shrink-0"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                      <p className="px-4 pb-2 text-[9px] text-muted-foreground/60">
                        ⚠️ Sharing phone numbers or contact info is not allowed.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                  <div className="mb-4 rounded-full bg-secondary p-6">
                    <MessageCircle className="h-12 w-12 opacity-40" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Your Messages</h3>
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
