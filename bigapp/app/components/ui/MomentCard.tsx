import Link from "next/link";
import Image from "next/image";

interface MomentCardProps {
  moment: {
    id: string;
    title: string;
    summary: string;
    heroImage?: string;
    startAt?: string;
    endAt?: string;
    sourceTypes: string[];
    assetCount: number;
    whyMatched: string[];
  };
}

export default function MomentCard({ moment }: MomentCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-100 bg-white transition-all hover:shadow-xl hover:-translate-y-1">
      <Link href={`/moments/${moment.id}`} className="block">
        <div className="aspect-[16/9] w-full overflow-hidden bg-neutral-100">
          {moment.heroImage ? (
            <img
              src={moment.heroImage}
              alt={moment.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-300">
              <span className="text-4xl">📸</span>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xl font-bold text-neutral-900 line-clamp-1">{moment.title}</h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-600">
              {moment.assetCount} assets
            </span>
          </div>

          <p className="mb-4 text-sm leading-relaxed text-neutral-500 line-clamp-2">
            {moment.summary}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {moment.sourceTypes.map((source) => (
              <span key={source} className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                {source}
              </span>
            ))}
          </div>

          <div className="border-t border-neutral-50 pt-4 mt-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Why this matched</h4>
            <div className="flex flex-wrap gap-1">
              {moment.whyMatched.slice(0, 2).map((reason, idx) => (
                <span key={idx} className="text-[11px] text-neutral-600 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                  {reason}
                </span>
              ))}
              {moment.whyMatched.length > 2 && (
                <span className="text-[11px] text-neutral-400 py-0.5 px-1">
                  +{moment.whyMatched.length - 2} more
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
