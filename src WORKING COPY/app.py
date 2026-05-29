import streamlit as st
import os
import re
from dotenv import load_dotenv
import backend 

from langchain_core.messages import HumanMessage, AIMessage


# Load environment variables
load_dotenv()
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

def configure_page():
    st.set_page_config(page_title="Medical Appeal Generator", page_icon="⚕️", layout="wide")
    st.markdown("""
        <style>
            /* Gemini Aesthetic Styles */
            .stApp { background-color: #131314; color: #e3e3e3; }
            .sidebar-title { font-size: 1.25rem; font-weight: 600; color: #e3e3e3; margin-bottom: 1rem; }
            .chat-history-item { padding: 0.5rem 0.75rem; border-radius: 8px; margin-bottom: 0.25rem; background-color: transparent; cursor: pointer; transition: background 0.2s; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #c4c7c5; }
            .chat-history-item:hover { background-color: #282a2d; color: #e3e3e3; }
            .intake-card { background-color: #1e1f20; padding: 2rem; border-radius: 16px; border: 1px solid #444746; margin: 2rem auto; max-width: 800px; }
            div[data-testid="stExpander"] { background-color: #1e1f20; border: 1px solid #444746; border-radius: 12px; }
            .stTextArea textarea, .stTextInput input, .stSelectbox div[data-baseweb="select"] { background-color: #131314 !important; color: #e3e3e3 !important; border: 1px solid #444746 !important; }
        </style>
    """, unsafe_allow_html=True)
    
def init_session_state():
    """Initializes session state variables cleanly at startup."""
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "rag_context" not in st.session_state:
        st.session_state.rag_context = None
    if "retrieved_docs" not in st.session_state:
        st.session_state.retrieved_docs = None
    if "detected_provider" not in st.session_state:
        st.session_state.detected_provider = None
    if "final_letter_draft" not in st.session_state:
        st.session_state.final_letter_draft = None
    if "past_chats" not in st.session_state:
        st.session_state.past_chats = []
    if "agent_active" not in st.session_state:
        st.session_state.agent_active = False

@st.cache_resource(show_spinner=False)
def init_db():
    return backend.build_vector_db()

def process_agent_response(response_text):
    """Extracts the draft and cleans the text for the UI."""
    match = re.search(r'<FINAL_LETTER>(.*?)</FINAL_LETTER>', response_text, re.DOTALL)
    draft = match.group(1).strip() if match else None
    clean_ui_text = re.sub(r'<FINAL_LETTER>|</FINAL_LETTER>', '', response_text).strip()
    return clean_ui_text, draft

def render_sidebar():
    with st.sidebar:
        st.markdown("<div class='sidebar-title'>ClaimDefense AI</div>", unsafe_allow_html=True)
        
        # New Chat Button (Mimics Gemini's '+ New Chat')
        if st.button("+ New Appeal", use_container_width=True, type="secondary"):
            st.session_state.messages = []
            st.session_state.rag_context = None
            st.session_state.retrieved_docs = None
            st.session_state.detected_provider = None
            st.session_state.final_letter_draft = None
            st.session_state.agent_active = False
            st.rerun()
            
        st.markdown("---")
        
        # Gemini Style Recents / History List
        st.markdown("### Recent Cases")
        
        past_chats = st.session_state.get("past_chats", [])
        
        if past_chats:
            for item in past_chats:
                st.markdown(f"<div class='chat-history-item'>📄 {item}</div>", unsafe_allow_html=True)
        else:
            st.caption("No recent appeal logs found.")
            
        st.markdown("---")
        st.subheader("Status")
        vector_db = None
        
        if MISTRAL_API_KEY:
            with st.spinner("Indexing vector database..."):
                vector_db = init_db()
            if vector_db is None:
                st.error("Vector Database Offline")
            else:
                st.success("Vector Database Active")
        else:
            st.error("Missing Mistral API Key in `.env`")
            
        st.markdown("---")
        st.caption("2026")
        
    return vector_db

def render_main_content(vector_db):
    # CASE 1: If agent is NOT active, display the centralized input interface card
    if not st.session_state.agent_active:
        st.markdown("<h1 style='text-align: center; margin-top: 2rem; color: #e3e3e3;'>AI Medical Appeal Co-Pilot</h1>", unsafe_allow_html=True)
        st.markdown("<p style='text-align: center; color: #9aa0a6;'>Input patient claim criteria to initialize the specialized RAG tracking agent.</p>", unsafe_allow_html=True)
        
        with st.container():
            st.markdown("<div class='intake-card'>", unsafe_allow_html=True)
            st.subheader("1. Initial Case Details")
            patient_name = st.text_input("Patient Name (or ID)")
            provider_options = ["Auto-Detect", "aetna", "cigna", "unitedhealthcare", "bluecross", "medicare"]
            selected_provider = st.selectbox("Insurance Provider", options=provider_options)
            
            denial_reason = st.text_area(
                "Extracted Denial Reason / Letter Text", 
                height=180, 
                placeholder="e.g., 'Procedure CPT 70551 deemed not medically necessary...'"
            )
            
            if st.button("Initialize Appeal Agent", type="primary", use_container_width=True):
                if denial_reason:
                    with st.spinner("Analyzing denial data and extracting policies..."):
                        st.session_state.final_letter_draft = None 
                        provider_arg = None if selected_provider == "Auto-Detect" else selected_provider
                        
                        context, docs, detected_prov = backend.retrieve_policy_context(
                            denial_reason, vector_db, provider_arg
                        )
                        
                        st.session_state.rag_context = context
                        st.session_state.retrieved_docs = docs
                        st.session_state.detected_provider = detected_prov
                        
                        initial_input = f"Patient: {patient_name}\nDenial Reason: {denial_reason}"
                        st.session_state.messages = [HumanMessage(content=initial_input)]
                        
                        raw_response = backend.chat_with_agent(
                            st.session_state.messages, 
                            st.session_state.rag_context, 
                            patient_name
                        )

                        # 1. Unpack both variables correctly
                        clean_response, draft = process_agent_response(raw_response)

                        # 2. Bind the draft and sources to the message state just like you did in CASE 2
                        new_ai_msg = AIMessage(
                            content=clean_response,
                            additional_kwargs={
                                "draft": draft,
                                "sources": st.session_state.retrieved_docs
                            }
                        )
                        st.session_state.messages.append(new_ai_msg)
                        # Add case title descriptor string into history list array tracking
                        case_title = f"{patient_name if patient_name else 'Unknown'}: {detected_prov.upper()}"
                        
                        if case_title not in st.session_state.get("past_chats", []):
                            st.session_state["past_chats"].insert(0, case_title)
                            
                        # Change layout display visibility mode state trigger flag switch
                        st.session_state.agent_active = True
                        st.rerun()
                else:
                    st.warning("Please provide the denial reason to start.")
            st.markdown("</div>", unsafe_allow_html=True)

    # CASE 2: When submitted, clear screen and display full screen conversational workspace
    else:
        st.markdown(f"<h3>Case Workspace: <span style='color: #2563EB;'>{st.session_state.detected_provider.upper()}</span></h3>", unsafe_allow_html=True)
        st.markdown("---")
        
        # Render clean vertical conversation timeline
        for i, msg in enumerate(st.session_state.messages):
            # Hide the initial system data injection from the user
            if isinstance(msg, HumanMessage) and "Patient:" in msg.content and "Denial Reason:" in msg.content:
                continue
                
            role = "user" if isinstance(msg, HumanMessage) else "assistant"
            with st.chat_message(role):
                st.write(msg.content)
                
                # Check for attached sources and drafts ONLY on AI messages
                if isinstance(msg, AIMessage):
                    sources = msg.additional_kwargs.get("sources", [])
                    draft = msg.additional_kwargs.get("draft", None)
                    
                    # Render Sources for THIS specific response
                    if sources:
                        with st.expander("🔍 View Sourced Policy Reference Guidelines"):
                            for idx, doc in enumerate(sources):
                                source_name = doc.metadata.get('source', 'Unknown')
                                page = doc.metadata.get('page', 'Unknown')
                                st.markdown(f"**Source {idx+1}:** {os.path.basename(source_name)} (Page {page})")
                                st.caption(doc.page_content[:300] + "...")
                    
                    # Render Download Button for THIS specific response
                    # CRITICAL: Streamlit requires unique keys for duplicated widgets!
                    if draft:
                        st.success("✅ Final Actionable Draft Compiled Successfully!")
                        st.download_button(
                            label="⬇️ Download Letter Content payload (.TXT)",
                            data=draft,
                            file_name=f"Appeal_Workspace_Output_{i}.txt",
                            mime="text/plain",
                            use_container_width=True,
                            type="primary",
                            key=f"download_btn_{i}" 
                        )

        # Dynamic floating conversation text-bar
        if st.session_state.rag_context is not None:
            if user_input := st.chat_input("Provide details or type 'Draft the letter'"):
                st.session_state.messages.append(HumanMessage(content=user_input))
                st.rerun()

        # Handle message appending generation loop
        if len(st.session_state.messages) > 0 and isinstance(st.session_state.messages[-1], HumanMessage):
            with st.chat_message("assistant"):
                with st.spinner("Agent is typing..."):
                    raw_response = backend.chat_with_agent(
                        st.session_state.messages,
                        st.session_state.rag_context,
                        "" # Patient name is already in context
                    )
                    
                    clean_response, draft = process_agent_response(raw_response)
                    
                    # Bind the state to the message object
                    new_ai_msg = AIMessage(
                        content=clean_response,
                        additional_kwargs={
                            "draft": draft,
                            "sources": st.session_state.retrieved_docs
                        }
                    )
                    st.session_state.messages.append(new_ai_msg)
                    st.rerun()

def main():
    configure_page()
    init_session_state() 
    
    mistral_key = os.getenv("MISTRAL_API_KEY")
    langchain_key = os.getenv("LANGCHAIN_API_KEY")
    
    if not mistral_key or mistral_key == "myKeyExistsHere" or len(mistral_key) < 20:
        st.error("Invalid Mistral API Key detected. Please update your `.env` file with a valid key.")
        st.stop()
        
    if not langchain_key or langchain_key == "myKeyExistsHere":
        st.warning("LangSmith API Key is invalid. Tracing will fail. Update your `.env` file or disable tracing.")

    vector_db = render_sidebar()
    if vector_db is None:
        st.warning("No policy PDFs found in `/policies`. Database offline.")
        st.stop()

    render_main_content(vector_db)

if __name__ == "__main__":
    main()