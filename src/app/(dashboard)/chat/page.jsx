'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { Send, Image, FilePlus, Smile, Search, Phone, Video, MoreVertical, ShieldCheck, CheckCheck } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'


export default function ChatPage() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'designer', text: "Hey! I've uploaded the initial workspace deliverables in the portal. Please take a look when you have a moment.", time: '10:32 AM', status: 'read' },
    { id: 2, sender: 'client', text: "Wow, that was fast! Let me check the high-res layout and download the package.", time: '10:34 AM', status: 'read' },
    { id: 3, sender: 'client', text: "Looks fantastic! I've requested one minor revision on the typography colors, is that okay?", time: '10:35 AM', status: 'read' },
    { id: 4, sender: 'designer', text: "Absolutely! I see the revision cycle logged in the workspace. I am adjusting the palette right now. Will re-upload in 15 mins.", time: '10:36 AM', status: 'read' }
  ])
  const [inputVal, setInputVal] = useState('')
  const [activeChat, setActiveChat] = useState({
    id: 1,
    name: 'Alex Designs',
    role: 'Designer (Contractor)',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=alex',
    status: 'Online'
  })

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!inputVal.trim()) return

    const newMsg = {
      id: messages.length + 1,
      sender: 'client',
      text: inputVal,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    }

    setMessages([...messages, newMsg])
    setInputVal('')

    // Fake mock response after 1 second
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          sender: 'designer',
          text: "Received! Let me check that and update our workspace details accordingly.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        }
      ])
    }, 1500)
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white border-2 border-black rounded-none overflow-hidden shadow-brutalist text-black">
      {/* Chats List Sidebar (Left) */}
      <div className="w-80 border-r-2 border-black flex flex-col bg-slate-50/20">
        <div className="p-4 border-b-2 border-black space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider">Chat Portal</h2>
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <Input 
              type="text" 
              placeholder="Search chats..." 
              className="pl-9 h-9 text-xs" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-[#FAF9F6]/30">
          <div 
            onClick={() => setActiveChat({
              id: 1,
              name: 'Alex Designs',
              role: 'Designer (Contractor)',
              avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=alex',
              status: 'Online'
            })}
            className="flex items-center gap-3 p-3 rounded-none bg-accent-lime border-2 border-black shadow-brutalist-sm cursor-pointer select-none"
          >
            <div className="relative shrink-0">
              <UserAvatar 
                src="https://api.dicebear.com/7.x/identicon/svg?seed=alex" 
                name="Alex Designs" 
                className="w-10 h-10 rounded-none border border-black animate-pulse" 
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase truncate">Alex Designs</h4>
                <span className="text-[8px] font-mono font-bold text-black/60">10:36 AM</span>
              </div>
              <p className="text-[9px] font-mono font-bold uppercase text-accent-purple tracking-wide mt-0.5">Workspace #408A</p>
              <p className="text-[10px] text-slate-700 truncate mt-0.5 font-medium">Will re-upload in 15 mins...</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-none bg-white border-2 border-black/10 hover:border-black hover:shadow-brutalist-sm transition-all cursor-not-allowed opacity-60 select-none">
            <div className="relative shrink-0">
              <UserAvatar 
                src="https://api.dicebear.com/7.x/identicon/svg?seed=branding" 
                name="Branding Pro" 
                className="w-10 h-10 rounded-none border border-black/40" 
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-slate-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase truncate text-slate-500">Branding Pro</h4>
                <span className="text-[8px] font-mono font-bold text-slate-400">Yesterday</span>
              </div>
              <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">Workspace #112F</p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">Workspace finalized.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Conversation Feed (Right) */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Active Chat Header */}
        <div className="p-4 border-b-2 border-black flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar 
              src={activeChat.avatar} 
              name={activeChat.name} 
              className="w-9 h-9 rounded-none border border-black shrink-0" 
            />
            <div className="min-w-0">
              <h3 className="text-xs font-black uppercase truncate">{activeChat.name}</h3>
              <p className="text-[9px] font-mono font-bold text-slate-500 flex items-center gap-1.5 mt-0.5 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 border border-black shrink-0" />
                {activeChat.role} • {activeChat.status}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-accent-lime border border-black text-black text-[9px] font-mono font-bold uppercase py-1 px-2.5 shadow-brutalist-sm shrink-0 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              Escrow Active
            </div>
            <Button variant="secondary" size="icon" className="w-8 h-8 rounded-none border-2 border-black bg-white shadow-brutalist-sm opacity-40 cursor-not-allowed">
              <Phone className="w-3.5 h-3.5 text-black" />
            </Button>
            <Button variant="secondary" size="icon" className="w-8 h-8 rounded-none border-2 border-black bg-white shadow-brutalist-sm opacity-40 cursor-not-allowed">
              <Video className="w-3.5 h-3.5 text-black" />
            </Button>
            <Button variant="secondary" size="icon" className="w-8 h-8 rounded-none border-2 border-black bg-white shadow-brutalist-sm">
              <MoreVertical className="w-3.5 h-3.5 text-black" />
            </Button>
          </div>
        </div>

        {/* Message Feed Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/10">
          {messages.map((msg) => {
            const isMe = msg.sender === 'client'
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-lg ${isMe ? 'ml-auto' : 'mr-auto'}`}
              >
                <div 
                  className={`p-3.5 rounded-none text-xs leading-relaxed border-2 border-black shadow-brutalist-sm font-sans ${
                    isMe 
                      ? 'bg-black text-white' 
                      : 'bg-accent-lime text-black border-2 border-black'
                  }`}
                >
                  {msg.text}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[8.5px] font-mono font-bold uppercase text-slate-400">
                  <span>{msg.time}</span>
                  {isMe && (
                    <span className="text-black font-bold">
                      <CheckCheck className="w-3.5 h-3.5 text-black inline shrink-0" />
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Message Input Area */}
        <div className="p-4 border-t-2 border-black bg-slate-50">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="icon" className="w-9 h-9 rounded-none border-2 border-black bg-white shadow-brutalist-sm">
              <Image className="w-4 h-4 text-black" />
            </Button>
            <Button type="button" variant="secondary" size="icon" className="w-9 h-9 rounded-none border-2 border-black bg-white shadow-brutalist-sm">
              <FilePlus className="w-4 h-4 text-black" />
            </Button>
            
            <div className="flex-1 relative">
              <Input 
                type="text" 
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Type your message here..." 
                className="w-full pr-8 h-9 text-xs" 
              />
            </div>

            <Button 
              type="submit" 
              variant="default"
              className="w-9 h-9 p-0 flex items-center justify-center shrink-0 shadow-brutalist-sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
