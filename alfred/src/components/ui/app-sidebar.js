"use client"
import Link from "next/link";
import { Calendar, Home, Inbox, Search, ChevronDown, Settings,History, Pen } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import{
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
}from "@/components/ui/collapsible";

// wudcb


import { usechatStore, user_contextStore } from "@/services/contextStrore";
import { useShallow } from "zustand/react/shallow";
import { shallow } from 'zustand/shallow';
import { useCallback, useEffect, useRef, useState } from "react";


import { fetchuserHistory , fireSessionEnd } from "@/services/fetch_info";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import  AccountDropdown  from "./AccountDropdown";











const PAGE_SIZE = 10;



export function AppSidebar() {

// Separate selectors
const first_name = user_contextStore(useShallow((state) => state.first_name));
const last_name = user_contextStore(useShallow((state) => state.last_name));
const email = user_contextStore(useShallow((state) => state.email));
const initialHistory = user_contextStore(useShallow((state) => state.chat_titles));
const updateHistory  = user_contextStore(useShallow((state) => state.updateHistory));


console.log("AppSidebar: first_name:", first_name, "last_name:", last_name, "email:", email, "initialHistory:", initialHistory, "updateHistory:", updateHistory);


const setcurr_chatid = usechatStore(useShallow((state) => state.actions.setcurr_chatid)); 
const curr_chatid = usechatStore(useShallow((state) => state.curr_chatid));

const [history, setHistory]     = useState([]); // local state for chat history
  const [page, setPage]           = useState(1.5);           // next page to fetch
  const [hasMore, setHasMore]     = useState(true);
  const [loading, setLoading]     = useState(false);
const router = useRouter();
  
  
  const sentinelRef = useRef(null);




const fetchHistory = useCallback(async (page) => {
  if (loading || !hasMore) return;

  setLoading(true);

  try {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const data = await fetchuserHistory(page * PAGE_SIZE, PAGE_SIZE);

    setHistory((prev) => {
      const ids = new Set(prev.map((c) => c.chatId));
      return [...prev, ...data.items.filter((c) => !ids.has(c.chatId))];
    });

    setHasMore(data.hasMore);
    setPage((p) => p + 1);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }

}, [loading, hasMore]);


    useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (history.length === 0) {
          setHistory(initialHistory || []);
        } else if (entry.isIntersecting) {
          fetchHistory(page);
        }
      },
      { root: null, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchHistory, page, history.length, initialHistory]);




const handleNewChat = (curr_chatid) => {
  console.log("New chat initiated. Ending session for chatId:", curr_chatid);
  const oldChatId = curr_chatid;  // capture current chat ID before resetting

  fireSessionEnd(oldChatId)   // fire-and-forget, non-blocking

}

 

const items = [
  { title: "New chat", url: "/", icon: Pen , handler: handleNewChat},

];







  //update history on new chat addition
useEffect(() => {
  const loadNewChat = async () => {
    if (!updateHistory) return;  // ← guard at top, not inside
    try {
      const data = await fetchuserHistory(0, 2);
      setHistory((prev) => {
        const ids = new Set(prev.map((c) => c.chatId));
        return [
          ...data.items.filter((c) => !ids.has(c.chatId)),
          ...prev,
        ];
      });
    } catch (err) {
      console.error(err);
    } finally {
      user_contextStore.getState().actions.setUpdateHistory(false);  // ← always reset, even on error
    }
  };
  loadNewChat();
}, [updateHistory]);












  return (
    <Sidebar  collapsible="icon" variant="floating">
      <SidebarHeader>
  <SidebarMenu>
    <SidebarMenuItem>
      <AccountDropdown
        trigger={
          <SidebarMenuButton size="lg" asChild={false}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg border-2 border-violet-700/30 bg-violet-900/50 text-sidebar-primary-foreground">
              <span className="text-lg font-bold">{first_name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-semibold">{first_name + " " + last_name}</span>
              <span className="text-xs">{email}</span>
            </div>
          </SidebarMenuButton>
        }
      />
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarHeader>

      <SidebarContent >
        <SidebarGroup className="flex-none border-t" >
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild onClick={() => item.handler(curr_chatid)}>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>







        
        <SidebarGroup  className="flex-1 min-h-0 border-t ">
          <SidebarGroupLabel >Chat History</SidebarGroupLabel>
          <SidebarGroupContent className=" h-full overflow-y-auto max-h-[calc(100vh-200px)]   " >
           <Collapsible defaultOpen className="group/collapsible">
               <CollapsibleTrigger  className="group-data-[state=collapsed]:hidden  mb-2 flex group items-center justify-between w-50 px-2 py-1 rounded-md bg-transparent hover:bg-zinc-700 dark:hover:bg-zinc-700 data-[state=open]:bg-zinc-800 dark:data-[state=open]:bg-zinc-700">
                <span>Previous chats</span>
                <ChevronDown className="transition-transform w-4 h-4 duration-200 group-data-[state=closed]:rotate-270" />
              </CollapsibleTrigger>
             <CollapsibleContent>
  <SidebarMenu>

    {/* History items — NO wrapping SidebarMenuItem */}
    {history.map((item) => (
      <SidebarMenuSubItem key={item.chatId}>
        <SidebarMenuSubButton
          asChild
          className={
            curr_chatid === item.chatId && curr_chatid !== null
              ? "h-10 w-[98%] border border-violet-700 bg-violet-700/30 dark:bg-violet-700/30"
              : "h-10 bg-transparent w-[98%]"
          }
        >
          <Link
            href={`/chats/${item.chatId}`}
            className="flex items-center gap-2 w-[98%] ml-[1%]"
            onClick={() => setcurr_chatid(item.chatId)}
          >
            {item.title}
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    ))}

    {/* Loading skeleton — use SidebarMenuSubItem directly, no SidebarMenuItem wrapper */}
    {loading && (
      <>
        {[1, 2, 3].map((i) => (
          <SidebarMenuSubItem key={`skeleton-${i}`} className="w-full animate-pulse group-data-[state=collapsed]:hidden">
            <div className="h-10 w-full rounded-md bg-zinc-300 dark:bg-zinc-700" />
          </SidebarMenuSubItem>
        ))}
      </>
    )}

    {/* No more chats indicator */}
    {!hasMore && (
      <div className="w-full flex justify-center text-xs text-zinc-400 py-1 group-data-[state=collapsed]:hidden">
        no more chats
      </div>
    )}

    {/* Sentinel */}
    <div ref={sentinelRef} className="h-1 w-full bg-transparent group-data-[state=collapsed]:hidden" />

  </SidebarMenu>
</CollapsibleContent>
            </Collapsible>
          </SidebarGroupContent>
        </SidebarGroup>





      </SidebarContent>
    </Sidebar>
  );
}