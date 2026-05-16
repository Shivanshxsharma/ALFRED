from dotenv import load_dotenv
load_dotenv()  # ✅ runs immediately when module is imported

from langchain_google_genai import ChatGoogleGenerativeAI




llm=ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.2

)


for chunk in llm.stream("create a new story of bruce wayne where he has to fight a japanese maniac minister who kills at niht by name of knight katana"):
    print(chunk, end="", flush=True)