import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from "uuid"
import { abortStream, streamChatResponse } from './streaming';
import { use } from 'react';
import { fetchOldMessages, fetchUserInfo } from './fetch_info';
import { BrainIcon, Globe2 } from "lucide-react";
import { useErrorBanner } from '@/components/ui/ErrorBanner';




export const usechatStore = create(
  immer((set,get) => ({
    new_created_chatId:null,
    curr_chatid:null,
    updateHistory:false,
    Curr_Conversation_array: [],
    tool_array:[],
    files_array:[],
    isStreaming: false,
    abortController: null,
    error: null,
    selectedModel:"gemini-2.5-flash",
    toggleTools:[
      { id: "web_search_enabled",       icon: Globe2,     label: "Web search",     enabled: true },
      { id: "remembring_enabled",       icon: BrainIcon,     label: "Memory",     enabled: true },
    ],

    actions: {
      

      setSelectedModel: (model) => set((state) => {
        state.selectedModel = model;
      }),



      showError: (message) => set((state) => {
        state.error = message;
        setTimeout(() => {
          set((state) => { state.error = null; });
        },5000);
      }),

setUpdateHistory: (val) => set((state) => {
  state.updateHistory = val
  }),


      toggleTool: (id) =>
        set((state) => {
          const tool = state.toggleTools.find(t => t.id === id);
          if (tool) tool.enabled = !tool.enabled;
        }),

        
addFile: (file) => {
  const id = uuidv4()
  const ext = file.name.split(".").pop()?.toLowerCase() || ""
  const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"]
  const type = IMAGE_EXTENSIONS.includes(ext) ? "image" : "document"

  set((state) => {
    state.files_array.push({
      id,
      file_hash:null,
      needs_rag:null,
      name: file.name,
      progress: 0,
      raw: file,
      status: "uploading",
      type,          
      path: null,
      base64: null,
      mime_type: null,
      uploaded: false,
      error: false,
    })
  })
  return id
},
       
setFileServerData: (id, serverData) => set((state) => {
  const file = state.files_array.find(f => f.id === id)
  if (file) {
    file.path = serverData.path || null
    file.file_hash = serverData.file_hash || null
    file.needs_rag = serverData.needs_rag ;
    file.base64 = serverData.base64 || null
    file.mime_type = serverData.mime_type || null
    file.uploaded = true
  }
}),




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

        setFilestatus: (name, status) => set((state) => {
          const file = state.files_array.find(f => f.name === name)
          if (file) file.status = status
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
            "meta_data": { 
            "files_uploaded": get().files_array.filter(f => !f.error).map(f => ({ name: f.name, type: f.type , mime_type: f.mime_type,  base64: f.base64 }))
              }
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

updateTool: (tool_name, updates) => set((state) => ({
    // ✅ return new array — never mutate state directly
    tool_array: state.tool_array.map(tool =>
        tool.name === tool_name
            ? { ...tool, ...updates }  // ✅ new object
            : tool
    )
})),

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
        const controller = new AbortController();
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
              "meta_data": {
                files_uploaded: get().files_array.filter(f => !f.error && f.type !== "image").map(f => ({ name: f.name, path: f.path,file_hash: f.file_hash, needs_rag: f.needs_rag })),
                images_uploaded: get().files_array.filter(f => f.type === "image" && !f.error).map(f => ({ name: f.name, base64: f.base64, mime_type: f.mime_type })),
                "model_id": "zai-glm-4.7",
                toggled_tools: get().toggleTools.reduce((acc, tool) => {
                  acc[tool.id] = tool.enabled;
                  return acc;
                }, {})
              }
            },
            (chunk) => get().actions.appendStreamingChunk(chunk), // Use callbacks
            (isStreaming) => get().actions.setisStreaming(isStreaming),
            isnew_Chat,
            controller.signal

          );
        } catch (error) {
          console.error("Streaming failed:", error);
          get().actions.setisStreaming(false);
        }
    },




    fillOldChat: (chatid,router) =>{
      // const { error, showError } = useErrorBanner()
      const chatId=get().curr_chatid;
      const oldMessages= fetchOldMessages(chatId)
      .then((messages) => {
        set((state) => {
          state.Curr_Conversation_array = messages;
        });
      })
      .catch((error) => {
        get().actions.showError("Failed to load chat history");
        console.error("Failed to fetch old messages:", error);
        router.push('/chats');
    }


    
  )

console.log("Old messages loaded:", get().Curr_Conversation_array);
},
   
  stopStreaming: async () => {
  const { abortController, curr_chatid } = get();
  abortController?.abort(); 
    if (curr_chatid) {
    await abortStream(curr_chatid);
  }

  set(state => {
    state.isStreaming = false;
    state.abortController = null;
  });
},






  
    },  
  
  
  
  
  
  







})



    
)
);








export const useChatActions = () => usechatStore((state) => state.actions);













export const user_contextStore = create(immer((set, get) => ({
    user_id: "",
    first_name: "",
    last_name: "",
    email: "",
    image: "",
    chat_titles: [],
    updateHistory: false,
    connected_models: {},        // ✅ object from the start, not []
    connected_providers: [],     // this one IS genuinely a list (from get_connected_providers_with_hints), so [] is correct here

    actions: {
      setUpdateHistory: (val) => set((state) => {
        state.updateHistory = val
      }),

      updateUser: (user_data) => {
        set((state) => {
          state.user_id = user_data.userid;
          state.first_name = user_data.first_name;
          state.last_name = user_data.last_name;
          state.email = user_data.email;
          state.image = user_data.image;
          state.connected_providers = user_data.connected_providers || [];
          state.connected_models = user_data.connected_models || {};   // ✅ fallback to {}, not []
        });
      },

      fetchUserInfo: async (router) => {
        try {
          if (get().user_id === "" || get().user_id === null) {
            const data = await fetchUserInfo();
            get().actions.updateUser(data)
            if (get().chat_titles.length === 0) set((state) => {
              state.chat_titles = data.chat_history || [];
            });
            console.log(data);
          } else {
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