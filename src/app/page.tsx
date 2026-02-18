'use client'

import { useState } from 'react'
import { Youtube, FileText, Upload, MessageCircle, Clock, Type } from 'lucide-react'
import { clsx } from 'clsx'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import YoutubeTab from '@/components/tabs/YoutubeTab'
import ArticleTab from '@/components/tabs/ArticleTab'
import TextTab from '@/components/tabs/TextTab'
import UploadTab from '@/components/tabs/UploadTab'
import ChatTab from '@/components/tabs/ChatTab'
import HistoryTab from '@/components/tabs/HistoryTab'

const TABS = [
  { id: 'youtube',  label: 'YouTube',  Icon: Youtube },
  { id: 'article',  label: 'Article',  Icon: FileText },
  { id: 'text',     label: 'Text',     Icon: Type },
  { id: 'upload',   label: 'Upload',   Icon: Upload },
  { id: 'chat',     label: 'Chat',     Icon: MessageCircle },
  { id: 'history',  label: 'History',  Icon: Clock },
]

function TabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'youtube':  return <YoutubeTab />
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

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-4 md:pb-8">
        {/* Animated brand bar */}
        <div className="gradient-bar mb-4 h-0.5 w-full rounded-full" />

        {/* Desktop tab bar */}
        <div className="mb-6 hidden overflow-x-auto md:flex md:gap-1">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]'
                )}
              >
                <Icon size={14} strokeWidth={isActive ? 2.5 : 1.75} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Mobile: active tab label */}
        <div className="mb-4 flex items-center gap-2 md:hidden">
          {(() => {
            const t = TABS.find(t => t.id === activeTab)
            return t ? (
              <>
                <t.Icon size={16} className="text-[var(--accent)]" />
                <span className="text-sm font-semibold text-[var(--text)]">{t.label}</span>
              </>
            ) : null
          })()}
        </div>

        {/* Tab content */}
        <TabContent tab={activeTab} />
      </main>

      {/* Mobile bottom nav */}
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}
