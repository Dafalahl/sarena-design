'use client'

import { useState, useEffect } from 'react'
import UserAvatar from "@/components/UserAvatar"
import FollowButton from "@/components/FollowButton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Globe, ExternalLink, Settings, ShieldCheck, MessageCircle } from "lucide-react"

export default function ProfileHeader({ creator, initialStats, currentUserId }) {
  const [stats, setStats] = useState(initialStats)
  const isOwnProfile = currentUserId === creator.id

  const handleFollowChange = (isNowFollowing) => {
    setStats(prev => ({
      ...prev,
      isFollowing: isNowFollowing,
      followers: isNowFollowing ? prev.followers + 1 : Math.max(0, prev.followers - 1)
    }))
  }

  const isImageLink = creator.portfolio_url?.match(/\.(jpeg|jpg|gif|png|webp)$/i)

  return (
    <div className="bg-white border-[3px] border-black rounded-none overflow-hidden mb-8 relative shadow-brutalist select-none">
      {/* Cover Image Banner */}
      <div className="h-32 md:h-44 bg-slate-50 border-b-[3px] border-black relative overflow-hidden flex items-center justify-center">
        {isImageLink ? (
          <img 
            src={creator.portfolio_url} 
            className="w-full h-full object-cover grayscale opacity-25 mix-blend-overlay"
            alt="Cover background"
          />
        ) : (
          <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-300">
            Creative Portfolio Banner
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent" />
      </div>

      <div className="px-5 md:px-10 pb-8 pt-4">
        {/* Instagram Profile Grid */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
          
          {/* Left Column: Large Avatar */}
          <div className="relative shrink-0 -mt-16 md:-mt-20">
            <div className="p-1.5 bg-white border-[3px] border-black shadow-brutalist-sm inline-block">
              <UserAvatar
                src={creator.avatar_url}
                name={creator.full_name || creator.username}
                email={creator.email}
                className="w-24 h-24 md:w-32 md:h-32 rounded-none border-2 border-black" 
              />
            </div>
          </div>

          {/* Right Column: Username, Buttons, Stats, Bio */}
          <div className="flex-1 w-full text-center md:text-left space-y-4">
            
            {/* Header Line: Username and Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-center md:justify-start">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-black">
                  {creator.username || 'user'}
                </h1>
                {creator.is_verified && (
                  <span className="bg-accent-lime text-black border border-black text-[8px] font-bold font-mono px-1.5 py-0.5 uppercase tracking-wider shadow-brutalist-sm">
                    Verified
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {isOwnProfile ? (
                  <Link href="/account">
                    <Button variant="secondary" className="shadow-brutalist-sm text-xs font-black uppercase h-9 px-3 rounded-none border-2 border-black flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5" />
                      Edit Profile
                    </Button>
                  </Link>
                ) : (
                  <>
                    <FollowButton 
                      creatorId={creator.id} 
                      initialIsFollowing={stats.isFollowing} 
                      onFollowChange={handleFollowChange}
                    />

                    {/* Tanya Desainer - always shown for non-own profiles */}
                    <Link href={`/inbox?dm=${creator.username}`}>
                      <Button
                        variant="secondary"
                        className="shadow-brutalist-sm text-xs font-black uppercase h-9 px-3 rounded-none border-2 border-black bg-white text-black hover:bg-slate-100 flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Tanya Desainer
                      </Button>
                    </Link>
                    
                    {creator.role === 'creator' && (
                      <Link href={`/workspace/new/${creator.username}`}>
                        <Button variant="default" className="shadow-brutalist-sm text-xs font-black uppercase h-9 px-4 rounded-none border-2 border-black bg-accent-lime text-black hover:bg-black hover:text-white">
                          Hire (Rp {(creator.price_base || 0).toLocaleString('id-ID')})
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Stats Line: Posts, Followers, Following */}
            <div className="flex items-center justify-center md:justify-start gap-8 py-2 border-y border-slate-200 md:border-none">
              <div className="flex flex-col md:flex-row md:items-baseline md:gap-1.5 text-center md:text-left">
                <span className="font-mono font-black text-sm md:text-base text-black">{stats.succeedCount}</span>
                <span className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">completed</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-baseline md:gap-1.5 text-center md:text-left">
                <span className="font-mono font-black text-sm md:text-base text-black">{stats.followers}</span>
                <span className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">followers</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-baseline md:gap-1.5 text-center md:text-left">
                <span className="font-mono font-black text-sm md:text-base text-black">{stats.following}</span>
                <span className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">following</span>
              </div>
            </div>

            {/* Profile Bio Details */}
            <div className="space-y-1.5">
              <h2 className="text-sm font-black text-black uppercase">
                {creator.full_name || creator.username}
              </h2>
              {creator.bio ? (
                <p className="text-slate-700 text-xs font-semibold whitespace-pre-wrap max-w-xl leading-relaxed">
                  {creator.bio}
                </p>
              ) : (
                <p className="text-slate-400 text-xs italic font-medium">No bio description available.</p>
              )}

              {creator.portfolio_url && (
                <div className="pt-2 flex justify-center md:justify-start">
                  <a 
                    href={creator.portfolio_url.startsWith('http') ? creator.portfolio_url : `https://${creator.portfolio_url}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 text-[10px] font-black font-mono text-accent-purple uppercase tracking-wider hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{creator.portfolio_url.replace(/https?:\/\/(www\.)?/, '')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
