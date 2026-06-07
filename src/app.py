import streamlit as st
import os
import re
import uuid
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
from dotenv import load_dotenv
import backend 
from langchain_core.messages import HumanMessage, AIMessage

load_dotenv()
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

# ==========================================
# 1. DESIGN SYSTEM & THEMING ARCHITECTURE
# ==========================================

@dataclass
class ThemeTokens:
    """
    Centralized design tokens mapping to CSS variables.
    Provides a single source of truth for instantaneous theme pivoting.
    """
    bg_base: str = "#0E0E0E"
    bg_surface: str = "#161616"
    bg_elevated: str = "#1E1E1E"
    text_primary: str = "#F3F4F6"
    text_secondary: str = "#9CA3AF"
    accent: str = "#3B82F6"
    accent_hover: str = "#2563EB"
    border: str = "#27272A"
    radius_md: str = "8px"
    radius_lg: str = "12px"
    font_sans: str = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

def inject_design_system(tokens: ThemeTokens) -> None:
    """
    Mounts CSS custom properties to the DOM root and orchestrates component overrides.
    """
    css = f"""
    <style>
        :root {{
            --bg-base: {tokens.bg_base};
            --bg-surface: {tokens.bg_surface};
            --bg-elevated: {tokens.bg_elevated};
            --text-primary: {tokens.text_primary};
            --text-secondary: {tokens.text_secondary};
            --accent: {tokens.accent};
            --border: {tokens.border};
            --radius-md: {tokens.radius_md};
            --radius-lg: {tokens.radius_lg};
            --font-sans: {tokens.font_sans};
        }}

        /* Typography & Canvas Reset */
        .stApp {{
            background-color: var(--bg-base);
            color: var(--text-primary);
            font-family: var(--font-sans);
        }}
        
        h1, h2, h3, h4, h5, h6, .sidebar-title {{
            color: var(--text-primary) !important;
            font-weight: 600 !important;
            letter-spacing: -0.03em;
        }}

        p, span, div {{
            color: var(--text-secondary);
        }}

        /* Component Mutators */
        .stTextArea textarea, .stTextInput input, .stSelectbox div[data-baseweb="select"] {{
            background-color: var(--bg-elevated) !important;
            color: var(--text-primary) !important;
            border: 1px solid var(--border) !important;
            border-radius: var(--radius-md) !important;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }}
        
        .stTextArea textarea:focus, .stTextInput input:focus {{
            border-color: var(--accent) !important;
            box-shadow: 0 0 0 1px var(--accent) !important;
        }}

        div[data-testid="stExpander"] {{
            background-color: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
        }}

        /* Fluid Navigation Sidebar */
        div[data-testid="stSidebar"] button[kind="secondary"] {{
            background-color: transparent;
            border: 1px solid transparent;
            text-align: left;
            padding: 0.75rem 1rem;
            justify-content: flex-start;
            color: var(--text-secondary);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }}
        
        div[data-testid="stSidebar"] button[kind="secondary"]:hover {{
            background-color: var(--bg-elevated);
            color: var(--text-primary);
            border-color: var(--border);
        }}
    </style>
    """
    st.markdown(css, unsafe_allow_html=True)

def configure_page() -> None:
    st.set_page_config(page_title="ClaimDefense AI", page_icon="⚕️", layout="wide")
    # Instant theme pivot point. Swap parameters here to compile an entirely new aesthetic.
    theme = ThemeTokens() 
    inject_design_system(theme)

# ==========================================
# 2. STATE & DATA ORCHESTRATION
# ==========================================

def init_session_state() -> None:
    if "chats" not in st.session_state:
        st.session_state.chats: Dict[str, Any] = {}
    if "current_chat_id" not in st.session_state:
        st.session_state.current_chat_id: Optional[str] = None

@st.cache_resource(show_spinner=False)
def init_db() -> Any:
    return backend.build_vector_db()

def process_agent_response(response_text: str) -> Tuple[str, Optional[str]]:
    match = re.search(r'<FINAL_LETTER>(.*?)</FINAL_LETTER>', response_text, re.DOTALL)
    draft = match.group(1).strip() if match else None
    clean_ui_text = re.sub(r'<FINAL_LETTER>|</FINAL_LETTER>', '', response_text).strip()
    return clean_ui_text, draft

# ==========================================
# 3. COMPONENT RENDERING
# ==========================================

def render_sidebar() -> Any:
    with st.sidebar:
        st.markdown("<div class='sidebar-title'>ClaimDefense AI</div>", unsafe_allow_html=True)
        
        if st.button("+ New Appeal", use_container_width=True, type="primary"):
            st.session_state.current_chat_id = None
            st.rerun()
            
        st.markdown("---")
        st.markdown("### Active & Past Cases")
        
        if not st.session_state.chats:
            st.caption("No recent appeal logs found.")
        else:
            for chat_id, chat_data in reversed(st.session_state.chats.items()):
                prefix = "🟢" if chat_id == st.session_state.current_chat_id else "📄"
                if st.button(f"{prefix} {chat_data['title']}", key=f"load_{chat_id}", use_container_width=True):
                    st.session_state.current_chat_id = chat_id
                    st.rerun()
            
        st.markdown("---")
        st.subheader("System Status")
        
        vector_db = None
        if MISTRAL_API_KEY:
            with st.spinner("Indexing vector database..."):
                vector_db = init_db()
            if vector_db is None:
                st.error("Vector DB Offline")
            else:
                st.success("Vector DB Active")
        else:
            st.error("Missing Auth Context")
            
    return vector_db

def handle_intake_submission(patient_name: str, denial_reason: str, provider: str, vector_db: Any) -> None:
    """
    Executes the retrieval pipeline, constructs state boundaries, and locks the session state.
    """
    with st.spinner("Setting up..."):
        provider_arg = None if provider == "Auto-Detect" else provider
        context, docs, detected_prov = backend.retrieve_policy_context(denial_reason, vector_db, provider_arg)
        
        new_chat_id = str(uuid.uuid4())
        initial_input = f"Patient: {patient_name}\nDenial Reason: {denial_reason}"
        starting_messages = [HumanMessage(content=initial_input)]
        
        raw_response = backend.chat_with_agent(starting_messages, context, patient_name)
        clean_response, draft = process_agent_response(raw_response)
        
        starting_messages.append(AIMessage(
            content=clean_response,
            additional_kwargs={"draft": draft, "sources": docs}
        ))
        
        st.session_state.chats[new_chat_id] = {
            "title": f"{patient_name}: {detected_prov.upper()}",
            "messages": starting_messages,
            "rag_context": context,
            "retrieved_docs": docs,
            "provider": detected_prov
        }
        st.session_state.current_chat_id = new_chat_id
        st.rerun()

def render_intake_view(vector_db: Any) -> None:
    st.markdown("<h1 style='text-align: center; margin-top: 1rem;'>New Appeal</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center;'>Enter some basic information before we begin drafting.</p>", unsafe_allow_html=True)
    
    with st.container():
       
        col1, col2 = st.columns(2)
        with col1:
            patient_name = st.text_input("Patient Identifier")
        with col2:
            provider_options = ["Auto-Detect", "aetna", "cigna", "unitedhealthcare", "bluecross", "medicare"]
            selected_provider = st.selectbox("Insurance Provider", options=provider_options)
        
        denial_reason = st.text_area(
            "Extraction Data / Letter Text", 
            height=150, 
            placeholder="Inject raw denial reason logic..."
        )
        
        if st.button("Initialize Agent", type="primary", use_container_width=True):
            if denial_reason and patient_name:
                handle_intake_submission(patient_name, denial_reason, selected_provider, vector_db)
            else:
                st.warning("Insufficient parameters provided.")
                
        st.markdown("</div>", unsafe_allow_html=True)

def render_workspace_view() -> None:
    active_chat = st.session_state.chats[st.session_state.current_chat_id]
    
    st.markdown(f"<h3>Workspace: <span style='color: var(--accent);'>{active_chat['provider'].upper()}</span></h3>", unsafe_allow_html=True)
    st.markdown("---")
    
    for i, msg in enumerate(active_chat['messages']):
        if isinstance(msg, HumanMessage) and "Patient:" in msg.content and "Denial Reason:" in msg.content:
            continue
            
        role = "user" if isinstance(msg, HumanMessage) else "assistant"
        with st.chat_message(role):
            st.write(msg.content)
            
            if isinstance(msg, AIMessage):
                sources = msg.additional_kwargs.get("sources", [])
                draft = msg.additional_kwargs.get("draft", None)
                
                if sources:
                    with st.expander("References"):
                        for idx, doc in enumerate(sources):
                            source_name = doc.metadata.get('source', 'Unknown')
                            page = doc.metadata.get('page', 'Unknown')
                            st.markdown(f"**Source {idx+1}:** {os.path.basename(source_name)} (Page {page})")
                            st.caption(doc.page_content[:300] + "...")
                
                if draft:
                    st.success("Draft Compiled.")
                    st.download_button(
                        label="⬇️ Download Output Payload (.TXT)",
                        data=draft,
                        file_name=f"Appeal_{active_chat['provider']}_{st.session_state.current_chat_id[:5]}.txt",
                        mime="text/plain",
                        use_container_width=True,
                        type="primary",
                        key=f"dl_btn_{st.session_state.current_chat_id}_{i}" 
                    )

    if active_chat['rag_context'] is not None:
        if user_input := st.chat_input("Execute follow-up instruction..."):
            active_chat['messages'].append(HumanMessage(content=user_input))
            st.rerun()

    if len(active_chat['messages']) > 0 and isinstance(active_chat['messages'][-1], HumanMessage):
        with st.chat_message("assistant"):
            with st.spinner("Processing trajectory..."):
                raw_response = backend.chat_with_agent(
                    active_chat['messages'],
                    active_chat['rag_context'],
                    "" 
                )
                clean_response, draft = process_agent_response(raw_response)
                
                active_chat['messages'].append(AIMessage(
                    content=clean_response,
                    additional_kwargs={"draft": draft, "sources": active_chat['retrieved_docs']}
                ))
                st.rerun()

# ==========================================
# 4. ENTRY POINT
# ==========================================

def main() -> None:
    configure_page()
    init_session_state() 
    
    mistral_key = os.getenv("MISTRAL_API_KEY")
    if not mistral_key or mistral_key == "myKeyExistsHere" or len(mistral_key) < 20:
        st.error("Invalid Authentication parameters. Halt execution.")
        st.stop()

    vector_db = render_sidebar()
    if vector_db is None:
        st.warning("Database mounting failed.")
        st.stop()

    if st.session_state.current_chat_id is None:
        render_intake_view(vector_db)
    else:
        render_workspace_view()

if __name__ == "__main__":
    main()