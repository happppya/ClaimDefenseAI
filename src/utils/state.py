# utils/state.py
import streamlit as st
import re
from typing import Tuple, Optional, Dict, Any

def init_session_state() -> None:
    """
    Initializes dictionary-based session state boundaries for multi-chat support.
    """
    if "chats" not in st.session_state:
        st.session_state.chats: Dict[str, Any] = {}
    if "current_chat_id" not in st.session_state:
        st.session_state.current_chat_id: Optional[str] = None

def process_agent_response(response_text: str) -> Tuple[str, Optional[str]]:
    """
    Parses agent response to extract draft payloads and clean UI text.
    
    Args:
        response_text (str): Raw string output from the LLM.
        
    Returns:
        Tuple[str, Optional[str]]: Cleaned UI response and the extracted draft string.
    """
    match = re.search(r'<FINAL_LETTER>(.*?)</FINAL_LETTER>', response_text, re.DOTALL)
    draft = match.group(1).strip() if match else None
    clean_ui_text = re.sub(r'<FINAL_LETTER>|</FINAL_LETTER>', '', response_text).strip()
    return clean_ui_text, draft