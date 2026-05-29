import streamlit as st
import os
import re
import uuid
from dotenv import load_dotenv
import backend 

from langchain_core.messages import HumanMessage, AIMessage

# Load environment variables
load_dotenv()
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

def configure_page():
    st.set_page_config(page_title="ClaimDefense AI", page_icon="⚕️", layout="wide")
    st.markdown("""
        <style>
            /* Professional B2B Dark Aesthetic */
            .stApp { background-color: #131314; color: #e3e3e3; }
            .sidebar-title { font-size: 1.25rem; font-weight: 600; color: #e3e3e3; margin-bottom: 1rem; }
            .intake-card { background-color: #1e1f20; padding: 2rem; border-radius: 12px; border: 1px solid #444746; margin: 1rem auto; }
            div[data-testid="stExpander"] { background-color: #1e1f20; border: 1px solid #444746; border-radius: 8px; }
            .stTextArea textarea, .stTextInput input, .stSelectbox div[data-baseweb="select"] { background-color: #131314 !important; color: #e3e3e3 !important; border: 1px solid #444746 !important; }
            
            /* Clean up sidebar buttons to look like history items */
            div[data-testid="stSidebar"] button {
                border: none;
                background-color: transparent;
                text-align: left;
                padding: 0.5rem;
                justify-content: flex-start;
                font-size: 0.9rem;
                color: #c4c7c5;
            }
            div[data-testid="stSidebar"] button:hover {
                background-color: #282a2d;
                color: #e3e3e3;
            }
        </style>
    """, unsafe_allow_html=True)
    
def init_session_state():
    """Initializes a dictionary-based session state to handle multiple chat instances."""
    if "chats" not in st.session_state:
        # Structure: { chat_id: { 'title': str, 'messages': list, 'rag_context': str, 'retrieved_docs': list, 'provider': str } }
        st.session_state.chats = {}
    if "current_chat_id" not in st.session_state:
        st.session_state.current_chat_id = None

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
        
        # Reset to Intake Screen
        if st.button("+ New Appeal", use_container_width=True, type="primary"):
            st.session_state.current_chat_id = None
            st.rerun()
            
        st.markdown("---")
        st.markdown("### Active & Past Cases")
        
        # Render dynamic history buttons
        if not st.session_state.chats:
            st.caption("No recent appeal logs found.")
        else:
            # Reverse order to show newest first
            for chat_id, chat_data in reversed(st.session_state.chats.items()):
                # Highlight the active chat visually
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
                st.error("Vector DB Offline: No Policies")
            else:
                st.success("Vector DB Active")
        else:
            st.error("Missing Mistral API Key")
            
    return vector_db

def render_main_content(vector_db):
    # CASE 1: No active chat selected -> Show Intake Interface
    if st.session_state.current_chat_id is None:
        st.markdown("<h1 style='text-align: center; margin-top: 1rem; color: #e3e3e3;'>New Appeal</h1>", unsafe_allow_html=True)
        st.markdown("<p style='text-align: center; color: #9aa0a6;'>Input claim criteria to filter exact metadata and initiate the RAG agent.</p>", unsafe_allow_html=True)
        
        with st.container():
            st.markdown("<div class='intake-card'>", unsafe_allow_html=True)
            
            # Using columns for a denser, more professional B2B layout
            col1, col2 = st.columns(2)
            with col1:
                patient_name = st.text_input("Patient Name (or ID)")
            with col2:
                provider_options = ["Auto-Detect", "aetna", "cigna", "unitedhealthcare", "bluecross", "medicare"]
                selected_provider = st.selectbox("Insurance Provider Filter", options=provider_options)
            
            denial_reason = st.text_area(
                "Extracted Denial Reason / Letter Text", 
                height=150, 
                placeholder="Paste the exact text of the denial reason here. E.g., 'CPT 70551 not deemed medically necessary...'"
            )
            
            if st.button("Initialize Appeal Agent", type="primary", use_container_width=True):
                if denial_reason and patient_name:
                    with st.spinner("Analyzing denial data and retrieving policy guidelines..."):
                        provider_arg = None if selected_provider == "Auto-Detect" else selected_provider
                        
                        # 1. Run Retrieval Pipeline
                        context, docs, detected_prov = backend.retrieve_policy_context(
                            denial_reason, vector_db, provider_arg
                        )
                        
                        # 2. Setup New Chat State Profile
                        new_chat_id = str(uuid.uuid4())
                        initial_input = f"Patient: {patient_name}\nDenial Reason: {denial_reason}"
                        starting_messages = [HumanMessage(content=initial_input)]
                        
                        # 3. Generate Initial Agent Response
                        raw_response = backend.chat_with_agent(
                            starting_messages, 
                            context, 
                            patient_name
                        )
                        clean_response, draft = process_agent_response(raw_response)
                        
                        new_ai_msg = AIMessage(
                            content=clean_response,
                            additional_kwargs={
                                "draft": draft,
                                "sources": docs
                            }
                        )
                        starting_messages.append(new_ai_msg)
                        
                        # 4. Save to global chats dictionary
                        case_title = f"{patient_name}: {detected_prov.upper()}"
                        st.session_state.chats[new_chat_id] = {
                            "title": case_title,
                            "messages": starting_messages,
                            "rag_context": context,
                            "retrieved_docs": docs,
                            "provider": detected_prov
                        }
                        
                        # 5. Lock in the active chat and render
                        st.session_state.current_chat_id = new_chat_id
                        st.rerun()
                else:
                    st.warning("Please provide both the Patient Name and Denial Reason to start.")
            st.markdown("</div>", unsafe_allow_html=True)

    # CASE 2: Active Chat -> Display Conversational Workspace
    else:
        # Load the specific chat pointer
        active_chat = st.session_state.chats[st.session_state.current_chat_id]
        
        st.markdown(f"<h3>Case Workspace: <span style='color: #2563EB;'>{active_chat['provider'].upper()}</span></h3>", unsafe_allow_html=True)
        st.markdown("---")
        
        # Render Timeline
        for i, msg in enumerate(active_chat['messages']):
            # Hide the initial injection prompt
            if isinstance(msg, HumanMessage) and "Patient:" in msg.content and "Denial Reason:" in msg.content:
                continue
                
            role = "user" if isinstance(msg, HumanMessage) else "assistant"
            with st.chat_message(role):
                st.write(msg.content)
                
                if isinstance(msg, AIMessage):
                    sources = msg.additional_kwargs.get("sources", [])
                    draft = msg.additional_kwargs.get("draft", None)
                    
                    if sources:
                        with st.expander("🔍 View Sourced Policy Reference Guidelines"):
                            for idx, doc in enumerate(sources):
                                source_name = doc.metadata.get('source', 'Unknown')
                                page = doc.metadata.get('page', 'Unknown')
                                st.markdown(f"**Source {idx+1}:** {os.path.basename(source_name)} (Page {page})")
                                st.caption(doc.page_content[:300] + "...")
                    
                    if draft:
                        st.success("✅ Final Actionable Draft Compiled Successfully!")
                        st.download_button(
                            label="⬇️ Download Letter Content payload (.TXT)",
                            data=draft,
                            file_name=f"Appeal_{active_chat['provider']}_{st.session_state.current_chat_id[:5]}.txt",
                            mime="text/plain",
                            use_container_width=True,
                            type="primary",
                            # Use chat_id + index to guarantee absolute button key uniqueness 
                            key=f"dl_btn_{st.session_state.current_chat_id}_{i}" 
                        )

        # Dynamic floating text input
        if active_chat['rag_context'] is not None:
            if user_input := st.chat_input("Provide details or type 'Draft the letter'"):
                active_chat['messages'].append(HumanMessage(content=user_input))
                st.rerun()

        # Handle Generation Loop
        if len(active_chat['messages']) > 0 and isinstance(active_chat['messages'][-1], HumanMessage):
            with st.chat_message("assistant"):
                with st.spinner("Agent is tracking policies and drafting..."):
                    raw_response = backend.chat_with_agent(
                        active_chat['messages'],
                        active_chat['rag_context'],
                        "" 
                    )
                    
                    clean_response, draft = process_agent_response(raw_response)
                    
                    new_ai_msg = AIMessage(
                        content=clean_response,
                        additional_kwargs={
                            "draft": draft,
                            "sources": active_chat['retrieved_docs']
                        }
                    )
                    # Python automatically updates the dict value because it references the same list
                    active_chat['messages'].append(new_ai_msg) 
                    st.rerun()

def main():
    configure_page()
    init_session_state() 
    
    mistral_key = os.getenv("MISTRAL_API_KEY")
    
    if not mistral_key or mistral_key == "myKeyExistsHere" or len(mistral_key) < 20:
        st.error("Invalid Mistral API Key detected. Please update your `.env` file with a valid key.")
        st.stop()

    vector_db = render_sidebar()
    if vector_db is None:
        st.warning("No policy PDFs found in `/policies`. Database offline.")
        st.stop()

    render_main_content(vector_db)

if __name__ == "__main__":
    main()