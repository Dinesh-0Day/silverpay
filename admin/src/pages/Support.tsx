import { useEffect, useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { adminApi, getErrorMessage, type SupportConv, type SupportConvDetail } from "../api";
import { PageHeader, Card, Badge, Button, Input, EmptyState, PageError, Alert } from "../components/ui";

export default function Support() {
  const [conversations, setConversations] = useState<SupportConv[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [chat, setChat] = useState<SupportConvDetail | null>(null);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");

  const loadList = () =>
    adminApi
      .supportConversations()
      .then(setConversations)
      .catch((e) => setError(getErrorMessage(e)));

  useEffect(() => {
    void loadList();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const load = () => adminApi.supportChat(selected).then(setChat);
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [selected]);

  const send = async () => {
    if (!selected || !reply.trim()) return;
    setSendError("");
    try {
      await adminApi.sendSupportMessage(selected, reply.trim());
      setReply("");
      setChat(await adminApi.supportChat(selected));
      loadList();
    } catch (e) {
      setSendError(getErrorMessage(e));
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Live support" description="Chat with users in real time" />
      <PageError message={error} onRetry={loadList} />
      {sendError && <Alert variant="error">{sendError}</Alert>}
      <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-11rem)] min-h-[480px]">
        <Card className="lg:col-span-4 flex flex-col overflow-hidden !p-0" padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Inbox</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">{conversations.length} conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.userId)}
                className={`w-full text-left px-5 py-4 border-b border-slate-50 transition-all ${
                  selected === c.userId
                    ? "bg-brand-50/80 border-l-[3px] border-l-brand-600"
                    : "hover:bg-slate-50 border-l-[3px] border-l-transparent"
                }`}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-800">UID {c.user?.uid}</span>
                  <Badge variant={c.status === "OPEN" ? "warning" : "default"} dot>
                    {c.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 truncate mt-1">
                  {c.user?.mobile ? `+91 ${c.user.mobile}` : c.user?.email}
                </p>
                <p className="text-xs text-slate-400 truncate mt-1">{c.messages[0]?.body ?? "No messages"}</p>
              </button>
            ))}
            {!conversations.length && (
              <EmptyState title="No chats" icon={<MessageSquare size={24} strokeWidth={1.5} />} />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-8 flex flex-col overflow-hidden !p-0" padding={false}>
          {chat ? (
            <>
              <div className="px-6 py-4 border-b border-slate-100 bg-white">
                <p className="font-bold text-slate-900">
                  {chat.user?.mobile ? `+91 ${chat.user.mobile}` : chat.user?.email}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">
                  UID {chat.user?.uid} · Balance ₹{chat.user?.wallet?.balance ?? 0}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#f8f9fc] scrollbar-thin">
                {chat.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      m.sender === "ADMIN"
                        ? "ml-auto bg-brand-600 text-white rounded-br-md"
                        : "bg-white border border-slate-200/80 text-slate-800 rounded-bl-md"
                    }`}
                  >
                    {m.body}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-100 flex gap-2 bg-white">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Type your reply…"
                  className="flex-1"
                />
                <Button onClick={send} className="shrink-0 px-4">
                  <Send size={16} />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50/30">
              <EmptyState
                title="Select a conversation"
                description="Choose a user from the inbox to start chatting."
                icon={<MessageSquare size={24} strokeWidth={1.5} />}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
