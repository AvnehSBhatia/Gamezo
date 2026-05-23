"use client";

interface ScoreCategory {
  label: string;
  value: number;
}

interface JudgeScoreCardProps {
  title: string;
  tone: "blue" | "orange";
  categories: ScoreCategory[];
  animate: boolean;
}

export function JudgeScoreCard({ title, tone, categories, animate }: JudgeScoreCardProps) {
  const isBlue = tone === "blue";
  const total = categories.reduce((sum, category) => sum + category.value, 0);

  return (
    <article className={`overflow-hidden rounded-[1.5rem] border-2 bg-white shadow-lg ${isBlue ? "border-blue-200" : "border-orange-200"}`}>
      <header className={`px-4 py-4 text-2xl font-black text-white ${isBlue ? "bg-blue-600" : "bg-orange-500"}`}>
        {title}
      </header>
      <div className="space-y-4 p-5">
        {categories.map((category) => (
          <div key={category.label}>
            <div className="mb-1 flex items-center justify-between text-sm font-black">
              <span>{category.label}</span>
              <span className={isBlue ? "text-blue-600" : "text-orange-500"}>{animate ? category.value : 0}</span>
            </div>
            <div className={`h-3 overflow-hidden rounded-full ${isBlue ? "bg-blue-100" : "bg-orange-100"}`}>
              <div
                className={`h-full rounded-full transition-all duration-1000 ${isBlue ? "bg-blue-600" : "bg-orange-500"}`}
                style={{ width: animate ? `${category.value}%` : "0%" }}
              />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
          <span className="text-sm font-black text-neutral-500">Total</span>
          <span className={`text-3xl font-black ${isBlue ? "text-blue-600" : "text-orange-500"}`}>{animate ? total : 0}</span>
        </div>
      </div>
    </article>
  );
}
