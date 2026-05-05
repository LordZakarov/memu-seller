import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { formatDate } from "@/lib/utils";
import { Loader2, Send } from "lucide-react";

type QA = { id: string; question: string; answer: string | null; buyer_id: string; created_at: string; product_id: string };
type Review = { id: string; rating: number; comment: string; created_at: string; product_id: string };

export default function Reviews() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"reviews" | "qa">("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [qas, setQAs] = useState<QA[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState<string | null>(null);

  useEffect(() => { document.title = "Reviews — Memu Seller"; if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [rRes, qRes] = await Promise.all([
      supabase.from("reviews").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("product_questions").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false }),
    ]);
    setReviews(rRes.data ?? []); setQAs(qRes.data ?? []);
    setLoading(false);
  }

  async function answerQuestion(id: string) {
    const answer = answers[id]; if (!answer?.trim()) return;
    setAnswering(id);
    await supabase.from("product_questions").update({ answer, answered_at: new Date().toISOString() }).eq("id", id);
    setQAs(prev => prev.map(q => q.id === id ? { ...q, answer } : q));
    setAnswers(p => ({ ...p, [id]: "" }));
    setAnswering(null);
  }

  return (
    <div className="p-6">
      <div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Reviews & Q&A</h1></div>
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {(["reviews", "qa"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
            {t === "qa" ? "Q&A" : "Reviews"}
          </button>
        ))}
      </div>
      {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} /></div>
        : tab === "reviews" ? (
          <div className="space-y-3">
            {reviews.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">No reviews yet</div>
              : reviews.map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {[1,2,3,4,5].map(i => <span key={i} className={`text-sm ${i <= r.rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>)}
                    <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{r.comment || "No comment"}</p>
                </div>
              ))}
          </div>
        ) : (
          <div className="space-y-3">
            {qas.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">No questions yet</div>
              : qas.map(q => (
                <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Q: {q.question}</p>
                  {q.answer ? <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">A: {q.answer}</p>
                    : <div className="flex gap-2">
                        <input type="text" placeholder="Your answer…" value={answers[q.id] ?? ""}
                          onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
                        <button onClick={() => answerQuestion(q.id)} disabled={answering === q.id}
                          className="p-2 rounded-lg text-white" style={{ background: "#df0060" }}>
                          {answering === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                      </div>}
                  <p className="text-xs text-gray-400 mt-2">{formatDate(q.created_at)}</p>
                </div>
              ))}
          </div>
        )}
    </div>
  );
}
