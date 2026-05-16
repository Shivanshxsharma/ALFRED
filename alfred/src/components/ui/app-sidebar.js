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




import { user_contextStore } from "@/services/contextStrore";
import { useShallow } from "zustand/react/shallow";
import { shallow } from 'zustand/shallow';
import { useCallback, useEffect, useRef, useState } from "react";


import { fetchuserHistory } from "@/services/fetch_info";


const items = [
  { title: "New chat", url: "/", icon: Pen },

];




const PAGE_SIZE = 10;


export function AppSidebar() {

// Separate selectors
const first_name = user_contextStore(useShallow((state) => state.first_name));
const last_name = user_contextStore(useShallow((state) => state.last_name));
const email = user_contextStore(useShallow((state) => state.email));
const initialHistory = user_contextStore(useShallow((state) => state.chat_titles));
const updateHistory  = user_contextStore(useShallow((state) => state.updateHistory));



const [history, setHistory]     = useState([]); // local state for chat history
  const [page, setPage]           = useState(1.5);           // next page to fetch
  const [hasMore, setHasMore]     = useState(true);
  const [loading, setLoading]     = useState(false);

  
  
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





  //update history on new chat addition
useEffect(() => {

  const loadNewChat = async () => {
    try {
      if(updateHistory){
      const data = await fetchuserHistory(0, 2);
      
      setHistory((prev) => {
        const ids = new Set(prev.map((c) => c.chatId));
        return [
          ...data.items.filter((c) => !ids.has(c.chatId)), 
          ...prev
        ];
      });
      updateHistory.setState(false);
    }
    
    } catch (err) {
      console.error(err);
    }
  };

  loadNewChat();

}, [updateHistory]);












  return (
    <Sidebar  collapsible="icon" variant="floating">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/" className="">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg  bg-linear-to-r from-slate-600 to-slate-700 text-sidebar-primary-foreground">
                  <span className="text-lg font-bold">A</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{first_name+" "+last_name}</span>
                  <span className="text-xs">{email}</span>
                </div>
              </a>
            </SidebarMenuButton>
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
                  <SidebarMenuButton asChild>
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
               <CollapsibleTrigger  className="group-data-[state=collapsed]:hidden flex group items-center justify-between w-50 px-2 py-1 rounded-md bg-transparent hover:bg-zinc-700 dark:hover:bg-zinc-700 data-[state=open]:bg-zinc-800 dark:data-[state=open]:bg-zinc-700">
                <span>Previous chats</span>
                <ChevronDown className="transition-transform w-4 h-4 duration-200 group-data-[state=closed]:rotate-270" />
              </CollapsibleTrigger>
              <CollapsibleContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  
                    {
                      history.map((item)=>(
                        <SidebarMenuSubItem key={item.chatId} > 
                        <Link href={`/chats/${item.chatId}`} className="flex items-center gap-2 w-full">
                         <SidebarMenuSubButton className="h-10 w-full">
                          <span >
                          
                            
                              {item.title}
                            
                         
                          </span>
                         </SidebarMenuSubButton> </Link>
                    </SidebarMenuSubItem>
                      ))
                    }
                    

                 {/* sentinal element for intersection observer */}


<SidebarMenuItem   className={` ${loading? 'flex' : 'hidden'}    flex-col items-center gap-2 w-full animate-pulse group-data-[state=collapsed]:hidden`}>
  <SidebarMenuSubItem className="w-full">
    <div className="h-10 w-full rounded-md bg-zinc-300 dark:bg-zinc-700"></div>
  </SidebarMenuSubItem>

  <SidebarMenuSubItem className="w-full">
    <div className="h-10 w-full rounded-md bg-zinc-300 dark:bg-zinc-700"></div>
  </SidebarMenuSubItem>

  <SidebarMenuSubItem className="w-full">
    <div className="h-10 w-full rounded-md bg-zinc-300 dark:bg-zinc-700"></div>
  </SidebarMenuSubItem>
</SidebarMenuItem>   
                                
                <div  className={` ${!hasMore? 'h-1' : 'hidden'} w-full flex justify-center text-zinc-400 bg-transparent group-data-[state=collapsed]:hidden`} >no more chats</div>
                <div ref={sentinelRef} className="h-1 w-full bg-transparent group-data-[state=collapsed]:hidden" /> 
                 
            




                </SidebarMenuItem>
              </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroupContent>
        </SidebarGroup>





      </SidebarContent>
    </Sidebar>
  );
}