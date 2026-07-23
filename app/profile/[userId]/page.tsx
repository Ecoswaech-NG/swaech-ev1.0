import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { FaPhone, FaWhatsapp, FaMapMarkerAlt, FaStar } from "react-icons/fa";
import { BsDot } from "react-icons/bs";
import ReviewForm from "@/components/profile/Reviewform ";

interface Props { params: Promise<{ userId: string }> }

const FALLBACK = "https://cloudfront-eu-central-1.images.arcpublishing.com/thenational/C7BBKEO5NNNFT6CUY7TGRDHX44.jpg";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((n) => (
        <FaStar key={n} className={`w-3.5 h-3.5 ${n <= rating ? "text-amber-400" : "text-gray-200 dark:text-[#2d1e5f]"}`} />
      ))}
    </div>
  );
}

export default async function PublicProfilePage({ params }: Props) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, fullName: true, email: true, createdAt: true,
      // Extended fields (add these to schema)
      // phone: true, bio: true, city: true, state: true, country: true,
    },
  });

  if (!user) return notFound();

  const [listings, reviews] = await Promise.all([
    prisma.carListing.findMany({
      where:   { userId, status: "active" },
      include: {
        images:        { take: 1, select: { imageUrl: true } },
        batteryReport: { select: { id: true, grade: true, sohScore: true } },
      },
      orderBy: { id: "desc" },
      take:    12,
    }),
    prisma.review.findMany({
      where:   { subjectId: userId },
      include: { reviewer: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take:    10,
    }),
  ]);

  const avgRating = reviews.length
    ? reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length
    : null;

  const initials = user.fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const GRADE_COLOR: Record<string, string> = {
    A: "#3fb950", B: "#58a6ff", C: "#d29922", D: "#f85149",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0822]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: profile card ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Profile card */}
            <div className="bg-white dark:bg-[#18122b] rounded-2xl border border-gray-100 dark:border-[#2d1e5f] p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-[#7b2ff2] flex items-center justify-center text-white text-xl font-bold mb-4 relative">
                  {initials}
                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-[#18122b]" />
                </div>

                <h1 className="font-bold text-xl text-gray-900 dark:text-white">{user.fullName}</h1>

                {/* Rating */}
                {avgRating && (
                  <div className="flex items-center gap-2 mt-2">
                    <Stars rating={Math.round(avgRating)} />
                    <span className="text-xs text-gray-500 dark:text-[#8b949e]">
                      {avgRating.toFixed(1)} ({reviews.length} reviews)
                    </span>
                  </div>
                )}

                <div className="flex items-center mt-2">
                  <BsDot className="text-green-500 text-2xl -ml-1" />
                  <span className="text-green-500 text-xs font-medium">Online</span>
                </div>

                <div className="mt-3 text-sm text-gray-500 dark:text-[#8b949e]">
                  <p>Member since {new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(new Date(user.createdAt))}</p>
                  <p className="mt-1">{listings.length} active listing{listings.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Contact buttons */}
              <div className="flex flex-col gap-2 mt-5">
                <a
                  href={`https://wa.me/`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                >
                  <FaWhatsapp className="w-4 h-4" /> WhatsApp
                </a>
                <a
                  href={`tel:`}
                  className="flex items-center justify-center gap-2 bg-[#220a77] hover:bg-[#7b2ff2] text-white font-semibold py-2.5 rounded-xl text-sm transition"
                >
                  <FaPhone className="w-4 h-4" /> Call Seller
                </a>
              </div>
            </div>

            {/* Reviews section */}
            <div className="bg-white dark:bg-[#18122b] rounded-2xl border border-gray-100 dark:border-[#2d1e5f] p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                Reviews <span className="text-gray-400 font-normal text-sm">({reviews.length})</span>
              </h2>

              {reviews.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-[#8b949e]">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="border-b border-gray-100 dark:border-[#2d1e5f] pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">
                          {r.reviewer.fullName}
                        </p>
                        <Stars rating={r.rating} />
                      </div>
                      {r.comment && (
                        <p className="text-xs text-gray-500 dark:text-[#8b949e] leading-relaxed">{r.comment}</p>
                      )}
                      <p className="text-[10px] text-gray-300 dark:text-[#484f58] mt-1">
                        {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(r.createdAt))}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Leave a review — client component */}
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-[#2d1e5f]">
                <ReviewForm subjectId={userId} subjectName={user.fullName} />
              </div>
            </div>
          </div>

          {/* ── Right: listings ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <h2 className="font-bold text-xl text-gray-900 dark:text-white mb-5">
              Active Listings
            </h2>

            {listings.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-[#18122b] rounded-2xl border border-gray-100 dark:border-[#2d1e5f]">
                <p className="text-gray-400 dark:text-[#8b949e]">No active listings</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {listings.map((listing: any) => {
                  const grade = listing.batteryReport?.grade;
                  return (
                    <div key={listing.id} className="bg-white dark:bg-[#18122b] rounded-2xl border border-gray-100 dark:border-[#2d1e5f] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="relative h-44">
                        <img
                          src={listing.images[0]?.imageUrl || FALLBACK}
                          alt={listing.listingTitle ?? ""}
                          className="w-full h-full object-cover"
                        />
                        {grade && (
                          <span
                            className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: `${GRADE_COLOR[grade]}25`,
                              color:       GRADE_COLOR[grade],
                              border:     `1px solid ${GRADE_COLOR[grade]}50`,
                            }}
                          >
                            {grade} · {listing.batteryReport?.sohScore}%
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
                          {listing.listingTitle || `${listing.year} ${listing.make} ${listing.model}`}
                        </h3>
                        <p className="font-bold text-[#7b2ff2] dark:text-[#c4b8e8] text-sm mt-1">
                          ₦{Number(listing.sellingPrice).toLocaleString()}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Link href={`/listing-details/${listing.id}`} className="flex-1">
                            <button className="w-full py-2 text-xs font-semibold bg-[#220a77] hover:bg-[#7b2ff2] text-white rounded-xl transition">
                              View Details
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}