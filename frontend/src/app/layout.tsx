import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { SidebarNav } from "@/components/sidebar-nav";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'AI Studio - 电商出图',
  description: '电商AI出图应用 - 精准控图流水线',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-[#FFFFFF] min-h-screen text-[#0D0D0D] font-inter`}
      >
        <div className="flex h-screen w-full overflow-hidden">
          {/* Sidebar */}
          <aside className="w-[240px] h-full border-r border-[#E8E8E8] bg-[#FFFFFF] flex flex-col pt-10 pb-10 px-8 gap-12 shrink-0">
            {/* Logo Container */}
            <div className="flex items-center gap-3 w-full">
               <div className="w-6 h-6 bg-[#E42313] shrink-0" />
               <h1 className="font-space-grotesk text-lg font-semibold tracking-tight text-[#0D0D0D]">AI 电商出图</h1>
            </div>
            
            {/* Navigation */}
            <SidebarNav />
          </aside>
          
          {/* Main Content Area */}
          <main className="flex-1 h-full overflow-y-auto bg-[#FFFFFF]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
