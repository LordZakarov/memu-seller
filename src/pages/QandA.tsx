import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { Loader2, MessageCircle, Send, ChevronDown, ChevronUp } from "lucide-react";

type QA = {
  id: string;
  question: string;
  answer: string | null;
  buyer_name: string;
  created_at: string;
  answered_at: string | null;
  product_id: string;
  product_title: string;
};

export default function QandA() {
  const { user } = useAuth();
  const [qas, setQas] = useState<QA[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unanswered" | "answered">("unanswered");

  useEffect(() => { document.title = "Q&A — Memu Seller"; if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    // Join product_qa with products to get product title
    const { data, error } = await supabase
      .from("product_qa")
      .select("id,question,answer,buyer_name,created_at,answered_at,product_id,products(title)")
      .eq("products.seller_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }

    const mapped = (data ?? []).map((q: any) => ({
      ...q,
      product_title: q.products?.title ?? "Unknown product",
    }));
    setQas(mapped);
    setLoading(false);
  }

  async function submitAnswer(qaId: string) {
    const answer = answers[qaId]?.trim();
    if (!answer) return;
    setSubmitting(qaId);
    const { error } = await supabase.from("product_qa").update({
      answer,
      answered_at: new Date().toISOString(),
    }).eq("id", qaId);
    if (!error) {
      setQas(prev => prev.map(q => q.id === qaId ? { ...q, answer, answered_at: new Date().toISOString() } : q));
      setAnswers(prev => { const n = { ...prev }; delete n[qaId]; return n; });
    }
    setSubmitting(null);
  }

  const filtered = qas.filter(q =>
    filter === "all" ? true : filter === "unanswered" ? !q.answer : !!q.answer
  );

  const unansweredCount = qas.filter(q => !q.answer).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Questions & Answers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unansweredCount > 0
              ? <span className="text-orange-600 font-medium">{unansweredCount} unanswered question{unansweredCount !== 1 ? "s" : ""}</span>
              : "All questions answered"}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(["unanswered", "all", "answered"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${filter === f ? "text-white" : "bg-white border border-gray-200 text-gray-600"}`}
            style={filter === f ? { background: "#df0060" } : {}}>
            {f} {f === "unanswered" && unansweredCount > 0 ? `(${unansweredCount})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <MessageCircle className="h-10 w-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {filter === "unanswered" ? "No unanswered questions 🎉" : "No questions yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(qa => (
            <div key={qa.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpanded(e => e === qa.id ? null : qa.id)}
                className="w-full flex items-start gap-3 p-4 text-left">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${qa.answer ? "bg-green-400" : "bg-orange-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">
                    {qa.product_title} · {qa.buyer_name} · {new Date(qa.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-medium text-gray-900 truncate">{qa.question}</p>
                  {qa.answer && (
                    <p className="text-xs text-green-600 mt-0.5 truncate">✓ Answered</p>
                  )}
                </div>
                {expanded === qa.id ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
              </button>

              {expanded === qa.id && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                  {/* Full question */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">QUESTION</p>
                    <p className="text-sm text-gray-900">{qa.question}</p>
                    <p className="text-xs text-gray-400 mt-1">{qa.buyer_name} · {new Date(qa.created_at).toLocaleString()}</p>
                  </div>

                  {/* Existing answer */}
                  {qa.answer && (
                    <div className="rounded-xl p-3" style={{ background: "#fff0f5" }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: "#df0060" }}>YOUR ANSWER</p>
                      <p className="text-sm text-gray-900">{qa.answer}</p>
                      <p className="text-xs text-gray-400 mt-1">{qa.answered_at ? new Date(qa.answered_at).toLocaleString() : ""}</p>
                    </div>
                  )}

                  {/* Answer input */}
                  {!qa.answer && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1.5">Your answer</p>
                      <div className="flex gap-2">
                        <textarea
                          value={answers[qa.id] ?? ""}
                          onChange={e => setAnswers(prev => ({ ...prev, [qa.id]: e.target.value }))}
                          rows={3}
                          placeholder="Type your answer…"
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-300 resize-none"
                        />
                      </div>
                      <button
                        onClick={() => submitAnswer(qa.id)}
                        disabled={submitting === qa.id || !answers[qa.id]?.trim()}
                        className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition"
                        style={{ background: "#df0060" }}>
                        {submitting === qa.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        {submitting === qa.id ? "Posting…" : "Post Answer"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
