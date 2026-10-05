'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function FollowButton({ creatorId, initialIsFollowing, onFollowChange }) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    setIsFollowing(initialIsFollowing)
  }, [initialIsFollowing])

  const handleFollow = async () => {
    if (!currentUser) {
      router.push('/login')
      return
    }

    setLoading(true)
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', creatorId)

        if (error) throw error
        setIsFollowing(false)
        if (onFollowChange) onFollowChange(false)
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: creatorId
          })

        if (error) throw error
        setIsFollowing(true)
        if (onFollowChange) onFollowChange(true)
      }
    } catch (err) {
      console.error("Follow action failed:", err.message)
      // Safe fallback if follows table doesn't exist
      if (err.message.includes("Could not find the table")) {
        alert("Follow capability requires the database updates to be executed. Please run setup.sql in your Supabase SQL Editor!")
      }
    } finally {
      setLoading(false)
    }
  }

  if (currentUser?.id === creatorId) {
    return null // Don't show follow button on your own profile
  }

  return (
    <Button
      onClick={handleFollow}
      disabled={loading}
      variant={isFollowing ? "secondary" : "default"}
      className="shadow-brutalist-sm text-xs font-black uppercase tracking-wider h-9 px-4 rounded-none border-2 border-black"
    >
      {loading ? "..." : (isFollowing ? "Following" : "Follow")}
    </Button>
  )
}
