import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from "uuid"
import { streamChatResponse } from './streaming';
import { use } from 'react';
import { fetchOldMessages, fetchUserInfo } from './fetch_info';

export const usechatStore = create(
  immer((set,get) => ({
    new_created_chatId:null,
    curr_chatid:null,
    Curr_Conversation_array: [],
    tool_array:[],
    files_array:[],
    isStreaming: false,
    toggleTools:{
      "web_search":false,
    },

    actions: {




      addFile: (file) => {
        const id = uuidv4();
        set((state) => {
          state.files_array.push({
            name: file.name,
            id,
            progress: 0,
            raw: file,
          });
        });
        return id;
      },

      removeFile: (fileId) => set((state) => {
        state.files_array = state.files_array.filter(file => file.id !== fileId);
        console.log(state.files_array);
            }),


updateFileProgress: (id, progress) => {
  const updated = get().files_array.map(f => 
    f.id === id ? { ...f, progress } : f
  )
  set({ files_array: updated })
},


setFileError: (id) => set((state) => {
  const file = state.files_array.find(f => f.id === id)
  if (file) file.error = true
}),






            setisStreaming: (bool) => set((state) => {
        state.isStreaming = bool;
      }),
      setcurr_chatid: (chatId) => set((state) => {
        console.log("setting chat id",chatId)
        state.curr_chatid = chatId;
      }),

      new_chat: () => {
        let newId = uuidv4();
        set((state) => {
          state.curr_chatid = newId;
          state.new_created_chatId = newId;
          state.Curr_Conversation_array = [];
          state.isStreaming = false;
        });
        return newId;
      },

      addMessage: (role, content) =>
        set((state) => {
          state.Curr_Conversation_array.push({
            "role":role,
            "content":content,
          });
          console.log("Message added:", content);
        }),



      addTool: (tool) => set((state) => {
         state.tool_array.push({
           name: tool.name,
           input: tool.input,
           status: tool.status, // "running"
         });
       }),

       updateTool: (tool_name, updates) => set((state) => {
         const tool = state.tool_array.find(t => t.name === tool_name);       
         if (tool) {
           Object.assign(tool, updates); // updates = { status: "done" }
         }
       }),

clearTools: () => set((state) => {
  state.tool_array = [];
}), 
        



        




appendStreamingChunk: (chunk) =>
  set((state) => {
    const index = state.Curr_Conversation_array.length - 1;
    if (index >= 0) {
      // Immer ensures this mutation triggers a re-render
      state.Curr_Conversation_array[index].content += chunk;
    }
    // console.log("Appended chunk:", state.Curr_Conversation_array);
  }),







      submitHandler: async (prompt,router) =>{
        let chatId=get().curr_chatid;
        let isnew_Chat=false;
        if(chatId===null||!chatId){
          // console.log(chatId);
          isnew_Chat=true;
          chatId=get().actions.new_chat();
          router.replace(`/chats/${chatId}`);

        }
        
        
        get().actions.addMessage('human', prompt);
        get().actions.addMessage('ai', '');
        get().actions.setisStreaming(true);

        
        try {
          await streamChatResponse(
            chatId,
            { 
              "role":"human",
              "content":prompt,
            },
            (chunk) => get().actions.appendStreamingChunk(chunk), // Use callbacks
            (isStreaming) => get().actions.setisStreaming(isStreaming),
            isnew_Chat,
            user_contextStore.getState().user_id
          );
        } catch (error) {
          console.error("Streaming failed:", error);
          get().actions.setisStreaming(false);
        }
    },




    fillOldChat: (chatid) =>{
      const chatId=get().curr_chatid;
      const oldMessages= fetchOldMessages(chatId)
      .then((messages) => {
        set((state) => {
          state.Curr_Conversation_array = messages;
        });
      })
      .catch((error) => {
        console.error("Failed to fetch old messages:", error);
        alert("Failed to load chat history. Please try again.");  
        router.push('/chats');
    }
  )}
  
  
  
    },  })
)
);






export const useChatActions = () => usechatStore((state) => state.actions);














export const user_contextStore = create(immer((set, get) => ({
    user_id:"",
    first_name:"",
    last_name:"",
    email:"",
    image:"",
    chat_titles:[],
    updateHistory:false, 

    actions: {
      updateUser: (user_data) => {
        set((state) => {
          state.user_id = user_data.userid;
          state.first_name = user_data.First_Name;
          state.last_name = user_data.Last_Name;
          state.email = user_data.email;
          state.image = user_data.image;
        });
      },




       fetchUserInfo: async (router)=>{
        try{
          if(get().user_id===""||get().user_id===null){
             const data=await fetchUserInfo();
             get().actions.updateUser(data)
             if(get().chat_titles.length===0) set((state)=>{
              state.chat_titles=data.chat_history||[];
             });
             console.log(data);
          }else{
            console.log("user already fetched.....");
          }

        }
        catch (error) {
          console.error("failed fetch user info :", error);
          alert("failed to fetch user info , please log in again");
          router.push('/auth');
        }
             
       }


    },
})));
