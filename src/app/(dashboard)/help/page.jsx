'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  CircleHelp, 
  ShieldCheck, 
  CreditCard, 
  MessageSquare, 
  Headphones, 
  Send, 
  CheckCircle2, 
  AlertTriangle,
  Mail
} from 'lucide-react'

export default function HelpPage() {
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketMessage, setTicketMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmitTicket = (e) => {
    e.preventDefault()
    if (!ticketSubject.trim() || !ticketMessage.trim()) return

    setIsSubmitting(true)
    const mailtoUrl = `mailto:support@sarena.design?subject=${encodeURIComponent(ticketSubject)}&body=${encodeURIComponent(ticketMessage)}`
    window.open(mailtoUrl, '_blank')
    setSubmitted(true)
    setIsSubmitting(false)
  }

  const helpCategories = [
    {
      title: "Escrow & Payments",
      description: "Understand our secure milestone-based contract flow and payouts.",
      icon: CreditCard,
      color: "text-black bg-accent-lime"
    },
    {
      title: "Account & Security",
      description: "Manage credentials, roles, OAuth bindings, and personal profile options.",
      icon: ShieldCheck,
      color: "text-white bg-accent-purple"
    },
    {
      title: "Workspace & Revisions",
      description: "Learn how to deliver source files, request updates, and count revision cycles.",
      icon: MessageSquare,
      color: "text-black bg-accent-yellow"
    },
    {
      title: "Dispute Support",
      description: "Encountering project difficulties? Initiate a formal design audit review.",
      icon: AlertTriangle,
      color: "text-black bg-accent-orange"
    }
  ]

  return (
    <div className="space-y-8 text-black">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-black">
        <div>
          <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-1.5 shadow-brutalist-sm">
            SUPPORT DESK
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-2">
            <Headphones className="w-7 h-7 text-black shrink-0" />
            Help &amp; Support
          </h1>
          <p className="text-slate-600 text-xs font-semibold mt-1">Get support, browse resources, or submit tickets directly to our administrators.</p>
        </div>
      </header>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {helpCategories.map((cat, idx) => {
          const Icon = cat.icon
          return (
            <div key={idx} className="bg-white border-2 border-black p-5 flex items-start gap-4 shadow-brutalist-sm hover:shadow-brutalist hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all">
              <div className={`w-10 h-10 border-2 border-black flex items-center justify-center shrink-0 shadow-brutalist-sm ${cat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">{cat.title}</h3>
                <p className="text-xs text-slate-600 font-semibold mt-1 leading-relaxed">{cat.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Direct Contact Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a 
          href="mailto:support@sarena.design" 
          className="p-4 bg-white border-2 border-black shadow-brutalist-sm hover:shadow-brutalist hover:-translate-y-0.5 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-black bg-accent-lime flex items-center justify-center">
              <Mail className="w-5 h-5 text-black" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-black">Email Resmi Support</p>
              <p className="text-[11px] font-mono text-slate-500 font-bold">support@sarena.design</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-black uppercase bg-black text-white px-2 py-1 shadow-brutalist-xs group-hover:bg-accent-purple transition-colors">
            Kirim Email →
          </span>
        </a>

        <a 
          href="https://discord.gg/sarena-design" 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-4 bg-white border-2 border-black shadow-brutalist-sm hover:shadow-brutalist hover:-translate-y-0.5 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-black bg-accent-purple flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-black">Komunitas &amp; Live Chat</p>
              <p className="text-[11px] font-mono text-slate-500 font-bold">discord.gg/sarena-design</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-black uppercase bg-black text-white px-2 py-1 shadow-brutalist-xs group-hover:bg-accent-yellow group-hover:text-black transition-colors">
            Join Discord →
          </span>
        </a>
      </div>

      {/* Support Ticket Section */}
      <Card className="bg-white border-2 border-black rounded-none overflow-hidden shadow-brutalist">
        <CardHeader className="p-5 md:p-6 border-b-2 border-black bg-slate-50">
          <CardTitle className="font-black uppercase text-black text-base flex items-center gap-2">
            <CircleHelp className="w-4.5 h-4.5 text-black shrink-0" />
            Submit a Support Ticket
          </CardTitle>
          <CardDescription className="text-slate-600 text-xs font-semibold mt-1">Direct support response from the Sarena administration within 24 hours.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {submitted ? (
            <div className="text-center py-8 space-y-4 max-w-sm mx-auto animate-fade-in">
              <div className="w-12 h-12 border-2 border-black bg-accent-lime text-black flex items-center justify-center mx-auto shadow-brutalist-sm">
                <CheckCircle2 className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="text-sm font-black uppercase">Ticket Submitted!</h3>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                Thank you for reaching out. We have logged your request and our admin team will reply to your registered email shortly.
              </p>
              <Button 
                onClick={() => setSubmitted(false)} 
                variant="secondary" 
                className="mt-2"
              >
                Submit another ticket
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-black">Subject / Project Reference</Label>
                <Input 
                  id="subject"
                  type="text" 
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="e.g. Workspace #820f - File Upload Issue"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-black">Detailed Description</Label>
                <Textarea 
                  id="message"
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Describe the issue you are experiencing in detail..."
                  required
                />
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-11"
                >
                  {isSubmitting ? 'Sending Ticket...' : 'Send Message'}
                  {!isSubmitting && <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
