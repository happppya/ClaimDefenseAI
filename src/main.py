# main.py
import streamlit as st
import os
from dotenv import load_dotenv

# Utilities
from utils.theme import ThemeTokens, inject_design_system
from utils.state import init_session_state

# Components
from components.sidebar import render_sidebar
from components.intake import render_intake_view
from components.workspace import render_workspace_view

def configure_page() -> None:
    """Bootstraps Streamlit layout config and injects the design token system."""
    st.set_page_config(page_title="ClaimDefense AI", page_icon="⚕️", layout="wide")
    theme = ThemeTokens() 
    inject_design_system(theme)

def main() -> None:
    """Master entry point and router."""
    load_dotenv()
    configure_page()
    init_session_state() 
    
    vector_db = render_sidebar()
    if vector_db is None:
        st.warning("Database mounting failed. Check API Keys and /policies directory.")
        st.stop()

    # View Routing
    if st.session_state.current_chat_id is None:
        render_intake_view(vector_db)
    else:
        render_workspace_view()

if __name__ == "__main__":
    main()