'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Mail, MessageCircle, MapPin, CheckCircle, Send } from 'lucide-react'

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setFormData({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-16 md:py-24 space-y-12 text-black select-none">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-block border border-black bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider shadow-brutalist-sm">
          SUPPORT DIRECTORY
        </div>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-[0.95]">
          Get in Touch
        </h1>
        <p className="text-sm font-bold text-slate-700">
          Have questions about workspaces, escrow terms, or disputing a transaction? Our support team is here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        
        {/* Left Side: Contact Channels */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase tracking-wider">Support Channels</h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              We respond to inquiries within 24 hours. If you are disputing a workspace transaction, please provide the Workspace ID in the subject.
            </p>
          </div>

          <div className="space-y-4">
            {/* Email Support */}
            <div className="flex items-start gap-4 p-5 bg-white border-2 border-black rounded-none shadow-brutalist-sm hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutalist transition-all">
              <div className="w-10 h-10 border-2 border-black bg-accent-lime text-black flex items-center justify-center shrink-0 shadow-brutalist-sm">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Email Support</h4>
                <p className="text-[9px] font-mono text-slate-400 font-bold uppercase mt-0.5">Direct ticket dashboard</p>
                <p className="text-xs font-bold text-accent-purple mt-1 select-all font-mono">support@sarena.design</p>
              </div>
            </div>

            {/* Live Chat */}
            <div className="flex items-start gap-4 p-5 bg-white border-2 border-black rounded-none shadow-brutalist-sm hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutalist transition-all">
              <div className="w-10 h-10 border-2 border-black bg-accent-purple text-white flex items-center justify-center shrink-0 shadow-brutalist-sm">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Live Discussions</h4>
                <p className="text-[9px] font-mono text-slate-400 font-bold uppercase mt-0.5">Real-time team chats</p>
                <p className="text-xs font-bold text-accent-purple mt-1 select-all font-mono">discord.gg/sarena-design</p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-4 p-5 bg-white border-2 border-black rounded-none shadow-brutalist-sm hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutalist transition-all">
              <div className="w-10 h-10 border-2 border-black bg-accent-yellow text-black flex items-center justify-center shrink-0 shadow-brutalist-sm">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">HQ Location</h4>
                <p className="text-[9px] font-mono text-slate-400 font-bold uppercase mt-0.5">Jakarta office hours</p>
                <p className="text-xs font-bold text-slate-700 mt-1">Sarena Tower, Jakarta, Indonesia</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="lg:col-span-7">
          <Card className="bg-white border-[3px] border-black rounded-none shadow-brutalist overflow-hidden h-full flex flex-col justify-between">
            <CardHeader className="p-6 md:p-8 border-b-2 border-black bg-slate-50">
              <CardTitle className="text-black text-lg font-black uppercase">Send a Message</CardTitle>
              <CardDescription className="text-xs font-semibold text-slate-600">Complete the form below to register a support request.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8 flex-1">
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-12 h-12 border-2 border-black bg-accent-lime text-black flex items-center justify-center mx-auto shadow-brutalist-sm">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-wider">Message Sent Successfully!</h4>
                    <p className="text-xs text-slate-600 max-w-xs mx-auto font-semibold">
                      Thank you for contacting us. Our ticket team will review and respond within 24 hours.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button variant="secondary" className="px-6" onClick={() => setSubmitted(false)}>
                      Send Another Message
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-black">Your Name</Label>
                      <Input 
                        id="name" 
                        required 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Alex designs" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-black">Your Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        required 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="alex@gmail.com" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-black">Subject</Label>
                    <Input 
                      id="subject" 
                      required 
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      placeholder="Workspace Dispute / General Inquiry" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-black">Message</Label>
                    <Textarea 
                      id="message" 
                      required 
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Write your detailed request here..." 
                    />
                  </div>

                  <div className="pt-4">
                    <Button type="submit" className="w-full h-11">
                      <Send className="w-3.5 h-3.5" />
                      Submit Request
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
