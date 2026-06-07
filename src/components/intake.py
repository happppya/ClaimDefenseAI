# components/intake.py
import streamlit as st
import uuid
from typing import Any
import backend
from utils.state import process_agent_response
from langchain_core.messages import HumanMessage, AIMessage

def _handle_intake_submission(patient_name: str, denial_reason: str, provider: str, vector_db: Any) -> None:
    """Internal submission handler bridging UI interactions to backend pipeline."""
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
    """Renders the initial data extraction forms and handles payload dispatch."""
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
                _handle_intake_submission(patient_name, denial_reason, selected_provider, vector_db)
            else:
                st.warning("Insufficient parameters provided.")