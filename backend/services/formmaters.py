# message_helpers.py
#
# Two functions to drop into backend/services/llm_model/model.py:
#
# 1. normalize_ai_message()  — collapses any provider-specific AIMessage.content
#    shape (Gemini's list-of-parts with extras/signature, stray string fragments,
#    etc.) into a clean string. Applied ONCE per turn, right after llm.ainvoke(),
#    so malformed shapes never enter MongoDBSaver-backed conversation history.
#
# 2. build_final_messages()  — replaces the inline message-building logic
#    currently inside chat_node. Fixes the bug where, after a tool call,
#    non_system[-1] is a ToolMessage (not a fresh HumanMessage), but the old
#    code blindly treated it as the user's question, stripped it, and replaced
#    it with a HumanMessage — corrupting the tool_call/tool_message pairing
#    and breaking OpenAI-format providers with:
#        "An assistant message with 'tool_calls' must be followed by tool
#         messages responding to each 'tool_call_id'"
#
# Both functions are provider-agnostic — they don't need to know whether the
# active model is Gemini, Cerebras, OpenRouter, Groq, GLM, etc.

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)

def normalize_ai_message(message: AIMessage) -> AIMessage:
    """
    Collapse any provider-specific content shape into a single clean string
    before it gets checkpointed.
 
    - OpenAI-compatible providers (Cerebras, OpenRouter, Groq, Mistral, GLM,
      Kimi, DeepSeek — all routed through ChatOpenAI) already return content
      as a plain string. This is a no-op for them.
    - Gemini (ChatGoogleGenerativeAI) returns content as a list of parts,
      sometimes mixing {'type': 'text', 'text': ..., 'extras': {...}} dicts
      with bare string fragments. This flattens that into one clean string.
 
    tool_calls is left untouched — already normalized identically by
    LangChain regardless of provider.
    """
    content = message.content
 
    if isinstance(content, str):
        return message
 
    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, str):
                text_parts.append(item)
            elif isinstance(item, dict):
                text = item.get("text")
                if text:
                    text_parts.append(text)
        clean_text = "".join(text_parts)
        return AIMessage(
            content=clean_text,
            tool_calls=message.tool_calls or [],
            id=message.id,
            name=message.name,
            response_metadata=message.response_metadata,
        )
 
    return AIMessage(
        content=str(content) if content else "",
        tool_calls=message.tool_calls or [],
        id=message.id,
        name=message.name,
        response_metadata=message.response_metadata,
    )
 
 
def build_final_messages(
    messages: list[BaseMessage],
    system_prompt: str,
    injected_file_text: str,
    images_uploaded: list[dict],
) -> tuple[list[BaseMessage], str]:
    """
    Build the message list to send to the LLM this turn, and return whatever
    image_context string was generated (so chat_node can log/inspect it if
    needed — though it's already folded into system_prompt by the caller
    pattern below).
 
    Key fix: only rewrite the last message (to inject file/image context)
    when it is genuinely a fresh HumanMessage. If the last message is a
    ToolMessage — chat_node re-invoked after a tool call completed — leave
    the message list completely untouched. Rewriting a ToolMessage into a
    HumanMessage breaks the tool_call_id pairing that OpenAI-format
    providers require, causing:
        "An assistant message with 'tool_calls' must be followed by tool
         messages responding to each 'tool_call_id'"
    """
    non_system = [m for m in messages if not isinstance(m, SystemMessage)]
 
    if not non_system:
        return [SystemMessage(content=system_prompt)], ""
 
    last_message = non_system[-1]
    image_context = ""
 
    if isinstance(last_message, HumanMessage):
        raw_text = (
            last_message.content
            if isinstance(last_message.content, str)
            else "".join(
                part.get("text", "")
                for part in last_message.content
                if isinstance(part, dict)
            )
        )
 
        content_blocks = [{"type": "text", "text": injected_file_text + raw_text}]
 
        if images_uploaded:
            image_names = "\n".join(f"- {img['name']}" for img in images_uploaded)
            image_context = f"""
                             The user has also uploaded these images which are embedded directly in this message:
                            {image_names}
                             Analyze them as part of your response — no tool call needed for images.
                            """
            for img in images_uploaded:
                content_blocks.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{img['mime_type']};base64,{img['base64']}"},
                })
 
        non_system = non_system[:-1] + [HumanMessage(content=content_blocks)]
 
 
 
    return [SystemMessage(content=system_prompt)] + non_system, image_context