# components/workspace.py
import streamlit as st
import os
import backend
from utils.state import process_agent_response
from langchain_core.messages import HumanMessage, AIMessage

def render_workspace_view() -> None:
    """Renders the dynamic chat timeline, reference expanders, and handles ongoing generation."""
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