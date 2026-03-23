'use client'

import { useState } from 'react'
import { Youtube, FileText, Upload, MessageCircle, Clock, Type, Mic } from 'lucide-react'
import { clsx } from 'clsx'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import YoutubeTab from '@/components/tabs/YoutubeTab'
import ArticleTab from '@/components/tabs/ArticleTab'
import TextTab from '@/components/tabs/TextTab'
import UploadTab from '@/components/tabs/UploadTab'
import ChatTab from '@/components/tabs/ChatTab'
import HistoryTab from '@/components/tabs/HistoryTab'
import PodcastTab from '@/components/tabs/PodcastTab'

const TABS = [
  { id: 'youtube',  label: 'YouTube',  Icon: Youtube },
  { id: 'podcast',  label: 'Podcast',  Icon: Mic },
  { id: 'article',  label: 'Article',  Icon: FileText },
  { id: 'text',     label: 'Text',     Icon: Type },
  { id: 'upload',   label: 'Upload',   Icon: Upload },
  { id: 'chat',     label: 'Chat',     Icon: MessageCircle },
  { id: 'history',  label: 'History',  Icon: Clock },
]

function TabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'youtube':  return <YoutubeTab />
    case 'podcast':  return <PodcastTab />
    case 'article':  return <ArticleTab />
    case 'text':     return <TextTab />
    case 'upload':   return <UploadTab />
    case 'chat':     return <ChatTab />
    case 'history':  return <HistoryTab />
    default:         return <YoutubeTab />
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('youtube')

  return (
    <div className="relative flex min-h-dvh flex-col">
      <Header />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-20 pt-3 md:pb-8">
        {/* Animated brand bar */}
        <div className="gradient-bar mb-3 h-0.5 w-full rounded-full" />

        {/* Desktop tab bar */}
        <div className="mb-4 hidden md:flex md:flex-wrap md:justify-center md:gap-1">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx(
                  'flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  isActive
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]'
                )}
              >
                <Icon size={12} strokeWidth={isActive ? 2.5 : 1.75} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <TabContent tab={activeTab} />
      </main>

      {/* Mobile bottom nav */}
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}
