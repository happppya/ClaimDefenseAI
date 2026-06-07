# components/sidebar.py
import streamlit as st
import os
from typing import Any
import backend

@st.cache_resource(show_spinner=False)
def init_db() -> Any:
    """Singleton initialization of the vector database."""
    return backend.build_vector_db()

def render_sidebar() -> Any:
    """
    Renders navigation, history mapping, and system status indicators.
    
    Returns:
        Any: The initialized Vector DB instance, or None if offline.
    """
    mistral_key = os.getenv("MISTRAL_API_KEY")
    
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
        if mistral_key and mistral_key != "myKeyExistsHere" and len(mistral_key) > 20:
            with st.spinner("Indexing vector database..."):
                vector_db = init_db()
            if vector_db is None:
                st.error("Vector DB Offline")
            else:
                st.success("Vector DB Active")
        else:
            st.error("Missing Auth Context")
            
    return vector_db