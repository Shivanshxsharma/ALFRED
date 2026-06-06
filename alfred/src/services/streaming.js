import { fetchEventSource } from '@microsoft/fetch-event-source';
import { user_contextStore, usechatStore } from './contextStrore';





export const streamChatResponse = async (chatId, prompt, onChunk, onComplete,isnew_Chat,user_id,signal) => {
  await fetchEventSource('http://127.0.0.1:8000/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: signal,
    body: JSON.stringify({ "is_new_chat":isnew_Chat,"user_id":user_id, "chatId":chatId, "prompt":prompt }),
    onmessage(ev) {
      const data = JSON.parse(ev.data);
      console.log("Received data:", data);
      if (data.type === 'stream'){
        
       onChunk(data.content);
      } 


       
      if (data.type === "tool_start") {
        usechatStore.getState().actions.addTool({ name: data.tool_name, input: data.tool_input, status: "running" });
       }
      if (data.type === "tool_end") {
        usechatStore.getState().actions.updateTool(data.tool_name, { status: "done" });
       } 
      if (data.type === 'complete'){
        if(isnew_Chat){
          user_contextStore.setState((state) => ({  
          ...state,
         updateHistory: !state.updateHistory
         }));}
        onComplete(false);
      } 



      if(data.type==='error'){
        console.log("Error received from server:", data.status);
        if(data.status=="ChatGoogleGenerativeAIError")onChunk("\n[Error]: Rate limit exceeded. Please try again after recharging keys.");
        if(data.status=="429")onChunk("\n[Error]: Rate limit exceeded. Please try again after recharging keys.");
        if(data.status==500)onChunk("\n[Error]: Internal Server Error. Please try again later.");
        if(data.status==="ConnectError")onChunk("\n[Error]: No Internet Connection. Please check your connection.");
        onComplete(false);
      }
    },
    onerror(err){
      console.error("EventSource error:", err);
      onComplete(false);
    }
  });
};




export const abortStream = async (chatId) => {
  try {
    const response = await fetch(`http://127.0.0.1:8000/abort/${chatId}`, {
      method: 'POST'
    });
    const result = await response.json();
    console.log("Abort result:", result);
  } catch (error) {
    console.error("Error aborting stream:", error);
  }
};